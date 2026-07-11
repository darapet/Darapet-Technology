import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { RestrictionRequirement } from '@/types/database';

export function RestrictedPage() {
  const { appUser, signOut, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});

  let requirement: RestrictionRequirement | null = null;
  try {
    if (appUser?.review_request) requirement = JSON.parse(appUser.review_request as string);
  } catch { /* ignore */ }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    setLoading(true);

    // Upload files if any
    const fileUrls: Record<string, string> = {};
    for (const [fieldId, file] of Object.entries(files)) {
      const path = `restrictions/${appUser.auth_user_id}/${fieldId}-${file.name}`;
      const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('documents').getPublicUrl(path);
        fileUrls[fieldId] = data.publicUrl;
      }
    }

    // Save submission as review data
    const submission = { ...answers, ...fileUrls, submitted_at: new Date().toISOString() };
    await supabase.from('app_users').update({
      review_request: JSON.stringify({ ...requirement, submission }),
    }).eq('auth_user_id', appUser.auth_user_id!);

    setSubmitted(true);
    setLoading(false);
    await refreshProfile();
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-yellow-950 p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
          <h1 className="text-3xl font-bold text-white">Submitted!</h1>
          <p className="text-white/70">Your response has been submitted for review. You'll be notified once the admin reviews it.</p>
          <Button onClick={signOut} variant="outline" className="border-white/20 text-white">Sign Out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-yellow-950 p-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/40 mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Account Restricted</h1>
          <p className="text-yellow-200 mt-2 text-sm">Please complete the form below to resolve this restriction.</p>
        </div>

        {requirement ? (
          <Card className="border-yellow-500/20 bg-white/10 backdrop-blur-md text-white">
            <CardHeader>
              <CardTitle className="text-white">{requirement.title}</CardTitle>
              <CardDescription className="text-yellow-200">{requirement.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {requirement.fields.map(field => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-yellow-100">{field.label}{field.required && ' *'}</Label>
                    {field.type === 'file' ? (
                      <Input type="file" required={field.required}
                        onChange={e => { const f = e.target.files?.[0]; if (f) setFiles(prev => ({ ...prev, [field.id]: f })); }}
                        className="bg-white/10 border-white/20 text-white file:text-blue-300 file:bg-transparent file:border-0" />
                    ) : (
                      <Input type={field.type} required={field.required} value={answers[field.id] || ''}
                        onChange={e => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
                    )}
                  </div>
                ))}
                <Button type="submit" disabled={loading} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white mt-4">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Response
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-yellow-500/20 bg-white/10 backdrop-blur-md text-white p-6 text-center">
            <p className="text-yellow-200">Your account is under review. Please contact support for more information.</p>
          </Card>
        )}

        <div className="text-center">
          <Button onClick={signOut} variant="ghost" className="text-white/50 hover:text-white">Sign Out</Button>
        </div>
      </div>
    </div>
  );
}
