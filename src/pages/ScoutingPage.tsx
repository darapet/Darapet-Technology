import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  AlertCircle, Check, CheckCircle2, ChevronDown, ExternalLink, FileDown, FileText,
  Globe2, Loader2, Mail, Megaphone, RefreshCw, Search,
  Send, ShieldCheck, Sparkles, Upload, UserRound, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadFileToCloudinary } from '@/lib/cloudinary';
import { hasUsableEmailProvider, sendEmail } from '@/lib/emailSend';
import { disconnectGmail, getGmailStatus, sendGmail, startGmailConnection, type GmailStatus } from '@/lib/gmail';
import { extractLeadEmails, parseAiJson, extractLeadsFromFile, toHtmlEmail, type ScoutLead } from '@/lib/scouting';
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

type PersonalizationResponse = {
  subject: string;
  body: string;
};

type WebsiteResearchResult = {
  leadId: string;
  website: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
  httpStatus: number | null;
  statusText: string;
  success: boolean;
  finalUrl?: string;
  title?: string;
  description?: string;
  extractedText?: string;
  error?: string;
  merits: string[];
  demerits: string[];
  improvements: string[];
  contactHints: string[];
  concentration?: string;
  websiteName?: string;
  ownerName?: string;
  analyzedAt?: string;
};

type TemplateConfig = {
  logoUrl: string;
  brandName: string;
  brandColor: string;
  websiteUrl: string;
  socialLinks: { platform: string; url: string }[];
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

function storedResearch(lead: ScoutLead): WebsiteResearchResult | null {
  if (lead.research_data && typeof lead.research_data === 'object') return lead.research_data as WebsiteResearchResult;
  return null;
}

export function ScoutingPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [leads, setLeads] = useState<ScoutLead[]>([]);
  const [imports, setImports] = useState<LeadImport[]>([]);
  const [selectedImportId, setSelectedImportId] = useState('all');
  const [showImportName, setShowImportName] = useState(false);
  const [importName, setImportName] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
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
  const [personalizationPrompt, setPersonalizationPrompt] = useState('');
  const [showPersonalizationPrompt, setShowPersonalizationPrompt] = useState(false);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [showTemplateCustomize, setShowTemplateCustomize] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(EMAIL_TEMPLATES[0]?.id || 'personal');
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig>({ logoUrl: '', brandName: '', brandColor: '#2563eb', websiteUrl: '', socialLinks: [] });
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

  const researchLead = (lead: ScoutLead) => {
    setLocation('/scouting/research?leadId=' + encodeURIComponent(lead.id) + '&rerun=1');
  };

  const researchImport = () => {
    if (selectedImportId === 'all') {
      toast({ variant: 'destructive', title: 'Choose a lead list first', description: 'Select the uploaded list you want to research.' });
      return;
    }
    setLocation('/scouting/research?importId=' + encodeURIComponent(selectedImportId) + '&rerun=1');
  };

  const personalizeLead = async (lead: ScoutLead) => {
    const research = storedResearch(lead);
    const recipientEmails = extractLeadEmails(lead);
    if (!research || !recipientEmails.length) return;
    const drafts = await Promise.all(recipientEmails.map(async recipientEmail => {
      const result = await callGroq<PersonalizationResponse>(
        'Write one distinct, respectful outreach email for this contact.\n' +
        'User personalization instruction: ' + personalizationPrompt + '\n' +
        'Recipient: ' + (lead.owner_name || 'the contact') + '\n' +
        'Email: ' + recipientEmail + '\n' +
        'Business: ' + lead.business_name + '\n' +
        'App/product: ' + (lead.app_name || 'not provided') + '\n' +
        'Imported fields: ' + JSON.stringify(lead.raw_data || {}) + '\n' +
        'Website: ' + (lead.website || 'not provided') + '\n' +
        'Website title: ' + (research.title || 'None') + '\n' +
        'Website description: ' + (research.description || 'None') + '\n' +
        'Merits: ' + research.merits.join('; ') + '\n' +
        'Demerits: ' + research.demerits.join('; ') + '\n' +
        'Area of concentration: ' + (research.concentration || 'None recorded') + '\n' +
        'Areas for improvement: ' + research.improvements.join('; ') + '\n' +
        'Public contact hints: ' + research.contactHints.join('; ') + '\n' +
        'Fetched evidence: ' + (research.extractedText || '').slice(0, 6500) + '\n' +
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
    if (!activeLeads.some(lead => selectedIds.has(lead.id) && storedResearch(lead) && !lead.opted_out && extractLeadEmails(lead).length)) {
      toast({ variant: 'destructive', title: 'Research and select contacts first', description: 'Choose researched leads with email addresses before personalizing.' });
      return;
    }
    openTemplateChooser();
  };

  const loadTemplateConfig = () => {
    const saved = profile as any;
    const rawSocials = saved?.social_links;
    const socialLinks = Array.isArray(rawSocials)
      ? rawSocials.filter((item: any) => item?.url).map((item: any) => ({ platform: String(item.platform || 'website'), url: String(item.url) }))
      : Object.entries(rawSocials || {}).filter(([, value]) => value).map(([platform, value]) => ({ platform, url: String(value) }));
    setTemplateConfig({
      logoUrl: saved?.logo_url || saved?.default_logo_url || '',
      brandName: saved?.company || saved?.name || 'Darapet Technology',
      brandColor: saved?.brand_color || '#2563eb',
      websiteUrl: saved?.website_url || '',
      socialLinks,
    });
  };

  const openTemplateChooser = () => {
    loadTemplateConfig();
    setShowTemplateChooser(true);
  };

  const socialUrl = (platform: string) => templateConfig.socialLinks.find(link => link.platform === platform)?.url || '';

  const setSocialUrl = (platform: string, url: string) => {
    setTemplateConfig(current => ({ ...current, socialLinks: url ? [...current.socialLinks.filter(link => link.platform !== platform), { platform, url }] : current.socialLinks.filter(link => link.platform !== platform) }));
  };

  const renderLeadEmail = (lead: ScoutLead) => {
    const template = (EMAIL_TEMPLATES as any[]).find(item => item.id === selectedTemplateId) || EMAIL_TEMPLATES[0];
    if (!template?.renderHTML) return '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">' + toHtmlEmail(lead.email_body) + '</div>';
    return template.renderHTML({
      brandName: templateConfig.brandName || profile?.company || 'Darapet Technology',
      logoUrl: templateConfig.logoUrl,
      brandColor: templateConfig.brandColor || '#2563eb',
      emailBgColor: '#f8fafc',
      subject: lead.email_subject,
      body: lead.email_body,
      signatureUrl: null,
      recipientName: lead.owner_name || 'there',
      socialLinks: templateConfig.socialLinks,
      websiteUrl: templateConfig.websiteUrl,
      ctaUrl: lead.website || templateConfig.websiteUrl,
    });
  };

  const personalizeSelected = async () => {
    const targets = activeLeads.filter(lead => selectedIds.has(lead.id) && !lead.opted_out && extractLeadEmails(lead).length && storedResearch(lead));
    if (!targets.length) {
      toast({ variant: 'destructive', title: 'No researched contacts selected', description: 'Research the list, select contacts, then personalize.' });
      return;
    }
    setShowPersonalizationPrompt(false);
    setPersonalizing(true);
    let completed = 0;
    try {
      for (const lead of targets) {
        await personalizeLead(lead);
        completed += 1;
      }
      toast({ title: completed + ' personalized drafts ready', description: 'Choose an email template before sending.' });
      toast({ title: 'Review the drafts', description: 'When they look right, click Continue to template.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Personalization stopped', description: error instanceof Error ? error.message : 'Try the remaining contacts again.' });
    } finally {
      setPersonalizing(false);
    }
  };

  const sendSelected = async () => {
    const targets = leads.flatMap(lead => {
      if (!selectedIds.has(lead.id) || lead.opted_out) return [];
      const drafts = lead.email_drafts?.length
        ? lead.email_drafts
        : lead.email && lead.email_subject && lead.email_body
          ? [{ recipientEmail: lead.email, subject: lead.email_subject, body: lead.email_body }]
          : [];
      return drafts.filter(draft => draft.recipientEmail && draft.subject && draft.body).map(draft => ({ lead, draft }));
    });
    if (!targets.length) {
      toast({ variant: 'destructive', title: 'No reviewed drafts selected', description: 'Generate and review drafts before sending.' });
      return;
    }
    if (!window.confirm('Send ' + targets.length + ' reviewed message' + (targets.length === 1 ? '' : 's') + ' now? Opted-out leads are excluded.')) return;

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
      recipients: targets.map(target => target.draft.recipientEmail),
      status: 'sending',
      created_at: new Date().toISOString(),
    }).select('id').single();
    const leadResults: Record<string, { sent: number; total: number }> = {};
    let sent = 0;
    for (const [index, target] of targets.entries()) {
      const lead = target.lead;
      leadResults[lead.id] = leadResults[lead.id] || { sent: 0, total: 0 };
      leadResults[lead.id].total += 1;
      updateLocalLead(lead.id, { send_status: 'sending' });
      let sendOk = false;
      let sendError = '';
      try {
        const sendLead = { ...lead, email: target.draft.recipientEmail, email_subject: target.draft.subject, email_body: target.draft.body };
        if (gmailStatus.connected) {
          const result = await sendGmail({
            fromName: profile?.name || 'Darapet',
            to: target.draft.recipientEmail,
            subject: target.draft.subject,
            html: renderLeadEmail(sendLead),
          });
          sendOk = result.success;
        } else {
          const result = await sendEmail({
            config: provider,
            fromName: profile?.name || 'Darapet',
            fromEmail: profile?.email || user!.email!,
            to: target.draft.recipientEmail,
            subject: target.draft.subject,
            html: renderLeadEmail(sendLead),
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
        to_email: target.draft.recipientEmail,
        subject: target.draft.subject,
        provider: gmailStatus.connected ? 'gmail' : provider?.active_smtp === 'smtp' ? 'smtp' : 'brevo',
        status: sendOk ? 'sent' : 'failed',
        error_msg: sendError || null,
        sent_at: new Date().toISOString(),
      });
      if (sendOk) {
        sent += 1;
        leadResults[lead.id].sent += 1;
      }
      await db.from('scout_leads').update({
        send_status: sendOk ? 'sent' : 'failed',
        sent_at: sendOk ? new Date().toISOString() : null,
      }).eq('id', lead.id).eq('user_id', user!.id);
      updateLocalLead(lead.id, { send_status: sendOk ? 'sent' : 'failed', sent_at: sendOk ? new Date().toISOString() : null });
      setSendProgress(Math.round(((index + 1) / targets.length) * 100));
    }
    if (campaign?.id) {
      await db.from('campaigns').update({ status: sent === targets.length ? 'sent' : 'failed', sent_count: sent, sent_at: new Date().toISOString() }).eq('id', campaign.id);
    }
    setSending(false);
    toast({ title: sent + ' of ' + targets.length + ' messages sent', description: sent === targets.length ? 'Your campaign history has been updated.' : 'Failed sends are marked for review.' });
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

      {showPersonalizationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-2xl shadow-xl">
            <CardHeader><CardTitle>What should the AI personalize?</CardTitle><p className="text-sm text-muted-foreground">This instruction is applied separately to every selected contact using that contact’s website research, imported fields, merits, demerits, and improvements.</p></CardHeader>
            <CardContent className="space-y-4">
              <Textarea autoFocus value={personalizationPrompt} onChange={event => setPersonalizationPrompt(event.target.value)} placeholder="Example: Offer a short website improvement audit and mention one concrete way I can help them convert more visitors. Keep the tone warm and direct." className="min-h-32" />
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowPersonalizationPrompt(false)}>Cancel</Button><Button onClick={personalizeSelected} disabled={personalizing}>{personalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate drafts</Button></div>
            </CardContent>
          </Card>
        </div>
      )}

      {showTemplateChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto shadow-xl">
            <CardHeader><CardTitle>Choose an email template</CardTitle><p className="text-sm text-muted-foreground">Your personalized copy stays different for every contact. This only chooses the presentation around it.</p></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              {(EMAIL_TEMPLATES as any[]).map(template => { const Icon = template.icon; return <button type="button" key={template.id} onClick={() => { setSelectedTemplateId(template.id); setShowTemplateChooser(false); setShowTemplateCustomize(true); }} className={`rounded-xl border p-4 text-left hover:border-primary hover:bg-primary/[0.03] transition-colors ${selectedTemplateId === template.id ? 'border-primary bg-primary/[0.04]' : ''}`}><div className="flex items-center gap-2 font-semibold"><Icon className="w-4 h-4 text-primary" />{template.name}</div><p className="text-xs text-muted-foreground mt-2">{template.category}</p></button>; })}
            </CardContent>
          </Card>
        </div>
      )}

      {showTemplateCustomize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-xl shadow-xl">
            <CardHeader><CardTitle>Customize the email template</CardTitle><p className="text-sm text-muted-foreground">Settings already saved on your profile are filled in automatically. Add anything missing before sending.</p></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3"><div><Label>Brand name</Label><Input value={templateConfig.brandName} onChange={event => setTemplateConfig(current => ({ ...current, brandName: event.target.value }))} /></div><div><Label>Brand color</Label><Input type="color" value={templateConfig.brandColor} onChange={event => setTemplateConfig(current => ({ ...current, brandColor: event.target.value }))} className="h-10 p-1" /></div></div>
              <div><Label>Logo URL</Label><Input value={templateConfig.logoUrl} onChange={event => setTemplateConfig(current => ({ ...current, logoUrl: event.target.value }))} placeholder="https://.../logo.png" /></div>
              <div><Label>Website URL</Label><Input value={templateConfig.websiteUrl} onChange={event => setTemplateConfig(current => ({ ...current, websiteUrl: event.target.value }))} placeholder="https://yourwebsite.com" /></div>
              <div className="grid sm:grid-cols-3 gap-3"><div><Label>LinkedIn</Label><Input value={socialUrl('linkedin')} onChange={event => setSocialUrl('linkedin', event.target.value)} /></div><div><Label>Instagram</Label><Input value={socialUrl('instagram')} onChange={event => setSocialUrl('instagram', event.target.value)} /></div><div><Label>Twitter / X</Label><Input value={socialUrl('twitter')} onChange={event => setSocialUrl('twitter', event.target.value)} /></div></div>
              <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setShowTemplateCustomize(false)}>Back</Button><Button onClick={() => { setShowTemplateCustomize(false); setShowPersonalizationPrompt(true); }}>Continue to AI prompt</Button></div>
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

      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-semibold text-primary">Lead research</p><p className="text-sm text-muted-foreground mt-1">Every imported lead stays visible here. Research opens a separate page and visits each website one after another.</p></div>
        <Search className="w-5 h-5 text-primary shrink-0" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div><CardTitle className="text-base">Imported leads</CardTitle><p className="text-sm text-muted-foreground mt-1">Choose a list, then research one lead or the complete list. Website values are read from every imported column.</p></div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={researchImport} disabled={personalizing || sending || selectedImportId === 'all'} className="gap-1.5"><Search className="w-3.5 h-3.5" /> Research this list</Button>
              {activeLeads.some(lead => selectedIds.has(lead.id) && lead.email_subject) && <Button variant="outline" size="sm" onClick={openTemplateChooser} disabled={personalizing || sending} className="gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Continue to template</Button>}
              <Button variant="outline" size="sm" onClick={openPersonalizePrompt} disabled={personalizing || sending} className="gap-1.5">{personalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Personalize selected</Button>
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
                const sessionResearch = storedResearch(lead);
                const drafts = lead.email_drafts?.length ? lead.email_drafts : (lead.email_subject && lead.email_body && lead.email ? [{ recipientEmail: lead.email, subject: lead.email_subject, body: lead.email_body }] : []);
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
                        <Button variant="outline" size="sm" onClick={() => researchLead(lead)} disabled={lead.opted_out} className="hidden sm:flex gap-1.5">
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
                              <Button size="sm" onClick={() => researchLead(lead)} disabled={researching === lead.id || lead.opted_out} className="gap-1.5"><Search className="w-3.5 h-3.5" /> Research this lead</Button>
                              {lead.website && <Button variant="outline" size="sm" onClick={() => window.open(lead.website, '_blank', 'noopener,noreferrer')} className="gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Open website</Button>}
                              {lead.source_file_path && <Button variant="outline" size="sm" onClick={() => openSourceFile(lead)} className="gap-1.5"><FileDown className="w-3.5 h-3.5" /> Open original file</Button>}
                              <Button variant={lead.opted_out ? 'secondary' : 'ghost'} size="sm" onClick={() => saveLead(lead.id, { opted_out: !lead.opted_out })} className="gap-1.5">{lead.opted_out ? <Check className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />} {lead.opted_out ? 'Opted out' : 'Mark opted out'}</Button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-lg border bg-background p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Research brief</p>
                              <p className="text-sm mt-2">{sessionResearch?.description || lead.research_summary || 'No research yet. Run research on this lead or the selected list.'}</p>
                              {sessionResearch && <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm"><div><p className="text-xs font-semibold uppercase text-muted-foreground">Merits</p><ul className="list-disc pl-4 mt-1 space-y-1">{sessionResearch.merits.map(item => <li key={item}>{item}</li>)}</ul></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Demerits</p><ul className="list-disc pl-4 mt-1 space-y-1">{sessionResearch.demerits.map(item => <li key={item}>{item}</li>)}</ul></div><div><p className="text-xs font-semibold uppercase text-muted-foreground">Improvements</p><ul className="list-disc pl-4 mt-1 space-y-1">{sessionResearch.improvements.map(item => <li key={item}>{item}</li>)}</ul></div></div>}
                              {!sessionResearch && lead.pain_points.length > 0 && <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground space-y-1">{lead.pain_points.map(point => <li key={point}>{point}</li>)}</ul>}
                            </div>
                            <div className="rounded-lg border bg-background p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personalized drafts</p>{drafts.length > 0 && <Badge variant="outline" className="text-green-600 border-green-200">{drafts.length} recipient{drafts.length === 1 ? '' : 's'}</Badge>}</div>
                              {drafts.length ? drafts.map(draft => <div key={draft.recipientEmail} className="rounded-md border p-2 space-y-2"><p className="text-xs font-medium text-muted-foreground">{draft.recipientEmail}</p><Input value={draft.subject} onChange={event => { const next = drafts.map(item => item.recipientEmail === draft.recipientEmail ? { ...item, subject: event.target.value } : item); updateLocalLead(lead.id, { email_drafts: next, email_subject: next[0]?.subject || '' }); }} onBlur={() => saveLead(lead.id, { email_drafts: drafts })} /><Textarea value={draft.body} onChange={event => { const next = drafts.map(item => item.recipientEmail === draft.recipientEmail ? { ...item, body: event.target.value } : item); updateLocalLead(lead.id, { email_drafts: next, email_body: next[0]?.body || '' }); }} onBlur={() => saveLead(lead.id, { email_drafts: drafts })} className="min-h-32" /></div>) : <div className="text-sm text-muted-foreground py-4">Select this lead after research, then click <strong>Personalize selected</strong>.</div>}
                              {drafts.length > 0 && <Button variant="outline" size="sm" onClick={() => personalizeLead(lead)} disabled={personalizing || lead.opted_out} className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Regenerate</Button>}
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