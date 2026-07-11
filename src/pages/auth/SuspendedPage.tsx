import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function SuspendedPage() {
  const { appUser, signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-orange-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/40">
            <AlertTriangle className="w-10 h-10 text-orange-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white">Account Suspended</h1>
        <p className="text-orange-200">Your account has been temporarily suspended.</p>
        {appUser?.suspend_reason && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-left">
            <p className="text-orange-200 text-sm"><span className="font-semibold text-orange-300">Reason:</span> {appUser.suspend_reason}</p>
          </div>
        )}
        <p className="text-white/50 text-sm">Contact support if you believe this is a mistake.</p>
        <Button onClick={signOut} variant="outline" className="border-orange-500/30 text-orange-200 hover:bg-orange-500/10">Sign Out</Button>
      </div>
    </div>
  );
}

export function BannedPage() {
  const { appUser, signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-red-950 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/40">
            <span className="text-4xl">🚫</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white">Account Banned</h1>
        <p className="text-red-200">Your account has been permanently banned from this platform.</p>
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
