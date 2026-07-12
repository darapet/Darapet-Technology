import { useState, useEffect, type ComponentProps } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Upload, User, Mail, Key, Pen, Globe, Eye, EyeOff,
  ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Plus, X, Search,
} from 'lucide-react';
import { detectSmtpPreset, type SmtpPreset } from '@/lib/emailSend';
import { SOCIAL_PLATFORMS, SOCIAL_CATEGORIES } from '@/data/socialMedia';
import { SocialIcon } from '@/data/socialIcons';
import type { SocialLink } from '@/pages/email/emailTemplates';

// ─── Cloudinary ───────────────────────────────────────────────────────────────

async function getCloudinaryConfig(): Promise<{ cloud: string; preset: string }> {
  const { data } = await supabase.from('settings').select('cloudinary_cloud_name, cloudinary_upload_preset').eq('id', 1).single();
  // Trim any accidental whitespace that may have been copy-pasted into the admin form
  const cloud = (data?.cloudinary_cloud_name || '').trim();
  const preset = (data?.cloudinary_upload_preset || '').trim();
  if (!cloud || !preset) throw new Error('Cloudinary is not configured. Ask your admin to add the Cloud Name and Upload Preset in Admin → Settings.');
  return { cloud, preset };
}

async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const { cloud, preset } = await getCloudinaryConfig();
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', preset);
  form.append('folder', folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    let reason = res.statusText;
    try {
      const errBody = await res.json();
      reason = errBody?.error?.message ?? reason;
    } catch { /* ignore */ }
    if (res.status === 401 || res.status === 400) {
      throw new Error(
        `Cloudinary upload failed: ${reason}. ` +
        `Make sure the Upload Preset in Admin → Settings → Image Storage is set to "Unsigned" signing mode in your Cloudinary dashboard (Settings → Upload → Upload Presets).`
      );
    }
    throw new Error(`Cloudinary upload failed: ${reason}`);
  }
  const data = await res.json();
  return data.secure_url as string;
}

// ─── Secret input ─────────────────────────────────────────────────────────────

type SecretField = 'brevo_api_key' | 'sendgrid_api_key' | 'mailgun_api_key' | 'smtp_pass' | 'groq_api_key';

function SecretInput({ visible, onToggle, ...props }: ComponentProps<typeof Input> & { visible: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={`${props.className || ''} pr-10`} />
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggle}
        aria-label={visible ? 'Hide key' : 'Show key'}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── Social Links Manager ─────────────────────────────────────────────────────

function SocialLinksManager({
  links,
  websiteUrl,
  onLinksChange,
  onWebsiteChange,
}: {
  links: SocialLink[];
  websiteUrl: string;
  onLinksChange: (links: SocialLink[]) => void;
  onWebsiteChange: (url: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const addLink = (platformId: string) => {
    if (links.find(l => l.platform === platformId)) return;
    onLinksChange([...links, { platform: platformId, url: '' }]);
    setPickerOpen(false);
    setSearch('');
  };

  const removeLink = (platformId: string) => {
    onLinksChange(links.filter(l => l.platform !== platformId));
  };

  const updateUrl = (platformId: string, url: string) => {
    onLinksChange(links.map(l => l.platform === platformId ? { ...l, url } : l));
  };

  const alreadyAdded = new Set(links.map(l => l.platform));

  const filteredCategories = SOCIAL_CATEGORIES.map(cat => ({
    ...cat,
    platforms: SOCIAL_PLATFORMS.filter(
      p =>
        p.category === cat.id &&
        !alreadyAdded.has(p.id) &&
        (search === '' || p.name.toLowerCase().includes(search.toLowerCase()))
    ),
  })).filter(cat => cat.platforms.length > 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" /> Social Links
          </CardTitle>
          <CardDescription>
            Links added here appear as clickable brand icons at the bottom of every email you send
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Website — always visible */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-base shrink-0">🌐</span>
              Website URL
            </Label>
            <Input
              value={websiteUrl}
              onChange={e => onWebsiteChange(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="bg-muted/50"
            />
          </div>

          {/* Added platforms */}
          {links.length > 0 && (
            <div className="space-y-2.5">
              <div className="h-px bg-border" />
              {links.map(link => {
                const platform = SOCIAL_PLATFORMS.find(p => p.id === link.platform);
                if (!platform) return null;
                return (
                  <div key={link.platform} className="flex items-center gap-3">
                    {/* Platform badge */}
                    <div
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: platform.color + '18', border: `1px solid ${platform.color}30` }}
                    >
                      <SocialIcon platformId={platform.id} color={platform.color} size={16} />
                    </div>
                    {/* URL input */}
                    <div className="flex-1 min-w-0">
                      <Input
                        value={link.url}
                        onChange={e => updateUrl(link.platform, e.target.value)}
                        placeholder={`https://${platform.domain}/your-profile`}
                        className="bg-muted/50 text-sm"
                      />
                    </div>
                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeLink(link.platform)}
                      aria-label={`Remove ${platform.name}`}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add button */}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Social Platform
          </button>
        </CardContent>
      </Card>

      {/* Platform picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-5 pb-0 shrink-0">
            <DialogTitle className="text-base">Add Social Platform</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="px-5 pt-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search platforms..."
                className="pl-8 bg-muted/50 text-sm h-9"
                autoFocus
              />
            </div>
          </div>

          {/* Platform grid */}
          <div className="overflow-y-auto flex-1 px-5 pb-5 pt-3 space-y-4">
            {filteredCategories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No platforms match your search.</p>
            )}
            {filteredCategories.map(cat => (
              <div key={cat.id}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  {cat.label}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {cat.platforms.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addLink(p.id)}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-center group"
                    >
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110"
                        style={{ backgroundColor: p.color + '15', border: `1px solid ${p.color}25` }}
                      >
                        <SocialIcon platformId={p.id} color={p.color} size={18} />
                      </span>
                      <span className="text-[10px] font-medium leading-tight text-muted-foreground group-hover:text-foreground line-clamp-2">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [sigPreview, setSigPreview] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Record<SecretField, boolean>>({
    brevo_api_key: false, sendgrid_api_key: false, mailgun_api_key: false, smtp_pass: false, groq_api_key: false,
  });
  const toggleVisible = (field: SecretField) => setVisibleKeys(prev => ({ ...prev, [field]: !prev[field] }));
  const [smtpAdvancedOpen, setSmtpAdvancedOpen] = useState(false);
  const [smtpAdvancedTouched, setSmtpAdvancedTouched] = useState(false);

  // Social links state
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState('');

  const [form, setForm] = useState({
    name: '', company: '', phone: '', description: '',
    email_daily_limit: '', brand_color: '#3B82F6',
    brevo_api_key: '', sendgrid_api_key: '', mailgun_api_key: '', mailgun_domain: '',
    groq_api_key: '',
    smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '', smtp_secure: false,
    active_smtp: 'brevo',
  });
  const smtpPreset: SmtpPreset | null = detectSmtpPreset(form.smtp_user);

  useEffect(() => {
    if (!profile) return;
    setForm(prev => ({
      ...prev,
      name: profile.name || '',
      company: profile.company || '',
      phone: profile.phone || '',
      description: profile.description || '',
      email_daily_limit: profile.email_daily_limit?.toString() || '',
      brand_color: profile.brand_color || '#3B82F6',
      brevo_api_key: profile.brevo_api_key || '',
      sendgrid_api_key: profile.sendgrid_api_key || '',
      mailgun_api_key: profile.mailgun_api_key || '',
      mailgun_domain: profile.mailgun_domain || '',
      groq_api_key: profile.groq_api_key || '',
      smtp_host: profile.smtp_host || '',
      smtp_port: profile.smtp_port?.toString() || '',
      smtp_user: profile.smtp_user || '',
      smtp_pass: profile.smtp_pass || '',
      smtp_secure: profile.smtp_secure || false,
      active_smtp: profile.active_smtp || 'brevo',
    }));
    if (profile.logo_url) setLogoPreview(profile.logo_url);
    if (profile.signature_url) setSigPreview(profile.signature_url);
    // Load social links
    const raw = profile.social_links;
    if (Array.isArray(raw)) setSocialLinks(raw as SocialLink[]);
    if (profile.website_url) setWebsiteUrl(profile.website_url);
  }, [profile]);

  const set = (key: string, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (form.active_smtp !== 'smtp' || smtpAdvancedTouched) return;
    const preset = detectSmtpPreset(form.smtp_user);
    if (preset) {
      setForm(prev => ({ ...prev, smtp_host: preset.host, smtp_port: String(preset.port), smtp_secure: preset.secure }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.smtp_user, form.active_smtp, smtpAdvancedTouched]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'sig' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'sig') setSigFile(file);
    else setLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => {
      if (type === 'sig') setSigPreview(ev.target?.result as string);
      else setLogoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let logo_url = profile?.logo_url;
      let signature_url = profile?.signature_url;

      if (logoFile) {
        try {
          logo_url = await uploadToCloudinary(logoFile, `darapet/${user.id}`);
        } catch (err) {
          toast({ variant: 'destructive', title: 'Logo upload failed', description: err instanceof Error ? err.message : 'Check your Cloudinary settings.', duration: 12000 });
          setSaving(false);
          return;
        }
      }
      if (sigFile) {
        try {
          signature_url = await uploadToCloudinary(sigFile, `darapet/${user.id}`);
        } catch (err) {
          toast({ variant: 'destructive', title: 'Signature upload failed', description: err instanceof Error ? err.message : 'Check your Cloudinary settings.', duration: 12000 });
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        name: form.name,
        company: form.company,
        phone: form.phone,
        description: form.description,
        logo_url,
        signature_url,
        brand_color: form.brand_color,
        email_daily_limit: form.email_daily_limit ? Number(form.email_daily_limit) : null,
        brevo_api_key: form.brevo_api_key,
        sendgrid_api_key: form.sendgrid_api_key,
        mailgun_api_key: form.mailgun_api_key,
        mailgun_domain: form.mailgun_domain,
        groq_api_key: form.groq_api_key,
        smtp_host: form.smtp_host,
        smtp_port: form.smtp_port ? Number(form.smtp_port) : null,
        smtp_user: form.smtp_user,
        smtp_pass: form.smtp_pass,
        smtp_secure: form.smtp_secure,
        active_smtp: form.active_smtp,
        social_links: socialLinks,
        website_url: websiteUrl || null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Settings saved', description: 'Your profile has been updated.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      toast({ variant: 'destructive', title: 'Error saving settings', description: msg, duration: 12000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your profile, brand, and email configurations</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile"><User className="w-3 h-3 mr-1" />Profile</TabsTrigger>
          <TabsTrigger value="email"><Mail className="w-3 h-3 mr-1" />Email</TabsTrigger>
          <TabsTrigger value="brand"><Pen className="w-3 h-3 mr-1" />Brand</TabsTrigger>
        </TabsList>

        {/* ── PROFILE TAB ── */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={form.name} onChange={e => set('name', e.target.value)} className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => set('phone', e.target.value)} className="bg-muted/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={form.description} onChange={e => set('description', e.target.value)} className="bg-muted/50 resize-none" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Brand / Company Name</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={form.company} onChange={e => set('company', e.target.value)} className="pl-10 bg-muted/50" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EMAIL TAB ── */}
        <TabsContent value="email" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Provider</CardTitle>
              <CardDescription>Your API keys are used for sending email campaigns. Stored securely in your profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['brevo', 'sendgrid', 'mailgun', 'smtp'].map(p => (
                  <button key={p} onClick={() => {
                    set('active_smtp', p);
                    if (p === 'smtp' && !form.smtp_port) {
                      set('smtp_port', '465');
                      set('smtp_secure', true);
                    }
                  }}
                    className={`p-3 rounded-lg border text-sm font-medium capitalize transition-all ${form.active_smtp === p ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'}`}>
                    {p === 'brevo' ? '📧 Brevo' : p === 'sendgrid' ? '📨 SendGrid' : p === 'mailgun' ? '📬 Mailgun' : '🔧 My Email (SMTP)'}
                  </button>
                ))}
              </div>

              {form.active_smtp === 'brevo' && (
                <div className="space-y-2">
                  <Label>Brevo API Key</Label>
                  <SecretInput autoComplete="new-password" value={form.brevo_api_key} onChange={e => set('brevo_api_key', e.target.value)} placeholder="xkeysib-..." className="bg-muted/50"
                    visible={visibleKeys.brevo_api_key} onToggle={() => toggleVisible('brevo_api_key')} />
                  <p className="text-xs text-muted-foreground">From brevo.com → Settings → API Keys</p>
                </div>
              )}
              {form.active_smtp === 'sendgrid' && (
                <div className="space-y-2">
                  <Label>SendGrid API Key</Label>
                  <SecretInput autoComplete="new-password" value={form.sendgrid_api_key} onChange={e => set('sendgrid_api_key', e.target.value)} placeholder="SG...." className="bg-muted/50"
                    visible={visibleKeys.sendgrid_api_key} onToggle={() => toggleVisible('sendgrid_api_key')} />
                </div>
              )}
              {form.active_smtp === 'mailgun' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Mailgun API Key</Label>
                    <SecretInput autoComplete="new-password" value={form.mailgun_api_key} onChange={e => set('mailgun_api_key', e.target.value)} className="bg-muted/50"
                      visible={visibleKeys.mailgun_api_key} onToggle={() => toggleVisible('mailgun_api_key')} />
                  </div>
                  <div className="space-y-2">
                    <Label>Domain</Label>
                    <Input value={form.mailgun_domain} onChange={e => set('mailgun_domain', e.target.value)} placeholder="mg.yourdomain.com" className="bg-muted/50" />
                  </div>
                </div>
              )}
              {form.active_smtp === 'smtp' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Send free through your own mailbox — Gmail, Yahoo, Outlook, iCloud, AOL, Zoho, and GMX are recognized automatically
                    from your email address, no domain purchase required. Just enter your email and an app password below.
                  </p>
                  <div className="space-y-2">
                    <Label>Your Email Address</Label>
                    <Input autoComplete="off" value={form.smtp_user} onChange={e => set('smtp_user', e.target.value)} placeholder="you@gmail.com" className="bg-muted/50" />
                  </div>
                  {form.smtp_user.includes('@') && (
                    smtpPreset ? (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800/30 text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                        <p className="font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Detected {smtpPreset.label} — server settings filled in automatically.</p>
                        <p>{smtpPreset.passwordHint}</p>
                        {smtpPreset.passwordUrl && (
                          <p><a href={smtpPreset.passwordUrl} target="_blank" rel="noreferrer" className="underline font-medium">Get your {smtpPreset.passwordLabel.toLowerCase()} →</a></p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/30 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                        <p className="font-medium flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> We don't recognize this email domain automatically.</p>
                        <p>Open "Advanced server settings" below and enter your provider's SMTP host, port, and password manually.</p>
                      </div>
                    )
                  )}
                  <div className="space-y-2">
                    <Label>{smtpPreset?.passwordLabel || 'Password'}</Label>
                    <SecretInput autoComplete="new-password" value={form.smtp_pass} onChange={e => set('smtp_pass', e.target.value)}
                      placeholder={smtpPreset ? smtpPreset.passwordLabel : 'Your mailbox password or app password'} className="bg-muted/50"
                      visible={visibleKeys.smtp_pass} onToggle={() => toggleVisible('smtp_pass')} />
                    <p className="text-xs text-muted-foreground">Free accounts are typically capped around 500 emails/day.</p>
                  </div>
                  <button type="button" onClick={() => { setSmtpAdvancedOpen(v => !v); setSmtpAdvancedTouched(true); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    {smtpAdvancedOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Advanced server settings {smtpPreset && !smtpAdvancedOpen ? '(auto-filled)' : ''}
                  </button>
                  {smtpAdvancedOpen && (
                    <div className="grid grid-cols-2 gap-3 pl-1">
                      <div className="space-y-2 col-span-2">
                        <Label>SMTP Host</Label>
                        <Input value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)} placeholder="smtp.example.com" className="bg-muted/50" />
                      </div>
                      <div className="space-y-2">
                        <Label>Port</Label>
                        <Input type="number" value={form.smtp_port} onChange={e => set('smtp_port', e.target.value)} placeholder="465" className="bg-muted/50" />
                      </div>
                      <div className="space-y-2 flex flex-col justify-end">
                        <Label className="mb-2">Connection</Label>
                        <label className="flex items-center gap-2 text-sm h-10">
                          <input type="checkbox" checked={form.smtp_secure} onChange={e => set('smtp_secure', e.target.checked)} className="w-4 h-4" />
                          Use SSL/TLS (port 465)
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Daily Email Limit (0 = use admin default)</Label>
                <Input type="number" value={form.email_daily_limit} onChange={e => set('email_daily_limit', e.target.value)} placeholder="50" className="bg-muted/50 w-40" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Key className="w-4 h-4" /> AI Writing (Groq)</CardTitle>
              <CardDescription>Optional: add your own key to use AI email generation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Groq API Key</Label>
                <SecretInput autoComplete="new-password" value={form.groq_api_key} onChange={e => set('groq_api_key', e.target.value)} placeholder="gsk_... (or leave blank to use the admin default)" className="bg-muted/50"
                  visible={visibleKeys.groq_api_key} onToggle={() => toggleVisible('groq_api_key')} />
                <p className="text-xs text-muted-foreground">From console.groq.com. If left blank, the admin's default key (if any) is used.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BRAND TAB ── */}
        <TabsContent value="brand" className="space-y-4 mt-4">
          {/* Logo & Signature uploads */}
          <Card>
            <CardHeader><CardTitle className="text-base">Brand Assets</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {/* Logo */}
                <div className="space-y-3">
                  <Label>Brand Logo</Label>
                  <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed rounded-xl hover:border-primary/50 transition-colors cursor-pointer" onClick={() => document.getElementById('logoInput')?.click()}>
                    {logoPreview ? <img src={logoPreview} alt="logo" className="h-16 object-contain" /> : <Upload className="w-8 h-8 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">Click to upload logo</span>
                  </div>
                  <input id="logoInput" type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'logo')} />
                </div>
                {/* Signature */}
                <div className="space-y-3">
                  <Label>Email Signature Image</Label>
                  <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed rounded-xl hover:border-primary/50 transition-colors cursor-pointer" onClick={() => document.getElementById('sigInput')?.click()}>
                    {sigPreview ? <img src={sigPreview} alt="signature" className="h-16 object-contain" /> : <Pen className="w-8 h-8 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">Click to upload signature</span>
                  </div>
                  <input id="sigInput" type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, 'sig')} />
                  <p className="text-xs text-muted-foreground">For best results, use a transparent PNG.</p>
                </div>
              </div>

              {/* Brand colour */}
              <div className="space-y-2">
                <Label>Brand Colour</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.brand_color} onChange={e => set('brand_color', e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer border border-border" />
                  <span className="text-sm text-muted-foreground">Used as the default email header colour and in outreach templates</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <SocialLinksManager
            links={socialLinks}
            websiteUrl={websiteUrl}
            onLinksChange={setSocialLinks}
            onWebsiteChange={setWebsiteUrl}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2 px-8">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
