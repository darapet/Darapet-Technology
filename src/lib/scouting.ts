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
const DOMAIN_RE = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}(?::\d+)?(?:\/[^\s]*)?$/i;

function clean(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeUrl(value: string) {
  const url = clean(value).replace(/^['"]+|['"]+$/g, '').replace(/[.,;:]+$/, '');
  if (!url || EMAIL_RE.test(url)) return '';
  if (!/^https?:\/\//i.test(url) && !/^www\./i.test(url) && !DOMAIN_RE.test(url)) return '';
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

function extractWebsite(fields: string[]) {
  for (const field of fields) {
    const value = clean(field);
    if (!value || EMAIL_RE.test(value)) continue;
    const direct = normalizeUrl(value);
    if (direct) return direct;
    const embedded = value.match(/(?:https?:\/\/|www\.)[^\s<>'"]+/i)?.[0] || '';
    const normalized = normalizeUrl(embedded);
    if (normalized) return normalized;
  }
  return '';
}

function parseDelimitedLine(line: string, delimiter: string) {
  const fields: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      fields.push(clean(value));
      value = '';
    } else {
      value += character;
    }
  }
  fields.push(clean(value));
  return fields;
}

function countDelimiter(line: string, delimiter: string) {
  let count = 0;
  let quoted = false;
  for (const character of line) {
    if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) count += 1;
  }
  return count;
}

function detectDelimiter(line: string) {
  return ['\\t', ',', ';', '|'].sort((left, right) => countDelimiter(line, right) - countDelimiter(line, left))[0] || ',';
}

function headerKey(value: string) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const HEADER_ALIASES = {
  business: ['businessname', 'company', 'companyname', 'business', 'organization', 'organizationname', 'firm', 'client'],
  app: ['appname', 'app', 'product', 'productname', 'service'],
  owner: ['ownername', 'owner', 'contactname', 'contact', 'fullname', 'name'],
  firstName: ['firstname', 'givenname'],
  lastName: ['lastname', 'surname', 'familyname'],
  email: ['email', 'emailaddress', 'emailaddr', 'mail', 'emailid'],
  website: ['website', 'websiteurl', 'url', 'domain', 'web', 'site', 'homepage'],
  source: ['sourceurl', 'source', 'sourcewebsite'],
} as const;

function headerIndex(headers: string[], aliases: readonly string[]) {
  const normalized = headers.map(headerKey);
  return normalized.findIndex(header => aliases.includes(header));
}

function valueAt(fields: string[], headers: string[], aliases: readonly string[]) {
  const index = headerIndex(headers, aliases);
  return index >= 0 ? clean(fields[index]) : '';
}

function hasKnownHeader(headers: string[]) {
  return Object.values(HEADER_ALIASES).some(aliases => headerIndex(headers, aliases) >= 0);
}

function leadFromFields(fields: string[], rowNumber: number, sourceFileName?: string) {
  const email = fields.find(field => EMAIL_RE.test(field))?.match(EMAIL_RE)?.[0]?.toLowerCase() || '';
  const website = extractWebsite(fields);
  const nonContactFields = fields.filter(field => !EMAIL_RE.test(field) && !normalizeUrl(field));
  return emptyLead({
    business_name: nonContactFields[0] || 'Imported row ' + rowNumber,
    app_name: nonContactFields[1] || '',
    owner_name: nonContactFields[2] || '',
    email,
    website,
    source_url: website,
    source_notes: fields.join(' | '),
  }, sourceFileName);
}

function leadFromHeaderRow(fields: string[], headers: string[], rowNumber: number, sourceFileName?: string) {
  const record = Object.fromEntries(headers.map((header, index) => [header || 'Column ' + (index + 1), fields[index] || '']));
  const email = valueAt(fields, headers, HEADER_ALIASES.email).match(EMAIL_RE)?.[0]?.toLowerCase() || fields.find(field => EMAIL_RE.test(field))?.match(EMAIL_RE)?.[0]?.toLowerCase() || '';
  const website = normalizeUrl(valueAt(fields, headers, HEADER_ALIASES.website)) || extractWebsite(fields);
  const firstName = valueAt(fields, headers, HEADER_ALIASES.firstName);
  const lastName = valueAt(fields, headers, HEADER_ALIASES.lastName);
  const owner = valueAt(fields, headers, HEADER_ALIASES.owner) || [firstName, lastName].filter(Boolean).join(' ');
  const business = valueAt(fields, headers, HEADER_ALIASES.business) || 'Imported row ' + rowNumber;
  return emptyLead({
    business_name: business,
    app_name: valueAt(fields, headers, HEADER_ALIASES.app),
    owner_name: owner,
    email,
    website,
    source_url: normalizeUrl(valueAt(fields, headers, HEADER_ALIASES.source)) || website,
    source_notes: JSON.stringify(record, null, 2),
  }, sourceFileName);
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

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const nestedRows = !Array.isArray(parsed) && parsed && typeof parsed === 'object' ? (parsed.leads || parsed.contacts || parsed.data || parsed.rows) : null;
      const rows = Array.isArray(parsed) ? parsed : Array.isArray(nestedRows) ? nestedRows : [parsed];
      if (rows.length) {
        return rows.map((row, index) => {
          const value = row && typeof row === 'object' ? row as Record<string, unknown> : {};
          const email = clean(value.email || value.email_address).toLowerCase();
          const website = normalizeUrl(clean(value.website || value.url || value.website_url || value.domain));
          return emptyLead({
            business_name: clean(value.business_name || value.company || value.business || value.name) || 'Imported row ' + (index + 1),
            app_name: clean(value.app_name || value.app || value.product),
            owner_name: clean(value.owner_name || value.owner || value.contact_name || value.name),
            email,
            website,
            source_url: normalizeUrl(clean(value.source_url || value.source)) || website,
            source_notes: typeof row === 'string' ? row : JSON.stringify(row, null, 2),
          }, sourceFileName);
        });
      }
    } catch {
      // Fall through to delimited text parsing for malformed or mixed JSON.
    }
  }

  const lines = trimmed.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map(line => parseDelimitedLine(line, delimiter));
  const headers = rows[0];
  if (hasKnownHeader(headers)) {
    return rows.slice(1).filter(row => row.some(Boolean)).map((row, index) => leadFromHeaderRow(row, headers, index + 1, sourceFileName));
  }
  return rows.map((row, index) => leadFromFields(row, index + 1, sourceFileName));
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
    const parsedRows = extractedText.trim() ? parseLeadText(extractedText, sourceFileName) : [];
    return parsedRows.length
      ? parsedRows
      : [emptyLead({
        business_name: sourceFileName,
        source_notes: extractedText.trim()
          ? 'The original file was stored, but no lead rows could be extracted from its text.'
          : 'This PDF has no selectable text. The original file was stored and can be opened from this record.',
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