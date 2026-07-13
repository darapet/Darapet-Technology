import { useState, useEffect, useRef } from 'react';
import { useSearch } from 'wouter';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { DarapetLead } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Send, Clock, CheckCircle2, XCircle, AlertCircle, Image, Palette } from 'lucide-react';
import { EMAIL_TEMPLATES } from './emailTemplates';
import { cn } from '@/lib/utils';
import { sendEmail, hasUsableEmailProvider, type EmailProviderConfig } from '@/lib/emailSend';

type SendStatus = 'idle' | 'sending' | 'done';

interface SendResult {
  email: string;
  success: boolean;
  error?: string;
}

export function EmailPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const searchStr = useSearch();
  const batchIdParam = new URLSearchParams(searchStr).get('batch');

  const [leads, setLeads] = useState<DarapetLead[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState(EMAIL_TEMPLATES[0].id);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SendResult[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [groqKey, setGroqKey] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [headerColor, setHeaderColor] = useState('');
  const [footerColor, setFooterColor] = useState('');
  const [bodyBgColor, setBodyBgColor] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const abortRef = useRef(false);

  useEffect(() => {
    if (!user || !batchIdParam) return;
    supabase.from('darapet_leads').select('*').eq('batch_id', Number(batchIdParam)).not('email', 'is', null)
      .then(({ data }) => setLeads(data || []));
  }, [user, batchIdParam]);

  useEffect(() => {
    // Fall back to the admin's default Groq key when the user hasn't set their own
    if (profile?.groq_api_key) return;
    supabase.from('settings').select('groq_api_key').eq('id', 1).single().then(({ data }) => {
      if (data?.groq_api_key) setGroqKey(data.groq_api_key);
    });
  }, [profile]);

  const generateWithAI = async () => {
    const key = profile?.groq_api_key || groqKey;
    if (!key) { toast({ variant: 'destructive', title: 'No Groq API key', description: 'Add your Groq API key in Settings.' }); return; }
    if (!aiPrompt) { toast({ variant: 'destructive', title: 'Enter a prompt', description: 'Tell the AI what to write.' }); return; }
    setAiLoading(true);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: 'You are an expert email copywriter. Write professional, engaging outreach emails. Output only the email body text, no subject line, no placeholders.' },
            { role: 'user', content: `Write a cold outreach email for: ${aiPrompt}\n\nNiche: ${profile?.company || 'our business'}\nBrand: ${profile?.name || 'the sender'}` }
          ],
          max_tokens: 500,
          temperature: 0.7,
        })
      });
      const data = await res.json();
      const generated = data.choices?.[0]?.message?.content;
      if (generated) { setBody(generated); toast({ title: 'AI email generated!', description: 'Review and edit before sending.' }); }
    } catch (err) {
      toast({ variant: 'destructive', title: 'AI Error', description: 'Failed to generate. Check your Groq API key.' });
    } finally {
      setAiLoading(false);
    }
  };

  const sendEmails = async () => {
    if (!subject || !body) { toast({ variant: 'destructive', title: 'Missing fields', description: 'Add subject and body.' }); return; }
    if (leads.length === 0) { toast({ variant: 'destructive', title: 'No leads', description: 'No email leads found in this batch.' }); return; }

    // Get user's email provider settings
    const { data: prof } = await supabase.from('profiles')
      .select('brevo_api_key, active_smtp, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, email_daily_limit, emails_sent_today')
      .eq('id', user!.id).single();

    const providerConfig: EmailProviderConfig | null = prof;
    if (!providerConfig || !hasUsableEmailProvider(providerConfig)) {
      toast({ variant: 'destructive', title: 'No email provider configured', description: 'Add your Brevo API key or SMTP details in Settings to send emails.' });
      return;
    }

    if (scheduleMode && scheduledAt) {
      await supabase.from('scheduled_sends').insert({
        user_id: user!.id,
        campaign_id: batchIdParam || undefined,
        lead_ids: leads.map(l => l.id),
        type: 'email',
        subject,
        body,
        provider: providerConfig.active_smtp === 'smtp' ? 'smtp' : 'brevo',
        status: 'scheduled',
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
      toast({ title: 'Scheduled!', description: `Email will be sent on ${new Date(scheduledAt).toLocaleString()}` });
      return;
    }

    abortRef.current = false;
    setSendStatus('sending');
    setProgress(0);
    setResults([]);

    const BATCH_SIZE = 10;
    const emailList = leads.filter(l => l.email);
    const template = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate)!;
    const signatureUrl = includeSignature ? (profile?.signature_url || null) : null;

    for (let i = 0; i < emailList.length; i += BATCH_SIZE) {
      if (abortRef.current) break;
      const batch = emailList.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(batch.map(async (lead) => {
        const html = template.renderHTML({
          brandName: profile?.company || 'Darapet',
          logoUrl: profile?.logo_url || '',
          brandColor: profile?.brand_color || '#3B82F6',
          headerBgOverride: headerColor || undefined,
          footerBgOverride: footerColor || undefined,
          emailBgColor: bodyBgColor || undefined,
          ctaUrl: ctaUrl || undefined,
          subject,
          body,
          signatureUrl,
          recipientName: lead.social_name || '',
        });

        try {
          const result = await sendEmail({
            config: providerConfig,
            fromName: profile?.name || profile?.company || 'Darapet',
            fromEmail: profile?.email || user!.email!,
            to: lead.email!,
            subject,
            html,
          });
          setResults(prev => [...prev, { email: lead.email!, success: result.ok, error: result.error }]);
          // Log to email_sends
          await supabase.from('email_sends').insert({
            user_id: user!.id,
            lead_id: lead.id.toString(),
            to_email: lead.email!,
            subject,
            template_id: selectedTemplate,
            provider: providerConfig.active_smtp === 'smtp' ? 'smtp' : 'brevo',
            status: result.ok ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          setResults(prev => [...prev, { email: lead.email!, success: false, error: msg }]);
        }
      }));

      setProgress(Math.round(((i + BATCH_SIZE) / emailList.length) * 100));
      if (i + BATCH_SIZE < emailList.length) await new Promise(r => setTimeout(r, 1000));
    }

    setSendStatus('done');
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const template = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Send Email Campaign</h1>
        <p className="text-muted-foreground mt-1">
          {leads.length > 0 ? `${leads.length} email leads loaded from batch #${batchIdParam}` : 'Compose and send your outreach'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Template & compose */}
        <div className="space-y-5">
          {/* Template picker */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Email Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {EMAIL_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                    className={cn('p-3 rounded-lg border text-left transition-all text-sm', selectedTemplate === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>
                    <span className={cn('w-7 h-7 rounded-md flex items-center justify-center', selectedTemplate === t.id ? 'bg-primary/15' : 'bg-muted')}>
                      <t.icon className="w-3.5 h-3.5" />
                    </span>
                    <p className="font-medium mt-1 text-xs">{t.name}</p>
                    <p className="text-muted-foreground text-xs">{t.category}</p>
                  </button>
                ))}
              </div>

              {/* Colour overrides */}
              <div className="mt-4 pt-4 border-t space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colour overrides</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Header</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={headerColor || '#3B82F6'} onChange={e => setHeaderColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-transparent" />
                      <button onClick={() => setHeaderColor('')} className="text-xs text-muted-foreground hover:text-foreground">reset</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Footer</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={footerColor || '#0F172A'} onChange={e => setFooterColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-transparent" />
                      <button onClick={() => setFooterColor('')} className="text-xs text-muted-foreground hover:text-foreground">reset</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Content BG</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={bodyBgColor || '#F1F5F9'} onChange={e => setBodyBgColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-border p-0.5 bg-transparent" />
                      <button onClick={() => setBodyBgColor('')} className="text-xs text-muted-foreground hover:text-foreground">reset</button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compose */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Compose</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Your subject line here..." className="bg-muted/50" />
              </div>

              {/* AI Assistant */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Writing Assistant (Groq)</span>
                </div>
                <Input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                  placeholder="e.g. Cold outreach for SaaS company, B2B focused..."
                  className="bg-white dark:bg-white/5 border-purple-200 dark:border-purple-800/30 text-sm" />
                <Button size="sm" onClick={generateWithAI} disabled={aiLoading} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  Generate Email Body
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Email Body</Label>
                <Textarea value={body} onChange={e => setBody(e.target.value)}
                  placeholder="Write your email body here, or use AI to generate it..."
                  className="bg-muted/50 min-h-[180px] resize-none" />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">Button Link <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                <Input value={ctaUrl} onChange={e => setCtaUrl(e.target.value)}
                  placeholder="https://your-site.com/offer"
                  type="url"
                  className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">The URL the call-to-action button points to.</p>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm">Include email signature</Label>
                </div>
                <Switch checked={includeSignature} onCheckedChange={setIncludeSignature} />
              </div>
              {includeSignature && !profile?.signature_url && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> No signature uploaded. Add one in Settings → Signature.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Schedule toggle */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Label>Schedule for later</Label>
                </div>
                <Switch checked={scheduleMode} onCheckedChange={setScheduleMode} />
              </div>
              {scheduleMode && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Send at</Label>
                  <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="bg-muted/50" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview & send */}
        <div className="space-y-5">
          {/* Template Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription>Live preview of your email</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <div dangerouslySetInnerHTML={{
                  __html: template?.renderHTML({
                    brandName: profile?.company || 'Your Brand',
                    logoUrl: profile?.logo_url || '',
                    brandColor: profile?.brand_color || '#3B82F6',
                    headerBgOverride: headerColor || undefined,
                    footerBgOverride: footerColor || undefined,
                    emailBgColor: bodyBgColor || undefined,
                    ctaUrl: ctaUrl || undefined,
                    subject: subject || 'Your Subject Line',
                    body: body || 'Your email body will appear here...',
                    signatureUrl: includeSignature ? profile?.signature_url || null : null,
                    recipientName: 'Recipient',
                  }) || ''
                }} className="max-h-96 overflow-y-auto text-xs" />
              </div>
            </CardContent>
          </Card>

          {/* Send controls */}
          <Card>
            <CardContent className="py-5 space-y-4">
              {sendStatus === 'idle' && (
                <Button onClick={sendEmails} disabled={!subject || !body || leads.length === 0} className="w-full h-12 text-base font-semibold gap-2">
                  <Send className="w-5 h-5" />
                  {scheduleMode ? 'Schedule Campaign' : `Send to ${leads.length} leads`}
                </Button>
              )}

              {sendStatus === 'sending' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sending batch by batch...</span>
                    <span className="font-medium">{results.length}/{leads.length}</span>
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
                      <p className="font-semibold text-green-700 dark:text-green-300">Campaign complete</p>
                      <p className="text-sm text-green-600 dark:text-green-400">{successCount} sent · {failCount} failed</p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => { setSendStatus('idle'); setResults([]); setProgress(0); }} className="w-full">
                    Send Another Campaign
                  </Button>
                </div>
              )}

              {leads.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-2">
                  <AlertCircle className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                  No leads loaded. Go to <strong>Lead Batches</strong> and click "Send Email" on a batch.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results preview */}
          {results.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Send Results</CardTitle>
              </CardHeader>
              <CardContent className="max-h-48 overflow-y-auto space-y-1">
                {results.slice(-20).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    {r.success ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" /> : <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />}
                    <span className="truncate text-muted-foreground">{r.email}</span>
                    {!r.success && r.error && <Badge variant="destructive" className="text-xs ml-auto shrink-0">{r.error.slice(0, 20)}</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
