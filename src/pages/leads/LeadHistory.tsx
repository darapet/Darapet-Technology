import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { LeadBatch } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Mail, Share2, Globe2, ChevronRight, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LeadHistory() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [batches, setBatches] = useState<LeadBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('lead_batches').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setBatches(data || []); setLoading(false); });
  }, [user]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Batches</h1>
          <p className="text-muted-foreground mt-1">All your scraped lead collections</p>
        </div>
        <Button onClick={() => setLocation('/leads/new')} className="gap-2">
          <Plus className="w-4 h-4" /> New Scrape
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : batches.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground space-y-4">
          <Inbox className="w-14 h-14 mx-auto opacity-20" />
          <p className="text-lg font-medium">No lead batches yet</p>
          <Button onClick={() => setLocation('/leads/new')}>Start your first scrape</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(batch => {
            const isEmail = batch.target_type === 'email';
            return (
              <div key={batch.id} onClick={() => setLocation(`/leads/${batch.id}`)}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', isEmail ? 'bg-blue-500/10' : 'bg-purple-500/10')}>
                  {isEmail ? <Mail className="w-5 h-5 text-blue-500" /> : <Share2 className="w-5 h-5 text-purple-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">#{batch.id}</span>
                    <span className="font-medium truncate">{batch.niche}</span>
                    <Badge variant={batch.status === 'complete' ? 'default' : 'secondary'} className="text-xs shrink-0">{batch.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Globe2 className="w-3 h-3" />{batch.country}</span>
                    <span>Found: <strong className="text-foreground">{batch.found_count ?? 0}</strong></span>
                    {batch.source && <span>{batch.source}</span>}
                    <span>{batch.created_at ? new Date(batch.created_at).toLocaleDateString() : ''}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
