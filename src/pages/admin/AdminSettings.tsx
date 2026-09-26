import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Settings, AppSettings, EmailLimitRule } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Search, Key, Info, Image, ShieldCheck } from 'lucide-react';

export function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [appSettings, setAppSettings] = useState<Partial<AppSettings>>({});
  const [limitRules, setLimitRules] = useState<EmailLimitRule[]>([]);
  const [deletedRuleIds, setDeletedRuleIds] = useState<string[]>([]);
  const [brazeDirty, setBrazeDirty] = useState(false);
  const [braze, setBraze] = useState({
    apiKey: '',
    appId: '',
    restEndpoint: 'https://rest.iad-01.braze.com',
    fromEmail: '',
    fromName: 'Darapet Technology',
    configured: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [s, a, rules] = await Promise.all([
        supabase.from('settings').select('*').eq('id', 1).single(),
        supabase.from('app_settings').select('*').eq('id', 1).single(),
        supabase.from('email_limit_rules').select('*').order('min_account_age_days', { ascending: true }),
      ]);
      if (s.data) setSettings(s.data);
      if (a.data) setAppSettings(a.data);
      if (rules.data) setLimitRules(rules.data);
      const { data: brazeData } = await supabase.functions.invoke('admin-secrets', { body: { action: 'get' } });
      if (brazeData) setBraze(prev => ({
        ...prev,
        appId: brazeData.brazeAppId || '',
        restEndpoint: brazeData.brazeRestEndpoint || prev.restEndpoint,
        fromEmail: brazeData.brazeFromEmail || '',
        fromName: brazeData.brazeFromName || prev.fromName,
        configured: Boolean(brazeData.brazeConfigured),
      }));
      setLoading(false);
    };
    load();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from('settings').upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
    const { error: err2 } = await supabase.from('app_settings').upsert({ id: 1, ...appSettings, updated_at: new Date().toISOString() });
    let brazeData: { error?: string } | null = null;
    let brazeError: { message: string } | null = null;
    if (brazeDirty) {
      const result = await supabase.functions.invoke('admin-secrets', {
        body: {
          action: 'save',
          brazeApiKey: braze.apiKey,
          brazeAppId: braze.appId,
          brazeRestEndpoint: braze.restEndpoint,
          brazeFromEmail: braze.fromEmail,
          brazeFromName: braze.fromName,
        },
      });
      brazeData = result.data;
      brazeError = result.error;
    }
    const { error: deletedRulesError } = deletedRuleIds.length
      ? await supabase.from('email_limit_rules').delete().in('id', deletedRuleIds)
      : { error: null };
    const { error: rulesError } = await supabase.from('email_limit_rules').upsert(
      limitRules.map(rule => ({ ...rule, updated_at: new Date().toISOString() })),
    );
    setSaving(false);
    if (error || err2 || brazeError || brazeData?.error || deletedRulesError || rulesError) {
      toast({ variant: 'destructive', title: 'Error saving settings', description: (error || err2 || brazeError || deletedRulesError || rulesError)?.message || brazeData?.error });
    } else {
      setBraze(prev => ({ ...prev, apiKey: '', configured: brazeDirty ? true : prev.configured }));
      setBrazeDirty(false);
      setDeletedRuleIds([]);
      toast({ title: 'Settings saved', description: 'Platform settings and Braze OTP configuration have been updated.' });
    }
  };

  const set = (key: keyof Settings, value: string) => setSettings(prev => ({ ...prev, [key]: value }));
  const setApp = (key: keyof AppSettings, value: unknown) => setAppSettings(prev => ({ ...prev, [key]: value }));
  const addLimitRule = () => setLimitRules(prev => [...prev, {
    id: crypto.randomUUID(),
    label: 'New account window',
    min_account_age_days: 0,
    max_account_age_days: 6,
    daily_limit: 25,
    weekly_limit: 100,
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }]);
  const updateLimitRule = (id: string, patch: Partial<EmailLimitRule>) =>
    setLimitRules(prev => prev.map(rule => rule.id === id ? { ...rule, ...patch } : rule));
  const removeLimitRule = (id: string) => {
    setLimitRules(prev => prev.filter(rule => rule.id !== id));
    setDeletedRuleIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Platform Settings</h1>
        <p className="text-white/40 mt-1">Configure email, scraping, and global defaults</p>
      </div>

      {/* Braze / OTP */}
      <Card className="bg-white/5 border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-violet-400" /> Braze OTP Delivery</CardTitle>
          <CardDescription className="text-white/40">
            OTPs are generated and sent by a Supabase Edge Function. The API key is never returned to this page.
            {braze.configured && <span className="text-emerald-400 ml-1">Configured.</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70">Braze REST API Key</Label>
            <Input value={braze.apiKey} onChange={e => { setBrazeDirty(true); setBraze(prev => ({ ...prev, apiKey: e.target.value })); }}
              placeholder={braze.configured ? 'Leave blank to keep the saved key' : 'Enter API key'} type="password"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/70">Braze App ID</Label>
              <Input value={braze.appId} onChange={e => { setBrazeDirty(true); setBraze(prev => ({ ...prev, appId: e.target.value })); }}
                placeholder="Your Braze email app ID" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">REST Endpoint</Label>
              <Input value={braze.restEndpoint} onChange={e => { setBrazeDirty(true); setBraze(prev => ({ ...prev, restEndpoint: e.target.value })); }}
                placeholder="https://rest.iad-01.braze.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/70">From Email</Label>
              <Input type="email" value={braze.fromEmail} onChange={e => { setBrazeDirty(true); setBraze(prev => ({ ...prev, fromEmail: e.target.value })); }}
                placeholder="no-reply@example.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">From Name</Label>
              <Input value={braze.fromName} onChange={e => { setBrazeDirty(true); setBraze(prev => ({ ...prev, fromName: e.target.value })); }}
                placeholder="Darapet Technology" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            </div>
          </div>
          <p className="text-xs text-white/30 flex items-start gap-1">
            <Info className="w-3 h-3 mt-0.5 shrink-0" /> Deploy the <code>admin-secrets</code> and <code>admin-send-otp</code> Supabase Edge Functions before testing delivery.
          </p>
        </CardContent>
      </Card>

      {/* Email / OTP */}
      <Card className="bg-white/5 border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><Mail className="w-5 h-5 text-blue-400" /> Email (OTP & Outreach)</CardTitle>
          <CardDescription className="text-white/40">Brevo API key used for sending OTP verification emails and platform notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70">Brevo API Key</Label>
            <Input value={settings.brevo_api_key || ''} onChange={e => set('brevo_api_key', e.target.value)}
              placeholder="xkeysib-..." type="password"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <p className="text-xs text-white/30 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" /> Get this from brevo.com → Settings → API Keys. This key is used for sending OTP emails on registration.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Platform Brand Name</Label>
            <Input value={settings.brand_name || ''} onChange={e => set('brand_name', e.target.value)}
              placeholder="Darapet Lead Engine"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Platform Website</Label>
            <Input value={settings.website_url || ''} onChange={e => set('website_url', e.target.value)}
              placeholder="https://darapet.com"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
        </CardContent>
      </Card>

      {/* Scraping */}
      <Card className="bg-white/5 border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><Search className="w-5 h-5 text-green-400" /> Lead Scraping</CardTitle>
          <CardDescription className="text-white/40">Google Custom Search API — used globally for all users' lead scraping. Users don't need their own keys.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70">Google Search API Key</Label>
            <Input value={settings.google_search_api_key || ''} onChange={e => set('google_search_api_key', e.target.value)}
              type="password" placeholder="AIzaSy..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <p className="text-xs text-white/30 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" /> Get from console.cloud.google.com → APIs → Custom Search JSON API. Free: 100 queries/day.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Search Engine ID (CX)</Label>
            <Input value={settings.google_search_engine_id || ''} onChange={e => set('google_search_engine_id', e.target.value)}
              placeholder="017576662512468239146:omuauf_lfve"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <p className="text-xs text-white/30">Get from programmablesearchengine.google.com → Your engine → Setup → Search engine ID</p>
          </div>
        </CardContent>
      </Card>

      {/* AI */}
      <Card className="bg-white/5 border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><Key className="w-5 h-5 text-purple-400" /> AI Writing (Groq)</CardTitle>
          <CardDescription className="text-white/40">Platform-level Groq API key. Users can also set their own in profile settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70">Groq API Key</Label>
            <Input value={settings.groq_api_key || ''} onChange={e => set('groq_api_key', e.target.value)}
              type="password" placeholder="gsk_..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <p className="text-xs text-white/30">Get from console.groq.com. Free tier available.</p>
          </div>
        </CardContent>
      </Card>

      {/* New account limits */}
      <Card className="bg-white/5 border-white/5">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-white flex items-center gap-2"><Mail className="w-5 h-5 text-cyan-400" /> New Account Email Windows</CardTitle>
            <CardDescription className="text-white/40">Set daily and weekly limits by account age. Use 0 for unlimited.</CardDescription>
          </div>
          <Button type="button" size="sm" onClick={addLimitRule} className="bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30">Add Window</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {limitRules.length === 0 && <p className="text-sm text-white/35">No age windows configured yet. The default daily limit above remains in effect.</p>}
          {limitRules.map(rule => (
            <div key={rule.id} className="grid gap-3 rounded-lg bg-white/5 p-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] md:items-end">
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Label</Label>
                <Input value={rule.label} onChange={e => updateLimitRule(rule.id, { label: e.target.value })} className="bg-white/5 border-white/10 text-white h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">From day</Label>
                <Input type="number" min={0} value={rule.min_account_age_days} onChange={e => updateLimitRule(rule.id, { min_account_age_days: Number(e.target.value) })} className="bg-white/5 border-white/10 text-white h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">To day</Label>
                <Input type="number" min={rule.min_account_age_days} value={rule.max_account_age_days ?? ''} onChange={e => updateLimitRule(rule.id, { max_account_age_days: e.target.value === '' ? null : Number(e.target.value) })} placeholder="∞" className="bg-white/5 border-white/10 text-white h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Daily</Label>
                <Input type="number" min={0} value={rule.daily_limit} onChange={e => updateLimitRule(rule.id, { daily_limit: Number(e.target.value) })} className="bg-white/5 border-white/10 text-white h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Weekly</Label>
                <Input type="number" min={0} value={rule.weekly_limit} onChange={e => updateLimitRule(rule.id, { weekly_limit: Number(e.target.value) })} className="bg-white/5 border-white/10 text-white h-9" />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-white/60">
                  <input type="checkbox" checked={rule.enabled} onChange={e => updateLimitRule(rule.id, { enabled: e.target.checked })} />
                  On
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeLimitRule(rule.id)} className="text-red-300 hover:bg-red-500/10">Remove</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Default limits */}
      <Card className="bg-white/5 border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><Mail className="w-5 h-5 text-cyan-400" /> Default Account Limits</CardTitle>
          <CardDescription className="text-white/40">Applied to all new users. Can be overridden per user in User Detail.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70">Default Daily Email Limit</Label>
            <Input type="number" value={appSettings.default_daily_email_limit || ''} onChange={e => setApp('default_daily_email_limit', Number(e.target.value))}
              placeholder="50"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <p className="text-xs text-white/30">Maximum emails a new user can send per day (0 = unlimited)</p>
          </div>
        </CardContent>
      </Card>

      {/* Cloudinary */}
      <Card className="bg-white/5 border-white/5">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><Image className="w-5 h-5 text-orange-400" /> Image Storage (Cloudinary)</CardTitle>
          <CardDescription className="text-white/40">Used for storing user logo and signature uploads. Create a free account at cloudinary.com, then create an <strong className="text-white/60">unsigned</strong> upload preset.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70">Cloud Name</Label>
            <Input value={settings.cloudinary_cloud_name || ''} onChange={e => set('cloudinary_cloud_name', e.target.value)}
              placeholder="e.g. mycompany"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <p className="text-xs text-white/30 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" /> Found in your Cloudinary dashboard top-left under your account name.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Upload Preset (unsigned)</Label>
            <Input value={settings.cloudinary_upload_preset || ''} onChange={e => set('cloudinary_upload_preset', e.target.value)}
              placeholder="e.g. du7misvms"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30" />
            <p className="text-xs text-white/30 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" /> Settings → Upload → Upload Presets → create one with Signing Mode set to <strong className="text-white/50">Unsigned</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="bg-blue-600 hover:bg-blue-700 font-semibold px-8">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Save All Settings
      </Button>
    </div>
  );
}
