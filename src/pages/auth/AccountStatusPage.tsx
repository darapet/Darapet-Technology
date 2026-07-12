import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CountdownTimer } from '@/components/CountdownTimer';
import { DynamicReviewForm } from '@/components/DynamicReviewForm';
import { CheckCircle2, ShieldAlert, AlertTriangle, XCircle } from 'lucide-react';
import type { RestrictionRequirement } from '@/types/database';

interface AccountStatusPageProps {
  /** 'suspended' shows the orange theme, 'restricted' shows the yellow theme. Both support the review workflow. */
  variant: 'suspended' | 'restricted';
}

const THEME = {
  suspended: {
    gradient: 'from-slate-900 to-orange-950',
    ring: 'bg-orange-500/20 border-orange-500/40',
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
    title: 'Account Suspended',
    subtitle: 'Your account has been temporarily suspended.',
    accentText: 'text-orange-200',
    accentBorder: 'border-orange-500/20',
    accent: 'orange',
    buttonClass: 'bg-orange-600 hover:bg-orange-700',
  },
  restricted: {
    gradient: 'from-slate-900 to-yellow-950',
    ring: 'bg-yellow-500/20 border-yellow-500/40',
    icon: ShieldAlert,
    iconColor: 'text-yellow-400',
    title: 'Account Restricted',
    subtitle: 'Some access has been limited on this account.',
    accentText: 'text-yellow-200',
    accentBorder: 'border-yellow-500/20',
    accent: 'yellow',
    buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
  },
} as const;

export function AccountStatusPage({ variant }: AccountStatusPageProps) {
  const { appUser, signOut, refreshProfile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const theme = THEME[variant];
  const Icon = theme.icon;

  let requirement: RestrictionRequirement | null = null;
  try {
    if (appUser?.review_request) requirement = JSON.parse(appUser.review_request as string);
  } catch { /* ignore malformed JSON */ }

  const reviewStatus = appUser?.review_status || 'none';

  const handleSubmitted = async (submission: Record<string, string>) => {
    if (!appUser?.auth_user_id) return;
    const updatedRequirement = { ...requirement, submission, submitted_at: new Date().toISOString() };
    await supabase.from('app_users').update({
      review_request: JSON.stringify(updatedRequirement),
      review_status: 'pending',
      review_rejection_note: null,
    }).eq('auth_user_id', appUser.auth_user_id);
    await refreshProfile();
    setShowForm(false);
  };

  if (reviewStatus === 'pending') {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${theme.gradient} p-4`}>
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
          <h1 className="text-3xl font-bold text-white">Submitted — waiting for admin approval</h1>
          <p className="text-white/70">Your response has been sent for review. You'll be able to sign back in as soon as it's approved.</p>
          <Button onClick={signOut} variant="outline" className="border-white/20 text-white">Sign Out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${theme.gradient} p-4`}>
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <div className={`w-16 h-16 rounded-full ${theme.ring} flex items-center justify-center border mx-auto mb-4`}>
            <Icon className={`w-8 h-8 ${theme.iconColor}`} />
          </div>
          <h1 className="text-3xl font-bold text-white">{theme.title}</h1>
          <p className={`${theme.accentText} mt-2 text-sm`}>{theme.subtitle}</p>
        </div>

        <Card className={`${theme.accentBorder} bg-white/10 backdrop-blur-md text-white`}>
          <CardContent className="p-6 space-y-4">
            <CountdownTimer expiresAt={appUser?.restriction_expires_at ?? null} accentClassName="text-white" />
            {appUser?.suspend_reason && (
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 text-left">
                <p className="text-white/80 text-sm"><span className="font-semibold">Reason:</span> {appUser.suspend_reason}</p>
              </div>
            )}
            {reviewStatus === 'rejected' && appUser?.review_rejection_note && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-left flex gap-2">
                <XCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                <p className="text-red-200 text-sm"><span className="font-semibold">Admin note:</span> {appUser.review_rejection_note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {requirement && !showForm && (
          <Button onClick={() => setShowForm(true)} className={`w-full ${theme.buttonClass} text-white`}>
            Request Review
          </Button>
        )}

        {requirement && showForm && (
          <Card className={`${theme.accentBorder} bg-white/10 backdrop-blur-md text-white`}>
            <CardHeader>
              <CardTitle className="text-white">{requirement.title}</CardTitle>
              <CardDescription className={theme.accentText}>{requirement.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicReviewForm
                requirement={requirement}
                authUserId={appUser!.auth_user_id!}
                onSubmitted={handleSubmitted}
                accent={theme.accent}
              />
            </CardContent>
          </Card>
        )}

        {!requirement && (
          <Card className={`${theme.accentBorder} bg-white/10 backdrop-blur-md text-white p-6 text-center`}>
            <p className={theme.accentText}>Your account is under review. Please contact support for more information.</p>
          </Card>
        )}

        <div className="text-center">
          <Button onClick={signOut} variant="ghost" className="text-white/50 hover:text-white">Sign Out</Button>
        </div>
      </div>
    </div>
  );
}
