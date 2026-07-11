import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ActivityLog } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Activity } from 'lucide-react';

export function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, []);

  const filtered = logs.filter(l => !search || (l.action || '').toLowerCase().includes(search.toLowerCase()) || (l.user_id || '').includes(search));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Activity Log</h1>
        <p className="text-white/40 mt-1">All platform-wide user activity</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input placeholder="Search activity..." value={search} onChange={e => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 bg-white/5 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No activity found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(log => (
            <div key={log.id} className="flex items-center gap-4 px-4 py-3 bg-white/5 rounded-lg hover:bg-white/8 transition-colors">
              <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <span className="text-white/70 text-sm flex-1">{log.action}</span>
              <span className="text-white/30 text-xs font-mono truncate max-w-32">{log.user_id?.slice(0, 8)}...</span>
              {log.ip && <span className="text-white/20 text-xs">{log.ip}</span>}
              <span className="text-white/30 text-xs whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
