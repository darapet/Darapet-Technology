import { supabase } from './supabase';

// Shared email-sending helper. Picks the provider the user configured in
// Settings (Brevo API, or their own SMTP mailbox e.g. Gmail with an App
// Password) and sends through it. SendGrid/Mailgun are not wired up yet —
// only Brevo and SMTP actually send.
export interface EmailProviderConfig {
  active_smtp?: string | null;
  brevo_api_key?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
  smtp_secure?: boolean | null;
}

export interface SendEmailParams {
  config: EmailProviderConfig;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export function hasUsableEmailProvider(config: EmailProviderConfig): boolean {
  if (config.active_smtp === 'smtp') {
    return Boolean(config.smtp_host && config.smtp_user && config.smtp_pass);
  }
  return Boolean(config.brevo_api_key);
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { config, fromName, to, subject, html } = params;

  if (config.active_smtp === 'smtp') {
    if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
      return { ok: false, error: 'SMTP is not fully configured. Add host, username, and password in Settings.' };
    }
    try {
      const { data, error } = await supabase.functions.invoke('send-smtp-email', {
        body: {
          host: config.smtp_host,
          port: config.smtp_port || 465,
          secure: config.smtp_secure ?? true,
          username: config.smtp_user,
          password: config.smtp_pass,
          fromName,
          // Must send AS the authenticated mailbox — Gmail (and most SMTP
          // servers) reject a From address that doesn't match the logged-in
          // account, so we ignore params.fromEmail for the SMTP path.
          fromEmail: config.smtp_user,
          to,
          subject,
          html,
        },
      });
      if (error) return { ok: false, error: error.message };
      if (data?.error) return { ok: false, error: data.error };
      return { ok: Boolean(data?.success) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown SMTP send error' };
    }
  }

  // Default: Brevo
  if (!config.brevo_api_key) {
    return { ok: false, error: 'No Brevo API key. Add it in Settings.' };
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': config.brevo_api_key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: fromName, email: params.fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: body || `Brevo responded with ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
