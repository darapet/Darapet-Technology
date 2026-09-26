import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function requireAdmin(req: Request) {
  const authorization = req.headers.get("Authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Missing authorization");

  const admin = serviceClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) throw new Error("Unauthorized");

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.is_admin) throw new Error("Admin access required");

  return { admin, user };
}

export async function getSecret(admin: ReturnType<typeof serviceClient>, key: string) {
  const { data, error } = await admin
    .from("platform_secrets")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
}

export async function hashOtp(code: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code),
  );
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}