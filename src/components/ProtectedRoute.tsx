import { useEffect, useState } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/lib/supabase';
import { isExpired } from '@/lib/duration';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, appUser, refreshProfile } = useAuth();
  const [clearingExpiry, setClearingExpiry] = useState(false);

  const status = appUser?.status;
  const expired = isExpired(appUser?.restriction_expires_at);

  // A timed ban/suspension/restriction that has run out auto-lifts the moment
  // the user is seen again, instead of leaving them stuck on the status page.
  useEffect(() => {
    if (!appUser?.auth_user_id) return;
    if (status && status !== 'active' && expired) {
      setClearingExpiry(true);
      supabase.from('app_users').update({
        status: 'active',
        restriction_expires_at: null,
        suspend_reason: null,
        review_request: null,
        review_status: 'none',
        review_rejection_note: null,
      }).eq('auth_user_id', appUser.auth_user_id).then(() => {
        refreshProfile().finally(() => setClearingExpiry(false));
      });
    }
  }, [appUser?.auth_user_id, status, expired, refreshProfile]);

  if (isLoading || clearingExpiry) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  if (status && status !== 'active' && !expired) {
    if (status === 'banned') return <Redirect to="/banned" />;
    if (status === 'restricted') return <Redirect to="/restricted" />;
    if (status === 'suspended') return <Redirect to="/suspended" />;
  }

  if (adminOnly && !isAdmin) return <Redirect to="/" />;

  return <>{children}</>;
}
