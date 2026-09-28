import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function responseJson(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function parseJson(value: string): any | null {
  try { return JSON.parse(value.trim()); } catch {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try { return JSON.parse(value.slice(start, end + 1)); } catch { return null; }
  }
}

function outputText(body: any) {
  return typeof body?.choices?.[0]?.message?.content === 'string' ? body.choices[0].message.content : '';
}

async function readJson(response: Response) {
  try { return await response.json(); } catch { return {}; }
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

  const { data: profile } = await userClient.from('profiles').select('groq_api_key').eq('id', authData.user.id).maybeSingle();
  const { data: storedKeys } = await userClient.from('groq_api_keys').select('id,api_key').eq('user_id', authData.user.id).eq('enabled', true).order('priority', { ascending: true }).order('last_used_at', { ascending: true, nullsFirst: true });
  const keys: Array<{ id: string | null; apiKey: string }> = [];
  const seen = new Set<string>();
  for (const row of storedKeys || []) {
    const apiKey = String(row?.api_key || '').trim();
    if (apiKey && !seen.has(apiKey)) { seen.add(apiKey); keys.push({ id: row.id || null, apiKey }); }
  }
  const legacyKey = String(profile?.groq_api_key || '').trim();
  if (legacyKey && !seen.has(legacyKey)) keys.push({ id: null, apiKey: legacyKey });
  if (!keys.length) return responseJson({ error: 'Add a Groq API key in Settings before using scouting.' }, 422);

  let body: any;
  try { body = await request.json(); } catch { return responseJson({ error: 'Request body must be JSON.' }, 400); }
  const lead = body?.lead;
  const evidence = String(body?.evidence || '').slice(0, 12000);
  const website = String(body?.website || '').trim();
  const scraped = body?.scraped || {};
  const prompt = String(body?.prompt || '').slice(0, 4000);
  if (!lead || !evidence) return responseJson({ error: 'Saved website evidence and a selected lead are required.' }, 400);

  const userPrompt = [
    'Analyze only the fetched website evidence below. Never claim to browse and never invent facts.',
    'Website: ' + website,
    'Known business: ' + String(lead.business_name || ''),
    'Known owner: ' + String(lead.owner_name || ''),
    'Title: ' + String(scraped.title || ''),
    'Description: ' + String(scraped.description || ''),
    'Contact hints: ' + (Array.isArray(scraped.contactHints) ? scraped.contactHints.join('; ') : ''),
    'Fetched text: ' + evidence,
    'Instruction: ' + prompt,
    'Return JSON exactly as {"website_name":"","owner_name":"","merits":[],"demerits":[],"concentration":"","improvements":[],"contact_hints":[]}.',
  ].join('\n');

  let lastStatus = 429;
  let lastMessage = 'All enabled Groq API keys are rate-limited or unavailable. Wait briefly or add another key in Settings.';
  let retryAfter = '';
  for (const key of keys) {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a careful website evidence analyst. Return only valid JSON.' },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: 'json_object' },
      }),
    });
    const result = await readJson(upstream);
    if (upstream.ok) {
      if (key.id) await userClient.from('groq_api_keys').update({ last_used_at: new Date().toISOString(), last_error: null, last_error_at: null }).eq('id', key.id).eq('user_id', authData.user.id);
      const parsed = parseJson(outputText(result));
      if (!parsed) return responseJson({ error: 'Groq returned an unreadable research response.' }, 502);
      return responseJson({
        research: {
          website_name: String(parsed.website_name || ''),
          owner_name: String(parsed.owner_name || ''),
          merits: Array.isArray(parsed.merits) ? parsed.merits.map(String).slice(0, 6) : [],
          demerits: Array.isArray(parsed.demerits) ? parsed.demerits.map(String).slice(0, 6) : [],
          concentration: String(parsed.concentration || ''),
          improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String).slice(0, 6) : [],
          contact_hints: Array.isArray(parsed.contact_hints) ? parsed.contact_hints.map(String).slice(0, 8) : [],
        },
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
      });
    }
    lastStatus = upstream.status;
    lastMessage = String(result?.error?.message || lastMessage);
    retryAfter = upstream.headers.get('retry-after') || retryAfter;
    if (key.id) await userClient.from('groq_api_keys').update({ last_error: lastMessage.slice(0, 500), last_error_at: new Date().toISOString() }).eq('id', key.id).eq('user_id', authData.user.id);
    if (![401, 403, 429].includes(upstream.status)) break;
  }

  const message = lastStatus === 429 ? 'All enabled Groq API keys are rate-limited right now. Wait briefly or add another key in Settings.' : lastMessage;
  return responseJson({ error: message, provider: 'groq', retryAfter: retryAfter || undefined }, lastStatus >= 400 ? lastStatus : 502);
});
