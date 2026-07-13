import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CountdownTimer } from '@/components/CountdownTimer';
import { isExpired } from '@/lib/duration';
import { Ban } from 'lucide-react';
import { AccountStatusPage } from '@/pages/auth/AccountStatusPage';

export function SuspendedPage() {
  return <AccountStatusPage variant="suspended" />;
}

export function BannedPage() {
  const { appUser, signOut, refreshProfile } = useAuth();
  const [, navigate] = useLocation();

  // Poll for a status change (admin lifting the ban, or a timed ban expiring)
  // so the user is sent straight back into the app instead of being stuck
  // here until they manually reload.
  useEffect(() => {
    const id = setInterval(() => { refreshProfile(); }, 4000);
    return () => clearInterval(id);
  }, [refreshProfile]);

  useEffect(() => {
    if (appUser && (appUser.status === 'active' || isExpired(appUser.restriction_expires_at))) {
      navigate('/');
    }
  }, [appUser?.status, appUser?.restriction_expires_at, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-red-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/40">
            <Ban className="w-10 h-10 text-red-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white">Account Banned</h1>
        <p className="text-red-200">
          {appUser?.restriction_expires_at
            ? 'Your account has been temporarily banned from this platform.'
            : 'Your account has been permanently banned from this platform.'}
        </p>
        <Card className="border-red-500/20 bg-white/10 backdrop-blur-md">
          <CardContent className="p-5">
            <CountdownTimer expiresAt={appUser?.restriction_expires_at ?? null} accentClassName="text-white" />
          </CardContent>
        </Card>
        {appUser?.suspend_reason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-left">
            <p className="text-red-200 text-sm"><span className="font-semibold text-red-300">Reason:</span> {appUser.suspend_reason}</p>
          </div>
        )}
        <Button onClick={signOut} variant="outline" className="border-red-500/30 text-red-200 hover:bg-red-500/10">Sign Out</Button>
      </div>
    </div>
  );
}
