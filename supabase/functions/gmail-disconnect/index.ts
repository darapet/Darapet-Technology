import {
  authenticatedUser,
  corsHeaders,
  decryptToken,
  json,
  rest,
  restOne,
} from "../_shared/gmail.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user = await authenticatedUser(req);
  if (!user) return json({ error: "Not authenticated" }, 401);

  const connection = await restOne<{ refresh_token_encrypted: string }>(
    `gmail_connections?user_id=eq.${encodeURIComponent(user.id)}&select=refresh_token_encrypted&limit=1`,
  );
  if (connection) {
    try {
      const refreshToken = await decryptToken(connection.refresh_token_encrypted);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: "POST" });
    } catch {
      // The local connection must still be removed if Google's revoke endpoint is unavailable.
    }
  }

  const response = await rest(`gmail_connections?user_id=eq.${encodeURIComponent(user.id)}`, { method: "DELETE" });
  if (!response.ok) return json({ error: "Could not disconnect Gmail" }, 500);
  return json({ connected: false });
});