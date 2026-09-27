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

function htmlValue(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return (match?.[1] || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function extractText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return responseJson({ error: 'Use POST.' }, 405);
  if (!request.headers.get('authorization')) return responseJson({ error: 'Authentication is required.' }, 401);

  let url = '';
  try {
    const body = await request.json();
    url = String(body?.url || '').trim();
  } catch {
    return responseJson({ error: 'Request body must be JSON.' }, 400);
  }
  if (!/^https?:\/\//i.test(url)) return responseJson({ error: 'Only http and https websites can be researched.' }, 400);

  try {
    const upstream = await fetch(url, {
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        'User-Agent': 'Darapet-Research/1.0 (+website research)',
      },
    });
    const contentType = upstream.headers.get('content-type') || '';
    const bodyText = await upstream.text();
    const isHtml = contentType.includes('html') || /<html|<body|<title/i.test(bodyText);
    const title = isHtml ? htmlValue(bodyText, /<title[^>]*>([\s\S]*?)<\/title>/i) : '';
    const description = isHtml ? htmlValue(bodyText, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i) || htmlValue(bodyText, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i) : '';
    return responseJson({
      success: upstream.ok,
      status: upstream.status,
      statusText: upstream.statusText,
      finalUrl: upstream.url,
      contentType,
      title,
      description,
      extractedText: isHtml ? extractText(bodyText) : bodyText.slice(0, 12000),
      error: upstream.ok ? null : 'Website returned HTTP ' + upstream.status + ' ' + upstream.statusText,
    });
  } catch (error) {
    return responseJson({ success: false, status: null, statusText: '', extractedText: '', error: error instanceof Error ? error.message : 'The website request failed.' });
  }
});
