import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { supabase } from '@/lib/supabase';
import type { AppUser, RestrictionRequirement } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Loader2, Inbox, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';

interface QueueItem {
  user: AppUser;
  requirement: RestrictionRequirement;
}

export function ReviewRequestsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<QueueItem | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('app_users').select('*').eq('review_status', 'pending');
    const parsed: QueueItem[] = [];
    for (const user of (data || []) as AppUser[]) {
      try {
        if (user.review_request) parsed.push({ user, requirement: JSON.parse(user.review_request as string) });
      } catch { /* skip malformed */ }
    }
    setItems(parsed);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAccept = async (item: QueueItem) => {
    setSaving(item.user.id);
    const { error } = await supabase.from('app_users').update({
      status: 'active',
      review_request: null,
      review_status: 'none',
      review_rejection_note: null,
      restriction_expires_at: null,
      suspend_reason: null,
    }).eq('id', item.user.id);
    setSaving(null);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }
    toast({ title: 'Approved', description: `${item.user.email} can use their account again.` });
    setItems(prev => prev.filter(i => i.user.id !== item.user.id));
  };

  const openReject = (item: QueueItem) => { setRejectTarget(item); setRejectNote(''); };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setSaving(rejectTarget.user.id);
    // Clear the previous submission but keep the same requirement fields so the
    // user can resubmit; attach the admin's note explaining what's still needed.
    const requirement = { ...rejectTarget.requirement, submission: undefined, submitted_at: undefined };
    const { error } = await supabase.from('app_users').update({
      review_request: JSON.stringify(requirement),
      review_status: 'rejected',
      review_rejection_note: rejectNote,
    }).eq('id', rejectTarget.user.id);
    setSaving(null);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }
    toast({ title: 'Sent back to user', description: 'They remain restricted until they resubmit and you approve.' });
    setItems(prev => prev.filter(i => i.user.id !== rejectTarget.user.id));
    setRejectTarget(null);
  };

  if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 bg-white/5 rounded-xl" />)}</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Review Requests</h1>
        <p className="text-white/40 mt-1">Pending submissions from suspended or restricted accounts</p>
      </div>

      {items.length === 0 ? (
        <Card className="bg-white/5 border-white/5">
          <CardContent className="py-16 text-center">
            <Inbox className="w-10 h-10 mx-auto text-white/20 mb-3" />
            <p className="text-white/50">No pending review requests.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map(item => {
            const fullName = [item.user.first_name, item.user.last_name].filter(Boolean).join(' ') || item.user.email;
            const submission = item.requirement.submission || {};
            return (
              <Card key={item.user.id} className="bg-white/5 border-white/5">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      {fullName}
                      <Badge className="bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-xs">{item.user.status}</Badge>
                    </CardTitle>
                    <p className="text-white/40 text-xs mt-1">{item.user.email}</p>
                  </div>
                  <Link href={`/admin/users/${item.user.id}`}>
                    <a className="text-white/40 hover:text-white text-xs flex items-center gap-1">
                      View profile <ExternalLink className="w-3 h-3" />
                    </a>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-black/20 rounded-lg p-4">
                    <p className="text-white font-medium text-sm">{item.requirement.title}</p>
                    {item.requirement.description && <p className="text-white/50 text-xs mt-1">{item.requirement.description}</p>}
                  </div>
                  <div className="space-y-2">
                    {item.requirement.fields.map(field => {
                      const value = submission[field.id];
                      const isMedia = field.type === 'file' || field.type === 'image' || field.type === 'camera';
                      return (
                        <div key={field.id} className="flex items-start gap-3 text-sm border-b border-white/5 pb-2 last:border-0">
                          <span className="text-white/40 w-32 shrink-0">{field.label}</span>
                          {isMedia && value ? (
                            <a href={value} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1.5">
                              {field.type === 'image' || field.type === 'camera' ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                              View attachment
                            </a>
                          ) : (
                            <span className="text-white/80">{value || '—'}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button onClick={() => handleAccept(item)} disabled={saving === item.user.id}
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30">
                      {saving === item.user.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Accept
                    </Button>
                    <Button onClick={() => openReject(item)} disabled={saving === item.user.id}
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30">
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader><DialogTitle className="text-red-400">Reject Submission</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>What does the user still need to provide?</Label>
            <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="e.g. The ID photo was blurry, please retake it."
              className="bg-white/5 border-white/10 text-white" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)} className="text-white/60">Cancel</Button>
            <Button onClick={handleReject} disabled={saving === rejectTarget?.user.id} className="bg-red-600 hover:bg-red-700">
              {saving === rejectTarget?.user.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
