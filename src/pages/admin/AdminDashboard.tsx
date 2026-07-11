import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { Users, ShieldOff, AlertTriangle, Mail, Activity, TrendingUp } from 'lucide-react';
import type { AppUser } from '@/types/database';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  bannedUsers: number;
  restrictedUsers: number;
  totalLeadBatches: number;
  totalEmailSends: number;
  recentActivity: Array<{ id: string; action: string | null; created_at: string | null; user_id: string | null }>;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [users, batches, emails, activity] = await Promise.all([
        supabase.from('app_users').select('id, status'),
        supabase.from('lead_batches').select('id', { count: 'exact', head: true }),
        supabase.from('email_sends').select('id', { count: 'exact', head: true }),
        supabase.from('activity_logs').select('id, action, created_at, user_id').order('created_at', { ascending: false }).limit(10),
      ]);

      const userList: Array<{ id: string; status: string | null }> = (users.data as Array<{ id: string; status: string | null }>) || [];
      setStats({
        totalUsers: userList.length,
        activeUsers: userList.filter(u => !u.status || u.status === 'active').length,
        suspendedUsers: userList.filter(u => u.status === 'suspended').length,
        bannedUsers: userList.filter(u => u.status === 'banned').length,
        restrictedUsers: userList.filter(u => u.status === 'restricted').length,
        totalLeadBatches: batches.count || 0,
        totalEmailSends: emails.count || 0,
        recentActivity: activity.data || [],
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 bg-white/5 rounded-xl" />)}
      </div>
    </div>
  );

  const STAT_CARDS = [
    { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active', value: stats?.activeUsers, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Suspended', value: stats?.suspendedUsers, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Banned', value: stats?.bannedUsers, icon: ShieldOff, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Lead Batches', value: stats?.totalLeadBatches, icon: Activity, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Emails Sent', value: stats?.totalEmailSends, icon: Mail, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-white/40 mt-1">Platform overview and controls</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-white/5 border-white/5 text-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold">{value ?? 0}</div>
                <div className="text-white/50 text-sm">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/5 text-white">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats?.recentActivity.length === 0 && <p className="text-white/40 text-sm">No activity yet.</p>}
            {stats?.recentActivity.map(log => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                <span className="text-sm text-white/70 flex-1">{log.action}</span>
                <span className="text-xs text-white/30">{log.created_at ? new Date(log.created_at).toLocaleDateString() : ''}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/5 text-white">
          <CardHeader>
            <CardTitle className="text-white text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/users">
              <a className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                <Users className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium text-sm">Manage Users</p>
                  <p className="text-white/40 text-xs">Suspend, restrict, ban or delete accounts</p>
                </div>
              </a>
            </Link>
            <Link href="/admin/settings">
              <a className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors">
                <Mail className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium text-sm">Configure Email & Scraping</p>
                  <p className="text-white/40 text-xs">Set Brevo key, Google Search API</p>
                </div>
              </a>
            </Link>
            {(stats?.restrictedUsers ?? 0) > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-white font-medium text-sm">{stats?.restrictedUsers} user(s) with pending reviews</p>
                  <Link href="/admin/users?filter=restricted">
                    <a className="text-yellow-400 text-xs hover:underline">Review now →</a>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
