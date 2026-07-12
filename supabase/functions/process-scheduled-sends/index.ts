// Supabase Edge Function: process-scheduled-sends
//
// Picks up every row in `scheduled_sends` whose scheduled_at time has passed
// and status is still 'scheduled', sends the emails using the user's own
// SMTP or Brevo config (same providers as the manual send flow), then marks
// the row 'sent' or 'failed'.
//
// This function is meant to be triggered by a pg_cron job every minute.
// It is protected by a CRON_SECRET env-var so random HTTP callers cannot
// fire it.  Set that secret in Supabase Dashboard → Edge Functions → Secrets.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  active_smtp: string | null;
  brevo_api_key: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_secure: boolean | null;
}

interface ScheduledSend {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  recipients: string[];
  scheduled_at: string;
}

interface SendResult {
  email: string;
  ok: boolean;
  error?: string;
}

// ─── SMTP send (same hand-rolled approach as send-smtp-email function) ────────

class SmtpError extends Error {}

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

  releaseForUpgrade() {
    this.#reader.releaseLock();
    this.#writer.releaseLock();
  }

  async quit() {
    try { await this.send("QUIT"); } catch { /* ignore */ }
  }

  close() {
    try { this.#conn.close(); } catch { /* ignore */ }
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

async function authenticateAndSend(session: SmtpSession, opts: {
  username: string; password: string;
  fromEmail: string; fromName?: string;
  to: string; subject: string; html: string; host: string;
}) {
  await session.send(`EHLO localhost`);
  await session.expect(["250"], "EHLO");
  await session.send("AUTH LOGIN");
  await session.expect(["334"], "AUTH LOGIN");
  await session.send(btoa(opts.username));
  await session.expect(["334"], "AUTH username");
  await session.send(btoa(opts.password));
  await session.expect(["235"], "AUTH password");
  await session.send(`MAIL FROM:<${opts.fromEmail}>`);
  await session.expect(["250"], "MAIL FROM");
  await session.send(`RCPT TO:<${opts.to}>`);
  await session.expect(["250"], "RCPT TO");
  await session.send("DATA");
  await session.expect(["354"], "DATA");
  await session.send(buildMessage(opts));
  await session.expect(["250"], "message body");
  await session.quit();
}

async function sendViaSmtp(opts: {
  host: string; port: number; secure: boolean;
  username: string; password: string;
  fromEmail: string; fromName?: string;
  to: string; subject: string; html: string;
}): Promise<void> {
  const implicitTls = opts.secure && opts.port === 465;
  let conn: Deno.Conn;
  let session: SmtpSession;

  if (implicitTls) {
    conn = await Deno.connectTls({ hostname: opts.host, port: opts.port });
    session = new SmtpSession(conn);
    await session.readResponse(); // greeting
  } else {
    conn = await Deno.connect({ hostname: opts.host, port: opts.port });
    session = new SmtpSession(conn);
    await session.readResponse(); // greeting
    await session.send(`EHLO localhost`);
    await session.expect(["250"], "EHLO (plaintext)");
    await session.send("STARTTLS");
    await session.expect(["220"], "STARTTLS");
    session.releaseForUpgrade();
    conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: opts.host });
    session = new SmtpSession(conn);
  }

  try {
    await authenticateAndSend(session, opts);
  } finally {
    session.close();
  }
}

// ─── Brevo send ───────────────────────────────────────────────────────────────

async function sendViaBrevo(opts: {
  apiKey: string;
  fromName: string; fromEmail: string;
  to: string; subject: string; html: string;
}): Promise<void> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": opts.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: opts.fromName, email: opts.fromEmail },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Brevo ${res.status}`);
  }
}

// ─── Send one email using the user's configured provider ─────────────────────

async function sendOne(profile: Profile, to: string, subject: string, html: string): Promise<SendResult> {
  try {
    if (profile.active_smtp === "smtp") {
      if (!profile.smtp_host || !profile.smtp_user || !profile.smtp_pass) {
        return { email: to, ok: false, error: "SMTP not fully configured" };
      }
      await sendViaSmtp({
        host: profile.smtp_host,
        port: profile.smtp_port ?? 465,
        secure: profile.smtp_secure ?? true,
        username: profile.smtp_user,
        password: profile.smtp_pass,
        fromEmail: profile.smtp_user, // must match authenticated mailbox
        fromName: profile.name ?? undefined,
        to,
        subject,
        html,
      });
    } else {
      if (!profile.brevo_api_key) {
        return { email: to, ok: false, error: "Brevo API key not configured" };
      }
      await sendViaBrevo({
        apiKey: profile.brevo_api_key,
        fromName: profile.name ?? "Darapet",
        fromEmail: profile.email ?? "no-reply@darapet.com",
        to,
        subject,
        html,
      });
    }
    return { email: to, ok: true };
  } catch (err) {
    return { email: to, ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify the CRON_SECRET so only authorised callers can trigger sends.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const incoming = req.headers.get("x-cron-secret");
    if (incoming !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const headers = {
    "apikey": serviceKey,
    "Authorization": `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };

  // 1. Fetch all overdue scheduled sends
  const fetchUrl =
    `${supabaseUrl}/rest/v1/scheduled_sends` +
    `?status=eq.scheduled&scheduled_at=lte.${encodeURIComponent(new Date().toISOString())}&select=id,user_id,subject,body,recipients`;

  const fetchRes = await fetch(fetchUrl, { headers });
  if (!fetchRes.ok) {
    const err = await fetchRes.text();
    return new Response(JSON.stringify({ error: "Failed to fetch scheduled sends", detail: err }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const scheduled: ScheduledSend[] = await fetchRes.json();

  if (scheduled.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const summary: { id: string; sent: number; failed: number }[] = [];

  for (const send of scheduled) {
    // 2. Mark as 'sending' immediately so concurrent runs don't double-fire
    await fetch(
      `${supabaseUrl}/rest/v1/scheduled_sends?id=eq.${send.id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "sending" }),
      }
    );

    // 3. Get the user's profile for email credentials
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${send.user_id}&select=id,name,email,active_smtp,brevo_api_key,smtp_host,smtp_port,smtp_user,smtp_pass,smtp_secure`,
      { headers }
    );
    const profiles: Profile[] = await profileRes.json();
    const profile = profiles[0];

    if (!profile) {
      await fetch(`${supabaseUrl}/rest/v1/scheduled_sends?id=eq.${send.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "failed" }),
      });
      summary.push({ id: send.id, sent: 0, failed: send.recipients?.length ?? 0 });
      continue;
    }

    // 4. Send to each recipient
    const recipients: string[] = Array.isArray(send.recipients) ? send.recipients : [];
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${send.body}</div>`;

    let sentCount = 0;
    let failedCount = 0;

    for (const to of recipients) {
      const result = await sendOne(profile, to, send.subject, html);
      if (result.ok) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Record individual send in email_sends table
      await fetch(`${supabaseUrl}/rest/v1/email_sends`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: send.user_id,
          to_email: to,
          subject: send.subject,
          provider: profile.active_smtp === "smtp" ? "smtp" : "brevo",
          status: result.ok ? "sent" : "failed",
          sent_at: new Date().toISOString(),
        }),
      });
    }

    // 5. Update final status
    const finalStatus = failedCount === recipients.length && recipients.length > 0 ? "failed" : "sent";
    await fetch(`${supabaseUrl}/rest/v1/scheduled_sends?id=eq.${send.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: finalStatus, sent_count: sentCount }),
    });

    summary.push({ id: send.id, sent: sentCount, failed: failedCount });
  }

  return new Response(JSON.stringify({ processed: scheduled.length, summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
