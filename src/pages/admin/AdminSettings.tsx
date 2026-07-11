import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Settings, AppSettings } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Search, Key, Info } from 'lucide-react';

export function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [appSettings, setAppSettings] = useState<Partial<AppSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [s, a] = await Promise.all([
        supabase.from('settings').select('*').eq('id', 1).single(),
        supabase.from('app_settings').select('*').eq('id', 1).single(),
      ]);
      if (s.data) setSettings(s.data);
      if (a.data) setAppSettings(a.data);
      setLoading(false);
    };
    load();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from('settings').upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });
    const { error: err2 } = await supabase.from('app_settings').upsert({ id: 1, ...appSettings, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error || err2) {
      toast({ variant: 'destructive', title: 'Error saving settings', description: (error || err2)?.message });
    } else {
      toast({ title: 'Settings saved', description: 'All platform settings have been updated.' });
    }
  };

  const set = (key: keyof Settings, value: string) => setSettings(prev => ({ ...prev, [key]: value }));
  const setApp = (key: keyof AppSettings, value: unknown) => setAppSettings(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Platform Settings</h1>
        <p className="text-white/40 mt-1">Configure email, scraping, and global defaults</p>
      </div>

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

      <Button onClick={saveSettings} disabled={saving} className="bg-blue-600 hover:bg-blue-700 font-semibold px-8">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Save All Settings
      </Button>
    </div>
  );
}
