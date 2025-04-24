import { supabase } from './supabase';

// Bucket name - change this if the bucket has a different name in Supabase
const BUCKET_NAME = 'invoice_attachments';

/**
 * Uploads a file to Supabase Storage
 * @param file The file to upload
 * @param path The path to store the file at (including filename)
 * @returns URL of the uploaded file or null if upload failed
 */
export async function uploadFile(file: File, path: string): Promise<string | null> {
  try {
    console.log(`Attempting to upload file to bucket: ${BUCKET_NAME}, path: ${path}`);
    
    // Check if the bucket exists first
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return null;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
    if (!bucketExists) {
      console.error(`Bucket "${BUCKET_NAME}" does not exist. Available buckets:`, buckets.map(b => b.name));
      return null;
    }
    
    // Upload file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    console.log('File uploaded successfully:', data);

    // Get the public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log('File public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadFile:', error);
    return null;
  }
}

/**
 * Deletes a file from Supabase Storage
 * @param path The path of the file to delete
 * @returns true if successful, false otherwise
 */
export async function deleteFile(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return false;
  }
}

/**
 * Gets a downloadable URL for a file
 * @param path The path of the file
 * @returns The URL of the file
 */
export function getFileUrl(path: string): string | null {
  if (!path) return null;
  
  try {
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);
    
    return publicUrl;
  } catch (error) {
    console.error('Error getting file URL:', error);
    return null;
  }
} 