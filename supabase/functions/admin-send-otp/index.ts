import {
  corsHeaders,
  getSecret,
  hashOtp,
  json,
  requireAdmin,
} from "../_shared/admin.ts";

function randomOtp() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character] || character));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { admin, user: adminUser } = await requireAdmin(req);
    const { appUserId } = await req.json();
    if (!appUserId) return json({ error: "A user is required." }, 400);

    const { data: recipient, error: recipientError } = await admin
      .from("app_users")
      .select("id, auth_user_id, email, first_name")
      .eq("id", appUserId)
      .maybeSingle();
    if (recipientError) throw new Error(recipientError.message);
    if (!recipient?.email) return json({ error: "This account has no email address." }, 400);

    const { data: otpSettings, error: otpSettingsError } = await admin
      .from("app_settings")
      .select("otp_enabled, otp_provider")
      .eq("id", 1)
      .maybeSingle();
    if (otpSettingsError) throw new Error(otpSettingsError.message);
    if (!otpSettings?.otp_enabled) {
      return json({ error: "OTP sending is disabled. Enable it in Admin Settings first." }, 409);
    }

    const code = randomOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const html = `<html><body><p>Hello ${escapeHtml(recipient.first_name || "there")},</p><p>Your Darapet verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes.</p></body></html>`;
    const provider = otpSettings.otp_provider === "braze" ? "braze" : "brevo";
    let response: Response;

    if (provider === "brevo") {
      const [apiKey, fromEmail, fromName] = await Promise.all([
        getSecret(admin, "brevo_api_key"),
        getSecret(admin, "brevo_from_email"),
        getSecret(admin, "brevo_from_name"),
      ]);
      if (!apiKey || !fromEmail) {
        return json({ error: "Brevo is not configured. Add it in Admin Settings first." }, 400);
      }
      response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: fromName || "Darapet Technology", email: fromEmail },
          to: [{ email: recipient.email, name: recipient.first_name || undefined }],
          subject: "Your Darapet verification code",
          htmlContent: html,
        }),
      });
    } else {
      const [apiKey, appId, endpoint, fromEmail, fromName] = await Promise.all([
        getSecret(admin, "braze_api_key"),
        getSecret(admin, "braze_app_id"),
        getSecret(admin, "braze_rest_endpoint"),
        getSecret(admin, "braze_from_email"),
        getSecret(admin, "braze_from_name"),
      ]);
      if (!apiKey || !appId || !endpoint || !fromEmail) {
        return json({ error: "Braze is not configured. Add it in Admin Settings first." }, 400);
      }
      response = await fetch(`${endpoint.replace(/\/$/, "")}/messages/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: {
            email: {
              app_id: appId,
              subject: "Your Darapet verification code",
              from: `${fromName || "Darapet Technology"} <${fromEmail}>`,
              recipients: [{ email: recipient.email }],
              body: html,
            },
          },
        }),
      });
    }

    if (!response.ok) {
      const detail = await response.text();
      return json({ error: `${provider === "brevo" ? "Brevo" : "Braze"} rejected the message: ${detail.slice(0, 300)}` }, 502);
    }

    const { error: challengeError } = await admin.from("admin_otp_challenges").insert({
      app_user_id: recipient.id,
      auth_user_id: recipient.auth_user_id,
      recipient_email: recipient.email,
      code_hash: await hashOtp(code),
      expires_at: expiresAt,
      created_by: adminUser.id,
    });
    if (challengeError) throw new Error(challengeError.message);

    return json({
      sent: true,
      provider,
      recipient: recipient.email.replace(/^(.{2}).*(@.*)$/, "$1••••$2"),
      expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, message === "Unauthorized" || message === "Admin access required" ? 403 : 500);
  }
});