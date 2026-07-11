import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { Spinner } from '@/components/ui/spinner';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { OnboardingPage } from '@/pages/auth/OnboardingPage';
import { SuspendedPage, BannedPage } from '@/pages/auth/SuspendedPage';
import { RestrictedPage } from '@/pages/auth/RestrictedPage';

// App pages
import { Dashboard } from '@/pages/dashboard';
import { LeadHistory } from '@/pages/leads/LeadHistory';
import { ScrapePage } from '@/pages/leads/ScrapePage';
import { GeneratedLeads } from '@/pages/leads/GeneratedLeads';
import { EmailPage } from '@/pages/email/EmailPage';
import { SettingsPage } from '@/pages/settings';
import NotFound from '@/pages/not-found';

// Admin pages
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { UserManagement } from '@/pages/admin/UserManagement';
import { UserDetail } from '@/pages/admin/UserDetail';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { ActivityPage } from '@/pages/admin/ActivityPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function AppRoutes() {
  const { user, isLoading, isOnboarded } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public auth routes — redirect away if already signed in */}
      <Route path="/login">
        {user && isOnboarded ? <Redirect to="/" /> : <LoginPage />}
      </Route>
      <Route path="/register">
        {user && isOnboarded ? <Redirect to="/" /> : <RegisterPage />}
      </Route>

      {/* Account status pages */}
      <Route path="/suspended" component={SuspendedPage} />
      <Route path="/banned" component={BannedPage} />
      <Route path="/restricted" component={RestrictedPage} />

      {/* Onboarding — requires auth but not full profile */}
      <Route path="/onboarding">
        {!user ? <Redirect to="/login" /> : isOnboarded ? <Redirect to="/" /> : <OnboardingPage />}
      </Route>

      {/* Admin routes */}
      <Route path="/admin">
        <ProtectedRoute adminOnly>
          <AdminLayout><AdminDashboard /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute adminOnly>
          <AdminLayout><UserManagement /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users/:id">
        <ProtectedRoute adminOnly>
          <AdminLayout><UserDetail /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/activity">
        <ProtectedRoute adminOnly>
          <AdminLayout><ActivityPage /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute adminOnly>
          <AdminLayout><AdminSettings /></AdminLayout>
        </ProtectedRoute>
      </Route>

      {/* Protected app routes */}
      <Route path="/">
        <ProtectedRoute>
          {!isOnboarded && user ? (
            <Redirect to="/onboarding" />
          ) : (
            <AppLayout><Dashboard /></AppLayout>
          )}
        </ProtectedRoute>
      </Route>
      <Route path="/leads">
        <ProtectedRoute>
          <AppLayout><LeadHistory /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/leads/new">
        <ProtectedRoute>
          <AppLayout><ScrapePage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/leads/:id">
        <ProtectedRoute>
          <AppLayout><GeneratedLeads /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/email">
        <ProtectedRoute>
          <AppLayout><EmailPage /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <AppLayout><SettingsPage /></AppLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base="/Darapet-Technology">
            <AppRoutes />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
