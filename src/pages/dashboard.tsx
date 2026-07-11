import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { BarChart3, Mail, Share2, AlertCircle, ArrowRight, CheckCircle2, Clock, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardData {
  totalBatches: number;
  totalLeads: number;
  emailsSent: number;
  emailsFailed: number;
  recentBatches: Array<{ id: number; niche: string; country: string; found_count: number; target_type: string; created_at: string }>;
  scheduledCount: number;
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
        const [batches, leads, emailSends, scheduled] = await Promise.all([
          supabase.from('lead_batches').select('id, niche, country, found_count, target_type, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
          supabase.from('darapet_leads').select('id', { count: 'exact', head: true }),
          supabase.from('email_sends').select('id, status').eq('user_id', user.id),
          supabase.from('scheduled_sends').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'scheduled'),
        ]);
        const sends = emailSends.data || [];
        setData({
          totalBatches: batches.data?.length ? await (async () => { const r = await supabase.from('lead_batches').select('id', { count: 'exact', head: true }).eq('user_id', user.id); return r.count || 0; })() : 0,
          totalLeads: leads.count || 0,
          emailsSent: sends.filter(s => s.status === 'sent').length,
          emailsFailed: sends.filter(s => s.status === 'failed').length,
          recentBatches: (batches.data || []) as DashboardData['recentBatches'],
          scheduledCount: scheduled.count || 0,
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
    { label: 'Lead Batches', value: data?.totalBatches ?? 0, icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-t-blue-500' },
    { label: 'Total Leads', value: data?.totalLeads ?? 0, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-t-purple-500' },
    { label: 'Emails Sent', value: data?.emailsSent ?? 0, icon: Mail, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-t-green-500' },
    { label: 'Scheduled', value: data?.scheduledCount ?? 0, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-t-amber-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground mt-2">Your lead engine command center.</p>
        </div>
        <Link href="/leads/new">
          <Button className="gap-2 hidden sm:flex">
            <TrendingUp className="w-4 h-4" /> New Scrape
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, icon: Icon, color, bg, border }) => (
          <Card key={label} className={`border-t-4 ${border} shadow-sm`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent batches */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Lead Batches</CardTitle>
          <Link href="/leads"><a className="text-sm text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></a></Link>
        </CardHeader>
        <CardContent>
          {!data?.recentBatches.length ? (
            <div className="text-center py-10 text-muted-foreground space-y-3">
              <BarChart3 className="w-10 h-10 mx-auto opacity-20" />
              <p>No lead batches yet.</p>
              <Link href="/leads/new"><Button size="sm">Start your first scrape</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentBatches.map(batch => (
                <Link key={batch.id} href={`/leads/${batch.id}`}>
                  <a className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${batch.target_type === 'email' ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
                      {batch.target_type === 'email' ? <Mail className="w-4 h-4 text-blue-500" /> : <Share2 className="w-4 h-4 text-purple-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{batch.niche}</p>
                      <p className="text-xs text-muted-foreground">{batch.country} · {new Date(batch.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="secondary" className="text-xs">{batch.found_count ?? 0} leads</Badge>
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
        <Link href="/leads/new">
          <a className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div><p className="font-medium text-sm">New Scrape</p><p className="text-xs text-muted-foreground">Find leads by niche & location</p></div>
          </a>
        </Link>
        <Link href="/email">
          <a className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-blue-400/40 hover:bg-blue-50/50 transition-all">
            <Mail className="w-5 h-5 text-blue-500" />
            <div><p className="font-medium text-sm">Send Email</p><p className="text-xs text-muted-foreground">Launch an email campaign</p></div>
          </a>
        </Link>
        <Link href="/settings">
          <a className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-green-400/40 hover:bg-green-50/50 transition-all">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div><p className="font-medium text-sm">Settings</p><p className="text-xs text-muted-foreground">Configure email & API keys</p></div>
          </a>
        </Link>
      </div>
    </div>
  );
}
