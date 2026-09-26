import {
  corsHeaders,
  getSecret,
  json,
  requireAdmin,
} from "../_shared/admin.ts";

const BRAZE_KEYS = [
  "braze_api_key",
  "braze_app_id",
  "braze_rest_endpoint",
  "braze_from_email",
  "braze_from_name",
] as const;

function validHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".braze.com");
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { admin, user } = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));

    if (body.action === "get") {
      const [apiKey, appId, endpoint, fromEmail, fromName] = await Promise.all(
        BRAZE_KEYS.map((key) => getSecret(admin, key)),
      );
      return json({
        brazeConfigured: Boolean(apiKey && appId && endpoint && fromEmail),
        brazeAppId: appId,
        brazeRestEndpoint: endpoint || "https://rest.iad-01.braze.com",
        brazeFromEmail: fromEmail,
        brazeFromName: fromName || "Darapet Technology",
      });
    }

    if (body.action !== "save") return json({ error: "Unsupported action" }, 400);

    const submittedApiKey = String(body.brazeApiKey || "").trim();
    const values: Record<string, string> = {
      braze_api_key: submittedApiKey || (await getSecret(admin, "braze_api_key") || ""),
      braze_app_id: String(body.brazeAppId || "").trim(),
      braze_rest_endpoint: String(body.brazeRestEndpoint || "").trim(),
      braze_from_email: String(body.brazeFromEmail || "").trim(),
      braze_from_name: String(body.brazeFromName || "").trim(),
    };

    if (!values.braze_api_key || !values.braze_app_id || !values.braze_from_email) {
      return json({ error: "Braze API key, app ID, and sender email are required." }, 400);
    }
    if (!validHttpsUrl(values.braze_rest_endpoint)) {
      return json({ error: "Use a valid HTTPS Braze REST endpoint." }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.braze_from_email)) {
      return json({ error: "Enter a valid sender email." }, 400);
    }

    for (const [key, value] of Object.entries(values)) {
      const { error } = await admin.from("platform_secrets").upsert({
        key,
        value,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
    }

    return json({ saved: true, brazeConfigured: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json({ error: message }, message === "Unauthorized" || message === "Admin access required" ? 403 : 500);
  }
});