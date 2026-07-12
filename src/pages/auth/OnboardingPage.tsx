import { useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Upload, Globe, Phone, Building2, User, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SOCIAL_PLATFORMS } from '@/data/socialMedia';
import { SocialIcon } from '@/data/socialIcons';

const BUSINESS_CATEGORIES = [
  'Student', 'Freelancer', 'Developer', 'Designer',
  'E-commerce Store Owner', 'Digital Marketer', 'Agency Owner',
  'Entrepreneur', 'Coach / Consultant', 'Content Creator',
  'Real Estate Agent', 'Recruiter', 'Sales Professional', 'Other',
];

export function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    description: '',
    website_url: '',
    brand_name: '',
    brand_color: '#3B82F6',
    category: '',
    socials: {} as Record<string, string>,
  });

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSocialToggle = (platformId: string, value: string) => {
    setForm(prev => ({
      ...prev,
      socials: value ? { ...prev.socials, [platformId]: value } : Object.fromEntries(Object.entries(prev.socials).filter(([k]) => k !== platformId)),
    }));
  };

  const submit = async () => {
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      let logo_url = '';
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `logos/${user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, logoFile, { upsert: true });
        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          logo_url = data.publicUrl;
        }
      }

      // Insert into profiles
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        name: form.name,
        company: form.company,
        phone: form.phone,
        description: form.description,
        logo_url,
        brand_color: form.brand_color,
      });
      if (profileError) throw profileError;

      // Insert into app_users
      const { error: appUserError } = await supabase.from('app_users').upsert({
        auth_user_id: user.id,
        email: user.email,
        first_name: form.name.split(' ')[0] || form.name,
        last_name: form.name.split(' ').slice(1).join(' ') || '',
        brand_name: form.company,
        brand_logo_url: logo_url,
        website_url: form.website_url,
        socials: form.socials,
        role: form.category,
        status: 'active',
      });
      if (appUserError) throw appUserError;

      await refreshProfile();
      setLocation('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Your Identity', description: 'Tell us who you are' },
    { title: 'Brand & Business', description: 'Set up your brand presence' },
    { title: 'Social Media', description: 'Connect your social profiles' },
    { title: 'All Done!', description: 'Review and finish' },
  ];

  const canProceed = [
    form.name.length >= 2,
    form.company.length >= 1,
    true,
    true,
  ][step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Complete Your Profile</h1>
          <p className="text-blue-200 mt-1">Step {step + 1} of {steps.length} — {steps[step].description}</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-white/10'}`} />
          ))}
        </div>

        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-md text-white">
          <CardHeader>
            <CardTitle className="text-xl text-white">{steps[step].title}</CardTitle>
            <CardDescription className="text-blue-200">{steps[step].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && <div className="bg-red-500/20 border border-red-500/40 text-red-200 text-sm px-4 py-3 rounded-lg">{error}</div>}

            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('logoUpload')?.click()}>
                      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl border-2 border-dashed transition-all ${logoPreview ? 'border-transparent' : 'border-white/20 hover:border-blue-400'}`}>
                        {logoPreview ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover rounded-2xl" /> : <Upload className="w-6 h-6 text-white/40" />}
                      </div>
                      <input id="logoUpload" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                      <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1"><Upload className="w-3 h-3 text-white" /></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-200 font-medium">Profile / Brand Logo</p>
                      <p className="text-xs text-white/40 mt-1">Shown on emails and your profile</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-blue-100">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <Input placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-blue-100">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <Input placeholder="+1 234 567 8900" value={form.phone} onChange={e => set('phone', e.target.value)}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-blue-100">Short Bio</Label>
                    <Textarea placeholder="Tell the world what you do..." value={form.description} onChange={e => set('description', e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none" rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-blue-100">Business Category</Label>
                    <div className="flex flex-wrap gap-2">
                      {BUSINESS_CATEGORIES.map(cat => (
                        <button key={cat} type="button" onClick={() => set('category', cat)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${form.category === cat ? 'bg-blue-600 border-blue-600 text-white' : 'border-white/20 text-white/60 hover:border-blue-400 hover:text-white'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-blue-100">Brand / Business Name *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <Input placeholder="Acme Inc." value={form.company} onChange={e => set('company', e.target.value)}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-blue-100">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <Input placeholder="https://yoursite.com" value={form.website_url} onChange={e => set('website_url', e.target.value)}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-blue-100">Brand Colour</Label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={form.brand_color} onChange={e => set('brand_color', e.target.value)}
                        className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-transparent" />
                      <span className="text-white/60 text-sm">Used on your email templates and outreach</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <p className="text-sm text-blue-200">Add your social media profile URLs (optional). These will be shown in your email signature.</p>
                  <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto pr-1">
                    {SOCIAL_PLATFORMS.slice(0, 20).map(platform => (
                      <div key={platform.id} className="flex items-center gap-3">
                        <span className="w-8 flex items-center justify-center shrink-0">
                          <SocialIcon platformId={platform.id} color={platform.color} size={18} />
                        </span>
                        <span className="text-sm text-white/70 w-28 shrink-0">{platform.name}</span>
                        <Input
                          placeholder={`https://${platform.domain}/yourprofile`}
                          value={form.socials[platform.id] || ''}
                          onChange={e => handleSocialToggle(platform.id, e.target.value)}
                          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/30 text-sm h-9"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-4 space-y-3">
                    {logoPreview && <img src={logoPreview} alt="logo" className="w-16 h-16 rounded-xl object-cover" />}
                    <div><span className="text-blue-300 text-sm">Name:</span> <span className="text-white font-medium">{form.name}</span></div>
                    <div><span className="text-blue-300 text-sm">Brand:</span> <span className="text-white font-medium">{form.company}</span></div>
                    {form.phone && <div><span className="text-blue-300 text-sm">Phone:</span> <span className="text-white">{form.phone}</span></div>}
                    {form.website_url && <div><span className="text-blue-300 text-sm">Website:</span> <span className="text-white">{form.website_url}</span></div>}
                    {form.category && <div><span className="text-blue-300 text-sm">Category:</span> <Badge className="ml-1 bg-blue-600/30 text-blue-200 border-blue-500/30">{form.category}</Badge></div>}
                    {Object.keys(form.socials).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(form.socials).map(id => {
                          const p = SOCIAL_PLATFORMS.find(pl => pl.id === id);
                          return p ? (
                            <Badge key={id} variant="outline" className="text-white/70 border-white/20 inline-flex items-center gap-1">
                              <SocialIcon platformId={id} color={p.color} size={12} />
                              {p.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 border-white/20 text-white hover:bg-white/10">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 font-semibold">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Launch My Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
