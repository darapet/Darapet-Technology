import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, ImagePlus } from 'lucide-react';
import type { RestrictionRequirement } from '@/types/database';
import { CameraCaptureField } from '@/components/CameraCaptureField';

interface DynamicReviewFormProps {
  requirement: RestrictionRequirement;
  authUserId: string;
  onSubmitted: (submission: Record<string, string>) => Promise<void> | void;
  accent?: string;
}

/** Renders an admin-defined dynamic form (text/number/date/file/image/camera fields) and uploads files to Supabase Storage. */
export function DynamicReviewForm({ requirement, authUserId, onSubmitted, accent = 'yellow' }: DynamicReviewFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fileUrls: Record<string, string> = {};
      for (const [fieldId, file] of Object.entries(files)) {
        const path = `restrictions/${authUserId}/${fieldId}-${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
        if (uploadError) throw new Error(`Failed to upload "${file.name}": ${uploadError.message}`);
        const { data } = supabase.storage.from('documents').getPublicUrl(path);
        fileUrls[fieldId] = data.publicUrl;
      }
      const submission = { ...answers, ...fileUrls };
      await onSubmitted(submission);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong submitting your response.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {requirement.fields.map(field => (
        <div key={field.id} className="space-y-2">
          <Label className={`text-${accent}-100`}>{field.label}{field.required && ' *'}</Label>
          {field.type === 'file' && (
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer border border-dashed border-white/20 rounded-lg px-3 py-2">
              <Upload className="w-4 h-4" />
              {files[field.id]?.name || 'Choose a file'}
              <input type="file" required={field.required && !files[field.id]} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setFiles(prev => ({ ...prev, [field.id]: f })); }} />
            </label>
          )}
          {field.type === 'image' && (
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer border border-dashed border-white/20 rounded-lg px-3 py-2">
              <ImagePlus className="w-4 h-4" />
              {files[field.id]?.name || 'Choose a picture'}
              <input type="file" accept="image/*" required={field.required && !files[field.id]} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setFiles(prev => ({ ...prev, [field.id]: f })); }} />
            </label>
          )}
          {field.type === 'camera' && (
            <CameraCaptureField captured={files[field.id]}
              onCapture={f => setFiles(prev => ({ ...prev, [field.id]: f }))} />
          )}
          {(field.type === 'text' || field.type === 'number' || field.type === 'date') && (
            <Input type={field.type} required={field.required} value={answers[field.id] || ''}
              onChange={e => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
          )}
        </div>
      ))}
      {error && <p className="text-red-300 text-sm">{error}</p>}
      <Button type="submit" disabled={loading} className={`w-full bg-${accent}-600 hover:bg-${accent}-700 text-white mt-4`}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Submit Response
      </Button>
    </form>
  );
}
