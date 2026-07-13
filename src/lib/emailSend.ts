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

export interface SmtpPreset {
  label: string;
  host: string;
  port: number;
  secure: boolean;
  passwordLabel: string;
  passwordHint: string;
  passwordUrl?: string;
}

// Known SMTP servers for common consumer/business email providers, keyed by
// the domain after the "@" in the user's email address. Lets users just
// enter their email + an app password instead of hunting down server
// settings themselves.
export const SMTP_PRESETS: Record<string, SmtpPreset> = {
  'gmail.com': {
    label: 'Gmail',
    host: 'smtp.gmail.com', port: 465, secure: true,
    passwordLabel: 'App Password',
    passwordHint: 'Not your normal Gmail password — generate a 16-character App Password (requires 2-Step Verification on your Google account).',
    passwordUrl: 'https://myaccount.google.com/apppasswords',
  },
  'googlemail.com': { label: 'Gmail', host: 'smtp.gmail.com', port: 465, secure: true, passwordLabel: 'App Password', passwordHint: 'Generate a 16-character App Password (requires 2-Step Verification).', passwordUrl: 'https://myaccount.google.com/apppasswords' },
  'yahoo.com': {
    label: 'Yahoo Mail',
    host: 'smtp.mail.yahoo.com', port: 465, secure: true,
    passwordLabel: 'App Password',
    passwordHint: 'Not your normal Yahoo password — generate an App Password in Yahoo Account Security.',
    passwordUrl: 'https://login.yahoo.com/account/security',
  },
  'outlook.com': {
    label: 'Outlook',
    host: 'smtp-mail.outlook.com', port: 587, secure: false,
    passwordLabel: 'Password / App Password',
    passwordHint: 'Your normal password works if 2-Step Verification is off. If it\u2019s on, create an App Password instead.',
    passwordUrl: 'https://account.live.com/proofs/AppPassword',
  },
  'hotmail.com': { label: 'Outlook', host: 'smtp-mail.outlook.com', port: 587, secure: false, passwordLabel: 'Password / App Password', passwordHint: 'Your normal password works if 2-Step Verification is off; otherwise create an App Password.', passwordUrl: 'https://account.live.com/proofs/AppPassword' },
  'live.com': { label: 'Outlook', host: 'smtp-mail.outlook.com', port: 587, secure: false, passwordLabel: 'Password / App Password', passwordHint: 'Your normal password works if 2-Step Verification is off; otherwise create an App Password.', passwordUrl: 'https://account.live.com/proofs/AppPassword' },
  'msn.com': { label: 'Outlook', host: 'smtp-mail.outlook.com', port: 587, secure: false, passwordLabel: 'Password / App Password', passwordHint: 'Your normal password works if 2-Step Verification is off; otherwise create an App Password.', passwordUrl: 'https://account.live.com/proofs/AppPassword' },
  'icloud.com': {
    label: 'iCloud Mail',
    host: 'smtp.mail.me.com', port: 587, secure: false,
    passwordLabel: 'App-Specific Password',
    passwordHint: 'Not your Apple ID password — generate an app-specific password at appleid.apple.com.',
    passwordUrl: 'https://appleid.apple.com/account/manage',
  },
  'me.com': { label: 'iCloud Mail', host: 'smtp.mail.me.com', port: 587, secure: false, passwordLabel: 'App-Specific Password', passwordHint: 'Generate an app-specific password at appleid.apple.com.', passwordUrl: 'https://appleid.apple.com/account/manage' },
  'mac.com': { label: 'iCloud Mail', host: 'smtp.mail.me.com', port: 587, secure: false, passwordLabel: 'App-Specific Password', passwordHint: 'Generate an app-specific password at appleid.apple.com.', passwordUrl: 'https://appleid.apple.com/account/manage' },
  'aol.com': {
    label: 'AOL Mail',
    host: 'smtp.aol.com', port: 465, secure: true,
    passwordLabel: 'App Password',
    passwordHint: 'Generate an App Password in AOL Account Security settings.',
    passwordUrl: 'https://login.aol.com/account/security',
  },
  'zoho.com': {
    label: 'Zoho Mail',
    host: 'smtp.zoho.com', port: 465, secure: true,
    passwordLabel: 'App Password',
    passwordHint: 'Generate an App Password under Zoho Account Security if two-factor auth is enabled; otherwise use your normal password.',
  },
  'gmx.com': { label: 'GMX Mail', host: 'mail.gmx.com', port: 465, secure: true, passwordLabel: 'Password', passwordHint: 'Use your normal GMX password.' },
};

export function detectSmtpPreset(email: string): SmtpPreset | null {
  const domain = email.split('@')[1]?.trim().toLowerCase();
  if (!domain) return null;
  return SMTP_PRESETS[domain] || null;
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
        headers: {
          'List-Unsubscribe': `<mailto:${params.fromEmail}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Precedence': 'bulk',
        },
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
