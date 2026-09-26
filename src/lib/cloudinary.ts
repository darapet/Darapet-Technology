import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

export type AssetType = 'image' | 'pdf' | 'video';

export interface CloudinaryUploadResult {
  assetType: AssetType;
  bytes: number;
  duration: number | null;
  format: string | null;
  height: number | null;
  originalFilename: string;
  publicId: string;
  resourceType: string;
  secureUrl: string;
  width: number | null;
  metadata: Json;
}

const MAX_ASSET_SIZE_BYTES = 25 * 1024 * 1024;

export function getAssetType(file: Pick<File, 'type'>): AssetType | null {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

export function validateAssetFile(file: File): AssetType {
  const assetType = getAssetType(file);
  if (!assetType) {
    throw new Error('Only PDF, image, and video files can be added to the library.');
  }
  if (file.size > MAX_ASSET_SIZE_BYTES) {
    throw new Error('Files must be 25 MB or smaller.');
  }
  return assetType;
}

async function getCloudinaryConfig(): Promise<{ cloud: string; preset: string }> {
  const { data, error } = await supabase
    .from('settings')
    .select('cloudinary_cloud_name, cloudinary_upload_preset')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw new Error(`Could not load Cloudinary settings: ${error.message}`);

  const cloud = (data?.cloudinary_cloud_name || '').trim();
  const preset = (data?.cloudinary_upload_preset || '').trim();
  if (!cloud || !preset) {
    throw new Error('Cloudinary is not configured. Ask your admin to add the Cloud Name and Upload Preset in Admin → Settings.');
  }
  return { cloud, preset };
}

export async function uploadToCloudinary(file: File, folder: string): Promise<CloudinaryUploadResult> {
  const assetType = validateAssetFile(file);
  const { cloud, preset } = await getCloudinaryConfig();
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', preset);
  form.append('folder', folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    let reason = response.statusText;
    try {
      const errorBody = await response.json();
      reason = errorBody?.error?.message ?? reason;
    } catch {
      // Keep the HTTP status text when Cloudinary does not return JSON.
    }
    if (response.status === 400 || response.status === 401) {
      throw new Error(
        `Cloudinary upload failed: ${reason}. Make sure the Upload Preset in Admin → Settings → Image Storage is set to "Unsigned".`,
      );
    }
    throw new Error(`Cloudinary upload failed: ${reason}`);
  }

  const data = await response.json();
  return {
    assetType,
    bytes: Number(data.bytes ?? file.size),
    duration: data.duration == null ? null : Number(data.duration),
    format: data.format ?? null,
    height: data.height == null ? null : Number(data.height),
    originalFilename: data.original_filename ?? file.name,
    publicId: data.public_id,
    resourceType: data.resource_type ?? assetType,
    secureUrl: data.secure_url,
    width: data.width == null ? null : Number(data.width),
    metadata: {
      resource_type: data.resource_type ?? null,
      version: data.version ?? null,
      created_at: data.created_at ?? null,
      etag: data.etag ?? null,
    },
  };
}

export async function uploadImageToCloudinary(file: File, folder: string): Promise<string> {
  return (await uploadToCloudinary(file, folder)).secureUrl;
}