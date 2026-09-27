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
  import_id?: string | null;
  raw_data: Record<string, string>;
  source_headers: string[];
  source_file_path?: string | null;
  source_file_type?: string | null;
  source_file_size?: number | null;
  created_at?: string;
  research_data?: ResearchSnapshot | null;
  email_drafts?: ScoutEmailDraft[];
};

export type ResearchSnapshot = {
  leadId: string;
  website: string;
  status: 'scraped' | 'complete' | 'failed';
  success: boolean;
  httpStatus: number | null;
  statusText: string;
  finalUrl?: string;
  title?: string;
  websiteName?: string;
  ownerName?: string;
  description?: string;
  extractedText?: string;
  error?: string;
  merits: string[];
  demerits: string[];
  concentration: string;
  improvements: string[];
  contactHints: string[];
  analyzedAt?: string;
};

export type ScoutEmailDraft = {
  recipientEmail: string;
  subject: string;
  body: string;
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
    const embedded = value.match(/(?:https?:\/\/|www\.)[^\s<>'"]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>'"]*)?/i)?.[0] || '';
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
  business: ['businessname', 'company', 'companyname', 'business', 'organization', 'organizationname', 'firm', 'client', 'publisher', 'startup'],
  app: ['appname', 'app', 'product', 'productname', 'service', 'appnameorproduct'],
  owner: ['ownername', 'owner', 'contactname', 'contact', 'fullname', 'name', 'founder', 'foundername'],
  firstName: ['firstname', 'givenname'],
  lastName: ['lastname', 'surname', 'familyname'],
  email: ['email', 'emailaddress', 'emailaddr', 'mail', 'emailid', 'owneremail', 'contactemail', 'developeremail', 'devemail', 'founderemail'],
  website: ['website', 'websiteurl', 'websiteaddress', 'websitelink', 'companywebsite', 'url', 'domain', 'web', 'site', 'homepage', 'appwebsite', 'appurl', 'productwebsite', 'producturl'],
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

function objectValue(record: Record<string, string>, aliases: readonly string[]) {
  const entry = Object.entries(record).find(([key]) => aliases.includes(headerKey(key)));
  return entry ? clean(entry[1]) : '';
}

function objectToRawData(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [clean(key) || 'Column', clean(value)]));
}

function leadFromObject(row: Record<string, unknown>, rowNumber: number, sourceFileName?: string) {
  const rawData = objectToRawData(row);
  const fields = Object.values(rawData);
  const email = (objectValue(rawData, HEADER_ALIASES.email).match(EMAIL_RE)?.[0] || fields.find(field => EMAIL_RE.test(field))?.match(EMAIL_RE)?.[0] || '').toLowerCase();
  const website = normalizeUrl(objectValue(rawData, HEADER_ALIASES.website)) || extractWebsite(fields);
  const firstName = objectValue(rawData, HEADER_ALIASES.firstName);
  const lastName = objectValue(rawData, HEADER_ALIASES.lastName);
  const owner = objectValue(rawData, HEADER_ALIASES.owner) || [firstName, lastName].filter(Boolean).join(' ');
  const business = objectValue(rawData, HEADER_ALIASES.business) || 'Imported row ' + rowNumber;
  return emptyLead({
    business_name: business,
    app_name: objectValue(rawData, HEADER_ALIASES.app),
    owner_name: owner,
    email,
    website,
    source_url: normalizeUrl(objectValue(rawData, HEADER_ALIASES.source)) || website,
    source_notes: JSON.stringify(rawData, null, 2),
    raw_data: rawData,
    source_headers: Object.keys(rawData),
  }, sourceFileName);
}

function leadFromFields(fields: string[], rowNumber: number, sourceFileName?: string) {
  return leadFromObject(Object.fromEntries(fields.map((field, index) => ['Column ' + (index + 1), field])), rowNumber, sourceFileName);
}

function leadFromHeaderRow(fields: string[], headers: string[], rowNumber: number, sourceFileName?: string) {
  return leadFromObject(Object.fromEntries(headers.map((header, index) => [header || 'Column ' + (index + 1), fields[index] || ''])), rowNumber, sourceFileName);
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
    raw_data: partial.raw_data || {},
    source_headers: partial.source_headers || Object.keys(partial.raw_data || {}),
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

export function extractLeadEmails(lead: Pick<ScoutLead, 'email' | 'raw_data'>): string[] {
  const matches = [lead.email || '', ...Object.values(lead.raw_data || {})].flatMap(value => String(value || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []);
  return Array.from(new Set(matches.map(email => email.toLowerCase())));
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
        return rows.map((row, index) => row && typeof row === 'object'
          ? leadFromObject(row as Record<string, unknown>, index + 1, sourceFileName)
          : leadFromFields([String(row ?? '')], index + 1, sourceFileName));
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
    type PdfTextItem = { str: string; x: number; y: number };
    const pages: string[] = [];
    const tableRows: string[] = [];
    let columnStarts: number[] = [];
    let headerStored = false;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      content.items.forEach(item => {
        if (!('str' in item) || !item.str.trim()) return;
        const transform = (item as { transform?: number[] }).transform;
        if (!Array.isArray(transform)) return;
        items.push({ str: item.str.trim(), x: Number(transform[4] || 0), y: Number(transform[5] || 0) });
      });
      pages.push(items.map(item => item.str).join(' '));

      const rows: Array<{ y: number; items: PdfTextItem[] }> = [];
      for (const item of items) {
        const row = rows.find(candidate => Math.abs(candidate.y - item.y) < 4);
        if (row) row.items.push(item);
        else rows.push({ y: item.y, items: [item] });
      }
      rows.sort((left, right) => right.y - left.y);

      const headerRow = rows.find(row => {
        const values = row.items.map(item => headerKey(item.str));
        return values.includes('business') && values.includes('website');
      });
      if (headerRow && !columnStarts.length) {
        columnStarts = [...headerRow.items].sort((left, right) => left.x - right.x).map(item => item.x);
      }
      if (columnStarts.length < 2) continue;

      const cellsForRow = (row: { items: PdfTextItem[] }) => {
        const sortedItems = [...row.items].sort((left, right) => left.x - right.x);
        return columnStarts.map((start, columnIndex) => {
          const end = columnStarts[columnIndex + 1] ?? Number.POSITIVE_INFINITY;
          return sortedItems
            .filter(item => item.x >= start - 3 && item.x < end - 3)
            .map(item => item.str)
            .join(' ')
            .trim();
        });
      };

      for (const row of rows) {
        if (headerRow && row === headerRow) {
          if (!headerStored) {
            tableRows.push(cellsForRow(row).join('\t'));
            headerStored = true;
          }
          continue;
        }
        const cells = cellsForRow(row);
        if (/^\d+$/.test(cells[0] || '') && cells.slice(1).some(Boolean)) tableRows.push(cells.join('\t'));
      }
    }
    const extractedText = pages.join('\n');
    const parsedRows = tableRows.length ? parseLeadText(tableRows.join('\n'), sourceFileName) : extractedText.trim() ? parseLeadText(extractedText, sourceFileName) : [];
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