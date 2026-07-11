import { Redirect } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, appUser } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  // Check user status from appUser
  const status = appUser?.status;

  if (status === 'banned') return <Redirect to="/banned" />;
  if (status === 'restricted') return <Redirect to="/restricted" />;
  if (status === 'suspended') return <Redirect to="/suspended" />;

  if (adminOnly && !isAdmin) return <Redirect to="/" />;

  return <>{children}</>;
}
