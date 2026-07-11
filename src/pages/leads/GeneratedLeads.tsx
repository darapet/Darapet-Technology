import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { LeadBatch, DarapetLead } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, Share2, Search, Download, Globe2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GeneratedLeads() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [batch, setBatch] = useState<LeadBatch | null>(null);
  const [leads, setLeads] = useState<DarapetLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!id || !user) return;
    const load = async () => {
      const [batchRes, leadsRes] = await Promise.all([
        supabase.from('lead_batches').select('*').eq('id', Number(id)).eq('user_id', user.id).single(),
        supabase.from('darapet_leads').select('*').eq('batch_id', Number(id)).order('created_at', { ascending: false }),
      ]);
      setBatch(batchRes.data);
      setLeads(leadsRes.data || []);
      setLoading(false);
    };
    load();
  }, [id, user]);

  const filtered = leads.filter(l =>
    !search ||
    (l.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.social_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.social_url || '').toLowerCase().includes(search.toLowerCase())
  );

  const downloadCSV = () => {
    const headers = ['ID', 'Email', 'Social Name', 'Platform', 'Social URL', 'Source URL', 'Created'];
    const rows = filtered.map(l => [l.id, l.email || '', l.social_name || '', l.social_platform || '', l.social_url || '', l.source_url || '', l.created_at || '']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `batch-${id}-leads.csv`;
    a.click();
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-28 rounded-xl" />
      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
    </div>
  );

  if (!batch) return (
    <div className="text-center py-20 text-muted-foreground">
      <p>Batch not found.</p>
      <Button variant="link" onClick={() => setLocation('/leads')}>Back to history</Button>
    </div>
  );

  const isEmail = batch.target_type === 'email';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => setLocation('/leads')} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" /> All Batches
      </Button>

      {/* Batch header */}
      <Card className={cn('border-t-4', isEmail ? 'border-t-blue-500' : 'border-t-purple-500')}>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', isEmail ? 'bg-blue-500/10' : 'bg-purple-500/10')}>
              {isEmail ? <Mail className="w-6 h-6 text-blue-500" /> : <Share2 className="w-6 h-6 text-purple-500" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">Batch #{id}</CardTitle>
                <Badge variant={batch.status === 'complete' ? 'default' : 'secondary'}>{batch.status}</Badge>
                {batch.source && <Badge variant="outline" className="text-xs">{batch.source}</Badge>}
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                <strong>{batch.niche}</strong> · {batch.country} · {isEmail ? 'Email leads' : 'Social profiles'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span><Globe2 className="inline w-3 h-3 mr-1" />{batch.country}</span>
                <span>Requested: {batch.requested_count}</span>
                <span>Found: <strong className="text-foreground">{batch.found_count}</strong></span>
                <span>{batch.created_at ? new Date(batch.created_at).toLocaleDateString() : ''}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {isEmail && (
                <Button size="sm" onClick={() => setLocation(`/email?batch=${id}`)} className="gap-1">
                  <Mail className="w-3.5 h-3.5" /> Send Email
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={downloadCSV} className="gap-1">
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search & list */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-muted/50" />
      </div>

      <div className="text-sm text-muted-foreground">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No leads found in this batch.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead, i) => (
            <div key={lead.id} className="flex items-center gap-4 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-all">
              <span className="text-muted-foreground text-xs w-8 shrink-0 text-right">#{i + 1}</span>
              <span className="text-xs text-muted-foreground font-mono w-16 shrink-0">#{lead.id}</span>
              <div className="flex-1 min-w-0">
                {lead.email && <p className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate">{lead.email}</p>}
                {lead.social_name && <p className="text-sm font-medium truncate">{lead.social_name}</p>}
                {lead.social_platform && <Badge variant="secondary" className="text-xs mt-0.5">{lead.social_platform}</Badge>}
              </div>
              {(lead.social_url || lead.source_url) && (
                <a href={lead.social_url || lead.source_url || '#'} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
