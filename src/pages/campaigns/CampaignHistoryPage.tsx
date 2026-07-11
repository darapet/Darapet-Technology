import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertCircle, Clock, Search, Mail, ChevronDown, ChevronRight, Plus, RefreshCw } from 'lucide-react';

interface Campaign {
  id: string;
  subject: string;
  status: 'draft' | 'sending' | 'sent' | 'scheduled';
  recipients: string[];
  sent_count: number | null;
  created_at: string;
  scheduled_at: string | null;
}

interface EmailSend {
  id: string;
  to_email: string;
  status: 'sent' | 'failed';
  sent_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-green-500/10 text-green-600 border-green-200',
  draft: 'bg-gray-500/10 text-gray-500 border-gray-200',
  sending: 'bg-blue-500/10 text-blue-600 border-blue-200',
  scheduled: 'bg-amber-500/10 text-amber-600 border-amber-200',
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sent: CheckCircle2,
  draft: Mail,
  sending: RefreshCw,
  scheduled: Clock,
};

export function CampaignHistoryPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sendsByC, setSendsByC] = useState<Record<string, EmailSend[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from('campaigns')
      .select('id, subject, status, recipients, sent_count, created_at, scheduled_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setCampaigns((data || []) as Campaign[]);
        setLoading(false);
      });
  }, [user]);

  const toggleExpand = async (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      next.add(id);
      return next;
    });

    if (!sendsByC[id]) {
      setLoadingDetails(prev => new Set(prev).add(id));
      const { data } = await supabase
        .from('email_sends')
        .select('id, to_email, status, sent_at')
        .eq('campaign_id', id)
        .order('sent_at', { ascending: false })
        .limit(200);
      setSendsByC(prev => ({ ...prev, [id]: (data || []) as EmailSend[] }));
      setLoadingDetails(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const filtered = campaigns.filter(c =>
    c.subject.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaign History</h1>
          <p className="text-muted-foreground mt-1">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-1.5"><Plus className="w-4 h-4" /> New Campaign</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search campaigns by subject..."
          className="pl-9 bg-muted/40"
        />
      </div>

      {/* Campaign list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-4">
            <Mail className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <div>
              <p className="font-medium">{search ? 'No campaigns match your search' : 'No campaigns yet'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? 'Try a different search.' : 'Create your first campaign to see it here.'}
              </p>
            </div>
            {!search && (
              <Link href="/campaigns/new">
                <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Create Campaign</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const Icon = STATUS_ICONS[c.status] || Mail;
            const isOpen = expanded.has(c.id);
            const sends = sendsByC[c.id] || [];
            const sentOk = sends.filter(s => s.status === 'sent').length;
            const sentFail = sends.filter(s => s.status === 'failed').length;
            const isLoadingDetail = loadingDetails.has(c.id);
            const totalRecipients = c.recipients?.length ?? 0;

            return (
              <Card key={c.id} className="overflow-hidden">
                {/* Campaign row */}
                <button
                  onClick={() => toggleExpand(c.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${STATUS_STYLES[c.status]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.subject}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''}</span>
                        {c.sent_count != null && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-green-600">{c.sent_count} sent</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge className={`text-xs border ${STATUS_STYLES[c.status]}`}>{c.status}</Badge>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>
                </button>

                {/* Expanded: per-email results */}
                {isOpen && (
                  <div className="border-t bg-muted/20">
                    <div className="px-4 py-3">
                      {isLoadingDetail ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 rounded" />)}
                        </div>
                      ) : sends.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No individual send records for this campaign.</p>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-medium text-green-600">{sentOk} delivered</span>
                            {sentFail > 0 && <span className="text-xs font-medium text-red-500">{sentFail} failed</span>}
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-0.5">
                            {sends.map(s => (
                              <div key={s.id} className="flex items-center gap-2 py-1 text-xs">
                                {s.status === 'sent'
                                  ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                                  : <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />}
                                <span className="truncate text-muted-foreground flex-1">{s.to_email}</span>
                                <span className="text-muted-foreground shrink-0">{new Date(s.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
