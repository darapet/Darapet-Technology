import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { COUNTRIES } from '@/data/countries';
import { SOCIAL_PLATFORMS, SOCIAL_CATEGORIES } from '@/data/socialMedia';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ChevronRight, ChevronLeft, Loader2, CheckCircle2, Search, Globe2, Hash, Share2, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScrapeResult {
  country: string;
  leads: Array<{ name: string; url: string; email?: string; source: string }>;
}

// Replit scrape backend — visits actual pages to extract real emails
const SCRAPE_API = 'https://3a63fe3e-5067-49b0-82f9-ba9b2991e703-00-iu9aps3qq093.riker.replit.dev/api/scrape';

export function ScrapePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [scraping, setScraping] = useState(false);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [adminSettings, setAdminSettings] = useState<{ google_search_api_key?: string | null; google_search_engine_id?: string | null } | null>(null);

  // Step 1: Countries & States
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<Record<string, string[]>>({});
  const [countrySearch, setCountrySearch] = useState('');

  // Step 2: Niche & Amount
  const [niche, setNiche] = useState('');
  const [amount, setAmount] = useState(20);

  // Step 3: Target
  const [scrapeType, setScrapeType] = useState<'email' | 'social'>('email');
  const [selectedSocial, setSelectedSocial] = useState('');
  const [socialCategoryFilter, setSocialCategoryFilter] = useState('all');

  useEffect(() => {
    supabase.from('settings').select('google_search_api_key, google_search_engine_id').eq('id', 1).single()
      .then(({ data }) => setAdminSettings(data));
  }, []);

  const steps = [
    { title: 'Location', description: 'Pick countries & states', icon: Globe2 },
    { title: 'Target', description: 'Niche & lead count', icon: Hash },
    { title: 'Channel', description: 'Email or social platform', icon: Share2 },
  ];

  // Country/State helpers
  const toggleCountry = (code: string) => {
    setSelectedCountries(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
    if (!selectedStates[code]) setSelectedStates(prev => ({ ...prev, [code]: [] }));
  };
  const toggleState = (countryCode: string, state: string) => {
    setSelectedStates(prev => {
      const cur = prev[countryCode] || [];
      return { ...prev, [countryCode]: cur.includes(state) ? cur.filter(s => s !== state) : [...cur, state] };
    });
  };
  const selectAllStates = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) return;
    const cur = selectedStates[countryCode] || [];
    if (cur.length === country.states.length) {
      setSelectedStates(prev => ({ ...prev, [countryCode]: [] }));
    } else {
      setSelectedStates(prev => ({ ...prev, [countryCode]: [...country.states] }));
    }
  };

  const filteredCountries = COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));

  const doScrape = async () => {
    if (!user) return;
    setScraping(true);
    setStep(3);

    const apiKey = adminSettings?.google_search_api_key;
    const cx = adminSettings?.google_search_engine_id;

    if (!apiKey || !cx) {
      toast({ variant: 'destructive', title: 'Scraping not configured', description: 'Admin has not set up the Google Search API key yet.' });
      setScraping(false);
      setStep(2);
      return;
    }

    const platform = SOCIAL_PLATFORMS.find(p => p.id === selectedSocial);
    const allResults: ScrapeResult[] = [];

    for (const countryCode of selectedCountries) {
      const country = COUNTRIES.find(c => c.code === countryCode);
      if (!country) continue;
      const states = selectedStates[countryCode] || [];
      // Pass up to 5 locations per country to the backend
      const locations = states.length > 0 ? states.slice(0, 5) : [country.name];

      try {
        const res = await fetch(SCRAPE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            googleApiKey: apiKey,
            googleCx: cx,
            niche,
            locations,
            amount,
            scrapeType,
            socialDomain: platform?.domain || '',
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}) as { error?: string });
          toast({
            variant: 'destructive',
            title: 'Scrape failed',
            description: (errData as { error?: string }).error || `Server error ${res.status}`,
          });
          break;
        }

        const data = await res.json() as {
          results: Array<{ location: string; leads: ScrapeResult['leads'] }>;
        };

        const countryLeads: ScrapeResult['leads'] = data.results.flatMap(r => r.leads);
        if (countryLeads.length > 0) {
          allResults.push({ country: country.name, leads: countryLeads.slice(0, amount) });
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Network error',
          description: 'Could not reach the scrape server. Make sure it is running.',
        });
        break;
      }
    }

    // Save batch to DB
    const { data: batch } = await supabase.from('lead_batches').insert({
      user_id: user.id,
      niche,
      country: selectedCountries.join(', '),
      target_type: scrapeType,
      requested_count: amount,
      found_count: allResults.reduce((sum, r) => sum + r.leads.length, 0),
      source: scrapeType === 'social' ? selectedSocial : 'email',
      status: 'complete',
    }).select().single();

    if (batch) {
      setBatchId(batch.id);
      const leadsToInsert = allResults.flatMap(r =>
        r.leads.map(lead => ({
          batch_id: batch.id,
          email: lead.email || null,
          social_name: scrapeType === 'social' ? lead.name : null,
          social_platform: scrapeType === 'social' ? selectedSocial : null,
          social_url: scrapeType === 'social' ? lead.url : null,
          source_url: lead.source,
        }))
      );
      if (leadsToInsert.length > 0) await supabase.from('darapet_leads').insert(leadsToInsert);
    }

    setResults(allResults);
    setScraping(false);
  };

  const totalFound = results.reduce((s, r) => s + r.leads.length, 0);
  const filteredSocials = SOCIAL_PLATFORMS.filter(p =>
    socialCategoryFilter === 'all' || p.category === socialCategoryFilter
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">New Lead Scrape</h1>
        <p className="text-muted-foreground mt-2">Find leads by location, niche, and channel</p>
      </div>

      {/* Step bar */}
      {step < 3 && (
        <div className="flex items-center gap-0">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.title} className="flex items-center">
                <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                  active ? 'bg-primary/10 text-primary' : done ? 'text-green-600' : 'text-muted-foreground')}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  <span className="text-sm font-medium hidden sm:block">{s.title}</span>
                </div>
                {i < steps.length - 1 && <div className={cn('w-8 h-0.5', done ? 'bg-green-500' : 'bg-border')} />}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 0 — Countries */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle>Select Countries & States</CardTitle>
                <CardDescription>Choose where to look for leads. Check states for more specific targeting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Search countries..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                  className="bg-muted/50" />
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredCountries.map(country => {
                    const isSelected = selectedCountries.includes(country.code);
                    const states = selectedStates[country.code] || [];
                    const allSelected = states.length === country.states.length;
                    return (
                      <div key={country.code} className={cn('border rounded-xl overflow-hidden transition-all', isSelected ? 'border-primary/40 bg-primary/5' : 'border-border')}>
                        <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30" onClick={() => toggleCountry(country.code)}>
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleCountry(country.code)} className="shrink-0" />
                          <span className="font-medium flex-1">{country.name}</span>
                          {isSelected && <Badge variant="secondary" className="text-xs">{states.length}/{country.states.length} states</Badge>}
                        </div>
                        {isSelected && (
                          <div className="px-4 pb-3 border-t border-border/50 bg-muted/20">
                            <button onClick={() => selectAllStates(country.code)}
                              className="text-xs text-primary hover:underline mt-2 mb-2 font-medium flex items-center gap-1">
                              {allSelected ? '☑ Deselect all states' : '☐ Select all states'} ({country.states.length})
                            </button>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                              {country.states.map(state => (
                                <label key={state} className="flex items-center gap-2 text-xs py-1 cursor-pointer hover:text-primary">
                                  <Checkbox checked={states.includes(state)} onCheckedChange={() => toggleState(country.code, state)} className="w-3 h-3" />
                                  {state}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">{selectedCountries.length} countr{selectedCountries.length !== 1 ? 'ies' : 'y'} selected</span>
                  <Button onClick={() => setStep(1)} disabled={selectedCountries.length === 0} className="gap-2">
                    Continue <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 1 — Niche & Amount */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle>What are you looking for?</CardTitle>
                <CardDescription>Enter a niche and how many leads you want to find.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Niche / Industry</Label>
                  <Input placeholder="e.g. Plumbers, SaaS Startups, E-commerce stores, Dentists..."
                    value={niche} onChange={e => setNiche(e.target.value)} className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>Number of leads (per country)</Label>
                  <Input type="number" min={1} max={100} value={amount} onChange={e => setAmount(Number(e.target.value))} className="bg-muted/50 w-40" />
                  <p className="text-xs text-muted-foreground">Max 100 per country per scrape. Google CSE has daily limits.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(0)} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
                  <Button onClick={() => setStep(2)} disabled={niche.length < 2} className="gap-2">Continue <ChevronRight className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2 — Channel */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle>Choose Your Channel</CardTitle>
                <CardDescription>Scrape email addresses, or find profiles on one social platform.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setScrapeType('email')} className={cn('p-4 rounded-xl border-2 text-left transition-all', scrapeType === 'email' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>
                    <Mail className="w-6 h-6 mb-2 text-primary" />
                    <p className="font-semibold">Email Addresses</p>
                    <p className="text-xs text-muted-foreground mt-1">Visits real pages to find business emails</p>
                  </button>
                  <button onClick={() => setScrapeType('social')} className={cn('p-4 rounded-xl border-2 text-left transition-all', scrapeType === 'social' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30')}>
                    <Share2 className="w-6 h-6 mb-2 text-primary" />
                    <p className="font-semibold">Social Profiles</p>
                    <p className="text-xs text-muted-foreground mt-1">Find profiles on a social platform</p>
                  </button>
                </div>

                {scrapeType === 'social' && (
                  <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {['all', ...SOCIAL_CATEGORIES.map(c => c.id)].map(cat => (
                        <button key={cat} onClick={() => setSocialCategoryFilter(cat)}
                          className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                            socialCategoryFilter === cat ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/30')}>
                          {cat === 'all' ? 'All' : SOCIAL_CATEGORIES.find(c => c.id === cat)?.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                      {filteredSocials.map(platform => (
                        <button key={platform.id} onClick={() => setSelectedSocial(platform.id)}
                          className={cn('flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all text-left',
                            selectedSocial === platform.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30')}>
                          <span className="text-lg shrink-0">{platform.icon}</span>
                          <span className="truncate">{platform.name}</span>
                        </button>
                      ))}
                    </div>
                    {selectedSocial && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm">
                        <span className="text-primary font-medium">
                          {SOCIAL_PLATFORMS.find(p => p.id === selectedSocial)?.icon} {SOCIAL_PLATFORMS.find(p => p.id === selectedSocial)?.name}
                        </span>
                        <span className="text-muted-foreground"> selected. Only one platform per scrape.</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
                  <Button onClick={doScrape} disabled={scrapeType === 'social' && !selectedSocial} className="gap-2">
                    <Search className="w-4 h-4" /> Start Scraping
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3 — Results */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {scraping ? (
              <Card>
                <CardContent className="py-16 text-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                  <p className="text-lg font-semibold">Scraping in progress...</p>
                  <p className="text-muted-foreground text-sm">Visiting real pages across {selectedCountries.length} countr{selectedCountries.length !== 1 ? 'ies' : 'y'} for <strong>{niche}</strong></p>
                  <p className="text-xs text-muted-foreground">This may take 15–30 seconds while we fetch live pages</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="p-6 flex items-center gap-4">
                    <CheckCircle2 className="w-10 h-10 text-green-500 shrink-0" />
                    <div>
                      <h3 className="text-lg font-bold text-green-700 dark:text-green-300">Scrape Complete!</h3>
                      <p className="text-green-600 dark:text-green-400 text-sm">Found <strong>{totalFound}</strong> leads across {results.length} countr{results.length !== 1 ? 'ies' : 'y'}</p>
                    </div>
                    <div className="ml-auto flex gap-2">
                      {scrapeType === 'email' ? (
                        <>
                          <Button onClick={() => batchId && setLocation(`/email?batch=${batchId}`)} className="bg-primary">
                            <Mail className="w-4 h-4 mr-2" /> Send Now
                          </Button>
                          <Button variant="outline" onClick={() => batchId && setLocation(`/leads/${batchId}`)}>
                            View Later
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => batchId && setLocation(`/leads/${batchId}`)}>
                          View All Leads →
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Results by country */}
                {results.map(r => (
                  <Card key={r.country}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe2 className="w-4 h-4 text-primary" /> {r.country}
                        <Badge variant="secondary">{r.leads.length} leads</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {r.leads.map((lead, i) => (
                          <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                            <span className="text-muted-foreground text-xs w-6">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{lead.name}</p>
                              {lead.email && <p className="text-xs text-blue-600 dark:text-blue-400">{lead.email}</p>}
                              {lead.url && (
                                <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary truncate block">
                                  {lead.url}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {totalFound === 0 && (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">
                    No leads found. Try a broader niche or different location.
                  </CardContent></Card>
                )}

                <Button variant="outline" onClick={() => { setStep(0); setResults([]); }} className="w-full">Start New Scrape</Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
