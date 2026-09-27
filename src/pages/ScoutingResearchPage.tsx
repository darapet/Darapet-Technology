import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, CheckCircle2, ExternalLink, Globe2, Loader2, Mail, Search, Sparkles, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { parseAiJson, type ResearchSnapshot, type ScoutLead } from '@/lib/scouting';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

const db = supabase as any;

type ScrapeResult = {
  success: boolean;
  status: number | null;
  statusText: string;
  finalUrl?: string;
  title?: string;
  description?: string;
  extractedText?: string;
  contactHints?: string[];
  error?: string;
};

function normalizeWebsite(value: unknown) {
  const raw = String(value || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/[.,;:]+$/, '');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?$/i.test(raw)) return 'https://' + raw;
  return '';
}

function snapshotFromLead(lead: ScoutLead): ResearchSnapshot | null {
  if (lead.research_data && typeof lead.research_data === 'object') return lead.research_data;
  return null;
}

export function ScoutingResearchPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const targetLeadId = params.get('leadId');
  const targetImportId = params.get('importId');
  const [leads, setLeads] = useState<ScoutLead[]>([]);
  const [results, setResults] = useState<Record<string, ResearchSnapshot>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [prompt, setPrompt] = useState('Review only the fetched website evidence. Identify visible merits, demerits, the website\'s main area of concentration, concrete areas for improvement, and public contact hints. Never invent facts.');
  const [groqKey, setGroqKey] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const query = db.from('scout_leads').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
      if (targetLeadId) query.eq('id', targetLeadId);
      if (targetImportId) query.eq('import_id', targetImportId);
      const [{ data, error }, { data: settings }] = await Promise.all([
        query,
        db.from('settings').select('groq_api_key').eq('id', 1).maybeSingle(),
      ]);
      if (error) toast({ variant: 'destructive', title: 'Could not load leads', description: error.message });
      const loaded = (data || []) as ScoutLead[];
      setLeads(loaded);
      setGroqKey(settings?.groq_api_key || '');
      setResults(Object.fromEntries(loaded.map(lead => [lead.id, snapshotFromLead(lead)]).filter((entry): entry is [string, ResearchSnapshot] => Boolean(entry[1]))));
      setLoading(false);
    };
    void load();
  }, [targetImportId, targetLeadId, toast, user]);

  const aiKey = profile?.groq_api_key || groqKey;
  const websiteTargets = useMemo(() => leads.map(lead => {
    const website = normalizeWebsite(lead.website) || Object.values(lead.raw_data || {}).map(normalizeWebsite).find(Boolean) || '';
    return website ? { lead, website } : null;
  }).filter((target): target is { lead: ScoutLead; website: string } => Boolean(target)), [leads]);
  const missingWebsiteLeads = leads.filter(lead => !websiteTargets.some(target => target.lead.id === lead.id));

  const callGroq = async (evidence: string, lead: ScoutLead, website: string, scraped: ScrapeResult) => {
    if (!aiKey) return null;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + aiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Return only valid JSON. Do not invent facts. If evidence is missing, use empty arrays and state that clearly.' },
          { role: 'user', content: 'Analyze this fetched website evidence.\nWebsite: ' + website + '\nKnown business: ' + lead.business_name + '\nKnown owner: ' + lead.owner_name + '\nTitle: ' + (scraped.title || 'None') + '\nDescription: ' + (scraped.description || 'None') + '\nContact hints: ' + (scraped.contactHints || []).join('; ') + '\nFetched text: ' + evidence.slice(0, 8000) + '\nInstruction: ' + prompt + '\nReturn JSON exactly as {"website_name":"","owner_name":"","merits":[],"demerits":[],"concentration":"","improvements":[],"contact_hints":[]}.' }
        ],
        temperature: 0.2,
        max_tokens: 900,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'AI analysis failed.');
    return parseAiJson<{ website_name?: string; owner_name?: string; merits?: string[]; demerits?: string[]; concentration?: string; improvements?: string[]; contact_hints?: string[] }>(data.choices?.[0]?.message?.content || '');
  };

  const researchLead = async (lead: ScoutLead) => {
    const website = normalizeWebsite(lead.website) || Object.values(lead.raw_data || {}).map(normalizeWebsite).find(Boolean) || '';
    if (!website) {
      const snapshot: ResearchSnapshot = { leadId: lead.id, website: '', status: 'failed', success: false, httpStatus: null, statusText: '', error: 'No website found in this lead\'s imported columns.', merits: [], demerits: [], concentration: '', improvements: [], contactHints: [], analyzedAt: new Date().toISOString() };
      setResults(current => ({ ...current, [lead.id]: snapshot }));
      await db.from('scout_leads').update({ research_status: 'needs_manual', research_summary: snapshot.error, research_data: snapshot }).eq('id', lead.id).eq('user_id', user!.id);
      return;
    }
    setActiveId(lead.id);
    await db.from('scout_leads').update({ research_status: 'researching' }).eq('id', lead.id).eq('user_id', user!.id);
    try {
      const { data, error } = await supabase.functions.invoke('research-website', { body: { url: website } });
      if (error) throw new Error(error.message || 'The website scraper could not be reached.');
      const scraped = data as ScrapeResult;
      const evidence = scraped.extractedText || scraped.description || '';
      let ai: Awaited<ReturnType<typeof callGroq>> = null;
      if (evidence) {
        try { ai = await callGroq(evidence, lead, website, scraped); } catch (error) { toast({ variant: 'destructive', title: 'AI analysis skipped', description: error instanceof Error ? error.message : 'The website was fetched without AI analysis.' }); }
      }
      const snapshot: ResearchSnapshot = {
        leadId: lead.id,
        website,
        status: 'complete',
        success: Boolean(scraped.success),
        httpStatus: scraped.status,
        statusText: scraped.statusText || '',
        finalUrl: scraped.finalUrl,
        title: scraped.title,
        websiteName: ai?.website_name || scraped.title || '',
        ownerName: ai?.owner_name || lead.owner_name || '',
        description: scraped.description,
        extractedText: scraped.extractedText,
        error: scraped.error,
        merits: Array.isArray(ai?.merits) ? ai!.merits!.slice(0, 6) : (scraped.success ? ['Website responded successfully.'] : []),
        demerits: Array.isArray(ai?.demerits) ? ai!.demerits!.slice(0, 6) : (scraped.success ? [] : [scraped.error || 'The website returned an error.']),
        concentration: ai?.concentration || scraped.description || '',
        improvements: Array.isArray(ai?.improvements) ? ai!.improvements!.slice(0, 6) : [],
        contactHints: Array.from(new Set([...(scraped.contactHints || []), ...(ai?.contact_hints || [])])).slice(0, 8),
        analyzedAt: new Date().toISOString(),
      };
      const summary = [snapshot.websiteName, snapshot.description, snapshot.concentration].filter(Boolean).join(' — ') || snapshot.error || 'Research complete.';
      const { error: saveError } = await db.from('scout_leads').update({ research_status: snapshot.success ? 'researched' : 'needs_manual', research_summary: summary, pain_points: snapshot.demerits, research_data: snapshot }).eq('id', lead.id).eq('user_id', user!.id);
      if (saveError) throw new Error(saveError.message);
      setResults(current => ({ ...current, [lead.id]: snapshot }));
      setLeads(current => current.map(item => item.id === lead.id ? { ...item, website, research_status: snapshot.success ? 'researched' : 'needs_manual', research_summary: summary, pain_points: snapshot.demerits, research_data: snapshot } : item));
    } catch (error) {
      const snapshot: ResearchSnapshot = { leadId: lead.id, website, status: 'failed', success: false, httpStatus: null, statusText: '', error: error instanceof Error ? error.message : 'Research failed.', merits: [], demerits: ['The website could not be fetched.'], concentration: '', improvements: [], contactHints: [], analyzedAt: new Date().toISOString() };
      setResults(current => ({ ...current, [lead.id]: snapshot }));
      await db.from('scout_leads').update({ research_status: 'needs_manual', research_summary: snapshot.error, research_data: snapshot }).eq('id', lead.id).eq('user_id', user!.id);
    }
  };

  const runResearch = async () => {
    if (running || !websiteTargets.length) return;
    setRunning(true);
    for (const target of websiteTargets) await researchLead(target.lead);
    setActiveId(null);
    setRunning(false);
    toast({ title: 'Research run finished', description: 'Each lead was processed in order. Review the findings below before personalizing email.' });
  };

  const completed = websiteTargets.filter(target => results[target.lead.id]?.status === 'complete' || results[target.lead.id]?.status === 'failed').length;
  const currentResult = activeId ? results[activeId] : null;
  const currentLead = activeId ? leads.find(lead => lead.id === activeId) : null;

  if (loading) return <div className="max-w-5xl mx-auto space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-28 rounded-xl" />{[1, 2, 3].map(item => <Skeleton key={item} className="h-40 rounded-xl" />)}</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/scouting" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-4 h-4" /> Back to scouting</Link>
          <div className="flex items-center gap-2 text-primary text-sm font-semibold"><Search className="w-4 h-4" /> Lead research</div>
          <h1 className="text-3xl font-bold tracking-tight mt-2">Research websites one by one</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">The first website is fetched, analyzed, and displayed before the next lead starts. A slow or unavailable site does not stop the queue.</p>
        </div>
        <div className="flex gap-2 shrink-0"><Button variant="outline" onClick={() => setLocation('/scouting')}><ArrowLeft className="w-4 h-4 mr-2" /> Scouting</Button><Button onClick={() => void runResearch()} disabled={running || !websiteTargets.length}>{running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />} {running ? 'Researching…' : 'Research websites'}</Button></div>
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3"><div><p className="font-semibold">Research progress</p><p className="text-sm text-muted-foreground">{completed} of {websiteTargets.length} websites researched</p></div>{activeId && <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Researching website</Badge>}</div>
          <Progress value={leads.length ? Math.round((completed / leads.length) * 100) : 0} />
          {activeId && <p className="text-sm text-muted-foreground break-all">Researching website {(currentResult?.website || currentLead?.website || 'with no detected URL')}…</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-base flex items-center gap-2"><Globe2 className="w-4 h-4 text-primary" /> Websites found in this list</CardTitle><p className="text-sm text-muted-foreground mt-1">This is the discovery step. Nothing is visited or analyzed until you click Research websites.</p></div><Badge variant="outline">{websiteTargets.length} found</Badge></div></CardHeader>
        <CardContent className="space-y-2">
          {websiteTargets.length ? websiteTargets.map((target, index) => { const result = results[target.lead.id]; return <div key={target.lead.id} className="flex items-center gap-3 rounded-lg border p-3"><span className="text-xs text-muted-foreground w-6">{index + 1}</span><div className="min-w-0 flex-1"><p className="font-medium truncate">{target.lead.business_name}</p><p className="text-sm text-muted-foreground break-all">{target.website}</p></div>{result ? <Badge variant="outline" className="text-green-600 border-green-200">Processed</Badge> : <Badge variant="secondary">Queued</Badge>}</div>; }) : <p className="text-sm text-muted-foreground py-4">No website values were found in this list.</p>}
          {missingWebsiteLeads.length > 0 && <p className="text-xs text-amber-700 bg-amber-500/10 rounded-lg p-3">{missingWebsiteLeads.length} lead{missingWebsiteLeads.length === 1 ? '' : 's'} had no recognizable website and will not be sent to the research queue.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Analysis instruction</CardTitle></CardHeader>
        <CardContent><Label htmlFor="research-prompt">Optional rules for the AI analysis</Label><Textarea id="research-prompt" value={prompt} onChange={event => setPrompt(event.target.value)} className="min-h-20 mt-2" /><p className="text-xs text-muted-foreground mt-2">The scraper always uses the website stored on each lead. The instruction only controls how fetched evidence is summarized.</p></CardContent>
      </Card>

      {!websiteTargets.length ? <Card><CardContent className="py-16 text-center text-muted-foreground">No websites were found for this research run.</CardContent></Card> : <div className="space-y-4">{websiteTargets.map((target, index) => { const lead = target.lead; const website = target.website; const result = results[lead.id]; const isActive = activeId === lead.id; return <Card key={lead.id} className={isActive ? 'border-primary shadow-sm' : ''}><CardHeader className="pb-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Website {index + 1} of {websiteTargets.length}</p><CardTitle className="text-lg mt-1">{result?.websiteName || lead.business_name}</CardTitle><p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 break-all"><Globe2 className="w-3.5 h-3.5 shrink-0" /> {result?.website || website || lead.website || 'Website not detected'}</p></div>{isActive ? <Badge><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Researching website…</Badge> : result?.success ? <Badge variant="outline" className="text-green-600 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Information received</Badge> : result ? <Badge variant="outline" className="text-amber-600 border-amber-200"><TriangleAlert className="w-3 h-3 mr-1" /> Needs review</Badge> : <Badge variant="secondary">Queued</Badge>}</div></CardHeader>{result && <CardContent className="space-y-4"><div className="grid sm:grid-cols-2 gap-3"><div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs font-semibold uppercase text-muted-foreground">Website</p><p className="font-medium mt-1">{result.websiteName || result.title || lead.business_name}</p><p className="text-sm text-muted-foreground mt-1">{result.description || 'No description found.'}</p>{result.finalUrl && <a href={result.finalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary mt-2"><ExternalLink className="w-3.5 h-3.5" /> Open site</a>}</div><div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs font-semibold uppercase text-muted-foreground">Contact generated</p>{result.ownerName && <p className="text-sm font-medium mt-1">Owner / contact: {result.ownerName}</p>}{result.contactHints.length ? <ul className="text-sm mt-2 space-y-1">{result.contactHints.map(item => <li key={item} className="break-all">{item}</li>)}</ul> : <p className="text-sm text-muted-foreground mt-1">No public contact details found.</p>}</div></div><div className="grid md:grid-cols-3 gap-3"><div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase text-muted-foreground">Merits</p>{result.merits.length ? <ul className="list-disc pl-4 mt-2 text-sm space-y-1">{result.merits.map(item => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground mt-2">None recorded</p>}</div><div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase text-muted-foreground">Demerits</p>{result.demerits.length ? <ul className="list-disc pl-4 mt-2 text-sm space-y-1">{result.demerits.map(item => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground mt-2">None recorded</p>}</div><div className="rounded-lg border p-3"><p className="text-xs font-semibold uppercase text-muted-foreground">Area of concentration</p><p className="text-sm mt-2">{result.concentration || 'No clear focus found in the fetched evidence.'}</p><p className="text-xs font-semibold uppercase text-muted-foreground mt-4">Areas for improvement</p>{result.improvements.length ? <ul className="list-disc pl-4 mt-2 text-sm space-y-1">{result.improvements.map(item => <li key={item}>{item}</li>)}</ul> : <p className="text-sm text-muted-foreground mt-2">None recorded</p>}</div></div>{result.error && <p className="text-sm text-amber-700 bg-amber-500/10 rounded-lg p-3">{result.error}</p>}<p className="text-xs text-muted-foreground">{result.httpStatus ? 'HTTP ' + result.httpStatus + ' ' + result.statusText : 'Request did not return an HTTP response.'}</p></CardContent>}</Card>; })}</div>}

      <Card className="border-green-200 bg-green-500/[0.03]"><CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><p className="font-semibold flex items-center gap-2"><Mail className="w-4 h-4 text-green-600" /> Research complete? Personalize your emails next.</p><p className="text-sm text-muted-foreground mt-1">Review the findings above, then return to the lead list to choose a template and generate one draft per email address.</p></div><Button onClick={() => setLocation('/scouting')}><Mail className="w-4 h-4 mr-2" /> Personalize emails</Button></CardContent></Card>
    </div>
  );
}
