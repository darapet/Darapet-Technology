import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from './RichTextEditor';
import { EMAIL_TEMPLATES } from '../email/emailTemplates';
import { sendEmail, hasUsableEmailProvider } from '@/lib/emailSend';
import {
  Wand2, Send, Clock, CheckCircle2, XCircle, AlertCircle, Loader2,
  ChevronRight, ChevronLeft, Users, FileText, Eye, Rocket,
  Save, TestTube2, X, Palette,
} from 'lucide-react';
import type { SocialLink } from '@/pages/email/emailTemplates';

interface SendResult { email: string; success: boolean; error?: string; }

const STEPS = [
  { id: 1, label: 'Recipients', icon: Users },
  { id: 2, label: 'Compose', icon: FileText },
  { id: 3, label: 'Preview', icon: Eye },
  { id: 4, label: 'Send', icon: Rocket },
];

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

export function NewCampaignPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [step, setStep] = useState(1);

  // Step 1 — recipients
  const [recipientRaw, setRecipientRaw] = useState('');
  const recipients = parseEmails(recipientRaw);

  // Step 2 — compose
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [groqKey, setGroqKey] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  // Per-campaign template colour overrides (not saved to DB)
  const [tplHeaderColor, setTplHeaderColor] = useState<string>('#3B82F6');
  const [tplBgColor, setTplBgColor] = useState<string>('#f1f5f9');
  // Raw body content (just the message body, separate from the full template HTML)
  const [rawBodyContent, setRawBodyContent] = useState<string>('');

  // Step 3 — preview (nothing extra needed)

  // Step 4 — send
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SendResult[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    supabase.from('settings').select('groq_api_key').eq('id', 1).single().then(({ data }) => {
      if (data?.groq_api_key) setGroqKey(data.groq_api_key);
    });
  }, []);

  // Sync header colour default from profile brand colour when profile loads
  useEffect(() => {
    if (profile?.brand_color) setTplHeaderColor(profile.brand_color);
  }, [profile?.brand_color]);

  const generateWithAI = async () => {
    const key = profile?.groq_api_key || groqKey;
    if (!key) { toast({ variant: 'destructive', title: 'No Groq API key', description: 'Add your Groq key in Admin Settings.' }); return; }
    if (!aiPrompt.trim()) { toast({ variant: 'destructive', title: 'Enter a prompt' }); return; }
    setAiLoading(true);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are an expert email copywriter. Write professional, engaging outreach emails. Output only the email body as plain HTML paragraphs (use <p>, <strong>, <em> tags). No subject line, no placeholders like [Name].' },
            { role: 'user', content: `Write a cold outreach email for: ${aiPrompt}\nBrand: ${profile?.name || 'the sender'}\nCompany: ${profile?.company || 'our business'}` }
          ],
          max_tokens: 600,
          temperature: 0.7,
        })
      });
      const data = await res.json();
      const generated = data.choices?.[0]?.message?.content;
      if (generated) {
        setRawBodyContent(generated);
        if (selectedTemplateId) {
          // Inject the AI content straight into the selected template wrapper
          applyTemplate(selectedTemplateId, generated, tplHeaderColor, tplBgColor);
          toast({ title: '✨ AI content applied to template!', description: 'The generated email is inside your chosen template. Review and edit before sending.' });
        } else {
          setBody(generated);
          toast({ title: 'AI email generated!', description: 'Pick a template above to wrap it, or send as-is.' });
        }
        setAiOpen(false);
      }
    } catch {
      toast({ variant: 'destructive', title: 'AI Error', description: 'Failed to generate. Check your Groq API key.' });
    } finally {
      setAiLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!subject) { toast({ variant: 'destructive', title: 'Add a subject line first' }); return; }
    setSavingDraft(true);
    try {
      await supabase.from('campaigns').insert({
        user_id: user!.id,
        subject,
        body,
        recipients: recipients,
        status: 'draft',
        created_at: new Date().toISOString(),
      });
      toast({ title: 'Draft saved!', description: 'Find it in Campaign History.' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to save draft' });
    } finally {
      setSavingDraft(false);
    }
  };

  const sendTestEmail = async () => {
    if (!subject || !body) { toast({ variant: 'destructive', title: 'Add subject & body first' }); return; }
    const { data: prof } = await supabase.from('profiles')
      .select('brevo_api_key, active_smtp, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure')
      .eq('id', user!.id).single();
    if (!prof || !hasUsableEmailProvider(prof)) {
      toast({ variant: 'destructive', title: 'No email provider configured', description: 'Add it in Settings.' });
      return;
    }
    setSendingTest(true);
    try {
      const result = await sendEmail({
        config: prof,
        fromName: profile?.name || 'Darapet',
        fromEmail: profile?.email || user!.email!,
        to: user!.email!,
        subject: `[TEST] ${subject}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${body}</div>`,
      });
      if (result.ok) toast({ title: 'Test sent!', description: `Check ${user!.email}` });
      else toast({ variant: 'destructive', title: 'Test failed', description: result.error || 'Check your email provider settings.' });
    } catch {
      toast({ variant: 'destructive', title: 'Test send error' });
    } finally {
      setSendingTest(false);
    }
  };

  const sendNow = async () => {
    if (!subject || !body) { toast({ variant: 'destructive', title: 'Missing subject or body' }); return; }
    if (recipients.length < 1) { toast({ variant: 'destructive', title: 'No valid recipients' }); return; }

    const { data: prof } = await supabase.from('profiles')
      .select('brevo_api_key, active_smtp, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure')
      .eq('id', user!.id).single();
    if (!prof || !hasUsableEmailProvider(prof)) {
      toast({ variant: 'destructive', title: 'No email provider configured', description: 'Add it in Settings.' });
      return;
    }

    if (scheduleMode && scheduledAt) {
      await supabase.from('scheduled_sends').insert({
        user_id: user!.id,
        subject,
        body,
        recipients,
        status: 'scheduled',
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
      // Also save campaign record
      await supabase.from('campaigns').insert({
        user_id: user!.id,
        subject,
        body,
        recipients,
        status: 'scheduled',
        scheduled_at: new Date(scheduledAt).toISOString(),
        created_at: new Date().toISOString(),
      });
      toast({ title: 'Campaign scheduled!', description: `Sends at ${new Date(scheduledAt).toLocaleString()}` });
      navigate('/campaigns/automation');
      return;
    }

    abortRef.current = false;
    setSendStatus('sending');
    setProgress(0);
    setResults([]);

    // Save campaign record first
    const { data: campaign } = await supabase.from('campaigns').insert({
      user_id: user!.id,
      subject,
      body,
      recipients,
      status: 'sending',
      created_at: new Date().toISOString(),
    }).select().single();

    const BATCH_SIZE = 5;
    const htmlContent = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${body}</div>`;

    // Track results in a local array too — `results` (React state) is captured by
    // this closure at call time, so reading it after the loop would always see the
    // stale empty array from before sending started and record sent_count as 0.
    const localResults: Array<{ email: string; success: boolean; error?: string }> = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      if (abortRef.current) break;
      const batch = recipients.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(batch.map(async (email) => {
        try {
          const result = await sendEmail({
            config: prof,
            fromName: profile?.name || 'Darapet',
            fromEmail: profile?.email || user!.email!,
            to: email,
            subject,
            html: htmlContent,
          });
          localResults.push({ email, success: result.ok, error: result.error });
          setResults(prev => [...prev, { email, success: result.ok, error: result.error }]);
          await supabase.from('email_sends').insert({
            user_id: user!.id,
            campaign_id: campaign?.id?.toString(),
            to_email: email,
            subject,
            provider: prof.active_smtp === 'smtp' ? 'smtp' : 'brevo',
            status: result.ok ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown';
          localResults.push({ email, success: false, error: msg });
          setResults(prev => [...prev, { email, success: false, error: msg }]);
        }
      }));

      const pct = Math.min(100, Math.round(((i + BATCH_SIZE) / recipients.length) * 100));
      setProgress(pct);
      if (i + BATCH_SIZE < recipients.length) await new Promise(r => setTimeout(r, 800));
    }

    // Update campaign status
    if (campaign?.id) {
      const sent = localResults.filter(r => r.success).length;
      await supabase.from('campaigns').update({ status: 'sent', sent_count: sent }).eq('id', campaign.id);
    }

    setSendStatus('done');
  };

  /**
   * Render a template into the full body HTML.
   * bodyContent — the email message text/HTML to inject; falls back to
   *   rawBodyContent (from a previous AI generation or manual edit), then
   *   to a default placeholder if neither exists.
   */
  const applyTemplate = (templateId: string, bodyContent?: string, headerColor?: string, bgColor?: string) => {
    const tpl = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplateId(templateId);
    const content = bodyContent ?? (rawBodyContent || 'Hi there,\n\nI wanted to reach out personally...');
    if (bodyContent) setRawBodyContent(bodyContent);
    const profileSocialLinks = Array.isArray((profile as any)?.social_links)
      ? ((profile as any).social_links as SocialLink[])
      : [];
    const html = tpl.renderHTML({
      brandName: profile?.company || profile?.name || 'Your Brand',
      logoUrl: (profile as any)?.logo_url || '',
      brandColor: headerColor ?? tplHeaderColor,
      headerBgOverride: headerColor ?? tplHeaderColor,
      emailBgColor: bgColor ?? tplBgColor,
      subject: subject || tpl.name,
      body: content,
      signatureUrl: (profile as any)?.signature_url || null,
      recipientName: '{{First Name}}',
      socialLinks: profileSocialLinks,
      websiteUrl: (profile as any)?.website_url || '',
    });
    setBody(html);
    if (!subject) setSubject(tpl.name);
  };

  const canProceed = () => {
    if (step === 1) return recipients.length >= 1 && recipients.length <= 100;
    if (step === 2) return subject.trim().length > 0 && body.trim().length > 0;
    if (step === 3) return true;
    return true;
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')} className="shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
          <p className="text-sm text-muted-foreground">Step {step} of {STEPS.length}</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                done ? 'bg-green-500/10 text-green-600' : active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {done ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* STEP 1: Recipients */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Recipients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Paste email addresses (5–100)</Label>
                  <textarea
                    value={recipientRaw}
                    onChange={e => setRecipientRaw(e.target.value)}
                    placeholder={"john@example.com\njane@example.com, bob@company.org\n...paste up to 100 emails"}
                    className="w-full min-h-[180px] rounded-xl border border-input bg-muted/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={recipients.length >= 5 ? 'default' : 'secondary'} className="text-sm">
                    {recipients.length} valid email{recipients.length !== 1 ? 's' : ''}
                  </Badge>
                  {recipients.length > 100 && (
                    <span className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Max 100 recipients
                    </span>
                  )}
                  {recipients.length > 0 && recipients.length < 5 && (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Minimum 5 recipients recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Separate emails by commas, semicolons, or new lines. Duplicates and invalid emails are ignored.</p>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Compose */}
          {step === 2 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Compose</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => setAiOpen(v => !v)} className="gap-1.5 text-purple-600 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/30">
                      <Wand2 className="w-3.5 h-3.5" /> AI Generate
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AI Popup */}
                  <AnimatePresence>
                    {aiOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Wand2 className="w-4 h-4 text-purple-500" />
                              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">AI Writing Assistant (Groq)</span>
                            </div>
                            <button onClick={() => setAiOpen(false)} className="text-muted-foreground hover:text-foreground">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <textarea
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                            placeholder="e.g. Cold outreach for a SaaS company, B2B focused, friendly and professional tone..."
                            className="w-full h-20 rounded-lg border border-purple-200 dark:border-purple-800/30 bg-white dark:bg-white/5 px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-purple-400"
                          />
                          <Button
                            size="sm"
                            onClick={generateWithAI}
                            disabled={aiLoading || !aiPrompt.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                          >
                            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                            Generate Email Body
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Template Picker */}
                  <div className="space-y-2">
                    <Label>Email Template <span className="text-muted-foreground font-normal text-xs">(optional — pick one to pre-fill your email)</span></Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {EMAIL_TEMPLATES.map(tpl => {
                        const TplIcon = tpl.icon;
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => applyTemplate(tpl.id)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm transition-all ${
                              selectedTemplateId === tpl.id
                                ? 'border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30'
                                : 'border-border hover:border-primary/40 hover:bg-muted/60'
                            }`}
                          >
                            <span className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
                              selectedTemplateId === tpl.id ? 'bg-primary/15' : 'bg-muted'
                            }`}>
                              <TplIcon className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-xs leading-tight">{tpl.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{tpl.category}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {selectedTemplateId && (
                      <button
                        type="button"
                        onClick={() => { setSelectedTemplateId(null); setBody(''); }}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Clear template
                      </button>
                    )}
                  </div>

                  {/* ── Template colour customisation ── */}
                  <div className="p-4 bg-muted/30 rounded-xl border border-border/60 space-y-3">
                    <p className="text-xs font-semibold flex items-center gap-2 text-foreground/80">
                      <Palette className="w-3.5 h-3.5" />
                      Template Colours
                      {!selectedTemplateId && <span className="font-normal text-muted-foreground">(pick a template above first to preview)</span>}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Header colour</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={tplHeaderColor}
                            onChange={e => {
                              setTplHeaderColor(e.target.value);
                              if (selectedTemplateId) applyTemplate(selectedTemplateId, undefined, e.target.value, tplBgColor);
                            }}
                            className="w-9 h-8 rounded-md cursor-pointer border border-border bg-transparent"
                          />
                          <span className="text-[11px] text-muted-foreground font-mono">{tplHeaderColor}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Background colour</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={tplBgColor}
                            onChange={e => {
                              setTplBgColor(e.target.value);
                              if (selectedTemplateId) applyTemplate(selectedTemplateId, undefined, tplHeaderColor, e.target.value);
                            }}
                            className="w-9 h-8 rounded-md cursor-pointer border border-border bg-transparent"
                          />
                          <span className="text-[11px] text-muted-foreground font-mono">{tplBgColor}</span>
                        </div>
                      </div>
                    </div>
                    {/* Social links status */}
                    {(() => {
                      const links = Array.isArray((profile as any)?.social_links) ? (profile as any).social_links : [];
                      const website = (profile as any)?.website_url;
                      const count = links.length + (website ? 1 : 0);
                      if (count === 0) return (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          💡 Add social links in <strong>Settings → Brand</strong> to include them in the footer
                        </p>
                      );
                      return (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3" />
                          {count} social link{count !== 1 ? 's' : ''} will appear in the email footer
                        </p>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Your compelling subject line..."
                      className="bg-muted/40"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Body</Label>
                    <RichTextEditor
                      value={body}
                      onChange={setBody}
                      placeholder="Write your email here, or use a template or AI Generate above..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* STEP 3: Preview */}
          {step === 3 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4" /> Email Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border overflow-hidden bg-white shadow-sm">
                  {/* Email header mockup */}
                  <div className="bg-gray-50 px-5 py-3 border-b space-y-1">
                    <div className="flex items-baseline gap-2 text-xs text-gray-500">
                      <span className="font-medium w-12 text-right">From:</span>
                      <span>{profile?.name || 'You'} &lt;{profile?.email || user?.email}&gt;</span>
                    </div>
                    <div className="flex items-baseline gap-2 text-xs text-gray-500">
                      <span className="font-medium w-12 text-right">To:</span>
                      <span>{recipients.slice(0, 3).join(', ')}{recipients.length > 3 ? ` +${recipients.length - 3} more` : ''}</span>
                    </div>
                    <div className="flex items-baseline gap-2 text-xs text-gray-500">
                      <span className="font-medium w-12 text-right">Subject:</span>
                      <span className="font-semibold text-gray-700">{subject || '(no subject)'}</span>
                    </div>
                  </div>
                  {/* Email body */}
                  <div
                    className="px-6 py-5 text-sm prose prose-sm max-w-none max-h-96 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: body || '<p class="text-gray-400">Your email body will appear here...</p>' }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={saveDraft} disabled={savingDraft} className="gap-1.5">
                    {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Draft
                  </Button>
                  <Button variant="outline" size="sm" onClick={sendTestEmail} disabled={sendingTest} className="gap-1.5">
                    {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5" />}
                    Send Test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Test email is sent to your account email ({user?.email}).</p>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: Send */}
          {step === 4 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Rocket className="w-4 h-4" /> Launch Campaign</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Recipients', value: recipients.length },
                      { label: 'Batch size', value: '5 at a time' },
                      { label: 'Subject', value: subject, full: true },
                    ].map(({ label, value, full }) => (
                      <div key={label} className={`p-3 bg-muted/40 rounded-lg ${full ? 'col-span-2' : ''}`}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-medium text-sm truncate">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Schedule toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <Label>Schedule for later</Label>
                      </div>
                      <Switch checked={scheduleMode} onCheckedChange={setScheduleMode} />
                    </div>
                    {scheduleMode && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                        <div className="space-y-1">
                          <Label className="text-sm text-muted-foreground">Send at</Label>
                          <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="bg-muted/40" />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Send status */}
                  {sendStatus === 'idle' && (
                    <Button onClick={sendNow} className="w-full h-12 text-base font-semibold gap-2">
                      <Send className="w-5 h-5" />
                      {scheduleMode ? 'Schedule Campaign' : `Send to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`}
                    </Button>
                  )}

                  {sendStatus === 'sending' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending in batches of 5...
                        </span>
                        <span className="font-medium">{results.length}/{recipients.length}</span>
                      </div>
                      <Progress value={progress} className="h-3" />
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {results.filter(r => r.success).length} sent</span>
                        <span className="text-red-500 flex items-center gap-1.5"><XCircle className="w-4 h-4" /> {results.filter(r => !r.success).length} failed</span>
                      </div>
                      <Button variant="outline" onClick={() => { abortRef.current = true; setSendStatus('idle'); }} className="w-full">
                        Stop Sending
                      </Button>
                    </div>
                  )}

                  {sendStatus === 'done' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800/30">
                        <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                        <div>
                          <p className="font-semibold text-green-700 dark:text-green-300">Campaign complete!</p>
                          <p className="text-sm text-green-600 dark:text-green-400">{successCount} sent · {failCount} failed</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/campaigns/history')} className="flex-1 gap-1.5">
                          <Eye className="w-3.5 h-3.5" /> View History
                        </Button>
                        <Button variant="outline" onClick={() => { setSendStatus('idle'); setResults([]); setProgress(0); setStep(1); setSubject(''); setBody(''); setRecipientRaw(''); }} className="flex-1">
                          New Campaign
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Results list */}
                  {results.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border p-3">
                      {results.slice(-30).map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                          {r.success
                            ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                            : <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />}
                          <span className="truncate text-muted-foreground">{r.email}</span>
                          {!r.success && r.error && <Badge variant="destructive" className="text-xs ml-auto shrink-0">{r.error.slice(0, 24)}</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      {sendStatus === 'idle' && (
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < STEPS.length ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="gap-1.5">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
