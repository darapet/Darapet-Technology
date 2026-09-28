import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function responseJson(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseJson(value: string): any | null {
  try {
    return JSON.parse(value.trim());
  } catch {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(value.slice(start, end + 1)); } catch { return null; }
  }
}

function outputText(body: any) {
  if (typeof body.output_text === 'string') return body.output_text;
  return (body.output || [])
    .flatMap((item: any) => item.content || [])
    .filter((part: any) => part.type === 'output_text' && typeof part.text === 'string')
    .map((part: any) => part.text)
    .join('\\n');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return responseJson({ error: 'Use POST.' }, 405);
  if (!request.headers.get('authorization')) return responseJson({ error: 'Authentication is required.' }, 401);

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return responseJson({ error: 'OPENAI_API_KEY is not configured for the OpenAI scouting agent.' }, 503);

  let body: any;
  try { body = await request.json(); } catch { return responseJson({ error: 'Request body must be JSON.' }, 400); }
  const lead = body?.lead;
  const recipientEmail = String(body?.recipientEmail || '').trim();
  const senderName = String(body?.senderName || 'Darapet Technology').trim();
  if (!lead || !recipientEmail) return responseJson({ error: 'A lead and recipient email are required.' }, 400);

  const rawData = JSON.stringify(lead.raw_data || {}).slice(0, 18000);
  const website = String(lead.website || '').trim();
  const instruction = 'Research this exact business using the official website and public web information when available. Do not use information from other businesses. If evidence is unavailable, say so instead of inventing it. Then write one concise, respectful outreach email from ' + senderName + ' to ' + recipientEmail + '. Mention one or two real observations and one practical improvement. Keep the email under 180 words and end with a polite unsubscribe sentence.';
  const userPrompt = [
    instruction,
    'Business: ' + String(lead.business_name || ''),
    'Owner/contact: ' + String(lead.owner_name || ''),
    'Website: ' + (website || 'Not provided'),
    'Existing research fields: ' + JSON.stringify(lead.research_data || {}),
    'All fields from the lead source: ' + rawData,
    'Return JSON only with this shape: {"research":{"websiteName":"","description":"","merits":[],"demerits":[],"concentration":"","improvements":[],"contactHints":[]},"subject":"","body":""}.',
  ].join('\\n');

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        tools: [{ type: 'web_search_preview' }],
        input: [
          { role: 'system', content: [{ type: 'input_text', text: 'You are a careful lead-research and email-drafting assistant. Keep each request isolated to the one lead provided. Return only valid JSON.' }] },
          { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
        ],
      }),
    });
    const result = await upstream.json();
    if (!upstream.ok) return responseJson({ error: result?.error?.message || 'OpenAI request failed.' }, upstream.status);
    const parsed = parseJson(outputText(result));
    if (!parsed?.subject || !parsed?.body) return responseJson({ error: 'OpenAI returned no usable email draft.' }, 502);
    const research = parsed.research && typeof parsed.research === 'object' ? parsed.research : {};
    return responseJson({
      subject: String(parsed.subject),
      body: String(parsed.body),
      research: {
        websiteName: String(research.websiteName || lead.business_name || ''),
        description: String(research.description || ''),
        merits: Array.isArray(research.merits) ? research.merits.map(String).slice(0, 8) : [],
        demerits: Array.isArray(research.demerits) ? research.demerits.map(String).slice(0, 8) : [],
        concentration: String(research.concentration || ''),
        improvements: Array.isArray(research.improvements) ? research.improvements.map(String).slice(0, 8) : [],
        contactHints: Array.isArray(research.contactHints) ? research.contactHints.map(String).slice(0, 8) : [],
      },
      searched: Boolean(website),
      model: 'gpt-4.1-mini',
    });
  } catch (error) {
    return responseJson({ error: error instanceof Error ? error.message : 'OpenAI request failed.' }, 502);
  }
});
