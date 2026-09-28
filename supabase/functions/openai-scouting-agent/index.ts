import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
  if (typeof body?.output_text === 'string') return body.output_text;
  if (typeof body?.choices?.[0]?.message?.content === 'string') return body.choices[0].message.content;
  return (Array.isArray(body?.output) ? body.output : [])
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((part: any) => part?.type === 'output_text' && typeof part?.text === 'string')
    .map((part: any) => part.text)
    .join('\n');
}

function openAiErrorResponse(upstream: Response, result: any) {
  const openAiError = result?.error || {};
  const type = String(openAiError.type || '').toLowerCase();
  const code = String(openAiError.code || '').toLowerCase();
  const message = String(openAiError.message || '').trim();
  let error = message || 'OpenAI request failed.';

  if (upstream.status === 401) {
    error = 'OpenAI rejected this API key. Check that the key is active and belongs to the correct OpenAI project.';
  } else if (upstream.status === 429) {
    const quotaError = code === 'insufficient_quota' || type === 'insufficient_quota' || /quota|billing|credit/i.test(message);
    error = quotaError
      ? 'Your OpenAI API quota is exhausted or billing is inactive. Add API credits or use a key from a funded OpenAI project, then try again.'
      : 'OpenAI is rate-limiting requests right now. Wait a moment and try again.';
  }

  return responseJson({
    error,
    provider: 'openai',
    code: code || undefined,
    type: type || undefined,
    retryAfter: upstream.headers.get('retry-after') || undefined,
  }, upstream.status);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return responseJson({ error: 'Use POST.' }, 405);

  const authorization = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return responseJson({ error: 'Authentication is required.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return responseJson({ error: 'The Supabase environment is not configured for this edge function.' }, 503);

  const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return responseJson({ error: 'Your session is invalid or expired. Please sign in again.' }, 401);

  const { data: profile, error: profileError } = await userClient
    .from('profiles')
    .select('groq_api_key, openai_api_key')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (profileError) return responseJson({ error: 'Could not load your OpenAI connection from your profile.' }, 500);

  const groqApiKey = String(profile?.groq_api_key || '').trim();
  const openAiApiKey = String(profile?.openai_api_key || '').trim();
  const provider = groqApiKey ? 'groq' : 'openai';
  const apiKey = groqApiKey || openAiApiKey;
  if (!apiKey) return responseJson({ error: 'Add a Groq API key in Settings before using scouting.' }, 422);

  let body: any;
  try { body = await request.json(); } catch { return responseJson({ error: 'Request body must be JSON.' }, 400); }
  const lead = body?.lead;
  const recipientEmail = String(body?.recipientEmail || '').trim();
  const senderName = String(body?.senderName || 'Darapet Technology').trim();
  if (!lead || !recipientEmail) return responseJson({ error: 'A lead and recipient email are required.' }, 400);

  const rawData = JSON.stringify(lead.raw_data || {}).slice(0, 18000);
  const website = String(lead.website || '').trim();
  const instruction = provider === 'groq'
    ? 'Use only the lead data and saved research evidence provided below. Do not claim to browse the web and do not invent facts. Then write one concise, respectful outreach email from ' + senderName + ' to ' + recipientEmail + '. Mention one or two supported observations and one practical improvement. Keep the email under 180 words and end with a polite unsubscribe sentence.'
    : 'Research this exact business using the official website and public web information when available. Do not use information from other businesses. If evidence is unavailable, say so instead of inventing it. Then write one concise, respectful outreach email from ' + senderName + ' to ' + recipientEmail + '. Mention one or two real observations and one practical improvement. Keep the email under 180 words and end with a polite unsubscribe sentence.';
  const userPrompt = [
    instruction,
    'Business: ' + String(lead.business_name || ''),
    'Owner/contact: ' + String(lead.owner_name || ''),
    'Website: ' + (website || 'Not provided'),
    'Existing research fields: ' + JSON.stringify(lead.research_data || {}).slice(0, 12000),
    'All fields from the lead source: ' + rawData,
    'Return JSON only with this shape: {"research":{"websiteName":"","description":"","merits":[],"demerits":[],"concentration":"","improvements":[],"contactHints":[]},"subject":"","body":""}.',
  ].join('\n');

  try {
    const upstream = provider === 'groq'
      ? await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a careful lead-research and email-drafting assistant. Use only the evidence provided. Return only valid JSON.' },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 900,
            response_format: { type: 'json_object' },
          }),
        })
      : await fetch('https://api.openai.com/v1/responses', {
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
    if (!upstream.ok) {
      if (provider === 'openai') return openAiErrorResponse(upstream, result);
      return responseJson({ error: result?.error?.message || 'Groq request failed.', provider: 'groq' }, upstream.status);
    }
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
      searched: provider === 'openai' && Boolean(website),
      provider,
      model: provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4.1-mini',
    });
  } catch (error) {
    return responseJson({ error: error instanceof Error ? error.message : 'OpenAI request failed.' }, 502);
  }
});
