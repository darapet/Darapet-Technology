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
  source_file_path?: string | null;
  source_file_type?: string | null;
  source_file_size?: number | null;
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

function leadFromLine(line: string, rowNumber: number): Partial<ScoutLead> {
  const email = line.match(EMAIL_RE)?.[0]?.toLowerCase() || '';
  const url = line.match(URL_RE)?.[0] || '';
  const fields = splitLine(line);
  const nonContactFields = fields.filter(field => !EMAIL_RE.test(field) && !URL_RE.test(field));

  return {
    business_name: nonContactFields[0] || `Imported row ${rowNumber}`,
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

export function parseLeadText(text: string, sourceFileName?: string): ScoutLead[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // JSON exports can contain any fields. Keep the complete row in source_notes
  // instead of throwing away fields that the lead UI does not understand yet.
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const nestedRows = !Array.isArray(parsed) && parsed && typeof parsed === 'object'
        ? (parsed.leads || parsed.contacts || parsed.data || parsed.rows)
        : null;
      const rows = Array.isArray(parsed) ? parsed : Array.isArray(nestedRows) ? nestedRows : [parsed];
      if (rows.length) {
        return rows.map((row, index) => {
          const value = row && typeof row === 'object' ? row as Record<string, unknown> : {};
          const email = clean(value.email || value.email_address).toLowerCase();
          return emptyLead({
            business_name: clean(value.business_name || value.company || value.business || value.name) || `Imported row ${index + 1}`,
            app_name: clean(value.app_name || value.app),
            owner_name: clean(value.owner_name || value.owner || value.contact_name),
            email,
            website: normalizeUrl(clean(value.website || value.url || value.website_url)),
            source_url: normalizeUrl(clean(value.source_url || value.source)),
            source_notes: typeof row === 'string' ? row : JSON.stringify(row, null, 2),
          }, sourceFileName);
        });
      }
    } catch {
      // Fall through to line parsing for malformed or mixed JSON/text.
    }
  }

  const lines = trimmed.split(/\r?\n/).map(clean).filter(Boolean);
  const looksLikeHeader = /email|website|company|business|owner|contact|name|phone|address/i.test(lines[0] || '');
  return lines
    .slice(looksLikeHeader ? 1 : 0)
    .map((line, index) => emptyLead(leadFromLine(line, index + 1), sourceFileName));
}

export async function extractLeadsFromFile(file: File) {
  const sourceFileName = file.name;
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // PDF.js does not guess the worker location in a browser build. Without
    // this, importing any PDF fails with "No GlobalWorkerOptions.workerSrc
    // specified" before the file can be read.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url,
    ).toString();
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
    const extractedText = pages.join('\n');
    return extractedText.trim()
      ? parseLeadText(extractedText, sourceFileName)
      : [emptyLead({
        business_name: sourceFileName,
        source_notes: 'This PDF has no selectable text. The original file was stored and can be opened from this record.',
      }, sourceFileName)];
  }

  const isTextLike = file.type.startsWith('text/')
    || ['application/json', 'application/csv', 'application/xml'].includes(file.type)
    || /\.(csv|json|txt|tsv|xml|html?)$/i.test(file.name);
  if (isTextLike) {
    const text = await file.text();
    const parsedRows = parseLeadText(text, sourceFileName);
    return parsedRows.length
      ? parsedRows
      : [emptyLead({
        business_name: sourceFileName,
        source_notes: 'The file was stored, but it did not contain readable rows.',
      }, sourceFileName)];
  }

  return [emptyLead({
    business_name: sourceFileName,
    source_notes: 'This file type is stored as-is. Open the original file from this record to view its contents.',
  }, sourceFileName)];
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