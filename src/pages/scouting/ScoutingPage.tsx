import { type ChangeEvent, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { sendEmail, hasUsableEmailProvider } from '@/lib/emailSend';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  AlertCircle, CheckCircle2, FileText, Globe2, Loader2, Mail,
  Search, Send, ShieldCheck, Upload, X, XCircle,
} from 'lucide-react';

type ResearchStatus = 'idle' | 'researching' | 'complete' | 'failed';
type DraftStatus = 'idle' | 'generating' | 'ready' | 'failed';

interface ScoutLead {
  id: string;
  name: string;
  company: string;
  email: string;
  website: string;
  notes: string;
  research: string;
  researchStatus: ResearchStatus;
  draftStatus: DraftStatus;
  subject: string;
  body: string;
  selected: boolean;
  sendStatus: 'idle' | 'sending' | 'sent' | 'failed';
  error?: string;
}

type LeadInput = Partial<ScoutLead> & Record<string, unknown>;
type CsvLead = { name?: string; company?: string; email?: string; website?: string; notes?: string };

const RESEARCH_LIMIT = 12000;
const READER_URL = 'https://r.jina.ai/http://';
const EMAIL_RE = /[^\s,;<>"]+@[^\s,;<>"]+\.[^\s,;<>"]+/i;
const URL_RE = /https?:\/\/[^\s,;<>"]+/i;

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanUrl(value: string) {
  const trimmed = value.trim().replace(/[),.;]+$/, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normaliseLead(value: LeadInput, index: number): ScoutLead | null {
  const email = String(value.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  return {
    id: id(),
    name: String(value.name || value.owner || '').trim(),
    company: String(value.company || value.business_name || value.app || '').trim(),
    email,
    website: cleanUrl(String(value.website || value.url || value.site || '')),
    notes: String(value.notes || value.description || '').trim(),
    research: '',
    researchStatus: 'idle',
    draftStatus: 'idle',
    subject: '',
    body: '',
    selected: true,
    sendStatus: 'idle',
    error: index < 0 ? 'Invalid lead' : undefined,
  };
}

function parseCsvLine(line: string) {
  const cells = line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
  return {
    name: cells[0],
    company: cells[1],
    email: cells.find(cell => EMAIL_RE.test(cell)) || '',
    website: cells.find(cell => URL_RE.test(cell)) || '',
    notes: cells.slice(3).join(', '),
  };
}

function parseLeadText(raw: string): ScoutLead[] {
  const text = raw.replace(/\r/g, '').trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    const values: LeadInput[] = (Array.isArray(parsed) ? parsed : Array.isArray(parsed.leads) ? parsed.leads : [parsed])
      .filter((value: unknown): value is LeadInput => Boolean(value) && typeof value === 'object');
    const jsonLeads = values.map((value: LeadInput, index: number) => normaliseLead(value, index)).filter(Boolean) as ScoutLead[];
    if (jsonLeads.length) return jsonLeads;
  } catch {
    // Fall through to CSV/plain text parsing.
  }

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const hasCsvHeader = /email/i.test(lines[0] || '') && (lines[0].includes(',') || lines[0].includes('\t'));
  const rows = hasCsvHeader ? lines.slice(1) : lines;
  const parsed = rows.map((line, index) => {
    const csv: CsvLead = line.includes(',') ? parseCsvLine(line) : {};
    const email = line.match(EMAIL_RE)?.[0] || csv.email || '';
    const website = line.match(URL_RE)?.[0] || csv.website || '';
    const beforeEmail = line.slice(0, Math.max(0, line.indexOf(email))).replace(/[|,;\t]/g, ' ').trim();
    return normaliseLead({
      ...csv,
      email,
      website,
      name: csv.name || beforeEmail.split(/\s{2,}/)[0],
      notes: csv.notes || line,
    }, index);
  }).filter(Boolean) as ScoutLead[];

  const unique = new Map<string, ScoutLead>();
  parsed.forEach(lead => unique.set(lead.email, lead));
  return [...unique.values()];
}

async function extractPdfText(file: File) {
  // Keep the main Cloudflare bundle small. The PDF parser loads only when a
  // PDF is selected, and is served as a browser ESM module.
  const pdfJsUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
  const loadPdfJs = new Function('url', 'return import(url)') as (url: string) => Promise<{
    getDocument: (options: { data: Uint8Array; disableWorker: boolean }) => { promise: Promise<any> };
  }>;
  const pdfjs = await loadPdfJs(pdfJsUrl);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  const pages: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: { str?: string }) => item.str || '').join(' '));
  }
  return pages.join('\n');
}

function bodyToHtml(body: string) {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped.split(/\n{2,}/).map(part => `<p>${part.replace(/\n/g, '<br />')}</p>`).join('');
}

function readerUrl(website: string) {
  return `${READER_URL}${website.replace(/^https?:\/\//i, '')}`;
}

export function ScoutingPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawInput, setRawInput] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [leads, setLeads] = useState<ScoutLead[]>([]);
  const [researching, setResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [personalization, setPersonalization] = useState(
    'Explain one specific opportunity you found on the website, how my service could help, and invite a short conversation. Keep it concise and honest.'
  );
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [confirmCompliance, setConfirmCompliance] = useState(false);
  const [groqKey, setGroqKey] = useState('');

  const selectedLeads = useMemo(() => leads.filter(lead => lead.selected), [leads]);
  const sent = leads.filter(lead => lead.sendStatus === 'sent').length;
  const failed = leads.filter(lead => lead.sendStatus === 'failed').length;

  const updateLead = (leadId: string, updates: Partial<ScoutLead>) => {
    setLeads(current => current.map(lead => lead.id === leadId ? { ...lead, ...updates } : lead));
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File is too large', description: 'Please upload a file smaller than 15 MB.' });
      return;
    }
    try {
      const text = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        ? await extractPdfText(file)
        : await file.text();
      setSourceName(file.name);
      setRawInput(text);
      toast({ title: 'File loaded', description: 'Review the extracted text, then import the leads.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not read file', description: error instanceof Error ? error.message : 'Try a text, CSV, JSON, or PDF file.' });
    } finally {
      event.target.value = '';
    }
  };

  const importLeads = () => {
    const imported = parseLeadText(rawInput);
    if (!imported.length) {
      toast({ variant: 'destructive', title: 'No email addresses found', description: 'Paste one lead per line, CSV/JSON, or upload a PDF containing email addresses.' });
      return;
    }
    setLeads(imported);
    toast({ title: `${imported.length} leads imported`, description: 'Only selected leads will be researched and drafted.' });
  };

  const researchAll = async () => {
    const candidates = selectedLeads.filter(lead => lead.website);
    if (!candidates.length) {
      toast({ variant: 'destructive', title: 'Website URLs are required', description: 'Add a website to each lead you want researched.' });
      return;
    }
    setResearching(true);
    setResearchProgress(0);
    for (let index = 0; index < candidates.length; index += 1) {
      const lead = candidates[index];
      updateLead(lead.id, { researchStatus: 'researching', error: undefined });
      try {
        const response = await fetch(readerUrl(lead.website));
        if (!response.ok) throw new Error(`Research returned ${response.status}`);
        const content = (await response.text()).slice(0, RESEARCH_LIMIT);
        updateLead(lead.id, { research: content, researchStatus: 'complete' });
      } catch (error) {
        updateLead(lead.id, { researchStatus: 'failed', error: error instanceof Error ? error.message : 'Could not read this website.' });
      }
      setResearchProgress(Math.round(((index + 1) / candidates.length) * 100));
    }
    setResearching(false);
    toast({ title: 'Research finished', description: 'Review the research results before generating drafts.' });
  };

  const getGroqKey = async () => {
    if (profile?.groq_api_key) return profile.groq_api_key;
    if (groqKey) return groqKey;
    const { data } = await supabase.from('settings').select('groq_api_key').eq('id', 1).single();
    if (data?.groq_api_key) setGroqKey(data.groq_api_key);
    return data?.groq_api_key || '';
  };

  const generateDraft = async (lead: ScoutLead, key: string) => {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You write a truthful, concise business outreach draft. Return valid JSON only with string keys "subject" and "body". Do not invent facts, claims, names, or contact details. Include a short plain-text opt-out line at the end of the body.',
          },
          {
            role: 'user',
            content: `Create a personalized outreach draft for this lead.\nSender: ${profile?.name || 'the sender'}\nCompany: ${profile?.company || 'the sender company'}\nLead name: ${lead.name || 'unknown'}\nLead company: ${lead.company || 'unknown'}\nLead email: ${lead.email}\nWebsite: ${lead.website || 'not provided'}\nResearch:\n${lead.research || 'No research available.'}\nPersonalization instructions: ${personalization}`,
          },
        ],
        max_tokens: 700,
        temperature: 0.5,
      }),
    });
    if (!response.ok) throw new Error(`AI returned ${response.status}`);
    const data = await response.json();
    const content = String(data.choices?.[0]?.message?.content || '').replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(content) as { subject?: string; body?: string };
    if (!parsed.subject || !parsed.body) throw new Error('AI returned an incomplete draft.');
    return { subject: parsed.subject.trim(), body: parsed.body.trim() };
  };

  const personalizeAll = async () => {
    const key = await getGroqKey();
    if (!key) {
      toast({ variant: 'destructive', title: 'No AI key configured', description: 'Add a Groq key in Settings or Admin Settings.' });
      return;
    }
    const candidates = selectedLeads.filter(lead => lead.researchStatus === 'complete');
    if (!candidates.length) {
      toast({ variant: 'destructive', title: 'Research leads first', description: 'Run Research Websites before generating drafts.' });
      return;
    }
    setGenerating(true);
    setGenerationProgress(0);
    for (let index = 0; index < candidates.length; index += 1) {
      const lead = candidates[index];
      updateLead(lead.id, { draftStatus: 'generating', error: undefined });
      try {
        const draft = await generateDraft(lead, key);
        updateLead(lead.id, { ...draft, draftStatus: 'ready' });
      } catch (error) {
        updateLead(lead.id, { draftStatus: 'failed', error: error instanceof Error ? error.message : 'Could not generate this draft.' });
      }
      setGenerationProgress(Math.round(((index + 1) / candidates.length) * 100));
    }
    setGenerating(false);
    toast({ title: 'Personalized drafts ready', description: 'Edit each draft and select the messages you want to send.' });
  };

  const sendNow = async () => {
    const ready = selectedLeads.filter(lead => lead.subject.trim() && lead.body.trim() && lead.draftStatus === 'ready');
    if (!ready.length) {
      toast({ variant: 'destructive', title: 'No ready drafts', description: 'Generate and review at least one draft first.' });
      return;
    }
    if (!confirmCompliance) {
      toast({ variant: 'destructive', title: 'Confirmation required', description: 'Confirm that these recipients are appropriate to contact and that every message includes an opt-out.' });
      return;
    }
    const { data: provider } = await supabase.from('profiles')
      .select('brevo_api_key, active_smtp, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure')
      .eq('id', user?.id || '').single();
    if (!provider || !hasUsableEmailProvider(provider)) {
      toast({ variant: 'destructive', title: 'No authorized sending provider', description: 'Connect a sender in Settings before sending.' });
      return;
    }
    setSending(true);
    setSendProgress(0);
    const { data: campaign } = await supabase.from('campaigns').insert({
      user_id: user?.id,
      name: 'Scouting outreach',
      subject: 'Personalized scouting outreach',
      body: 'Generated from the Scouting page.',
      recipients: ready.map(lead => lead.email),
      status: 'sending',
      created_at: new Date().toISOString(),
    }).select().single();
    let sentCount = 0;
    for (let index = 0; index < ready.length; index += 1) {
      const lead = ready[index];
      updateLead(lead.id, { sendStatus: 'sending' });
      const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px">${bodyToHtml(lead.body)}<hr style="margin:24px 0;border:0;border-top:1px solid #e5e7eb"><p style="font-size:12px;color:#6b7280">If you do not want to receive messages from me, reply with “unsubscribe” and I will remove you from future outreach.</p></div>`;
      try {
        const result = await sendEmail({
          config: provider,
          fromName: profile?.name || 'Darapet',
          fromEmail: profile?.email || user?.email || '',
          to: lead.email,
          subject: lead.subject,
          html,
        });
        const ok = result.ok;
        if (ok) sentCount += 1;
        updateLead(lead.id, { sendStatus: ok ? 'sent' : 'failed', error: result.error });
        await supabase.from('email_sends').insert({
          user_id: user?.id,
          campaign_id: campaign?.id,
          to_email: lead.email,
          subject: lead.subject,
          provider: provider.active_smtp === 'smtp' ? 'smtp' : 'brevo',
          status: ok ? 'sent' : 'failed',
          error_msg: result.error || null,
          sent_at: new Date().toISOString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Send failed';
        updateLead(lead.id, { sendStatus: 'failed', error: message });
      }
      setSendProgress(Math.round(((index + 1) / ready.length) * 100));
      if (index < ready.length - 1) await new Promise(resolve => setTimeout(resolve, 800));
    }
    if (campaign?.id) {
      await supabase.from('campaigns').update({ status: 'sent', sent_count: sentCount, sent_at: new Date().toISOString() }).eq('id', campaign.id);
    }
    setSending(false);
    toast({ title: 'Scouting send finished', description: `${sentCount} sent. Failed messages are shown below.` });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Search className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scouting</h1>
            <p className="text-muted-foreground mt-1">Research public websites, draft personalized outreach, and review before sending.</p>
          </div>
        </div>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Review-first outreach</p>
            <p className="text-muted-foreground mt-1">Only use public research you are allowed to use and contact people appropriately. Every generated message includes an opt-out line. Provider APIs do not reliably reveal whether a message landed in spam, so this page reports sent and failed outcomes rather than guessing.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="w-4 h-4 text-primary" /> 1. Import scouting leads</CardTitle>
            <CardDescription>Paste ChatGPT output or upload CSV, JSON, TXT, or PDF files with emails and website URLs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input ref={fileRef} type="file" accept=".csv,.json,.txt,.pdf,application/pdf,text/csv,application/json,text/plain" className="hidden" onChange={handleFile} />
            <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}><FileText className="w-4 h-4" /> Upload file</Button>
            {sourceName && <Badge variant="secondary">{sourceName}</Badge>}
            <Textarea value={rawInput} onChange={event => setRawInput(event.target.value)} rows={10} placeholder={'Paste one lead per line, CSV/JSON, or extracted PDF text…\n\nExample:\nJane Doe, Acme App, jane@example.com, https://acme.example'} className="font-mono text-xs" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Duplicates are removed by email.</span>
              <Button onClick={importLeads} disabled={!rawInput.trim()} className="gap-2"><CheckCircle2 className="w-4 h-4" /> Import leads</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe2 className="w-4 h-4 text-primary" /> 2. Research websites</CardTitle>
            <CardDescription>The researcher visits each selected public website one at a time and stores a reviewable result.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>{leads.length} imported · {selectedLeads.length} selected</span>
              <Button onClick={researchAll} disabled={researching || !selectedLeads.length} className="gap-2">
                {researching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {researching ? 'Researching…' : 'Research websites'}
              </Button>
            </div>
            {researching && <Progress value={researchProgress} />}
            {leads.length === 0 ? (
              <div className="border border-dashed rounded-xl p-8 text-center text-sm text-muted-foreground">Your imported leads will appear here.</div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {leads.map(lead => (
                  <div key={lead.id} className="flex items-start gap-3 p-3 rounded-xl border">
                    <Checkbox checked={lead.selected} onCheckedChange={value => updateLead(lead.id, { selected: Boolean(value) })} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{lead.company || lead.name || lead.email}</p>
                        {lead.researchStatus === 'complete' && <Badge className="bg-green-500/10 text-green-700 border-green-200">researched</Badge>}
                        {lead.researchStatus === 'failed' && <Badge variant="destructive">failed</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{lead.email} · {lead.website || 'No website'}</p>
                      {lead.research && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lead.research}</p>}
                    </div>
                    <button className="text-muted-foreground hover:text-destructive" onClick={() => setLeads(current => current.filter(item => item.id !== lead.id))} aria-label={`Remove ${lead.email}`}><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> 3. Personalize drafts</CardTitle>
          <CardDescription>Tell the AI what to focus on. Each lead gets its own subject and message based on the research you review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>What would you like to personalize?</Label>
            <Textarea value={personalization} onChange={event => setPersonalization(event.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={personalizeAll} disabled={generating || !selectedLeads.length} className="gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {generating ? 'Generating…' : 'Generate personalized drafts'}
            </Button>
            {generating && <div className="flex-1"><Progress value={generationProgress} /></div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> 4. Review and send</span>
            <span className="text-xs font-normal text-muted-foreground">{sent} sent · {failed} failed · spam placement unavailable</span>
          </CardTitle>
          <CardDescription>Edit each message before sending. Drafts are not sent automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {leads.length === 0 ? (
            <div className="border border-dashed rounded-xl p-8 text-center text-sm text-muted-foreground">Import and research leads to create drafts.</div>
          ) : (
            <div className="max-h-[720px] overflow-y-auto space-y-4 pr-1">
              {leads.map(lead => (
                <div key={lead.id} className={`rounded-xl border p-4 space-y-3 ${lead.sendStatus === 'sent' ? 'border-green-300 bg-green-500/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={lead.selected} onCheckedChange={value => updateLead(lead.id, { selected: Boolean(value) })} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{lead.company || lead.name || lead.email}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}{lead.website ? ` · ${lead.website}` : ''}</p>
                    </div>
                    {lead.sendStatus === 'sent' && <Badge className="bg-green-500/10 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />sent</Badge>}
                    {lead.sendStatus === 'failed' && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />failed</Badge>}
                    {lead.draftStatus === 'failed' && <AlertCircle className="w-4 h-4 text-destructive" />}
                  </div>
                  <div className="grid md:grid-cols-[1fr_2fr] gap-3">
                    <Input value={lead.subject} onChange={event => updateLead(lead.id, { subject: event.target.value, draftStatus: 'ready' })} placeholder="Subject" />
                    <Textarea value={lead.body} onChange={event => updateLead(lead.id, { body: event.target.value, draftStatus: 'ready' })} rows={5} placeholder="Personalized message" />
                  </div>
                  {lead.error && <p className="text-xs text-destructive">{lead.error}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="border-t pt-4 space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={confirmCompliance} onCheckedChange={value => setConfirmCompliance(Boolean(value))} className="mt-0.5" />
              <span>I confirm these recipients are appropriate to contact, the content is truthful, and every message includes a clear opt-out.</span>
            </label>
            {sending && <Progress value={sendProgress} />}
            <Button onClick={sendNow} disabled={sending || !selectedLeads.length} className="gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Send selected drafts now'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}