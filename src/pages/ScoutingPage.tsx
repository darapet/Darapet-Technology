import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  AlertCircle, Check, CheckCircle2, ChevronDown, Globe2, Loader2, Mail, Megaphone,
  FileUp, Search, Send, ShieldCheck, Sparkles, UserRound, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { hasUsableEmailProvider, sendEmail } from '@/lib/emailSend';
import { disconnectGmail, getGmailStatus, sendGmail, startGmailConnection, type GmailStatus } from '@/lib/gmail';
import { extractLeadEmails, extractLeadsFromFile, toHtmlEmail, type ResearchSnapshot, type ScoutLead } from '@/lib/scouting';
import { EMAIL_TEMPLATES } from '@/pages/email/emailTemplates';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

type PersonalizationResponse = { subject: string; body: string };
type StatusFilter = 'all' | 'ready' | 'drafted' | 'sent' | 'opted_out';

const db = supabase as any;

function storedResearch(lead: ScoutLead): ResearchSnapshot | null {
  const value = lead.research_data && typeof lead.research_data === 'object' ? lead.research_data : null;
  if (!value) return null;
  return {
    ...value,
    merits: Array.isArray(value.merits) ? value.merits : [],
    demerits: Array.isArray(value.demerits) ? value.demerits : [],
    improvements: Array.isArray(value.improvements) ? value.improvements : [],
    contactHints: Array.isArray(value.contactHints) ? value.contactHints : [],
  };
}

function displayWebsite(url: string) {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function leadStatus(lead: ScoutLead) {
  if (lead.opted_out) return 'Opted out';
  if (lead.send_status === 'sent') return 'Sent';
  if (lead.email_drafts?.length || lead.personalization_status === 'generated') return 'Draft ready';
  return 'Ready to personalize';
}

export function ScoutingPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<ScoutLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [personalizing, setPersonalizing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState((EMAIL_TEMPLATES as any[])[0]?.id || '');
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false, email: null, connectedAt: null });
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailAction, setGmailAction] = useState(false);
  const [gmailError, setGmailError] = useState('');
  const importLeadFile = async (file: File) => {
    if (!user) return;
    setImporting(true);
    try {
      const parsed = await extractLeadsFromFile(file);
      const usable = parsed.filter(lead => Object.keys(lead.raw_data || {}).length > 0 || lead.business_name !== file.name);
      if (!usable.length) throw new Error('No lead rows were found in that file.');

      let sourceFilePath: string | null = null;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const storagePath = user.id + '/' + crypto.randomUUID() + '-' + safeName;
      const { error: uploadError } = await db.storage.from('scouting-imports').upload(storagePath, file, { contentType: file.type || 'application/octet-stream', upsert: false });
      const storageWarning = uploadError?.message || '';
      if (!uploadError) sourceFilePath = storagePath;

      const columns = Array.from(new Set(usable.flatMap(lead => lead.source_headers || Object.keys(lead.raw_data || {}))));
      const { data: batch, error: batchError } = await db.from('scout_imports').insert({
        user_id: user.id,
        name: file.name,
        original_file_name: file.name,
        source_file_path: sourceFilePath,
        source_file_type: file.type || 'application/octet-stream',
        source_file_size: file.size,
        columns,
        row_count: usable.length,
      }).select('id').single();
      if (batchError || !batch?.id) throw new Error(batchError?.message || 'Could not create the import batch.');

      const rows = usable.map(lead => ({
        ...lead,
        user_id: user.id,
        import_id: batch.id,
        source_file_name: file.name,
        source_file_path: sourceFilePath,
        source_file_type: file.type || 'application/octet-stream',
        source_file_size: file.size,
      }));
      const { data: imported, error: importError } = await db.from('scout_leads').insert(rows).select('*');
      if (importError) throw new Error(importError.message);
      const saved = (imported || []) as ScoutLead[];
      setLeads(current => [...saved, ...current]);
      setSelectedIds(new Set());
      toast({ title: 'Import complete', description: saved.length + ' lead' + (saved.length === 1 ? '' : 's') + ' added. Select the lead(s) you want to work on, then choose Research, Personalize, or Send.' + (storageWarning ? ' The original file could not be archived, but the lead rows were imported.' : '') });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not import that file', description: error instanceof Error ? error.message : 'Check the file and try again.' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data, error } = await db.from('scout_leads').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) toast({ variant: 'destructive', title: 'Could not load scouting contacts', description: error.message });
      let loaded = (data || []) as ScoutLead[];
      try {
        const { data: asset } = await db.from('user_assets')
          .select('name, original_filename, size_bytes, cloudinary_url')
          .eq('user_id', user.id)
          .eq('asset_type', 'pdf')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (asset?.cloudinary_url && !loaded.some(lead => lead.source_file_path === asset.cloudinary_url)) {
          const response = await fetch(asset.cloudinary_url);
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], asset.original_filename || asset.name || 'scouting-leads.pdf', { type: 'application/pdf' });
            const parsed = await extractLeadsFromFile(file);
            const usable = parsed.filter(lead => Object.keys(lead.raw_data || {}).length > 0 && lead.business_name !== file.name);
            if (usable.length) {
              const rows = usable.map(lead => ({ ...lead, user_id: user.id, source_file_name: file.name, source_file_path: asset.cloudinary_url, source_file_type: 'application/pdf', source_file_size: Number(asset.size_bytes || file.size) }));
              const { data: imported, error: importError } = await db.from('scout_leads').insert(rows).select('*');
              if (!importError && imported?.length) {
                loaded = [...(imported as ScoutLead[]), ...loaded];
                toast({ title: imported.length + ' contacts synced from your stored PDF', description: 'They are ready for OpenAI research and drafting.' });
              }
            }
          }
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Stored PDF sync skipped', description: error instanceof Error ? error.message : 'The existing leads were still loaded.' });
      }
      setLeads(loaded);
      setSelectedIds(new Set());
      setLoading(false);
    };
    void load();
  }, [toast, user]);
  useEffect(() => {
    if (!user) return;
    getGmailStatus()
      .then(status => { setGmailStatus(status); setGmailError(''); })
      .catch(error => setGmailError(error instanceof Error ? error.message : 'Gmail connection is not available yet.'))
      .finally(() => setGmailLoading(false));
  }, [user]);

  const updateLocalLead = (id: string, patch: Partial<ScoutLead>) => {
    setLeads(current => current.map(lead => lead.id === id ? { ...lead, ...patch } : lead));
  };

  const saveLead = async (id: string, patch: Partial<ScoutLead>) => {
    updateLocalLead(id, patch);
    const { error } = await db.from('scout_leads').update(patch).eq('id', id).eq('user_id', user!.id);
    if (error) toast({ variant: 'destructive', title: 'Could not save contact', description: error.message });
  };

  const callOpenAiAgent = async (lead: ScoutLead, recipientEmail: string) => {
    const { data, error } = await supabase.functions.invoke('openai-scouting-agent', {
      body: {
        lead,
        recipientEmail,
        senderName: profile?.company || profile?.name || 'Darapet Technology',
      },
    });
    if (data?.error) throw new Error(data.error);
    if (error) {
      let message = error.message || 'The OpenAI scouting agent failed.';
      try {
        const context = (error as any).context;
        if (context && typeof context.clone === 'function') {
          const payload = await context.clone().json();
          if (typeof payload?.error === 'string') message = payload.error;
        }
      } catch {
        // Keep Supabase's fallback message when the error response is not JSON.
      }
      throw new Error(message);
    }
    if (!data?.subject || !data?.body) throw new Error('The OpenAI scouting agent returned no draft.');
    return data as { subject: string; body: string; research?: Partial<ResearchSnapshot>; searched?: boolean; provider?: 'groq' | 'openai' };
  };

  const personalizeLead = async (lead: ScoutLead) => {
    const recipientEmails = extractLeadEmails(lead);
    if (!recipientEmails.length) return;
    const drafts = [] as Array<{ recipientEmail: string; subject: string; body: string }>;
    let latestResearch: ResearchSnapshot | null = null;
    for (const recipientEmail of recipientEmails) {
      const result = await callOpenAiAgent(lead, recipientEmail);
      drafts.push({ recipientEmail, subject: result.subject, body: result.body });
      if (result.research) {
        latestResearch = {
          leadId: lead.id,
          website: lead.website || '',
          status: 'complete',
          success: true,
          httpStatus: null,
          statusText: result.provider === 'groq' ? 'Groq draft created from saved lead data' : result.searched ? 'OpenAI web research completed' : 'OpenAI draft based on saved lead data',
          websiteName: result.research.websiteName || lead.business_name,
          description: result.research.description || '',
          ownerName: lead.owner_name || '',
          merits: Array.isArray(result.research.merits) ? result.research.merits : [],
          demerits: Array.isArray(result.research.demerits) ? result.research.demerits : [],
          concentration: result.research.concentration || '',
          improvements: Array.isArray(result.research.improvements) ? result.research.improvements : [],
          contactHints: Array.isArray(result.research.contactHints) ? result.research.contactHints : [],
          analyzedAt: new Date().toISOString(),
        };
      }
    }
    const first = drafts[0];
    await saveLead(lead.id, {
      email_drafts: drafts,
      personalization_status: 'generated',
      email_subject: first?.subject || '',
      email_body: first?.body || '',
      research_status: 'researched',
      research_data: latestResearch || storedResearch(lead),
      research_summary: latestResearch?.description || latestResearch?.websiteName || 'AI research completed',
      pain_points: latestResearch?.demerits || [],
    });
  };

  const personalizeSelected = async () => {
    const targets = activeLeads.filter(lead => selectedIds.has(lead.id) && !lead.opted_out && extractLeadEmails(lead).length);
    if (!targets.length) {
      toast({ variant: 'destructive', title: 'No contacts with email addresses selected', description: 'Select at least one saved lead with a recipient email.' });
      return;
    }
    setPersonalizing(true);
    let completed = 0;
    try {
      for (const lead of targets) {
        await personalizeLead(lead);
        completed += 1;
      }
      toast({ title: completed + ' personalized drafts ready', description: 'Choose a design, review the messages, then send.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'AI personalization stopped', description: error instanceof Error ? error.message : 'Check the OpenAI connection and try again.' });
    } finally {
      setPersonalizing(false);
    }
  };


  const connectGmail = async () => {
    setGmailAction(true);
    try { await startGmailConnection(); }
    catch (error) { toast({ variant: 'destructive', title: 'Could not start Gmail connection', description: error instanceof Error ? error.message : 'Try again.' }); setGmailAction(false); }
  };

  const disconnectConnectedGmail = async () => {
    if (!window.confirm('Disconnect this Gmail account from Darapet?')) return;
    setGmailAction(true);
    try { await disconnectGmail(); setGmailStatus({ connected: false, email: null, connectedAt: null }); toast({ title: 'Gmail disconnected' }); }
    catch (error) { toast({ variant: 'destructive', title: 'Could not disconnect Gmail', description: error instanceof Error ? error.message : 'Try again.' }); }
    finally { setGmailAction(false); }
  };

  const renderLeadEmail = (lead: ScoutLead) => {
    const template = (EMAIL_TEMPLATES as any[]).find(item => item.id === selectedTemplateId) || (EMAIL_TEMPLATES as any[])[0];
    if (!template?.renderHTML) return '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">' + toHtmlEmail(lead.email_body) + '</div>';
    return template.renderHTML({
      brandName: profile?.company || profile?.name || 'Darapet Technology',
      logoUrl: (profile as any)?.logo_url || '',
      brandColor: (profile as any)?.brand_color || '#2563eb',
      emailBgColor: '#f8fafc',
      subject: lead.email_subject,
      body: lead.email_body,
      signatureUrl: null,
      recipientName: lead.owner_name || 'there',
      socialLinks: [],
      websiteUrl: (profile as any)?.website_url || '',
      ctaUrl: lead.website || (profile as any)?.website_url || '#',
    });
  };

  const sendSelected = async () => {
    const targets = leads.flatMap(lead => {
      if (!selectedIds.has(lead.id) || lead.opted_out) return [];
      const drafts = lead.email_drafts?.length ? lead.email_drafts : lead.email && lead.email_subject && lead.email_body ? [{ recipientEmail: lead.email, subject: lead.email_subject, body: lead.email_body }] : [];
      return drafts.filter(draft => draft.recipientEmail && draft.subject && draft.body).map(draft => ({ lead, draft }));
    });
    if (!targets.length) {
      toast({ variant: 'destructive', title: 'No reviewed drafts selected', description: 'Personalize contacts and review the drafts before sending.' });
      return;
    }
    if (!window.confirm('Send ' + targets.length + ' reviewed message' + (targets.length === 1 ? '' : 's') + ' now? Opted-out contacts are excluded.')) return;

    let provider: any = null;
    if (!gmailStatus.connected) {
      const { data } = await db.from('profiles').select('brevo_api_key, active_smtp, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure').eq('id', user!.id).single();
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
      subject: ((EMAIL_TEMPLATES as any[]).find(item => item.id === selectedTemplateId)?.name || 'Scouting outreach'),
      body: 'Individualized scouting messages from pasted contacts',
      recipients: targets.map(target => target.draft.recipientEmail),
      status: 'sending',
      created_at: new Date().toISOString(),
    }).select('id').single();
    let sent = 0;
    for (const [index, target] of targets.entries()) {
      const lead = target.lead;
      updateLocalLead(lead.id, { send_status: 'sending' });
      let sendOk = false;
      let sendError = '';
      try {
        const sendLead = { ...lead, email: target.draft.recipientEmail, email_subject: target.draft.subject, email_body: target.draft.body };
        if (gmailStatus.connected) {
          const result = await sendGmail({ fromName: profile?.name || 'Darapet', to: target.draft.recipientEmail, subject: target.draft.subject, html: renderLeadEmail(sendLead) });
          sendOk = result.success;
        } else {
          const result = await sendEmail({ config: provider, fromName: profile?.name || 'Darapet', fromEmail: profile?.email || user!.email!, to: target.draft.recipientEmail, subject: target.draft.subject, html: renderLeadEmail(sendLead) });
          sendOk = result.ok;
          sendError = result.error || '';
        }
      } catch (error) { sendError = error instanceof Error ? error.message : 'Send failed'; }
      await db.from('email_sends').insert({ user_id: user!.id, campaign_id: campaign?.id || null, lead_id: lead.id, to_email: target.draft.recipientEmail, subject: target.draft.subject, provider: gmailStatus.connected ? 'gmail' : provider?.active_smtp === 'smtp' ? 'smtp' : 'brevo', status: sendOk ? 'sent' : 'failed', error_msg: sendError || null, sent_at: new Date().toISOString() });
      if (sendOk) sent += 1;
      await db.from('scout_leads').update({ send_status: sendOk ? 'sent' : 'failed', sent_at: sendOk ? new Date().toISOString() : null }).eq('id', lead.id).eq('user_id', user!.id);
      updateLocalLead(lead.id, { send_status: sendOk ? 'sent' : 'failed', sent_at: sendOk ? new Date().toISOString() : null });
      setSendProgress(Math.round(((index + 1) / targets.length) * 100));
    }
    if (campaign?.id) await db.from('campaigns').update({ status: sent === targets.length ? 'sent' : 'failed', sent_count: sent, sent_at: new Date().toISOString() }).eq('id', campaign.id);
    setSending(false);
    toast({ title: sent + ' of ' + targets.length + ' messages sent', description: sent === targets.length ? 'Campaign history has been updated.' : 'Failed sends are marked for review.' });
  };

  const activeLeads = leads;
  const filteredLeads = useMemo(() => activeLeads.filter(lead => {
    const query = filter.toLowerCase();
    const matchesText = !query || [lead.business_name, lead.app_name, lead.owner_name, lead.email, lead.website, ...Object.values(lead.raw_data || {})].some(value => String(value || '').toLowerCase().includes(query));
    const status = leadStatus(lead);
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'ready' && status === 'Ready to personalize') || (statusFilter === 'drafted' && status === 'Draft ready') || (statusFilter === 'sent' && status === 'Sent') || (statusFilter === 'opted_out' && status === 'Opted out');
    return matchesText && matchesStatus;
  }), [activeLeads, filter, statusFilter]);
  const stats = { total: activeLeads.length, ready: activeLeads.filter(lead => leadStatus(lead) === 'Ready to personalize').length, drafts: activeLeads.filter(lead => leadStatus(lead) === 'Draft ready').length, sent: activeLeads.filter(lead => leadStatus(lead) === 'Sent').length };

  const toggleSelected = (id: string) => setSelectedIds(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const selectedLeadIds = Array.from(selectedIds);
  const selectVisible = () => setSelectedIds(current => { const next = new Set(current); filteredLeads.forEach(lead => next.add(lead.id)); return next; });
  const clearSelected = () => setSelectedIds(new Set());

  if (loading) return <div className="max-w-6xl mx-auto space-y-6"><Skeleton className="h-10 w-72" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map(item => <Skeleton key={item} className="h-24 rounded-xl" />)}</div><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2"><Megaphone className="w-4 h-4" /> Scouting workspace</div>
          <h1 className="text-3xl font-bold tracking-tight">AI research, choose a design, send</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Groq researches and drafts only the leads you select. Choose your email design, review the messages, and send.</p>
        </div>
        <Link href="/campaigns/history"><Button variant="outline" className="gap-2"><Mail className="w-4 h-4" /> Campaign history</Button></Link>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><p className="font-semibold flex items-center gap-2"><FileUp className="w-4 h-4 text-primary" /> Import more leads</p><p className="text-sm text-muted-foreground mt-1">Upload a PDF, CSV, JSON, TXT, or TSV file. Nothing is researched or drafted until you choose the leads.</p></div>
          <div className="flex items-center gap-2"><input ref={fileInputRef} type="file" accept=".pdf,.csv,.json,.txt,.tsv,.xml,.html,application/pdf,text/csv,application/json,text/plain" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void importLeadFile(file); }} /><Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} className="gap-1.5">{importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />} {importing ? 'Importing…' : 'Choose file'}</Button></div>
        </CardContent>
      </Card>
      <Card className={gmailStatus.connected ? 'border-green-200 bg-green-500/[0.03]' : 'border-primary/20 bg-primary/[0.03]'}>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="flex items-start gap-3"><div className={'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' + (gmailStatus.connected ? 'bg-green-500/10 text-green-600' : 'bg-primary/10 text-primary')}><Mail className="w-5 h-5" /></div><div><p className="font-semibold flex items-center gap-2">Send from Gmail {gmailStatus.connected && <Badge variant="outline" className="text-green-600 border-green-200">Connected</Badge>}</p>{gmailLoading ? <p className="text-sm text-muted-foreground mt-1">Checking connection…</p> : gmailStatus.connected ? <p className="text-sm text-muted-foreground mt-1">{gmailStatus.email} will be used for reviewed scouting sends.</p> : <p className="text-sm text-muted-foreground mt-1">Connect a mailbox so messages send from your Gmail account.</p>}{gmailError && <p className="text-xs text-amber-600 mt-1">{gmailError}</p>}</div></div>{gmailStatus.connected ? <Button variant="outline" size="sm" onClick={disconnectConnectedGmail} disabled={gmailAction}>{gmailAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Disconnect</Button> : <Button size="sm" onClick={connectGmail} disabled={gmailAction || gmailLoading}>{gmailAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Connect Gmail</Button>}</CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><CardTitle className="text-base">Saved contacts</CardTitle><p className="text-sm text-muted-foreground mt-1">Select the exact lead(s) you want Groq to research, draft, or send to. Nothing runs until you choose them.</p></div><div className="flex flex-wrap gap-2"><Badge variant="secondary">{selectedIds.size} selected</Badge><Button variant="ghost" size="sm" onClick={selectVisible} disabled={!filteredLeads.length}>Select visible</Button><Button variant="ghost" size="sm" onClick={clearSelected} disabled={!selectedIds.size}>Clear</Button>{personalizing && <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Groq is researching and drafting…</span>}<Button variant="outline" size="sm" onClick={() => setLocation('/scouting/research?leadIds=' + encodeURIComponent(selectedLeadIds.join(',')))} disabled={!selectedLeadIds.length || personalizing || sending} className="gap-1.5"><Search className="w-3.5 h-3.5" /> Research selected</Button><Button variant="outline" size="sm" onClick={() => void personalizeSelected()} disabled={!selectedLeadIds.length || personalizing || sending} className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Personalize selected</Button><select value={selectedTemplateId} onChange={event => setSelectedTemplateId(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" aria-label="Choose email design">{(EMAIL_TEMPLATES as any[]).map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select><Button size="sm" onClick={sendSelected} disabled={sending || personalizing || !selectedIds.size} className="gap-1.5">{sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send reviewed</Button></div></div>{sending && <Progress value={sendProgress} className="mt-3" />}</CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold mt-1">{stats.total}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Ready</p><p className="text-2xl font-bold mt-1">{stats.ready}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Drafts</p><p className="text-2xl font-bold mt-1">{stats.drafts}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Sent</p><p className="text-2xl font-bold mt-1">{stats.sent}</p></div></div>
          <div className="flex flex-col sm:flex-row gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search business, owner, email, website, or any pasted field" className="pl-9" /></div><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All contacts</option><option value="ready">Ready</option><option value="drafted">Draft ready</option><option value="sent">Sent</option><option value="opted_out">Opted out</option></select></div>
          {filteredLeads.length === 0 ? <div className="py-16 text-center border border-dashed rounded-xl"><Megaphone className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" /><p className="font-medium">No saved contacts yet</p><p className="text-sm text-muted-foreground mt-1">Choose a file above to import leads and begin.</p></div> : <div className="space-y-2">{filteredLeads.map(lead => {
            const expanded = expandedId === lead.id;
            const selected = selectedIds.has(lead.id);
            const research = storedResearch(lead);
            const drafts = lead.email_drafts?.length ? lead.email_drafts : lead.email_subject && lead.email_body && lead.email ? [{ recipientEmail: lead.email, subject: lead.email_subject, body: lead.email_body }] : [];
            return <div key={lead.id} className={'rounded-xl border transition-colors ' + (expanded ? 'border-primary/40 bg-primary/[0.02]' : 'border-border/70')}>
              <div className="flex items-start gap-3 p-3 sm:p-4"><input aria-label={'Select ' + lead.business_name} type="checkbox" checked={selected} onChange={() => toggleSelected(lead.id)} className="mt-1.5 h-4 w-4 accent-primary" /><button type="button" onClick={() => setExpandedId(expanded ? null : lead.id)} className="flex-1 min-w-0 text-left"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold truncate">{lead.business_name}</span><Badge variant="outline" className={leadStatus(lead) === 'Sent' ? 'text-green-600 border-green-200' : ''}>{leadStatus(lead)}</Badge></div><div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">{lead.owner_name && <span className="flex items-center gap-1"><UserRound className="w-3 h-3" />{lead.owner_name}</span>}<span>{extractLeadEmails(lead).join(', ') || 'No email'}</span>{lead.website && <span className="flex items-center gap-1"><Globe2 className="w-3 h-3" />{displayWebsite(lead.website)}</span>}</div></button><Button variant="ghost" size="icon" onClick={() => setExpandedId(expanded ? null : lead.id)} aria-label="Toggle contact details">{expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 -rotate-90" />}</Button></div>
              {expanded && <div className="border-t px-4 py-4 space-y-4 bg-muted/[0.18]"><div className="grid lg:grid-cols-2 gap-4"><div className="space-y-3"><div className="rounded-lg border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact details</p><div className="grid sm:grid-cols-2 gap-3 mt-3"><div><Label className="text-xs">Business</Label><Input value={lead.business_name} onChange={event => updateLocalLead(lead.id, { business_name: event.target.value })} onBlur={event => saveLead(lead.id, { business_name: event.target.value })} /></div><div><Label className="text-xs">Owner / contact</Label><Input value={lead.owner_name} onChange={event => updateLocalLead(lead.id, { owner_name: event.target.value })} onBlur={event => saveLead(lead.id, { owner_name: event.target.value })} /></div><div><Label className="text-xs">Website</Label><Input value={lead.website} onChange={event => updateLocalLead(lead.id, { website: event.target.value })} onBlur={event => saveLead(lead.id, { website: event.target.value })} /></div><div><Label className="text-xs">Primary email</Label><Input value={lead.email} onChange={event => updateLocalLead(lead.id, { email: event.target.value })} onBlur={event => saveLead(lead.id, { email: event.target.value })} /></div></div></div><div className="rounded-lg border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All pasted fields</p><div className="grid sm:grid-cols-2 gap-2 mt-3 max-h-72 overflow-auto">{Object.entries(lead.raw_data || {}).map(([key, value]) => <div key={key} className="rounded-md bg-muted/50 p-2"><p className="text-[11px] font-medium text-muted-foreground break-words">{key}</p><p className="text-sm break-words">{value || '—'}</p></div>)}</div></div><Button variant={lead.opted_out ? 'secondary' : 'ghost'} size="sm" onClick={() => saveLead(lead.id, { opted_out: !lead.opted_out })} className="gap-1.5 w-fit">{lead.opted_out ? <Check className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />} {lead.opted_out ? 'Opted out' : 'Mark opted out'}</Button></div><div className="space-y-3"><div className="rounded-lg border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Groq research for this contact</p>{research ? <div className="space-y-3 mt-3"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Website name</p><p className="text-sm mt-1">{research.websiteName || '—'}</p></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Description / concentration</p><p className="text-sm mt-1">{research.description || research.concentration || '—'}</p></div><div className="grid sm:grid-cols-2 gap-3"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Merits</p>{research.merits.length ? <ul className="list-disc pl-4 mt-1 text-sm space-y-1">{research.merits.map(item => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground mt-1">—</p>}</div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Demerits</p>{research.demerits.length ? <ul className="list-disc pl-4 mt-1 text-sm space-y-1">{research.demerits.map(item => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground mt-1">—</p>}</div></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Improvements</p><p className="text-sm mt-1">{research.improvements.join('; ') || '—'}</p></div></div> : <p className="text-sm text-muted-foreground mt-2">No structured research fields were detected in this row.</p>}</div><div className="rounded-lg border bg-background p-3 space-y-2"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personalized drafts</p>{drafts.length > 0 && <Badge variant="outline" className="text-green-600 border-green-200">{drafts.length} recipient{drafts.length === 1 ? '' : 's'}</Badge>}</div>{drafts.length ? drafts.map(draft => <div key={draft.recipientEmail} className="rounded-md border p-2 space-y-2"><p className="text-xs font-medium text-muted-foreground">{draft.recipientEmail}</p><Input value={draft.subject} onChange={event => { const next = drafts.map(item => item.recipientEmail === draft.recipientEmail ? { ...item, subject: event.target.value } : item); updateLocalLead(lead.id, { email_drafts: next, email_subject: next[0]?.subject || '' }); }} onBlur={() => saveLead(lead.id, { email_drafts: drafts })} /><Textarea value={draft.body} onChange={event => { const next = drafts.map(item => item.recipientEmail === draft.recipientEmail ? { ...item, body: event.target.value } : item); updateLocalLead(lead.id, { email_drafts: next, email_body: next[0]?.body || '' }); }} onBlur={() => saveLead(lead.id, { email_drafts: drafts })} className="min-h-32" /></div>) : <p className="text-sm text-muted-foreground py-4">Select this contact and click Personalize selected.</p>}{drafts.length > 0 && <Button variant="outline" size="sm" onClick={() => personalizeLead(lead)} disabled={personalizing || lead.opted_out} className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Regenerate</Button>}</div></div></div></div>}
            </div>;
          })}</div>}
        </CardContent>
      </Card>
      <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-3xl"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>Groq processes only the leads you select. No contact data is mixed, and nothing is sent until you review the individual drafts.</p></div>
    </div>
  );
}
