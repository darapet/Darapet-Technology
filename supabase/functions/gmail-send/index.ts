import {
  authenticatedUser,
  base64,
  base64Url,
  cleanHeader,
  corsHeaders,
  decryptToken,
  gmailConfig,
  json,
  rest,
  restOne,
} from "../_shared/gmail.ts";

type SendRequest = { to: string; subject: string; html: string; fromName?: string };
type GmailConnection = { google_email: string; refresh_token_encrypted: string };

function plainTextFromHtml(html: string) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function subjectHeader(subject: string) {
  const value = cleanHeader(subject);
  return /^[\x00-\x7F]*$/.test(value)
    ? value
    : `=?UTF-8?B?${base64(new TextEncoder().encode(value))}?=`;
}

async function refreshAccessToken(refreshToken: string) {
  const config = gmailConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Gmail authorization expired. Reconnect Gmail.");
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await authenticatedUser(req);
    if (!user) return json({ error: "Not authenticated" }, 401);
    const body = await req.json() as Partial<SendRequest>;
    const missing = ["to", "subject", "html"].filter(key => !body[key as keyof SendRequest]);
    if (missing.length) return json({ error: `Missing required field(s): ${missing.join(", ")}` }, 400);

    const connection = await restOne<GmailConnection>(
      `gmail_connections?user_id=eq.${encodeURIComponent(user.id)}&select=google_email,refresh_token_encrypted&limit=1`,
    );
    if (!connection) return json({ error: "Connect a Gmail account first." }, 400);

    const refreshToken = await decryptToken(connection.refresh_token_encrypted);
    const accessToken = await refreshAccessToken(refreshToken);
    const from = body.fromName
      ? `${cleanHeader(body.fromName)} <${cleanHeader(connection.google_email)}>`
      : connection.google_email;
    const unsubscribe = `<mailto:${connection.google_email}?subject=unsubscribe>`;
    const boundary = `darapet_${crypto.randomUUID().replace(/-/g, "")}`;
    const mime = [
      `From: ${from}`,
      `To: ${cleanHeader(body.to!)}`,
      `Subject: ${subjectHeader(body.subject!)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@gmail.com>`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "Precedence: bulk",
      `List-Unsubscribe: ${unsubscribe}`,
      "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      plainTextFromHtml(body.html!),
      "",
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      body.html!,
      "",
      `--${boundary}--`,
    ].join("\r\n");

    const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: base64Url(mime) }),
    });
    const result = await sendResponse.json();
    if (!sendResponse.ok) {
      const message = result?.error?.message || "Gmail could not send this message.";
      return json({ error: message }, sendResponse.status === 401 ? 401 : 502);
    }
    return json({ success: true, provider: "gmail", messageId: result.id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Gmail send failed" }, 500);
  }
});