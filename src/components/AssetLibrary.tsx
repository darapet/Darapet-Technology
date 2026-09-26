import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CloudUpload,
  ExternalLink,
  FileImage,
  FileText,
  Film,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatAssetSize, listUserAssets, uploadAndSaveAsset } from '@/lib/assetLibrary';
import type { UserAsset } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ACCEPTED_FILES = 'image/*,application/pdf,video/*';

function AssetIcon({ type }: { type: string }) {
  if (type === 'image') return <FileImage className="h-5 w-5 text-sky-500" />;
  if (type === 'video') return <Film className="h-5 w-5 text-violet-500" />;
  return <FileText className="h-5 w-5 text-rose-500" />;
}

function assetTypeLabel(type: string): string {
  return type === 'pdf' ? 'PDF' : type.charAt(0).toUpperCase() + type.slice(1);
}

function AssetPreview({ asset }: { asset: UserAsset }) {
  if (asset.asset_type === 'image') {
    return (
      <img
        src={asset.cloudinary_url}
        alt={asset.name}
        className="h-16 w-16 rounded-lg border object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted/50">
      <AssetIcon type={asset.asset_type} />
    </div>
  );
}

export function AssetLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loadAssets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      setAssets(await listUserAssets(user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your asset library.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const handleFiles = async (files: File[]) => {
    if (!user || files.length === 0) return;
    setUploading(true);
    setError('');
    let added = 0;
    try {
      // Keep uploads sequential so a large selection does not overwhelm the browser
      // or make it unclear which file failed.
      for (const file of files) {
        const asset = await uploadAndSaveAsset(user.id, file);
        setAssets(prev => [asset, ...prev]);
        added += 1;
      }
      toast({
        title: added === 1 ? 'Asset added' : 'Assets added',
        description: `${added} file${added === 1 ? '' : 's'} are ready to reuse.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setError(message);
      toast({ variant: 'destructive', title: 'Asset upload failed', description: message, duration: 10000 });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Asset Library</CardTitle>
          <CardDescription className="mt-1">
            Store PDFs, images, and videos once so they can be reused in future email workflows.
          </CardDescription>
        </div>
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="shrink-0 gap-2">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
          {uploading ? 'Uploading…' : 'Add files'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILES}
          multiple
          className="hidden"
          onChange={event => void handleFiles(Array.from(event.target.files ?? []))}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Files are limited to 25 MB each. Email attachments are intentionally not wired yet.
        </p>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your library…
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <CloudUpload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Your library is empty</p>
            <p className="mt-1 text-xs text-muted-foreground">Add your first PDF, image, or video to reuse it later.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center gap-3 rounded-lg border p-3">
                <AssetPreview asset={asset} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={asset.name}>{asset.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{assetTypeLabel(asset.asset_type)}</span>
                    <span>·</span>
                    <span>{formatAssetSize(asset.size_bytes)}</span>
                    <span>·</span>
                    <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="shrink-0 gap-1">
                  <a href={asset.cloudinary_url} target="_blank" rel="noreferrer">
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <Button type="button" variant="ghost" size="sm" onClick={() => void loadAssets()} disabled={uploading} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh library
          </Button>
        )}
      </CardContent>
    </Card>
  );
}