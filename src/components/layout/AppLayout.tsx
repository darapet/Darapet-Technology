import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Users, Mail, Settings, LogOut, ShieldCheck, Menu, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/email', label: 'Email', icon: Mail },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = profile?.name
    ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top nav */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2 font-bold text-lg shrink-0">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">D</span>
              </div>
              <span className="hidden sm:block">Darapet</span>
            </a>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? location === href : location.startsWith(href);
              return (
                <Link key={href} href={href}>
                  <a className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
                    <Icon className="w-4 h-4" />{label}
                  </a>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            {/* New scrape CTA */}
            <Link href="/leads/new">
              <a className="hidden sm:flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Scrape
              </a>
            </Link>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.logo_url || ''} alt={profile?.name || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium truncate">{profile?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  {profile?.company && <p className="text-xs text-muted-foreground mt-0.5">{profile.company}</p>}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings"><a className="flex items-center gap-2 cursor-pointer"><Settings className="w-4 h-4" /> Settings</a></Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin"><a className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400"><ShieldCheck className="w-4 h-4" /> Admin Panel <Badge className="ml-auto text-xs bg-red-500/10 text-red-500 border-red-500/20">Admin</Badge></a></Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-muted-foreground focus:text-foreground cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu toggle */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(v => !v)}>
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border/50 px-4 py-3 space-y-1 bg-background">
            {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? location === href : location.startsWith(href);
              return (
                <Link key={href} href={href}>
                  <a onClick={() => setMobileOpen(false)} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}>
                    <Icon className="w-4 h-4" />{label}
                  </a>
                </Link>
              );
            })}
            {isAdmin && (
              <Link href="/admin">
                <a onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600">
                  <ShieldCheck className="w-4 h-4" /> Admin Panel
                </a>
              </Link>
            )}
          </nav>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
}
