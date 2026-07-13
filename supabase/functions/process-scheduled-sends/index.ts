// Supabase Edge Function: process-scheduled-sends
    // Picks up campaigns with status='scheduled' whose scheduled_at has passed,
    // sends via the user's SMTP or Brevo config, marks the campaign 'sent'/'failed'.
    // Triggered by pg_cron every minute. Protected by x-cron-secret header.

    const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
    };

    interface Profile {
    id: string; name: string | null; email: string | null;
    active_smtp: string | null; brevo_api_key: string | null;
    smtp_host: string | null; smtp_port: number | null;
    smtp_user: string | null; smtp_pass: string | null; smtp_secure: boolean | null;
    }
    interface Campaign {
    id: string; user_id: string; subject: string;
    body: string; recipients: string[]; scheduled_at: string;
    }

    // ─── Minimal SMTP client ──────────────────────────────────────────────────────
    class SmtpError extends Error {}
    class SmtpSession {
    #conn: Deno.Conn;
    #reader: ReadableStreamDefaultReader<Uint8Array>;
    #writer: WritableStreamDefaultWriter<Uint8Array>;
    #enc = new TextEncoder(); #dec = new TextDecoder();
    constructor(conn: Deno.Conn) {
      this.#conn = conn;
      this.#reader = conn.readable.getReader();
      this.#writer = conn.writable.getWriter();
    }
    async send(l: string) { await this.#writer.write(this.#enc.encode(l + "\r\n")); }
    async readResponse(): Promise<string> {
      let buf = "";
      while (true) {
        const { value, done } = await this.#reader.read();
        if (done) break;
        buf += this.#dec.decode(value, { stream: true });
        const last = buf.split("\r\n").filter(Boolean).at(-1) ?? "";
        if (/^\d{3} /.test(last)) break;
      }
      return buf;
    }
    async expect(codes: string[], step: string) {
      const r = await this.readResponse();
      if (!codes.includes(r.slice(0, 3))) throw new SmtpError(`SMTP ${step}: ${r.trim()}`);
      return r;
    }
    releaseForUpgrade() { this.#reader.releaseLock(); this.#writer.releaseLock(); }
    async quit() { try { await this.send("QUIT"); } catch { /**/ } }
    close() { try { this.#conn.close(); } catch { /**/ } }
    }

    function buildMsg(o: { fromEmail:string; fromName?:string; to:string; subject:string; html:string; host:string; unsubscribeUrl?:string }) {
    const from = o.fromName ? `${o.fromName} <${o.fromEmail}>` : o.fromEmail;
    const unsubMailto = `<mailto:${o.fromEmail}?subject=unsubscribe>`;
    const listUnsub = o.unsubscribeUrl ? `${unsubMailto}, <${o.unsubscribeUrl}>` : unsubMailto;
    const boundary = `boundary_${crypto.randomUUID().replace(/-/g,"")}`;
    const escapedHtml = o.html.replace(/\r\n\.\r\n/g, "\r\n..\r\n");
    const plainText = o.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi,"")
      .replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ")
      .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
      .replace(/\s{2,}/g," ").trim();
    const headerLines = [
      `From: ${from}`, `To: ${o.to}`, `Subject: ${o.subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@${o.host}>`,
      "MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "Precedence: bulk", `List-Unsubscribe: ${listUnsub}`,
    ];
    if (o.unsubscribeUrl) headerLines.push("List-Unsubscribe-Post: List-Unsubscribe=One-Click");
    const body = [
      `--${boundary}`,`Content-Type: text/plain; charset="UTF-8"`,
      "Content-Transfer-Encoding: quoted-printable","",plainText,"",
      `--${boundary}`,`Content-Type: text/html; charset="UTF-8"`,
      "Content-Transfer-Encoding: quoted-printable","",escapedHtml,"",
      `--${boundary}--`,".",
    ].join("\r\n");
    return [...headerLines,"",body].join("\r\n");
    }

    async function smtpSend(profile: Profile, to: string, subject: string, html: string): Promise<{ok:boolean;error?:string}> {
    const host = profile.smtp_host!;
    const port = profile.smtp_port ?? 587;
    const secure = profile.smtp_secure ?? false;
    let conn!: Deno.Conn; let session!: SmtpSession;
    try {
      conn = await Deno.connect({ hostname: host, port });
      session = new SmtpSession(conn);
      await session.expect(["220"], "BANNER");
      const senderDomain = profile.smtp_user!.split("@")[1] || host;
      if (secure) {
        await session.send(`EHLO ${senderDomain}`); await session.expect(["250"], "EHLO");
        await session.send("STARTTLS"); await session.expect(["220"], "STARTTLS");
        session.releaseForUpgrade();
        conn = await Deno.startTls(conn, { hostname: host });
        session = new SmtpSession(conn);
      }
      await session.send(`EHLO ${senderDomain}`); await session.expect(["250"], "EHLO");
      await session.send("AUTH LOGIN"); await session.expect(["334"], "AUTH");
      await session.send(btoa(profile.smtp_user!)); await session.expect(["334"], "USER");
      await session.send(btoa(profile.smtp_pass!)); await session.expect(["235"], "PASS");
      await session.send(`MAIL FROM:<${profile.smtp_user}>`); await session.expect(["250"], "MAIL FROM");
      await session.send(`RCPT TO:<${to}>`); await session.expect(["250"], "RCPT TO");
      await session.send("DATA"); await session.expect(["354"], "DATA");
      await session.send(buildMsg({ fromEmail: profile.smtp_user!, fromName: profile.name ?? undefined, to, subject, html, host }));
      await session.expect(["250"], "MSG SENT");
      await session.quit();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    } finally {
      try { session?.close(); } catch { /**/ }
    }
    }

    async function brevoSend(profile: Profile, to: string, subject: string, html: string): Promise<{ok:boolean;error?:string}> {
    try {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": profile.brevo_api_key!, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: { name: profile.name ?? profile.email, email: profile.email },
          to: [{ email: to }], subject, htmlContent: html,
          headers: {
            "List-Unsubscribe": `<mailto:${profile.email}?subject=unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            "Precedence": "bulk",
          },
        }),
      });
      return r.ok ? { ok: true } : { ok: false, error: await r.text() };
    } catch (e) { return { ok: false, error: String(e) }; }
    }

    async function sendOne(profile: Profile, to: string, subject: string, html: string) {
    if (profile.active_smtp === "smtp" && profile.smtp_host && profile.smtp_user && profile.smtp_pass) {
      return smtpSend(profile, to, subject, html);
    }
    if (profile.brevo_api_key) return brevoSend(profile, to, subject, html);
    return { ok: false, error: "No email provider configured" };
    }

    // ─── Main handler ─────────────────────────────────────────────────────────────
    Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const headers = {
      "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json", "Prefer": "return=representation",
    };
    const nowIso = new Date().toISOString();

    // 1. Fetch due campaigns
    const schedRes = await fetch(
      `${supabaseUrl}/rest/v1/campaigns?status=eq.scheduled&scheduled_at=lte.${encodeURIComponent(nowIso)}&select=id,user_id,subject,body,recipients,scheduled_at&limit=50`,
      { headers }
    );
    const campaigns: Campaign[] = await schedRes.json();
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Mark all as 'sending' immediately to prevent double-fires
    const ids = campaigns.map(c => c.id);
    await fetch(`${supabaseUrl}/rest/v1/campaigns?id=in.(${ids.join(",")})`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status: "sending" }),
    });

    const summary: Array<{id:string;sent:number;failed:number}> = [];

    for (const campaign of campaigns) {
      // 3. Fetch user profile (email credentials)
      const profRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${campaign.user_id}&select=id,name,email,active_smtp,brevo_api_key,smtp_host,smtp_port,smtp_user,smtp_pass,smtp_secure&limit=1`,
        { headers }
      );
      const profiles: Profile[] = await profRes.json();
      const profile = profiles[0];

      if (!profile || (!profile.brevo_api_key && !(profile.smtp_host && profile.smtp_user && profile.smtp_pass))) {
        await fetch(`${supabaseUrl}/rest/v1/campaigns?id=eq.${campaign.id}`, {
          method: "PATCH", headers,
          body: JSON.stringify({ status: "failed" }),
        });
        summary.push({ id: campaign.id, sent: 0, failed: campaign.recipients?.length ?? 0 });
        continue;
      }

      // 4. Send to each recipient
      const recipients: string[] = Array.isArray(campaign.recipients) ? campaign.recipients : [];
      const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${campaign.body}</div>`;
      let sentCount = 0, failedCount = 0;

      for (const to of recipients) {
        const r = await sendOne(profile, to, campaign.subject, html);
        if (r.ok) sentCount++; else failedCount++;
        // Record individual send
        await fetch(`${supabaseUrl}/rest/v1/email_sends`, {
          method: "POST", headers,
          body: JSON.stringify({
            user_id: campaign.user_id, campaign_id: campaign.id,
            to_email: to, subject: campaign.subject,
            provider: profile.active_smtp === "smtp" ? "smtp" : "brevo",
            status: r.ok ? "sent" : "failed",
            sent_at: new Date().toISOString(),
          }),
        });
      }

      // 5. Update final campaign status
      const finalStatus = recipients.length > 0 && failedCount === recipients.length ? "failed" : "sent";
      await fetch(`${supabaseUrl}/rest/v1/campaigns?id=eq.${campaign.id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ status: finalStatus, sent_count: sentCount }),
      });
      summary.push({ id: campaign.id, sent: sentCount, failed: failedCount });
    }

    return new Response(JSON.stringify({ processed: campaigns.length, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    });
    