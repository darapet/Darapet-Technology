import { useEffect, useState } from 'react';
import { Eye, EyeOff, Key, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type GroqKeyRow = { id: string; label: string; api_key: string; enabled: boolean; priority: number };
const db = supabase as any;

export function GroqKeysManager({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<GroqKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    db.from('groq_api_keys').select('id,label,api_key,enabled,priority').eq('user_id', userId).order('priority', { ascending: true }).then(({ data, error }: any) => {
      if (active) {
        if (error && !/relation|table/i.test(error.message || '')) toast({ variant: 'destructive', title: 'Could not load extra Groq keys', description: error.message });
        setKeys((data || []) as GroqKeyRow[]);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [toast, userId]);

  const updateKey = (id: string, patch: Partial<GroqKeyRow>) => setKeys(current => current.map(row => row.id === id ? { ...row, ...patch } : row));

  const addKey = () => {
    const id = crypto.randomUUID();
    setKeys(current => [...current, { id, label: 'Additional key ' + (current.length + 1), api_key: '', enabled: true, priority: (current.length + 1) * 10 }]);
    setVisible(current => ({ ...current, [id]: true }));
  };

  const saveKey = async (row: GroqKeyRow) => {
    if (!row.api_key.trim()) { toast({ variant: 'destructive', title: 'Enter a Groq API key first' }); return; }
    setSavingId(row.id);
    const { error } = await db.from('groq_api_keys').upsert({ id: row.id, user_id: userId, label: row.label.trim(), api_key: row.api_key.trim(), enabled: row.enabled, priority: Number(row.priority) || 100, updated_at: new Date().toISOString() });
    setSavingId(null);
    if (error) toast({ variant: 'destructive', title: 'Could not save Groq key', description: error.message });
    else toast({ title: 'Groq key saved', description: 'This key can be used when another key is rate-limited.' });
  };

  const removeKey = async (row: GroqKeyRow) => {
    if (!window.confirm('Remove this Groq key from your account?')) return;
    if (row.api_key) {
      const { error } = await db.from('groq_api_keys').delete().eq('id', row.id).eq('user_id', userId);
      if (error) { toast({ variant: 'destructive', title: 'Could not remove Groq key', description: error.message }); return; }
    }
    setKeys(current => current.filter(item => item.id !== row.id));
  };

  return <Card>
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2"><Key className="w-4 h-4" /> Additional Groq API keys</CardTitle>
      <p className="text-sm text-muted-foreground">Add keys you own. Scouting tries enabled keys in order and moves to another key after an authentication or rate-limit response. This does not raise Groq's limits for a single key and should follow Groq's terms.</p>
    </CardHeader>
    <CardContent className="space-y-4">
      {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading keys…</div> : null}
      {keys.map(row => <div key={row.id} className="rounded-lg border p-3 space-y-3">
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div className="space-y-2"><Label>Label</Label><Input value={row.label} onChange={event => updateKey(row.id, { label: event.target.value })} placeholder="Work key" /></div>
          <div className="space-y-2"><Label>Groq API key</Label><div className="relative"><Input value={row.api_key} onChange={event => updateKey(row.id, { api_key: event.target.value })} type={visible[row.id] ? 'text' : 'password'} placeholder="gsk_…" className="pr-10" /><button type="button" onClick={() => setVisible(current => ({ ...current, [row.id]: !current[row.id] }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={visible[row.id] ? 'Hide key' : 'Show key'}>{visible[row.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
          <Button variant="ghost" size="icon" onClick={() => void removeKey(row)} aria-label="Remove Groq key"><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.enabled} onChange={event => updateKey(row.id, { enabled: event.target.checked })} className="h-4 w-4 accent-primary" /> Use this key for scouting</label><Button size="sm" onClick={() => void saveKey(row)} disabled={savingId === row.id}>{savingId === row.id && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />} Save key</Button></div>
      </div>)}
      <Button type="button" variant="outline" onClick={addKey} className="gap-2"><Plus className="w-4 h-4" /> Add another Groq key</Button>
    </CardContent>
  </Card>;
}
