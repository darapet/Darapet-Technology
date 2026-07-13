import { useEffect, useState } from 'react';
    import { useLocation } from 'wouter';
    import { supabase } from '@/lib/supabase';
    import { useAuth } from '@/context/AuthContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
    import { Loader2, Mail, Lock, CheckCircle2, Eye, EyeOff, MailCheck } from 'lucide-react';
    import { motion, AnimatePresence } from 'framer-motion';

    type Step = 'email' | 'check-email' | 'password';

    export function RegisterPage() {
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);

    // When Supabase's magic link is clicked the SDK fires detectSessionInUrl,
    // which creates a session and updates AuthContext. Watch for that here so
    // we can advance from the holding screen to the password step automatically.
    useEffect(() => {
      if (user && step === 'check-email') {
        setStep('password');
      }
    }, [user, step]);

    const sendLink = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setStep('check-email');
    };

    const resendLink = async () => {
      setResending(true);
      setResent(false);
      await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      setResending(false);
      setResent(true);
    };

    const setAccountPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (password !== confirmPassword) { setError('Passwords do not match'); return; }
      if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setLocation('/onboarding');
    };

    const steps = [
      { key: 'email',       label: 'Email',    icon: Mail },
      { key: 'check-email', label: 'Verify',   icon: MailCheck },
      { key: 'password',    label: 'Password', icon: Lock },
    ];
    const currentStepIdx = steps.findIndex(s => s.key === step);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/30">
              <span className="text-3xl">🎯</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
            <p className="text-blue-200 mt-1 text-sm">Join Darapet Lead Engine</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center mb-8 gap-0">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all ${i <= currentStepIdx ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/40'}`}>
                  {i < currentStepIdx ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <span className={`ml-2 text-sm font-medium hidden sm:block ${i <= currentStepIdx ? 'text-blue-200' : 'text-white/40'}`}>{s.label}</span>
                {i < steps.length - 1 && <div className={`w-12 h-0.5 mx-3 ${i < currentStepIdx ? 'bg-blue-600' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>

          <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-md text-white">
            <CardContent className="pt-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/40 text-red-200 text-sm px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* STEP 1 — Email */}
                {step === 'email' && (
                  <motion.form key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={sendLink} className="space-y-4">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-lg text-white">Enter your email</CardTitle>
                      <CardDescription className="text-blue-200">We'll send you a verification link</CardDescription>
                    </CardHeader>
                    <div className="space-y-2">
                      <Label className="text-blue-100">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-semibold" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                      Send verification link
                    </Button>
                  </motion.form>
                )}

                {/* STEP 2 — Check email (holding screen) */}
                {step === 'check-email' && (
                  <motion.div key="check-email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="py-4 text-center space-y-5">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30">
                      <MailCheck className="w-8 h-8 text-blue-300" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-2">Check your inbox</h2>
                      <p className="text-sm text-blue-200 leading-relaxed">
                        We sent a verification link to<br />
                        <span className="font-semibold text-white">{email}</span>
                      </p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-4 text-left space-y-2">
                      <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">How to continue</p>
                      <p className="text-sm text-blue-100">1. Open the email from Darapet</p>
                      <p className="text-sm text-blue-100">2. Click <strong>"Confirm email address"</strong></p>
                      <p className="text-sm text-blue-100">3. You'll be brought back here automatically</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-xs text-white/40">didn't receive it?</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resendLink}
                      disabled={resending}
                      className="text-blue-300 hover:text-white hover:bg-white/10"
                    >
                      {resending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                      {resent ? '✓ Link sent again' : 'Resend link'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="block w-full text-xs text-white/40 hover:text-white/60 underline"
                    >
                      Change email address
                    </button>
                  </motion.div>
                )}

                {/* STEP 3 — Set password */}
                {step === 'password' && (
                  <motion.form key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={setAccountPassword} className="space-y-4">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-lg text-white">Set your password</CardTitle>
                      <CardDescription className="text-blue-200">Create a strong password for your account</CardDescription>
                    </CardHeader>
                    <div className="space-y-2">
                      <Label className="text-blue-100">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400"
                          required
                        />
                        <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-blue-100">Confirm password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Repeat password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-blue-400"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-semibold" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Create Account
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              <p className="text-center text-sm text-blue-200 mt-6">
                Already have an account?{' '}
                <button onClick={() => setLocation('/login')} className="text-blue-300 hover:text-white font-semibold hover:underline">Sign in</button>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
    }
    