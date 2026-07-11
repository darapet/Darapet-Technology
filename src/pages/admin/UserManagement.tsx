import { useEffect, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { supabase } from '@/lib/supabase';
import type { AppUser } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserCheck, ShieldOff, AlertTriangle, Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  suspended: { label: 'Suspended', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  restricted: { label: 'Restricted', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  banned: { label: 'Banned', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const searchStr = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    const f = params.get('filter');
    if (f) setFilterStatus(f);
  }, [searchStr]);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter(u => {
    const matchSearch = !search || (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      ((u.first_name || '') + ' ' + (u.last_name || '')).toLowerCase().includes(search.toLowerCase()) ||
      (u.brand_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || (u.status || 'active') === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-white/40 mt-1">{users.length} total users</p>
        </div>
        <Button variant="outline" onClick={loadUsers} className="border-white/10 text-white/70 hover:text-white hover:bg-white/5">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input placeholder="Search by name, email, or brand..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 bg-white/5 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => {
            const status = user.status || 'active';
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
            const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown';
            return (
              <Link key={user.id} href={`/admin/users/${user.id}`}>
                <a className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 hover:border-white/10 group">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                    <span className="text-blue-300 font-bold text-sm">{fullName[0]?.toUpperCase() || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{fullName}</span>
                      {user.brand_name && <span className="text-white/40 text-xs">({user.brand_name})</span>}
                    </div>
                    <p className="text-white/40 text-xs truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {user.daily_email_limit && (
                      <span className="text-white/30 text-xs">{user.daily_email_limit} emails/day</span>
                    )}
                    <Badge className={cn('text-xs', cfg.bg, cfg.color)}>{cfg.label}</Badge>
                    {status === 'restricted' && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                    {status === 'banned' && <ShieldOff className="w-4 h-4 text-red-400" />}
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 shrink-0" />
                </a>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
