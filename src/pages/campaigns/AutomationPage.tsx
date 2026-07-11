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

interface ScheduledSend {
  id: string;
  subject: string;
  recipients: string[];
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  scheduled_at: string;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  scheduled: 'bg-amber-500/10 text-amber-600 border-amber-200',
  sent: 'bg-green-500/10 text-green-600 border-green-200',
  failed: 'bg-red-500/10 text-red-600 border-red-200',
  cancelled: 'bg-gray-500/10 text-gray-500 border-gray-200',
};

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  scheduled: Clock,
  sent: CheckCircle2,
  failed: AlertCircle,
  cancelled: Mail,
};

export function AutomationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ScheduledSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('scheduled_sends')
      .select('id, subject, recipients, status, scheduled_at, created_at')
      .eq('user_id', user.id)
      .order('scheduled_at', { ascending: false })
      .limit(100);
    setSchedules((data || []) as ScheduledSend[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const cancelSchedule = async (id: string) => {
    setCancelling(id);
    const { error } = await supabase
      .from('scheduled_sends')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', user!.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to cancel' });
    } else {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
      toast({ title: 'Cancelled', description: 'Scheduled send has been cancelled.' });
    }
    setCancelling(null);
  };

  const upcoming = schedules.filter(s => s.status === 'scheduled');
  const past = schedules.filter(s => s.status !== 'scheduled');

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automation</h1>
          <p className="text-muted-foreground mt-1">Manage scheduled campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Link href="/campaigns/new">
            <Button className="gap-1.5"><Plus className="w-4 h-4" /> Schedule Campaign</Button>
          </Link>
        </div>
      </div>

      {/* Upcoming */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <Clock className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No scheduled campaigns.</p>
              <Link href="/campaigns/new">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Schedule one now
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          upcoming.map(s => <ScheduleRow key={s.id} s={s} onCancel={() => cancelSchedule(s.id)} cancelling={cancelling === s.id} />)
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Past ({past.length})</h2>
          {past.map(s => <ScheduleRow key={s.id} s={s} onCancel={() => cancelSchedule(s.id)} cancelling={cancelling === s.id} />)}
        </div>
      )}
    </div>
  );
}

function ScheduleRow({ s, onCancel, cancelling }: { s: ScheduledSend; onCancel: () => void; cancelling: boolean }) {
  const Icon = STATUS_ICON[s.status] || Clock;
  const isScheduled = s.status === 'scheduled';
  const recipientCount = s.recipients?.length ?? 0;
  const sendDate = new Date(s.scheduled_at);
  const isPast = sendDate < new Date();

  return (
    <Card>
      <CardContent className="py-4 px-4">
        <div className="flex items-start gap-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${STATUS_STYLE[s.status]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm truncate">{s.subject || '(no subject)'}</p>
              <Badge className={`text-xs border shrink-0 ${STATUS_STYLE[s.status]}`}>{s.status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {sendDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                {isPast && isScheduled && <span className="text-amber-500 ml-1">(overdue)</span>}
              </span>
              <span className="text-xs text-muted-foreground">{recipientCount} recipient{recipientCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          {isScheduled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              disabled={cancelling}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              title="Cancel schedule"
            >
              {cancelling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
