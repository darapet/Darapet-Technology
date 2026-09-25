export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers },
  });
}

export function redirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

export function env(name: string) {
  return Deno.env.get(name)?.trim() || "";
}

export function gmailConfig() {
  const config = {
    clientId: env("GMAIL_CLIENT_ID"),
    clientSecret: env("GMAIL_CLIENT_SECRET"),
    redirectUri: env("GMAIL_REDIRECT_URI"),
    frontendUrl: env("GMAIL_FRONTEND_URL") ||
      "https://darapet.github.io/Darapet-Technology/scouting",
  };
  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "frontendUrl" && !value)
    .map(([key]) => key);
  if (missing.length) throw new Error(`Missing Gmail configuration: ${missing.join(", ")}`);
  return config;
}

function authHeader(req: Request) {
  const value = req.headers.get("Authorization");
  return value?.startsWith("Bearer ") ? value : "";
}

export async function authenticatedUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const token = authHeader(req);
  if (!token) return null;
  const response = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, {
    headers: {
      apikey: env("SUPABASE_ANON_KEY") || env("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: token,
    },
  });
  if (!response.ok) return null;
  return await response.json();
}

export function serviceHeaders(extra: Record<string, string> = {}) {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function rest(path: string, init: RequestInit = {}) {
  return fetch(`${env("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
  });
}

export async function restOne<T>(path: string): Promise<T | null> {
  const response = await rest(path);
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  const rows = await response.json();
  return Array.isArray(rows) ? (rows[0] || null) : rows;
}

export function base64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function encryptionKey() {
  const secret = env("GMAIL_TOKEN_ENCRYPTION_KEY") || env("GMAIL_CLIENT_SECRET");
  if (!secret) throw new Error("GMAIL_TOKEN_ENCRYPTION_KEY is not configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptToken(token: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(token),
  );
  return `${base64(iv)}.${base64(new Uint8Array(encrypted))}`;
}

export async function decryptToken(value: string) {
  const [ivValue, cipherValue] = value.split(".");
  if (!ivValue || !cipherValue) throw new Error("Stored Gmail token is invalid");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivValue) },
    await encryptionKey(),
    fromBase64(cipherValue),
  );
  return new TextDecoder().decode(decrypted);
}

export function safeRedirect(configuredUrl: string, params: Record<string, string>) {
  const url = new URL(configuredUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export function cleanHeader(value: string) {
  return value.replace(/[\r\n]/g, " ").trim();
}

export function base64Url(value: string) {
  return base64(new TextEncoder().encode(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}