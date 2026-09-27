import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  AlertCircle, Check, CheckCircle2, ChevronDown, Globe2, Loader2, Mail, Megaphone,
  Search, Send, ShieldCheck, Sparkles, UserRound, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { hasUsableEmailProvider, sendEmail } from '@/lib/emailSend';
import { disconnectGmail, getGmailStatus, sendGmail, startGmailConnection, type GmailStatus } from '@/lib/gmail';
import { extractLeadEmails, parseAiJson, parsePastedLeads, toHtmlEmail, type ResearchSnapshot, type ScoutLead } from '@/lib/scouting';
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
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState<ScoutLead[]>([]);
  const [savingPaste, setSavingPaste] = useState(false);
  const [personalizing, setPersonalizing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [personalizationPrompt, setPersonalizationPrompt] = useState('');
  const [showPersonalizationPrompt, setShowPersonalizationPrompt] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false, email: null, connectedAt: null });
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailAction, setGmailAction] = useState(false);
  const [gmailError, setGmailError] = useState('');
  const [groqKey, setGroqKey] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data, error }, { data: settings }] = await Promise.all([
        db.from('scout_leads').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('settings').select('groq_api_key').eq('id', 1).maybeSingle(),
      ]);
      if (error) toast({ variant: 'destructive', title: 'Could not load scouting contacts', description: error.message });
      setLeads((data || []) as ScoutLead[]);
      setGroqKey(settings?.groq_api_key || '');
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

  const previewPasted = () => {
    try {
      const parsed = parsePastedLeads(pasteText);
      if (!parsed.length) throw new Error('No contacts were recognized. Paste a JSON array, CSV/TSV table, or Markdown table with a business, website, and email column.');
      setPreview(parsed);
      toast({ title: parsed.length + ' contacts recognized', description: 'Review the rows below, then save them to scouting.' });
    } catch (error) {
      setPreview([]);
      toast({ variant: 'destructive', title: 'Could not read pasted contacts', description: error instanceof Error ? error.message : 'Use the example format shown below.' });
    }
  };

  const savePasted = async () => {
    const parsed = preview.length ? preview : parsePastedLeads(pasteText);
    if (!parsed.length) {
      previewPasted();
      return;
    }
    setSavingPaste(true);
    try {
      const rows = parsed.map(lead => ({ ...lead, user_id: user!.id }));
      const { data, error } = await db.from('scout_leads').insert(rows).select('*');
      if (error) throw new Error(error.message);
      const saved = (data || []) as ScoutLead[];
      setLeads(current => [...saved, ...current]);
      setSelectedIds(new Set(saved.map(lead => lead.id)));
      setPasteText('');
      setPreview([]);
      toast({ title: saved.length + ' contacts saved', description: 'Each row is ready to personalize separately.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save contacts', description: error instanceof Error ? error.message : 'Try pasting the data again.' });
    } finally {
      setSavingPaste(false);
    }
  };

  const aiKey = profile?.groq_api_key || groqKey;

  const callGroq = async <T,>(prompt: string): Promise<T> => {
    if (!aiKey) throw new Error('Add a Groq API key in Admin Settings before personalizing contacts.');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + aiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Return only valid JSON. Use only the supplied contact data. Do not browse, invent facts, or mix one contact with another.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.35,
        max_tokens: 700,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'AI personalization failed.');
    const parsed = parseAiJson<T>(data.choices?.[0]?.message?.content || '');
    if (!parsed) throw new Error('The AI returned an unreadable response. Try again.');
    return parsed;
  };

  const personalizeLead = async (lead: ScoutLead) => {
    const research = storedResearch(lead);
    const recipientEmails = extractLeadEmails(lead);
    if (!research || !recipientEmails.length) return;
    const drafts = await Promise.all(recipientEmails.map(async recipientEmail => {
      const result = await callGroq<PersonalizationResponse>(
        'Write one distinct, respectful outreach email for exactly this contact.\n' +
        'Personalization instruction: ' + personalizationPrompt + '\n' +
        'Contact ID: ' + lead.id + '\n' +
        'Recipient email: ' + recipientEmail + '\n' +
        'Business: ' + lead.business_name + '\n' +
        'Owner/contact: ' + (lead.owner_name || 'not provided') + '\n' +
        'Website: ' + (lead.website || 'not provided') + '\n' +
        'Website name: ' + (research.websiteName || 'not provided') + '\n' +
        'Description: ' + (research.description || 'not provided') + '\n' +
        'Merits: ' + research.merits.join('; ') + '\n' +
        'Demerits: ' + research.demerits.join('; ') + '\n' +
        'Area of concentration: ' + (research.concentration || 'not provided') + '\n' +
        'Areas for improvement: ' + research.improvements.join('; ') + '\n' +
        'Public contact hints: ' + research.contactHints.join('; ') + '\n' +
        'All pasted fields for this contact: ' + JSON.stringify(lead.raw_data || {}) + '\n' +
        'Sender: ' + (profile?.company || profile?.name || 'a freelance technology partner') + '\n' +
        'Return JSON exactly as {"subject":"...","body":"..."}. The body must be plain text, under 180 words, specific to this contact, and end with an unsubscribe sentence.'
      );
      return { recipientEmail, subject: result.subject || ('A quick idea for ' + lead.business_name), body: result.body || '' };
    }));
    const first = drafts[0];
    await saveLead(lead.id, {
      email_drafts: drafts,
      personalization_status: 'generated',
      email_subject: first?.subject || '',
      email_body: first?.body || '',
    });
  };

  const openPersonalizePrompt = () => {
    const targets = activeLeads.filter(lead => selectedIds.has(lead.id) && !lead.opted_out && storedResearch(lead) && extractLeadEmails(lead).length);
    if (!targets.length) {
      toast({ variant: 'destructive', title: 'Select contacts with email addresses', description: 'Every pasted row with an email is personalized separately.' });
      return;
    }
    setShowPersonalizationPrompt(true);
  };

  const personalizeSelected = async () => {
    const targets = activeLeads.filter(lead => selectedIds.has(lead.id) && !lead.opted_out && storedResearch(lead) && extractLeadEmails(lead).length);
    if (!targets.length) return;
    setShowPersonalizationPrompt(false);
    setPersonalizing(true);
    let completed = 0;
    try {
      for (const lead of targets) {
        await personalizeLead(lead);
        completed += 1;
      }
      toast({ title: completed + ' personalized drafts ready', description: 'Review each draft before sending.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Personalization stopped', description: error instanceof Error ? error.message : 'Try the remaining contacts again.' });
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
    const template = (EMAIL_TEMPLATES as any[])[0];
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
      subject: 'Scouting outreach',
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

  if (loading) return <div className="max-w-6xl mx-auto space-y-6"><Skeleton className="h-10 w-72" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map(item => <Skeleton key={item} className="h-24 rounded-xl" />)}</div><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-2"><Megaphone className="w-4 h-4" /> Scouting workspace</div>
          <h1 className="text-3xl font-bold tracking-tight">Paste leads, personalize, send</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">Give ChatGPT the research task first. Paste its finished contact data here, then each row is personalized separately from its own website, owner, merits, and demerits.</p>
        </div>
        <Link href="/campaigns/history"><Button variant="outline" className="gap-2"><Mail className="w-4 h-4" /> Campaign history</Button></Link>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardHeader><CardTitle>Paste contacts from ChatGPT</CardTitle><p className="text-sm text-muted-foreground">Paste 1 contact or 50+. JSON arrays and Markdown tables work best. Every row becomes a separate contact.</p></CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={pasteText} onChange={event => { setPasteText(event.target.value); setPreview([]); }} placeholder={'Paste ChatGPT output here, for example:\n[{"business":"Example Co","website":"https://example.com","owner_name":"Jane Doe","owner_email":"jane@example.com","merits":["Clear offer"],"demerits":["Weak call to action"],"improvements":["Add a stronger CTA"]}]'} className="min-h-48 font-mono text-sm" />
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={previewPasted} disabled={!pasteText.trim() || savingPaste}><Search className="w-4 h-4 mr-2" /> Preview contacts</Button><Button onClick={savePasted} disabled={!pasteText.trim() || savingPaste}>{savingPaste ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Save contacts</Button></div>
          <details className="rounded-lg border bg-background p-3 text-sm"><summary className="cursor-pointer font-medium">What fields can I paste?</summary><p className="text-muted-foreground mt-2">Business, website, website name, owner name, owner email, developer email, description, merits, demerits, concentration, improvements, contact hints, and any other fields. All unrecognized fields are preserved and sent to the AI for that same contact.</p></details>
          {preview.length > 0 && <div className="rounded-lg border bg-background p-3 space-y-2"><div className="flex items-center justify-between"><p className="font-semibold">Preview: {preview.length} contacts</p><Badge variant="outline">Ready to save</Badge></div><div className="max-h-56 overflow-auto space-y-1">{preview.slice(0, 8).map((lead, index) => <div key={lead.id} className="flex items-center gap-2 text-sm"><span className="text-muted-foreground w-5">{index + 1}.</span><span className="font-medium truncate">{lead.business_name}</span><span className="text-muted-foreground truncate">{lead.email || 'No email'}</span><span className="text-muted-foreground truncate">{lead.website || 'No website'}</span></div>)}{preview.length > 8 && <p className="text-xs text-muted-foreground">+ {preview.length - 8} more contacts</p>}</div></div>}
        </CardContent>
      </Card>

      <Card className={gmailStatus.connected ? 'border-green-200 bg-green-500/[0.03]' : 'border-primary/20 bg-primary/[0.03]'}>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="flex items-start gap-3"><div className={'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' + (gmailStatus.connected ? 'bg-green-500/10 text-green-600' : 'bg-primary/10 text-primary')}><Mail className="w-5 h-5" /></div><div><p className="font-semibold flex items-center gap-2">Send from Gmail {gmailStatus.connected && <Badge variant="outline" className="text-green-600 border-green-200">Connected</Badge>}</p>{gmailLoading ? <p className="text-sm text-muted-foreground mt-1">Checking connection…</p> : gmailStatus.connected ? <p className="text-sm text-muted-foreground mt-1">{gmailStatus.email} will be used for reviewed scouting sends.</p> : <p className="text-sm text-muted-foreground mt-1">Connect a mailbox so messages send from your Gmail account.</p>}{gmailError && <p className="text-xs text-amber-600 mt-1">{gmailError}</p>}</div></div>{gmailStatus.connected ? <Button variant="outline" size="sm" onClick={disconnectConnectedGmail} disabled={gmailAction}>{gmailAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Disconnect</Button> : <Button size="sm" onClick={connectGmail} disabled={gmailAction || gmailLoading}>{gmailAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Connect Gmail</Button>}</CardContent>
      </Card>

      {showPersonalizationPrompt && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true"><Card className="w-full max-w-2xl shadow-xl"><CardHeader><CardTitle>What should the AI personalize?</CardTitle><p className="text-sm text-muted-foreground">This instruction is applied independently to every selected contact. The AI will use only that row's pasted data.</p></CardHeader><CardContent className="space-y-4"><Textarea autoFocus value={personalizationPrompt} onChange={event => setPersonalizationPrompt(event.target.value)} placeholder="Example: Offer a short website improvement audit and mention one concrete way I can help them convert more visitors. Keep the tone warm and direct." className="min-h-32" /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowPersonalizationPrompt(false)}>Cancel</Button><Button onClick={personalizeSelected} disabled={personalizing}>{personalizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} Generate drafts</Button></div></CardContent></Card></div>}

      <Card>
        <CardHeader className="pb-3"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><CardTitle className="text-base">Saved contacts</CardTitle><p className="text-sm text-muted-foreground mt-1">Select contacts, personalize them as a batch, review each draft, then send.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={openPersonalizePrompt} disabled={personalizing || sending || !selectedIds.size} className="gap-1.5">{personalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Personalize selected</Button><Button size="sm" onClick={sendSelected} disabled={sending || personalizing || !selectedIds.size} className="gap-1.5">{sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send reviewed</Button></div></div>{sending && <Progress value={sendProgress} className="mt-3" />}</CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold mt-1">{stats.total}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Ready</p><p className="text-2xl font-bold mt-1">{stats.ready}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Drafts</p><p className="text-2xl font-bold mt-1">{stats.drafts}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Sent</p><p className="text-2xl font-bold mt-1">{stats.sent}</p></div></div>
          <div className="flex flex-col sm:flex-row gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search business, owner, email, website, or any pasted field" className="pl-9" /></div><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All contacts</option><option value="ready">Ready</option><option value="drafted">Draft ready</option><option value="sent">Sent</option><option value="opted_out">Opted out</option></select></div>
          {filteredLeads.length === 0 ? <div className="py-16 text-center border border-dashed rounded-xl"><Megaphone className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" /><p className="font-medium">No saved contacts yet</p><p className="text-sm text-muted-foreground mt-1">Paste your ChatGPT-generated lead data above to begin.</p></div> : <div className="space-y-2">{filteredLeads.map(lead => {
            const expanded = expandedId === lead.id;
            const selected = selectedIds.has(lead.id);
            const research = storedResearch(lead);
            const drafts = lead.email_drafts?.length ? lead.email_drafts : lead.email_subject && lead.email_body && lead.email ? [{ recipientEmail: lead.email, subject: lead.email_subject, body: lead.email_body }] : [];
            return <div key={lead.id} className={'rounded-xl border transition-colors ' + (expanded ? 'border-primary/40 bg-primary/[0.02]' : 'border-border/70')}>
              <div className="flex items-start gap-3 p-3 sm:p-4"><input aria-label={'Select ' + lead.business_name} type="checkbox" checked={selected} onChange={() => toggleSelected(lead.id)} className="mt-1.5 h-4 w-4 accent-primary" /><button type="button" onClick={() => setExpandedId(expanded ? null : lead.id)} className="flex-1 min-w-0 text-left"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold truncate">{lead.business_name}</span><Badge variant="outline" className={leadStatus(lead) === 'Sent' ? 'text-green-600 border-green-200' : ''}>{leadStatus(lead)}</Badge></div><div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">{lead.owner_name && <span className="flex items-center gap-1"><UserRound className="w-3 h-3" />{lead.owner_name}</span>}<span>{extractLeadEmails(lead).join(', ') || 'No email'}</span>{lead.website && <span className="flex items-center gap-1"><Globe2 className="w-3 h-3" />{displayWebsite(lead.website)}</span>}</div></button><Button variant="ghost" size="icon" onClick={() => setExpandedId(expanded ? null : lead.id)} aria-label="Toggle contact details">{expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 -rotate-90" />}</Button></div>
              {expanded && <div className="border-t px-4 py-4 space-y-4 bg-muted/[0.18]"><div className="grid lg:grid-cols-2 gap-4"><div className="space-y-3"><div className="rounded-lg border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact details</p><div className="grid sm:grid-cols-2 gap-3 mt-3"><div><Label className="text-xs">Business</Label><Input value={lead.business_name} onChange={event => updateLocalLead(lead.id, { business_name: event.target.value })} onBlur={event => saveLead(lead.id, { business_name: event.target.value })} /></div><div><Label className="text-xs">Owner / contact</Label><Input value={lead.owner_name} onChange={event => updateLocalLead(lead.id, { owner_name: event.target.value })} onBlur={event => saveLead(lead.id, { owner_name: event.target.value })} /></div><div><Label className="text-xs">Website</Label><Input value={lead.website} onChange={event => updateLocalLead(lead.id, { website: event.target.value })} onBlur={event => saveLead(lead.id, { website: event.target.value })} /></div><div><Label className="text-xs">Primary email</Label><Input value={lead.email} onChange={event => updateLocalLead(lead.id, { email: event.target.value })} onBlur={event => saveLead(lead.id, { email: event.target.value })} /></div></div></div><div className="rounded-lg border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All pasted fields</p><div className="grid sm:grid-cols-2 gap-2 mt-3 max-h-72 overflow-auto">{Object.entries(lead.raw_data || {}).map(([key, value]) => <div key={key} className="rounded-md bg-muted/50 p-2"><p className="text-[11px] font-medium text-muted-foreground break-words">{key}</p><p className="text-sm break-words">{value || '—'}</p></div>)}</div></div><Button variant={lead.opted_out ? 'secondary' : 'ghost'} size="sm" onClick={() => saveLead(lead.id, { opted_out: !lead.opted_out })} className="gap-1.5 w-fit">{lead.opted_out ? <Check className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />} {lead.opted_out ? 'Opted out' : 'Mark opted out'}</Button></div><div className="space-y-3"><div className="rounded-lg border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ChatGPT research for this contact</p>{research ? <div className="space-y-3 mt-3"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Website name</p><p className="text-sm mt-1">{research.websiteName || '—'}</p></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Description / concentration</p><p className="text-sm mt-1">{research.description || research.concentration || '—'}</p></div><div className="grid sm:grid-cols-2 gap-3"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Merits</p>{research.merits.length ? <ul className="list-disc pl-4 mt-1 text-sm space-y-1">{research.merits.map(item => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground mt-1">—</p>}</div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Demerits</p>{research.demerits.length ? <ul className="list-disc pl-4 mt-1 text-sm space-y-1">{research.demerits.map(item => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground mt-1">—</p>}</div></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Improvements</p><p className="text-sm mt-1">{research.improvements.join('; ') || '—'}</p></div></div> : <p className="text-sm text-muted-foreground mt-2">No structured research fields were detected in this row.</p>}</div><div className="rounded-lg border bg-background p-3 space-y-2"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personalized drafts</p>{drafts.length > 0 && <Badge variant="outline" className="text-green-600 border-green-200">{drafts.length} recipient{drafts.length === 1 ? '' : 's'}</Badge>}</div>{drafts.length ? drafts.map(draft => <div key={draft.recipientEmail} className="rounded-md border p-2 space-y-2"><p className="text-xs font-medium text-muted-foreground">{draft.recipientEmail}</p><Input value={draft.subject} onChange={event => { const next = drafts.map(item => item.recipientEmail === draft.recipientEmail ? { ...item, subject: event.target.value } : item); updateLocalLead(lead.id, { email_drafts: next, email_subject: next[0]?.subject || '' }); }} onBlur={() => saveLead(lead.id, { email_drafts: drafts })} /><Textarea value={draft.body} onChange={event => { const next = drafts.map(item => item.recipientEmail === draft.recipientEmail ? { ...item, body: event.target.value } : item); updateLocalLead(lead.id, { email_drafts: next, email_body: next[0]?.body || '' }); }} onBlur={() => saveLead(lead.id, { email_drafts: drafts })} className="min-h-32" /></div>) : <p className="text-sm text-muted-foreground py-4">Select this contact and click Personalize selected.</p>}{drafts.length > 0 && <Button variant="outline" size="sm" onClick={() => personalizeLead(lead)} disabled={personalizing || lead.opted_out} className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Regenerate</Button>}</div></div></div></div>}
            </div>;
          })}</div>}
        </CardContent>
      </Card>
      <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-3xl"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>Nothing is scraped or researched here. The website, contact details, merits, and demerits come from the data you paste from ChatGPT. The app only personalizes and sends after you review the drafts.</p></div>
    </div>
  );
}
