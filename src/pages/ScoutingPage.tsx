import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  AlertCircle, Check, CheckCircle2, ChevronDown, ExternalLink, FileDown, FileText,
  Globe2, Loader2, Mail, Megaphone, NotebookPen, RefreshCw, Search,
  Send, ShieldCheck, Sparkles, Upload, UserRound, X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadFileToCloudinary } from '@/lib/cloudinary';
import { hasUsableEmailProvider, sendEmail } from '@/lib/emailSend';
import { disconnectGmail, getGmailStatus, sendGmail, startGmailConnection, type GmailStatus } from '@/lib/gmail';
import { parseAiJson, extractLeadsFromFile, toHtmlEmail, type ScoutLead } from '@/lib/scouting';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type ResearchResponse = {
  summary: string;
  pain_points: string[];
};

type PersonalizationResponse = {
  subject: string;
  body: string;
};

type Stat = {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bg: string;
};

type LeadImport = {
  id: string;
  name: string;
  original_file_name: string;
  source_file_path?: string | null;
  source_file_type?: string | null;
  source_file_size?: number | null;
  columns: string[];
  row_count: number;
  created_at?: string;
};

const db = supabase as any;

function displayWebsite(url: string) {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function statusLabel(status: ScoutLead['research_status']) {
  if (status === 'researched') return 'Researched';
  if (status === 'researching') return 'Researching';
  if (status === 'needs_manual') return 'Needs notes';
  return 'Not researched';
}

export function ScoutingPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [leads, setLeads] = useState<ScoutLead[]>([]);
  const [imports, setImports] = useState<LeadImport[]>([]);
  const [selectedImportId, setSelectedImportId] = useState('all');
  const [showImportName, setShowImportName] = useState(false);
  const [importName, setImportName] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [researching, setResearching] = useState<string | null>(null);
  const [researchingBatch, setResearchingBatch] = useState(false);
  const [personalizing, setPersonalizing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_review' | 'ready' | 'opted_out'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false, email: null, connectedAt: null });
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailAction, setGmailAction] = useState(false);
  const [gmailError, setGmailError] = useState('');
  const [researchPrompt, setResearchPrompt] = useState(
    'Review the website and identify one specific opportunity where a freelance technology partner could help. Be factual, concise, and do not invent details.'
  );
  const [groqKey, setGroqKey] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: leadData, error: leadError }, { data: importData, error: importError }, { data: settings }] = await Promise.all([
        db.from('scout_leads').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('scout_imports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('settings').select('groq_api_key').eq('id', 1).maybeSingle(),
      ]);
      if (leadError) toast({ variant: 'destructive', title: 'Could not load leads', description: leadError.message });
      if (importError) toast({ variant: 'destructive', title: 'Could not load import lists', description: importError.message });
      setLeads((leadData || []) as ScoutLead[]);
      setImports((importData || []) as LeadImport[]);
      setGroqKey(settings?.groq_api_key || '');
      setLoading(false);
    };
    load();
  }, [toast, user]);

  useEffect(() => {
    if (!user) return;
    getGmailStatus()
      .then(status => {
        setGmailStatus(status);
        setGmailError('');
      })
      .catch(error => setGmailError(error instanceof Error ? error.message : 'Gmail connection is not available yet.'))
      .finally(() => setGmailLoading(false));
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('gmail');
    if (!result) return;
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    if (result === 'connected') {
      toast({ title: 'Gmail connected', description: 'Scouting messages will now send from your connected Gmail account.' });
      getGmailStatus().then(setGmailStatus).catch(() => undefined);
    } else {
      toast({ variant: 'destructive', title: 'Gmail connection was not completed', description: 'Check the Google consent screen and try again.' });
    }
  }, [toast]);

  const updateLocalLead = (id: string, patch: Partial<ScoutLead>) => {
    setLeads(current => current.map(lead => lead.id === id ? { ...lead, ...patch } : lead));
  };

  const saveLead = async (id: string, patch: Partial<ScoutLead>) => {
    updateLocalLead(id, patch);
    const { error } = await db.from('scout_leads').update(patch).eq('id', id).eq('user_id', user!.id);
    if (error) toast({ variant: 'destructive', title: 'Could not save lead', description: error.message });
  };

  const openSourceFile = async (lead: ScoutLead) => {
    if (!lead.source_file_path) {
      toast({ variant: 'destructive', title: 'Original file unavailable', description: 'This older record does not have a stored source file.' });
      return;
    }
    try {
      if (/^https?:\/\//i.test(lead.source_file_path)) {
        window.open(lead.source_file_path, '_blank', 'noopener,noreferrer');
        return;
      }
      // Keep legacy Supabase-stored imports readable when their bucket exists.
      const { data, error } = await db.storage.from('scouting-imports').createSignedUrl(lead.source_file_path, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not open original file', description: error instanceof Error ? error.message : 'Check the storage migration and try again.' });
    }
  };

  const beginImport = () => {
    setImportName('');
    setShowImportName(true);
  };

  const continueToFileUpload = () => {
    const name = importName.trim();
    if (!name) {
      toast({ variant: 'destructive', title: 'Name this lead list first', description: 'Use a name such as SaaS founders September.' });
      return;
    }
    setImportName(name);
    setShowImportName(false);
    window.setTimeout(() => fileInput.current?.click(), 0);
  };

  const importFile = async (file: File, listName: string) => {
    setImporting(true);
    let sourceFileUrl = '';
    let importRecord: LeadImport | null = null;
    try {
      const uploaded = await uploadFileToCloudinary(file, 'darapet/' + user!.id + '/scouting-imports');
      sourceFileUrl = uploaded.secureUrl;

      let imported: ScoutLead[];
      try {
        imported = await extractLeadsFromFile(file);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'The file could not be read in the browser.';
        throw new Error('The original file was uploaded to Cloudinary, but it could not be read: ' + reason);
      }
      const columns = Array.from(new Set(imported.flatMap(lead => lead.source_headers || Object.keys(lead.raw_data || {}))));
      const { data: createdImport, error: importError } = await db.from('scout_imports').insert({
        user_id: user!.id,
        name: listName,
        original_file_name: file.name,
        source_file_path: sourceFileUrl,
        source_file_type: file.type || 'application/octet-stream',
        source_file_size: file.size,
        columns,
        row_count: imported.length,
      }).select('*').single();
      if (importError) throw new Error('The file was read, but its lead list could not be created: ' + importError.message);
      importRecord = createdImport as LeadImport;

      const rows = imported.map(({ id: _id, ...lead }) => ({
        ...lead,
        import_id: importRecord!.id,
        user_id: user!.id,
        source_file_path: sourceFileUrl,
        source_file_type: file.type || 'application/octet-stream',
        source_file_size: file.size,
      }));
      const { data, error } = await db.from('scout_leads').insert(rows).select('*');
      if (error) throw new Error('The original file uploaded to Cloudinary, but the lead records could not be saved: ' + error.message);
      setImports(current => [importRecord!, ...current.filter(item => item.id !== importRecord!.id)]);
      setLeads(current => [...((data || []) as ScoutLead[]), ...current]);
      setSelectedImportId(importRecord.id);
      setSelectedIds(new Set((data || []).map((lead: ScoutLead) => lead.id)));
      toast({ title: (data?.length || imported.length) + ' records saved', description: 'Lead list “' + listName + '” is ready. Every imported column is preserved.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Import failed', description: error instanceof Error ? error.message : 'The file could not be imported. Try again with a CSV, JSON, PDF, or another supported file.' });
    } finally {
      setImporting(false);
      setImportName('');
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const aiKey = profile?.groq_api_key || groqKey;

  const connectGmail = async () => {
    setGmailAction(true);
    try {
      await startGmailConnection();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not start Gmail connection', description: error instanceof Error ? error.message : 'Try again.' });
      setGmailAction(false);
    }
  };

  const disconnectConnectedGmail = async () => {
    if (!window.confirm('Disconnect this Gmail account from Darapet?')) return;
    setGmailAction(true);
    try {
      await disconnectGmail();
      setGmailStatus({ connected: false, email: null, connectedAt: null });
      toast({ title: 'Gmail disconnected' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not disconnect Gmail', description: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      setGmailAction(false);
    }
  };

  const callGroq = async <T,>(prompt: string): Promise<T> => {
    if (!aiKey) throw new Error('Add a Groq API key in Admin Settings before using AI research.');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${aiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Return only valid JSON. Do not invent facts. If website evidence is missing, say so clearly.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.35,
        max_tokens: 700,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'AI request failed.');
    const parsed = parseAiJson<T>(data.choices?.[0]?.message?.content || '');
    if (!parsed) throw new Error('The AI returned an unreadable response. Try again.');
    return parsed;
  };

  const researchLead = async (lead: ScoutLead, quiet = false) => {
    if (!lead.website) {
      setExpandedId(lead.id);
      await saveLead(lead.id, { research_status: 'needs_manual' });
      if (!quiet) toast({ variant: 'destructive', title: 'Add a website first', description: 'This lead has no website to research.' });
      return false;
    }
    setResearching(lead.id);
    updateLocalLead(lead.id, { research_status: 'researching' });
    let pageText = '';
    try {
      const response = await fetch(lead.website, { headers: { Accept: 'text/html' } });
      if (response.ok) {
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('script, style, noscript, svg').forEach(node => node.remove());
        pageText = (doc.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 7000);
      }
    } catch {
      // Most sites block browser cross-origin reads. The imported row remains available as evidence.
    }

    if (!pageText && !lead.source_notes) {
      updateLocalLead(lead.id, { research_status: 'needs_manual' });
      await db.from('scout_leads').update({ research_status: 'needs_manual' }).eq('id', lead.id).eq('user_id', user!.id);
      if (!quiet) {
        window.open(lead.website, '_blank', 'noopener,noreferrer');
        setExpandedId(lead.id);
        toast({ title: 'Website opened for notes', description: 'This site blocks browser reading. Add your observations below, then research again.' });
      }
      setResearching(null);
      return false;
    }

    try {
      const result = await callGroq<ResearchResponse>(`Research this potential client using only the supplied evidence.
Business: ${lead.business_name}
App: ${lead.app_name || 'Not provided'}
Website: ${lead.website}
Imported fields: ${JSON.stringify(lead.raw_data || {})}
Imported notes: ${lead.source_notes || 'None'}
Website text: ${pageText || 'The website could not be read in-browser; use imported fields and notes only.'}
Instruction: ${researchPrompt}
Return JSON with exactly: {"summary":"...", "pain_points":["...", "..."]}.`);
      const patch = {
        research_status: 'researched' as const,
        research_summary: result.summary || '',
        pain_points: Array.isArray(result.pain_points) ? result.pain_points.slice(0, 4) : [],
      };
      await saveLead(lead.id, patch);
      if (!quiet) toast({ title: 'Research complete', description: lead.business_name + ' is ready for personalization.' });
      return true;
    } catch (error) {
      await saveLead(lead.id, { research_status: 'needs_manual' });
      if (!quiet) toast({ variant: 'destructive', title: 'Research needs attention', description: error instanceof Error ? error.message : 'Add notes and try again.' });
      return false;
    } finally {
      setResearching(null);
    }
  };

  const researchImport = async () => {
    if (selectedImportId === 'all') {
      toast({ variant: 'destructive', title: 'Choose a lead list first', description: 'Select the imported list you want to research.' });
      return;
    }
    const targets = activeLeads.filter(lead => Boolean(lead.website));
    if (!targets.length) {
      toast({ variant: 'destructive', title: 'No websites in this list', description: 'The imported rows need a website before research can begin.' });
      return;
    }
    setResearchingBatch(true);
    let completed = 0;
    try {
      for (const lead of targets) {
        if (await researchLead(lead, true)) completed += 1;
      }
      toast({ title: 'List research finished', description: completed + ' of ' + targets.length + ' websites produced research briefs.' });
    } finally {
      setResearchingBatch(false);
    }
  };

  const personalizeLead = async (lead: ScoutLead) => {
    if (!lead.research_summary && !lead.source_notes) return;
    const result = await callGroq<PersonalizationResponse>(`Write one respectful, personalized freelance outreach email.
Recipient: ${lead.owner_name || 'the owner'}
Business: ${lead.business_name}
App: ${lead.app_name || 'their product'}
Website: ${lead.website || 'not provided'}
Research: ${lead.research_summary || lead.source_notes}
Imported fields: ${JSON.stringify(lead.raw_data || {})}
Pain points: ${lead.pain_points.join('; ') || 'not established'}
Sender context: ${profile?.company || profile?.name || 'a freelance technology partner'}
Offer/context to personalize: ${researchPrompt}
Return JSON exactly as {"subject":"...", "body":"..."}.
The body must be plain text, specific but not creepy, under 180 words, and must end with:
If you would rather not receive messages from me, reply "unsubscribe" and I will not contact you again.`);
    const patch = {
      personalization_status: 'generated' as const,
      email_subject: result.subject || `A quick idea for ${lead.business_name}`,
      email_body: result.body || '',
    };
    await saveLead(lead.id, patch);
  };

  const personalizeSelected = async () => {
    const targets = leads.filter(lead => selectedIds.has(lead.id) && !lead.opted_out && lead.research_status === 'researched');
    if (!targets.length) {
      toast({ variant: 'destructive', title: 'Select researched leads first', description: 'Only researched, non-opted-out leads can receive a draft.' });
      return;
    }
    setPersonalizing(true);
    let completed = 0;
    try {
      for (const lead of targets) {
        await personalizeLead(lead);
        completed += 1;
      }
      toast({ title: `${completed} personalized drafts ready`, description: 'Review every message before sending.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Personalization stopped', description: error instanceof Error ? error.message : 'Try the remaining leads again.' });
    } finally {
      setPersonalizing(false);
    }
  };

  const sendSelected = async () => {
    const targets = leads.filter(lead =>
      selectedIds.has(lead.id) && lead.email && !lead.opted_out && lead.email_subject && lead.email_body && lead.send_status !== 'sent'
    );
    if (!targets.length) {
      toast({ variant: 'destructive', title: 'No reviewed drafts selected', description: 'Generate and review drafts before sending.' });
      return;
    }
    if (!window.confirm(`Send ${targets.length} reviewed message${targets.length === 1 ? '' : 's'} now? Opted-out leads are excluded.`)) return;

    let provider: any = null;
    if (!gmailStatus.connected) {
      const { data } = await db.from('profiles')
        .select('brevo_api_key, active_smtp, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure')
        .eq('id', user!.id).single();
      provider = data;
      if (!provider || !hasUsableEmailProvider(provider)) {
        toast({ variant: 'destructive', title: 'No email provider configured', description: 'Connect Gmail here, or configure Brevo/SMTP in Settings.' });
        return;
      }
    }

    setSending(true);
    setSendProgress(0);
    const { data: campaign } = await db.from('campaigns').insert({
      user_id: user!.id,
      subject: 'Scouting outreach',
      body: 'Individualized scouting messages',
      recipients: targets.map(lead => lead.email),
      status: 'sending',
      created_at: new Date().toISOString(),
    }).select('id').single();
    let sent = 0;
    for (const [index, lead] of targets.entries()) {
      updateLocalLead(lead.id, { send_status: 'sending' });
      let sendOk = false;
      let sendError = '';
      try {
        if (gmailStatus.connected) {
          const result = await sendGmail({
            fromName: profile?.name || 'Darapet',
            to: lead.email,
            subject: lead.email_subject,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${toHtmlEmail(lead.email_body)}</div>`,
          });
          sendOk = result.success;
        } else {
          const result = await sendEmail({
            config: provider,
            fromName: profile?.name || 'Darapet',
            fromEmail: profile?.email || user!.email!,
            to: lead.email,
            subject: lead.email_subject,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${toHtmlEmail(lead.email_body)}</div>`,
          });
          sendOk = result.ok;
          sendError = result.error || '';
        }
      } catch (error) {
        sendError = error instanceof Error ? error.message : 'Send failed';
      }
      await db.from('email_sends').insert({
        user_id: user!.id,
        campaign_id: campaign?.id || null,
        lead_id: lead.id,
        to_email: lead.email,
        subject: lead.email_subject,
        provider: gmailStatus.connected ? 'gmail' : provider.active_smtp === 'smtp' ? 'smtp' : 'brevo',
        status: sendOk ? 'sent' : 'failed',
        error_msg: sendError || null,
        sent_at: new Date().toISOString(),
      });
      await db.from('scout_leads').update({
        send_status: sendOk ? 'sent' : 'failed',
        sent_at: sendOk ? new Date().toISOString() : null,
      }).eq('id', lead.id).eq('user_id', user!.id);
      updateLocalLead(lead.id, { send_status: sendOk ? 'sent' : 'failed', sent_at: sendOk ? new Date().toISOString() : null });
      if (sendOk) sent += 1;
      setSendProgress(Math.round(((index + 1) / targets.length) * 100));
    }
    if (campaign?.id) {
      await db.from('campaigns').update({ status: sent === targets.length ? 'sent' : 'failed', sent_count: sent, sent_at: new Date().toISOString() }).eq('id', campaign.id);
    }
    setSending(false);
    toast({ title: `${sent} of ${targets.length} messages sent`, description: sent === targets.length ? 'Your campaign history has been updated.' : 'Failed sends are marked for review.' });
  };

  const activeLeads = useMemo(() => selectedImportId === 'all'
    ? leads
    : leads.filter(lead => lead.import_id === selectedImportId), [leads, selectedImportId]);

  const filteredLeads = useMemo(() => activeLeads.filter(lead => {
    const query = filter.toLowerCase();
    const matchesText = !query || [lead.business_name, lead.app_name, lead.owner_name, lead.email, lead.website, ...Object.values(lead.raw_data || {})].some(value => value.toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'needs_review' && (lead.research_status !== 'researched' || !lead.email_subject))
      || (statusFilter === 'ready' && lead.research_status === 'researched' && Boolean(lead.email_subject) && !lead.opted_out)
      || (statusFilter === 'opted_out' && lead.opted_out);
    return matchesText && matchesStatus;
  }), [activeLeads, filter, statusFilter]);

  const stats = {
    total: activeLeads.length,
    researched: activeLeads.filter(lead => lead.research_status === 'researched').length,
    drafts: activeLeads.filter(lead => lead.personalization_status === 'generated').length,
    sent: activeLeads.filter(lead => lead.send_status === 'sent').length,
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="max-w-6xl mx-auto space-y-6"><Skeleton className="h-10 w-72" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map(item => <Skeleton key={item} className="h-24 rounded-xl" />)}</div><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2"><Megaphone className="w-4 h-4" /> Scouting workspace</div>
          <h1 className="text-3xl font-bold tracking-tight">Find better-fit clients</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Import any file, keep every record, and optionally research the website or prepare an outreach message when contact details are available.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept="*/*" className="hidden" onChange={event => event.target.files?.[0] && importFile(event.target.files[0], importName)} />
          <Button onClick={beginImport} disabled={importing} className="gap-2">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import a lead list
          </Button>
          <Link href="/campaigns/history"><Button variant="outline" className="gap-2"><Mail className="w-4 h-4" /> Campaign history</Button></Link>
        </div>
      </div>

      {showImportName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="import-list-title">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader><CardTitle id="import-list-title">Name this lead list</CardTitle><p className="text-sm text-muted-foreground">Give this upload a name so you can research it separately from future imports.</p></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="import-list-name">Lead list name</Label><Input id="import-list-name" autoFocus value={importName} onChange={event => setImportName(event.target.value)} onKeyDown={event => event.key === 'Enter' && continueToFileUpload()} placeholder="e.g. SaaS founders — September" /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowImportName(false)}>Cancel</Button><Button onClick={continueToFileUpload}>Continue to file upload</Button></div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className={gmailStatus.connected ? 'border-green-200 bg-green-500/[0.03]' : 'border-primary/20 bg-primary/[0.03]'}>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${gmailStatus.connected ? 'bg-green-500/10 text-green-600' : 'bg-primary/10 text-primary'}`}>
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold flex items-center gap-2">Send from Gmail {gmailStatus.connected && <Badge variant="outline" className="text-green-600 border-green-200">Connected</Badge>}</p>
              {gmailLoading ? <p className="text-sm text-muted-foreground mt-1">Checking connection…</p> : gmailStatus.connected ? <p className="text-sm text-muted-foreground mt-1">{gmailStatus.email} will be used for reviewed scouting sends.</p> : <p className="text-sm text-muted-foreground mt-1">Connect a mailbox so messages send from the owner’s own Gmail account.</p>}
              {gmailError && <p className="text-xs text-amber-600 mt-1">{gmailError}</p>}
            </div>
          </div>
          {gmailStatus.connected
            ? <Button variant="outline" size="sm" onClick={disconnectConnectedGmail} disabled={gmailAction} className="shrink-0">{gmailAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Disconnect</Button>
            : <Button size="sm" onClick={connectGmail} disabled={gmailAction || gmailLoading} className="gap-1.5 shrink-0">{gmailAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Connect Gmail</Button>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { label: 'Leads', value: stats.total, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Researched', value: stats.researched, icon: Search, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Drafts ready', value: stats.drafts, icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Sent', value: stats.sent, icon: Send, color: 'text-green-500', bg: 'bg-green-500/10' },
        ] as Stat[]).map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`w-5 h-5 ${color}`} /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><NotebookPen className="w-4 h-4 text-primary" /> Research instruction</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="research-prompt">Tell the research assistant what to look for</Label>
          <Textarea id="research-prompt" value={researchPrompt} onChange={event => setResearchPrompt(event.target.value)} className="min-h-20 bg-background" />
          <p className="text-xs text-muted-foreground">Sites that block browser reading open in a new tab instead. Add what you observed in that lead’s notes; the assistant will use those notes rather than guessing.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div><CardTitle className="text-base">Imported records</CardTitle><p className="text-sm text-muted-foreground mt-1">Choose a named list, search its rows, open any lead, and research one website or the whole list.</p></div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={researchImport} disabled={researchingBatch || personalizing || sending || selectedImportId === 'all'} className="gap-1.5">{researchingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Research this list</Button>
              <Button variant="outline" size="sm" onClick={personalizeSelected} disabled={personalizing || sending} className="gap-1.5">{personalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Personalize selected</Button>
              <Button size="sm" onClick={sendSelected} disabled={sending || personalizing} className="gap-1.5">{sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send reviewed</Button>
            </div>
          </div>
          {sending && <Progress value={sendProgress} className="mt-3" />}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search business, owner, email, or website" className="pl-9" /></div>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All leads</option><option value="needs_review">Needs review</option><option value="ready">Ready to send</option><option value="opted_out">Opted out</option>
            </select>
            <select value={selectedImportId} onChange={event => { setSelectedImportId(event.target.value); setSelectedIds(new Set()); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-48">
              <option value="all">All lead lists</option>
              {imports.map(item => <option key={item.id} value={item.id}>{item.name} ({item.row_count})</option>)}
            </select>
          </div>

          {leads.length === 0 ? (
            <div className="py-16 text-center border border-dashed rounded-xl">
              <Upload className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium">No records imported yet</p>
              <p className="text-sm text-muted-foreground mt-1">Upload any file. The original file and any readable rows will be saved.</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No leads match this filter.</div>
          ) : (
            <div className="space-y-2">
              {filteredLeads.map(lead => {
                const expanded = expandedId === lead.id;
                const selected = selectedIds.has(lead.id);
                return (
                  <div key={lead.id} className={`rounded-xl border transition-colors ${expanded ? 'border-primary/40 bg-primary/[0.02]' : 'border-border/70'}`}>
                    <div className="flex items-start gap-3 p-3 sm:p-4">
                      <input aria-label={`Select ${lead.business_name}`} type="checkbox" checked={selected} onChange={() => toggleSelected(lead.id)} className="mt-1.5 h-4 w-4 accent-primary" />
                      <button type="button" onClick={() => setExpandedId(expanded ? null : lead.id)} className="flex-1 min-w-0 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold truncate">{lead.business_name}</span>
                          {lead.opted_out && <Badge variant="outline" className="text-red-600 border-red-200 bg-red-500/5">Opted out</Badge>}
                          {lead.send_status === 'sent' && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-500/5">Sent</Badge>}
                          {!lead.opted_out && <Badge variant="outline" className="text-xs">{statusLabel(lead.research_status)}</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {lead.owner_name && <span className="flex items-center gap-1"><UserRound className="w-3 h-3" />{lead.owner_name}</span>}
                          {lead.email ? <span>{lead.email}</span> : <span className="italic">No email</span>}
                          {lead.source_file_name && <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{lead.source_file_name}</span>}
                          {lead.website && <span className="flex items-center gap-1"><Globe2 className="w-3 h-3" />{displayWebsite(lead.website)}</span>}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => researchLead(lead)} disabled={researching === lead.id || lead.opted_out} className="hidden sm:flex gap-1.5">
                          {researching === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Research
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setExpandedId(expanded ? null : lead.id)} aria-label="Toggle lead details">{expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 -rotate-90" />}</Button>
                      </div>
                    </div>
                    {expanded && (
                      <div className="border-t px-4 py-4 space-y-4 bg-muted/[0.18]">
                        <div className="grid lg:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div><Label className="text-xs">Business</Label><Input value={lead.business_name} onChange={event => updateLocalLead(lead.id, { business_name: event.target.value })} onBlur={event => saveLead(lead.id, { business_name: event.target.value })} /></div>
                              <div><Label className="text-xs">Owner / contact</Label><Input value={lead.owner_name} onChange={event => updateLocalLead(lead.id, { owner_name: event.target.value })} onBlur={event => saveLead(lead.id, { owner_name: event.target.value })} /></div>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div><Label className="text-xs">App / product</Label><Input value={lead.app_name} onChange={event => updateLocalLead(lead.id, { app_name: event.target.value })} onBlur={event => saveLead(lead.id, { app_name: event.target.value })} /></div>
                              <div><Label className="text-xs">Email</Label><Input value={lead.email} onChange={event => updateLocalLead(lead.id, { email: event.target.value })} onBlur={event => saveLead(lead.id, { email: event.target.value })} /></div>
                              <div><Label className="text-xs">Website</Label><Input value={lead.website} onChange={event => updateLocalLead(lead.id, { website: event.target.value })} onBlur={event => saveLead(lead.id, { website: event.target.value })} /></div>
                            </div>
                            <div className="rounded-lg border bg-background p-3 space-y-2"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Imported fields</p><span className="text-xs text-muted-foreground">{Object.keys(lead.raw_data || {}).length} columns</span></div><div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-auto">{Object.entries(lead.raw_data || {}).map(([key, value]) => <div key={key} className="rounded-md bg-muted/50 p-2"><p className="text-[11px] font-medium text-muted-foreground break-words">{key}</p><p className="text-sm break-words">{value || '—'}</p></div>)}</div></div>
                            <div><Label className="text-xs">Your research notes</Label><Textarea value={lead.source_notes} onChange={event => updateLocalLead(lead.id, { source_notes: event.target.value })} onBlur={event => saveLead(lead.id, { source_notes: event.target.value })} placeholder="What did you notice about the product, website, or opportunity?" className="min-h-24" /></div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => researchLead(lead)} disabled={researching === lead.id || lead.opted_out} className="gap-1.5">{researching === lead.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Research this lead</Button>
                              {lead.website && <Button variant="outline" size="sm" onClick={() => window.open(lead.website, '_blank', 'noopener,noreferrer')} className="gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Open website</Button>}
                              {lead.source_file_path && <Button variant="outline" size="sm" onClick={() => openSourceFile(lead)} className="gap-1.5"><FileDown className="w-3.5 h-3.5" /> Open original file</Button>}
                              <Button variant={lead.opted_out ? 'secondary' : 'ghost'} size="sm" onClick={() => saveLead(lead.id, { opted_out: !lead.opted_out })} className="gap-1.5">{lead.opted_out ? <Check className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />} {lead.opted_out ? 'Opted out' : 'Mark opted out'}</Button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-lg border bg-background p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Research brief</p>
                              <p className="text-sm mt-2">{lead.research_summary || 'No research yet. Run research or add notes on the left.'}</p>
                              {lead.pain_points.length > 0 && <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground space-y-1">{lead.pain_points.map(point => <li key={point}>{point}</li>)}</ul>}
                            </div>
                            <div className="rounded-lg border bg-background p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personalized draft</p>{lead.email_subject && <Badge variant="outline" className="text-green-600 border-green-200">Ready to review</Badge>}</div>
                              {lead.email_subject ? <><Input value={lead.email_subject} onChange={event => updateLocalLead(lead.id, { email_subject: event.target.value })} onBlur={event => saveLead(lead.id, { email_subject: event.target.value })} /><Textarea value={lead.email_body} onChange={event => updateLocalLead(lead.id, { email_body: event.target.value })} onBlur={event => saveLead(lead.id, { email_body: event.target.value })} className="min-h-40" /><Button variant="outline" size="sm" onClick={() => personalizeLead(lead)} disabled={personalizing || lead.opted_out} className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Regenerate</Button></> : <div className="text-sm text-muted-foreground py-4">Select this lead after research, then click <strong>Personalize selected</strong>.</div>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-3xl"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>Original uploads are kept in your Cloudinary account. Records without email addresses are saved for review, but only records with email addresses can be sent messages.</p></div>
    </div>
  );
}