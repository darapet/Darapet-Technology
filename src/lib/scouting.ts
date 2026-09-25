export type ScoutLead = {
  id: string;
  user_id?: string;
  business_name: string;
  app_name: string;
  owner_name: string;
  email: string;
  website: string;
  source_url: string;
  source_notes: string;
  research_status: 'pending' | 'researching' | 'researched' | 'needs_manual';
  research_summary: string;
  pain_points: string[];
  personalization_status: 'draft' | 'generated';
  email_subject: string;
  email_body: string;
  opted_out: boolean;
  send_status: 'not_sent' | 'sending' | 'sent' | 'failed';
  sent_at?: string | null;
  source_file_name?: string | null;
  created_at?: string;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeUrl(value: string) {
  const url = clean(value).replace(/[.,;:]+$/, '');
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function splitLine(line: string) {
  return line
    .split(/\t|,|;|\|/)
    .map(clean)
    .filter(Boolean);
}

function leadFromLine(line: string): Partial<ScoutLead> | null {
  const email = line.match(EMAIL_RE)?.[0]?.toLowerCase() || '';
  if (!email) return null;

  const url = line.match(URL_RE)?.[0] || '';
  const fields = splitLine(line);
  const nonContactFields = fields.filter(field => !EMAIL_RE.test(field) && !URL_RE.test(field));

  return {
    business_name: nonContactFields[0] || '',
    app_name: nonContactFields[1] || '',
    owner_name: nonContactFields[2] || '',
    email,
    website: normalizeUrl(url),
    source_url: normalizeUrl(url),
    source_notes: line,
  };
}

function emptyLead(partial: Partial<ScoutLead>, sourceFileName?: string): ScoutLead {
  return {
    id: crypto.randomUUID(),
    business_name: partial.business_name || partial.app_name || partial.email || 'Unnamed lead',
    app_name: partial.app_name || '',
    owner_name: partial.owner_name || '',
    email: partial.email || '',
    website: partial.website || '',
    source_url: partial.source_url || partial.website || '',
    source_notes: partial.source_notes || '',
    research_status: 'pending',
    research_summary: '',
    pain_points: [],
    personalization_status: 'draft',
    email_subject: '',
    email_body: '',
    opted_out: false,
    send_status: 'not_sent',
    sent_at: null,
    source_file_name: sourceFileName || null,
  };
}

function dedupeLeads(leads: ScoutLead[]) {
  const seen = new Set<string>();
  return leads.filter(lead => {
    const key = lead.email || `${lead.business_name}:${lead.website}`.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseLeadText(text: string, sourceFileName?: string): ScoutLead[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // ChatGPT exports are often JSON even when saved with a .txt extension.
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const rows = Array.isArray(parsed) ? parsed : (parsed.leads || parsed.contacts || parsed.data || []);
      if (Array.isArray(rows)) {
        const jsonLeads = rows.map(row => {
          const value = row as Record<string, unknown>;
          const email = clean(value.email || value.email_address).toLowerCase();
          return emptyLead({
            business_name: clean(value.business_name || value.company || value.business || value.name),
            app_name: clean(value.app_name || value.app),
            owner_name: clean(value.owner_name || value.owner || value.contact_name),
            email,
            website: normalizeUrl(clean(value.website || value.url || value.website_url)),
            source_url: normalizeUrl(clean(value.source_url || value.source)),
            source_notes: clean(value.notes || value.description),
          }, sourceFileName);
        }).filter(lead => lead.email);
        if (jsonLeads.length) return dedupeLeads(jsonLeads);
      }
    } catch {
      // Fall through to line parsing for malformed or mixed JSON/text.
    }
  }

  const lines = trimmed.split(/\r?\n/).map(clean).filter(Boolean);
  const looksLikeHeader = /email|website|company|business|owner|contact/i.test(lines[0] || '');
  const leads = lines
    .slice(looksLikeHeader ? 1 : 0)
    .map(line => leadFromLine(line))
    .filter((lead): lead is Partial<ScoutLead> => Boolean(lead?.email))
    .map(lead => emptyLead(lead, sourceFileName));

  return dedupeLeads(leads);
}

export async function extractLeadsFromFile(file: File) {
  const sourceFileName = file.name;
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map(item => ('str' in item ? item.str : '')).join(' '));
    }
    return parseLeadText(pages.join('\n'), sourceFileName);
  }

  return parseLeadText(await file.text(), sourceFileName);
}

export function toHtmlEmail(body: string) {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped
    .split(/\n{2,}/)
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export function parseAiJson<T>(value: string): T | null {
  try {
    const unfenced = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(unfenced) as T;
  } catch {
    return null;
  }
}