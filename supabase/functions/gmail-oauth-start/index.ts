import {
  authenticatedUser,
  corsHeaders,
  gmailConfig,
  json,
  rest,
} from "../_shared/gmail.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await authenticatedUser(req);
    if (!user) return json({ error: "Not authenticated" }, 401);
    const config = gmailConfig();
    const state = crypto.randomUUID();

    const stateResponse = await rest("gmail_oauth_states", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        state,
        user_id: user.id,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
    });
    if (!stateResponse.ok) {
      return json({ error: "Could not start Gmail connection" }, 500);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: "https://www.googleapis.com/auth/gmail.send openid email profile",
      state,
    });
    return json({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not start Gmail connection" }, 500);
  }
});