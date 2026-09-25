import {
  encryptToken,
  gmailConfig,
  redirect,
  rest,
  restOne,
  safeRedirect,
} from "../_shared/gmail.ts";

type OAuthState = { state: string; user_id: string; expires_at: string };
type ExistingConnection = { refresh_token_encrypted: string } | null;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const config = gmailConfig();
    const error = url.searchParams.get("error");
    const state = url.searchParams.get("state") || "";
    if (error) return redirect(safeRedirect(config.frontendUrl, { gmail: "error", reason: "access_denied" }));
    const code = url.searchParams.get("code") || "";
    if (!state || !code) return redirect(safeRedirect(config.frontendUrl, { gmail: "error", reason: "missing_code" }));

    const oauthState = await restOne<OAuthState>(
      `gmail_oauth_states?state=eq.${encodeURIComponent(state)}&select=state,user_id,expires_at&limit=1`,
    );
    if (!oauthState || new Date(oauthState.expires_at).getTime() < Date.now()) {
      return redirect(safeRedirect(config.frontendUrl, { gmail: "error", reason: "expired_state" }));
    }
    await rest(`gmail_oauth_states?state=eq.${encodeURIComponent(state)}`, { method: "DELETE" });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      return redirect(safeRedirect(config.frontendUrl, { gmail: "error", reason: "token_exchange_failed" }));
    }

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleProfile = await profileResponse.json();
    if (!profileResponse.ok || !googleProfile.email) {
      return redirect(safeRedirect(config.frontendUrl, { gmail: "error", reason: "profile_lookup_failed" }));
    }

    const existing = await restOne<ExistingConnection>(
      `gmail_connections?user_id=eq.${encodeURIComponent(oauthState.user_id)}&select=refresh_token_encrypted&limit=1`,
    );
    const refreshToken = tokenData.refresh_token
      ? await encryptToken(tokenData.refresh_token)
      : existing?.refresh_token_encrypted;
    if (!refreshToken) {
      return redirect(safeRedirect(config.frontendUrl, { gmail: "error", reason: "missing_refresh_token" }));
    }

    const saveResponse = await rest("gmail_connections", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
        "Content-Profile": "public",
      },
      body: JSON.stringify({
        user_id: oauthState.user_id,
        google_email: googleProfile.email,
        refresh_token_encrypted: refreshToken,
        scopes: tokenData.scope || "https://www.googleapis.com/auth/gmail.send",
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    if (!saveResponse.ok) {
      return redirect(safeRedirect(config.frontendUrl, { gmail: "error", reason: "connection_save_failed" }));
    }

    return redirect(safeRedirect(config.frontendUrl, { gmail: "connected" }));
  } catch {
    try {
      const config = gmailConfig();
      return redirect(safeRedirect(config.frontendUrl, { gmail: "error", reason: "callback_failed" }));
    } catch {
      return new Response("Gmail connection failed", { status: 500 });
    }
  }
});