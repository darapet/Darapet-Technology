import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import type { AppUser, ActivityLog, RestrictionField } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, ShieldOff, UserCheck, Trash2, Plus, ArrowLeft, Loader2, Mail, Calendar, Hash } from 'lucide-react';

type FieldType = 'text' | 'number' | 'date' | 'file';

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<AppUser | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [suspendDialog, setSuspendDialog] = useState(false);
  const [banDialog, setBanDialog] = useState(false);
  const [restrictDialog, setRestrictDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState(false);

  const [suspendReason, setSuspendReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [emailLimit, setEmailLimit] = useState('');
  const [planName, setPlanName] = useState('');
  const [restrictionTitle, setRestrictionTitle] = useState('');
  const [restrictionDesc, setRestrictionDesc] = useState('');
  const [restrictionFields, setRestrictionFields] = useState<RestrictionField[]>([]);

  useEffect(() => {
    const load = async () => {
      const [userRes, actRes] = await Promise.all([
        supabase.from('app_users').select('*').eq('id', id!).single(),
        supabase.from('activity_logs').select('*').eq('user_id', id!).order('created_at', { ascending: false }).limit(20),
      ]);
      setUser(userRes.data);
      setActivity(actRes.data || []);
      if (userRes.data?.daily_email_limit) setEmailLimit(String(userRes.data.daily_email_limit));
      if (userRes.data?.role) setPlanName(userRes.data.role);
      setLoading(false);
    };
    load();
  }, [id]);

  const updateStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    setSaving(true);
    const updates = { status, ...extra } as unknown as import('@/types/database').Database['public']['Tables']['app_users']['Update'];
    const { error } = await supabase.from('app_users').update(updates).eq('id', id!);
    setSaving(false);
    if (error) { toast({ variant: 'destructive', title: 'Error', description: error.message }); return; }
    setUser(prev => prev ? { ...prev, status, ...extra } as AppUser : prev);
    toast({ title: 'Updated', description: `User status changed to ${status}` });
  };

  const handleSuspend = async () => {
    await updateStatus('suspended', { suspend_reason: suspendReason });
    setSuspendDialog(false); setSuspendReason('');
  };

  const handleBan = async () => {
    await updateStatus('banned', { suspend_reason: banReason });
    setBanDialog(false); setBanReason('');
  };

  const handleUndo = async () => {
    await updateStatus('active', { suspend_reason: null, review_request: null });
  };

  const handleRestrict = async () => {
    const requirement = { title: restrictionTitle, description: restrictionDesc, fields: restrictionFields };
    await updateStatus('restricted', { review_request: JSON.stringify(requirement) });
    setRestrictDialog(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    await supabase.from('app_users').delete().eq('id', id!);
    setSaving(false);
    toast({ title: 'Deleted', description: 'User account deleted.' });
    setLocation('/admin/users');
  };

  const handleUpgrade = async () => {
    setSaving(true);
    await (supabase.from('app_users') as ReturnType<typeof supabase.from>).update({ daily_email_limit: Number(emailLimit), role: planName }).eq('id', id!);
    setSaving(false);
    setUser(prev => prev ? { ...prev, daily_email_limit: Number(emailLimit), role: planName } as AppUser : prev);
    setUpgradeDialog(false);
    toast({ title: 'Plan Updated', description: 'Email limit and plan name updated.' });
  };

  const addField = () => {
    setRestrictionFields(prev => [...prev, { id: Date.now().toString(), label: '', type: 'text', required: true }]);
  };
  const updateField = (i: number, patch: Partial<RestrictionField>) => {
    setRestrictionFields(prev => prev.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  };
  const removeField = (i: number) => setRestrictionFields(prev => prev.filter((_, idx) => idx !== i));

  if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 bg-white/5 rounded-xl" />)}</div>;
  if (!user) return <div className="text-white/50 text-center py-20">User not found</div>;

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown User';
  const status = user.status || 'active';

  const STATUS_COLOR: Record<string, string> = {
    active: 'bg-green-500/10 text-green-400 border-green-500/30',
    suspended: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    restricted: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    banned: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" onClick={() => setLocation('/admin/users')} className="text-white/50 hover:text-white gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Button>

      <div className="flex items-start gap-4 p-6 bg-white/5 rounded-2xl border border-white/5">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center text-2xl font-bold text-blue-300 shrink-0">
          {fullName[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-white">{fullName}</h2>
            <Badge className={STATUS_COLOR[status] || STATUS_COLOR.active}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
          </div>
          <p className="text-white/50 text-sm mt-1">{user.email}</p>
          {user.brand_name && <p className="text-white/40 text-xs mt-1">Brand: {user.brand_name}</p>}
          <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
            {user.daily_email_limit && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {user.daily_email_limit} emails/day</span>}
            {user.role && <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {user.role}</span>}
            {user.created_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {new Date(user.created_at).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>

      <Card className="bg-white/5 border-white/5">
        <CardHeader><CardTitle className="text-white text-base">Account Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {status !== 'active' && (
              <Button onClick={handleUndo} disabled={saving} className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30">
                <UserCheck className="w-4 h-4 mr-2" /> Restore Active
              </Button>
            )}
            {status !== 'suspended' && (
              <Button onClick={() => setSuspendDialog(true)} className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30">
                <AlertTriangle className="w-4 h-4 mr-2" /> Suspend
              </Button>
            )}
            {status !== 'restricted' && (
              <Button onClick={() => setRestrictDialog(true)} className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-500/30">
                <AlertTriangle className="w-4 h-4 mr-2" /> Restrict
              </Button>
            )}
            {status !== 'banned' && (
              <Button onClick={() => setBanDialog(true)} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30">
                <ShieldOff className="w-4 h-4 mr-2" /> Ban
              </Button>
            )}
            <Button onClick={() => setUpgradeDialog(true)} className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30">
              <Mail className="w-4 h-4 mr-2" /> Set Plan / Limits
            </Button>
            <Button onClick={() => setDeleteDialog(true)} className="bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-800/30">
              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/5">
        <CardHeader><CardTitle className="text-white text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-white/30 text-sm">No activity recorded.</p>
          ) : (
            <div className="space-y-2">
              {activity.map(log => (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-sm text-white/70 flex-1">{log.action}</span>
                  <span className="text-xs text-white/30">{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspend dialog */}
      <Dialog open={suspendDialog} onOpenChange={setSuspendDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader><DialogTitle>Suspend User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason for suspension</Label>
            <Textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSuspendDialog(false)} className="text-white/60">Cancel</Button>
            <Button onClick={handleSuspend} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban dialog */}
      <Dialog open={banDialog} onOpenChange={setBanDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader><DialogTitle className="text-red-400">Ban User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason for ban</Label>
            <Textarea value={banReason} onChange={e => setBanReason(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanDialog(false)} className="text-white/60">Cancel</Button>
            <Button onClick={handleBan} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Permanently Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restrict dialog */}
      <Dialog open={restrictDialog} onOpenChange={setRestrictDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-yellow-400">Restrict Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Restriction Title</Label>
              <Input value={restrictionTitle} onChange={e => setRestrictionTitle(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={restrictionDesc} onChange={e => setRestrictionDesc(e.target.value)} className="bg-white/5 border-white/10 text-white resize-none" rows={2} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Form Fields</Label>
                <Button type="button" size="sm" onClick={addField} className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30">
                  <Plus className="w-3 h-3 mr-1" /> Add Field
                </Button>
              </div>
              {restrictionFields.map((field, i) => (
                <div key={field.id} className="flex gap-2 items-start p-3 bg-white/5 rounded-lg">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input value={field.label} onChange={e => updateField(i, { label: e.target.value })}
                      placeholder="Field label" className="bg-white/5 border-white/10 text-white text-sm h-8" />
                    <Select value={field.type} onValueChange={(v: FieldType) => updateField(i, { type: v })}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date Picker</SelectItem>
                        <SelectItem value="file">File Upload</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <button onClick={() => removeField(i)} className="text-red-400 hover:text-red-300 mt-1.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {restrictionFields.length === 0 && (
                <p className="text-white/30 text-sm text-center py-3">No fields yet.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRestrictDialog(false)} className="text-white/60">Cancel</Button>
            <Button onClick={handleRestrict} disabled={saving || !restrictionTitle} className="bg-yellow-600 hover:bg-yellow-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Apply Restriction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade dialog */}
      <Dialog open={upgradeDialog} onOpenChange={setUpgradeDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader><DialogTitle>Set Plan & Limits</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input value={planName} onChange={e => setPlanName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <Label>Daily Email Limit</Label>
              <Input type="number" value={emailLimit} onChange={e => setEmailLimit(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUpgradeDialog(false)} className="text-white/60">Cancel</Button>
            <Button onClick={handleUpgrade} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader><DialogTitle className="text-red-400">Delete Account</DialogTitle></DialogHeader>
          <p className="text-white/70">This permanently deletes <strong>{fullName}</strong>'s account. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialog(false)} className="text-white/60">Cancel</Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
