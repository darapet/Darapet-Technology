import { useEffect, useState } from 'react';
    import { Link } from 'wouter';
    import { supabase } from '@/lib/supabase';
    import { useAuth } from '@/context/AuthContext';
    import { useToast } from '@/hooks/use-toast';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Badge } from '@/components/ui/badge';
    import { Skeleton } from '@/components/ui/skeleton';
    import { Clock, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw, Mail } from 'lucide-react';

    interface ScheduledCampaign {
    id: string; subject: string; recipients: string[];
    status: 'scheduled' | 'sent' | 'failed' | 'cancelled' | 'sending';
    scheduled_at: string; created_at: string;
    }

    const STATUS_STYLE: Record<string, string> = {
    scheduled: 'bg-amber-500/10 text-amber-600 border-amber-200',
    sending:   'bg-blue-500/10 text-blue-600 border-blue-200',
    sent:      'bg-green-500/10 text-green-600 border-green-200',
    failed:    'bg-red-500/10 text-red-600 border-red-200',
    cancelled: 'bg-gray-500/10 text-gray-500 border-gray-200',
    };
    const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
    scheduled: Clock, sending: RefreshCw, sent: CheckCircle2, failed: AlertCircle, cancelled: Mail,
    };

    export function AutomationPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState<string | null>(null);

    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('campaigns')
        .select('id, subject, recipients, status, scheduled_at, created_at')
        .eq('user_id', user.id)
        .in('status', ['scheduled', 'sending', 'sent', 'failed', 'cancelled'])
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: false })
        .limit(100);
      setCampaigns((data || []) as ScheduledCampaign[]);
      setLoading(false);
    };

    useEffect(() => { load(); }, [user]);

    const cancelCampaign = async (id: string) => {
      setCancelling(id);
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'cancelled' })
        .eq('id', id).eq('user_id', user!.id).eq('status', 'scheduled');
      if (error) {
        toast({ variant: 'destructive', title: 'Failed to cancel' });
      } else {
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'cancelled' } : c));
        toast({ title: 'Cancelled', description: 'Scheduled campaign cancelled.' });
      }
      setCancelling(null);
    };

    const upcoming = campaigns.filter(c => c.status === 'scheduled' || c.status === 'sending');
    const past     = campaigns.filter(c => c.status !== 'scheduled' && c.status !== 'sending');

    if (loading) return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-56" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );

    const CampaignRow = ({ c }: { c: ScheduledCampaign }) => {
      const Icon = STATUS_ICON[c.status] ?? Mail;
      const canCancel = c.status === 'scheduled';
      return (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{c.subject}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {c.status === 'scheduled' || c.status === 'sending'
                ? `Sends ${new Date(c.scheduled_at).toLocaleString()}`
                : `Sent ${new Date(c.scheduled_at).toLocaleString()}`}
              {' · '}{Array.isArray(c.recipients) ? c.recipients.length : 0} recipient{Array.isArray(c.recipients) && c.recipients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_STYLE[c.status]}`}>
            {c.status}
          </Badge>
          {canCancel && (
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => cancelCampaign(c.id)} disabled={cancelling === c.id}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      );
    };

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Automation</h1>
            <p className="text-sm text-muted-foreground mt-1">Scheduled campaigns are sent automatically at the set time</p>
          </div>
          <Link href="/campaigns/new">
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Schedule New</Button>
          </Link>
        </div>

        {/* Upcoming */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Upcoming
              {upcoming.length > 0 && <Badge variant="secondary" className="ml-auto">{upcoming.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0
              ? <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No upcoming campaigns</p>
                  <p className="text-xs mt-1">Schedule a campaign from the New Campaign page</p>
                </div>
              : <div className="space-y-2">{upcoming.map(c => <CampaignRow key={c.id} c={c} />)}</div>
            }
          </CardContent>
        </Card>

        {/* History */}
        {past.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">{past.map(c => <CampaignRow key={c.id} c={c} />)}</div>
            </CardContent>
          </Card>
        )}
      </div>
    );
    }
    