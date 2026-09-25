import { supabase } from '@/lib/supabase';

export type GmailStatus = {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
};

async function invoke<T>(functionName: string, body?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(functionName, { body: body || {} });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function startGmailConnection() {
  const data = await invoke<{ authUrl: string }>('gmail-oauth-start');
  window.location.assign(data.authUrl);
}

export function getGmailStatus() {
  return invoke<GmailStatus>('gmail-status');
}

export function disconnectGmail() {
  return invoke<{ connected: false }>('gmail-disconnect');
}

export function sendGmail(params: { to: string; subject: string; html: string; fromName?: string }) {
  return invoke<{ success: boolean; provider: 'gmail'; messageId: string }>('gmail-send', params);
}