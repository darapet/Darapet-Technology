import { supabase } from '@/lib/supabase';
import { uploadToCloudinary, type CloudinaryUploadResult } from '@/lib/cloudinary';
import type { UserAsset, UserAssetInsert } from '@/types/database';

export async function listUserAssets(userId: string): Promise<UserAsset[]> {
  const { data, error } = await supabase
    .from('user_assets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Could not load your asset library: ${error.message}`);
  return data ?? [];
}

function assetInsertFromUpload(
  userId: string,
  file: File,
  uploaded: CloudinaryUploadResult,
): UserAssetInsert {
  return {
    user_id: userId,
    name: file.name,
    original_filename: uploaded.originalFilename,
    asset_type: uploaded.assetType,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    cloudinary_public_id: uploaded.publicId,
    cloudinary_url: uploaded.secureUrl,
    cloudinary_resource_type: uploaded.resourceType,
    cloudinary_format: uploaded.format,
    cloudinary_bytes: uploaded.bytes,
    cloudinary_width: uploaded.width,
    cloudinary_height: uploaded.height,
    cloudinary_duration: uploaded.duration,
    metadata: uploaded.metadata,
  };
}

export async function uploadAndSaveAsset(userId: string, file: File): Promise<UserAsset> {
  const uploaded = await uploadToCloudinary(file, `darapet/${userId}/library`);
  const { data, error } = await supabase
    .from('user_assets')
    .insert(assetInsertFromUpload(userId, file, uploaded))
    .select('*')
    .single();

  if (error) throw new Error(`Cloudinary uploaded, but metadata could not be saved: ${error.message}`);
  return data;
}

export function formatAssetSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}