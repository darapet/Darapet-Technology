// Supabase Edge Function: send-smtp-email
// Sends an email through a user-supplied SMTP account (e.g. Gmail SMTP with an
// App Password). This lets users send campaign/transactional email through
// their own mailbox's real infrastructure, so DKIM/DMARC are signed by the
// mailbox provider itself (no custom domain required).
//
// Implemented with a minimal hand-rolled SMTP client using only Deno's
// built-in TCP/TLS APIs (no remote module imports), since this sandbox's
// deploy-time bundler cannot reach deno.land/npm to resolve third-party
// SMTP libraries.
//
// Requires the caller to be an authenticated Supabase user (JWT verification
// is left ON for this function — do not deploy with --no-verify-jwt).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendRequest {
  host: string;
  port: number;
  secure?: boolean;
  username: string;
  password: string;
  fromName?: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
}

class SmtpError extends Error {}

// Wraps a Deno TCP/TLS connection with line-based SMTP read/write helpers.
class SmtpSession {
  #conn: Deno.Conn;
  #reader: ReadableStreamDefaultReader<Uint8Array>;
  #writer: WritableStreamDefaultWriter<Uint8Array>;
  #encoder = new TextEncoder();
  #decoder = new TextDecoder();

  constructor(conn: Deno.Conn) {
    this.#conn = conn;
    this.#reader = conn.readable.getReader();
    this.#writer = conn.writable.getWriter();
  }

  async send(line: string) {
    await this.#writer.write(this.#encoder.encode(line + "\r\n"));
  }

  async readResponse(): Promise<string> {
    let buf = "";
    while (true) {
      const { value, done } = await this.#reader.read();
      if (done) break;
      buf += this.#decoder.decode(value, { stream: true });
      const lines = buf.split("\r\n").filter(Boolean);
      const last = lines[lines.length - 1];
      if (last && /^\d{3} /.test(last)) break;
    }
    return buf;
  }

  async expect(codes: string[], step: string): Promise<string> {
    const resp = await this.readResponse();
    if (!codes.includes(resp.slice(0, 3))) {
      throw new SmtpError(`SMTP error at ${step}: ${resp.trim()}`);
    }
    return resp;
  }

  // Releases the underlying stream locks WITHOUT closing the socket, so the
  // raw connection can be upgraded to TLS via Deno.startTls().
  releaseForUpgrade() {
    this.#reader.releaseLock();
    this.#writer.releaseLock();
  }

  async quit() {
    try {
      await this.send("QUIT");
    } catch {
      // ignore
    }
  }

  close() {
    try {
      this.#conn.close();
    } catch {
      // ignore double-close
    }
  }
}

function buildMessage(opts: {
  fromEmail: string;
  fromName?: string;
  to: string;
  subject: string;
  html: string;
  host: string;
}): string {
  const from = opts.fromName ? `${opts.fromName} <${opts.fromEmail}>` : opts.fromEmail;
  const date = new Date().toUTCString();
  const messageId = `<${crypto.randomUUID()}@${opts.host}>`;
  // Dot-stuff any line that is exactly "." per RFC 5321 DATA framing.
  const escapedHtml = opts.html.replace(/\r\n\.\r\n/g, "\r\n..\r\n");
  return [
    `From: ${from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    escapedHtml,
    `.`,
  ].join("\r\n");
}

async function authenticateAndSend(session: SmtpSession, req: SendRequest) {
  await session.send(`EHLO localhost`);
  await session.expect(["250"], "EHLO");

  await session.send("AUTH LOGIN");
  await session.expect(["334"], "AUTH LOGIN");

  await session.send(btoa(req.username));
  await session.expect(["334"], "AUTH username");

  await session.send(btoa(req.password));
  await session.expect(["235"], "AUTH password");

  await session.send(`MAIL FROM:<${req.fromEmail}>`);
  await session.expect(["250"], "MAIL FROM");

  await session.send(`RCPT TO:<${req.to}>`);
  await session.expect(["250", "251"], "RCPT TO");

  await session.send("DATA");
  await session.expect(["354"], "DATA");

  const message = buildMessage({
    fromEmail: req.fromEmail,
    fromName: req.fromName,
    to: req.to,
    subject: req.subject,
    html: req.html,
    host: req.host,
  });
  await session.send(message);
  await session.expect(["250"], "message body");

  await session.quit();
}

async function sendSmtp(req: SendRequest): Promise<void> {
  const port = Number(req.port);
  const implicitTls = req.secure !== false && port === 465;

  let conn: Deno.Conn = implicitTls
    ? await Deno.connectTls({ hostname: req.host, port })
    : await Deno.connect({ hostname: req.host, port });

  let session = new SmtpSession(conn);

  try {
    await session.expect(["220"], "connect");

    if (!implicitTls) {
      // Announce, then upgrade via STARTTLS (e.g. Gmail on port 587).
      await session.send(`EHLO localhost`);
      await session.expect(["250"], "EHLO (plaintext)");

      await session.send("STARTTLS");
      await session.expect(["220"], "STARTTLS");

      session.releaseForUpgrade();
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: req.host });
      session = new SmtpSession(conn);
    }

    await authenticateAndSend(session, req);
  } finally {
    session.close();
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Partial<SendRequest>;
    const required = ["host", "port", "username", "password", "fromEmail", "to", "subject", "html"];
    const missing = required.filter((k) => !(body as Record<string, unknown>)[k]);
    if (missing.length) {
      return new Response(
        JSON.stringify({ error: `Missing required field(s): ${missing.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await sendSmtp(body as SendRequest);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
