import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { Mail, AlertCircle, ArrowRight, CheckCircle2, Clock, Send, History, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardData {
  totalCampaigns: number;
  emailsSent: number;
  emailsFailed: number;
  scheduledCount: number;
  recentCampaigns: Array<{
    id: string;
    subject: string;
    status: string;
    sent_count: number;
    created_at: string;
    recipients: string[];
  }>;
}

export function Dashboard() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [campaigns, emailSends, scheduled] = await Promise.all([
          supabase
            .from('campaigns')
            .select('id, subject, status, sent_count, created_at, recipients')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('email_sends')
            .select('id, status')
            .eq('user_id', user.id),
          supabase
            .from('scheduled_sends')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'scheduled'),
        ]);

        const totalCampaignsResult = await supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const sends = emailSends.data || [];
        setData({
          totalCampaigns: totalCampaignsResult.count || 0,
          emailsSent: sends.filter(s => s.status === 'sent').length,
          emailsFailed: sends.filter(s => s.status === 'failed').length,
          scheduledCount: scheduled.count || 0,
          recentCampaigns: (campaigns.data || []) as DashboardData['recentCampaigns'],
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-72" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-destructive/5 rounded-xl border border-destructive/20 text-destructive">
        <AlertCircle className="w-10 h-10 mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Failed to load dashboard</h2>
        <p>There was an error connecting to the database.</p>
      </div>
    );
  }

  const STATS = [
    { label: 'Total Campaigns', value: data?.totalCampaigns ?? 0, icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-t-blue-500' },
    { label: 'Emails Delivered', value: data?.emailsSent ?? 0, icon: Send, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-t-green-500' },
    { label: 'Failed Sends', value: data?.emailsFailed ?? 0, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-t-red-500' },
    { label: 'Scheduled', value: data?.scheduledCount ?? 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-t-amber-500' },
  ];

  const statusColors: Record<string, string> = {
    sent: 'bg-green-500/10 text-green-700 border-green-200',
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
    sending: 'bg-blue-500/10 text-blue-700 border-blue-200',
    scheduled: 'bg-amber-500/10 text-amber-700 border-amber-200',
    failed: 'bg-red-500/10 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground mt-2">Your email campaign command center.</p>
        </div>
        <Link href="/campaigns/new">
          <Button className="gap-2 hidden sm:flex shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 transition-shadow">
            <Plus className="w-4 h-4" /> New Campaign
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, icon: Icon, color, bg, border }) => (
          <Card key={label} className={`border-t-4 ${border} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center ring-1 ring-inset ring-black/5`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent campaigns */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Campaigns</CardTitle>
          <Link href="/campaigns/history">
            <a className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </a>
          </Link>
        </CardHeader>
        <CardContent>
          {!data?.recentCampaigns.length ? (
            <div className="text-center py-10 text-muted-foreground space-y-3">
              <Mail className="w-10 h-10 mx-auto opacity-20" />
              <p>No campaigns yet.</p>
              <Link href="/campaigns/new">
                <Button size="sm">Create your first campaign</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentCampaigns.map(campaign => (
                <Link key={campaign.id} href="/campaigns/history">
                  <a className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10">
                      <Mail className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{campaign.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.recipients?.length ?? 0} recipients · {new Date(campaign.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${statusColors[campaign.status] ?? ''}`}
                      >
                        {campaign.status}
                      </Badge>
                      {campaign.sent_count > 0 && (
                        <span className="text-xs text-muted-foreground">{campaign.sent_count} sent</span>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </a>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/campaigns/new">
          <a className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Send className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">New Campaign</p>
              <p className="text-xs text-muted-foreground">Compose and send emails</p>
            </div>
          </a>
        </Link>
        <Link href="/campaigns/history">
          <a className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-blue-400/40 hover:bg-blue-500/5 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <History className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Campaign History</p>
              <p className="text-xs text-muted-foreground">View past campaigns</p>
            </div>
          </a>
        </Link>
        <Link href="/campaigns/automation">
          <a className="group flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-amber-400/40 hover:bg-amber-500/5 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Automation</p>
              <p className="text-xs text-muted-foreground">Schedule & automate sends</p>
            </div>
          </a>
        </Link>
      </div>
    </div>
  );
}
