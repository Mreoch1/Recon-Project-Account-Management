import { supabase } from './supabase';

/**
 * Uploads a file to Supabase Storage
 * @param file The file to upload
 * @param path The path to store the file at (including filename)
 * @returns URL of the uploaded file or null if upload failed
 */
export async function uploadFile(file: File, path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('invoice_attachments')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    // Get the public URL for the file
    const { data: { publicUrl } } = supabase.storage
      .from('invoice_attachments')
      .getPublicUrl(data.path);

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
      .from('invoice_attachments')
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
      .from('invoice_attachments')
      .getPublicUrl(path);
    
    return publicUrl;
  } catch (error) {
    console.error('Error getting file URL:', error);
    return null;
  }
} 