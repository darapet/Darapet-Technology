import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Users, Settings, LogOut, ShieldCheck, Activity, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/activity', label: 'Activity', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-white/5 flex flex-col shrink-0">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-red-400" />
            <span className="text-white font-bold text-lg">Admin Panel</span>
          </div>
          <Badge className="mt-2 bg-red-500/20 text-red-300 border-red-500/30 text-xs">Super Admin</Badge>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== '/admin' && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <a className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active ? 'bg-red-500/20 text-red-300' : 'text-white/60 hover:text-white hover:bg-white/5')}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                  {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                </a>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <div className="px-3 py-2 mb-2">
            <p className="text-white/40 text-xs truncate">{user?.email}</p>
          </div>
          <Link href="/">
            <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5">
              <LayoutDashboard className="w-4 h-4" /> Main App
            </a>
          </Link>
          <Button variant="ghost" onClick={signOut} className="w-full justify-start gap-3 text-white/60 hover:text-red-400 hover:bg-red-500/10 px-3 mt-1">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8 text-white">
        {children}
      </main>
    </div>
  );
}
