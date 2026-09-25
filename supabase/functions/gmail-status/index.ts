import {
  authenticatedUser,
  corsHeaders,
  json,
  restOne,
} from "../_shared/gmail.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user = await authenticatedUser(req);
  if (!user) return json({ error: "Not authenticated" }, 401);
  const connection = await restOne<{
    google_email: string;
    connected_at: string;
  }>(`gmail_connections?user_id=eq.${encodeURIComponent(user.id)}&select=google_email,connected_at&limit=1`);

  return json({
    connected: Boolean(connection),
    email: connection?.google_email || null,
    connectedAt: connection?.connected_at || null,
  });
});