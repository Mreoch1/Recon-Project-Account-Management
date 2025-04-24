import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Get Supabase URL and key from environment variables or provide them directly
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Check your .env file.');
  process.exit(1);
}

// Bucket must only contain lowercase letters, numbers, dots, and hyphens
const BUCKET_NAME = 'invoice-attachments';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
  try {
    // First check if the bucket already exists
    const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
    
    if (getBucketsError) {
      throw getBucketsError;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
    
    if (bucketExists) {
      console.log(`Bucket "${BUCKET_NAME}" already exists.`);
    } else {
      // Create the bucket
      const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 10485760, // 10MB in bytes
        allowedMimeTypes: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
      });
      
      if (error) {
        throw error;
      }
      
      console.log(`Successfully created bucket "${BUCKET_NAME}":`, data);
    }
    
    // Add bucket policies - this requires the service role key
    console.log('Setting up bucket policies...');
    
    // Allow users to upload files to this bucket
    const { error: insertPolicyError } = await supabase.rpc('create_storage_policy', {
      name: 'Users can upload invoice files',
      bucket_name: BUCKET_NAME,
      operation: 'INSERT',
      actor_role: 'authenticated',
      check_expression: 'true' // Allow authenticated users to upload files
    });
    
    if (insertPolicyError) {
      console.warn('Error setting INSERT policy:', insertPolicyError);
    } else {
      console.log('INSERT policy created successfully');
    }
    
    // Allow users to read files from this bucket
    const { error: selectPolicyError } = await supabase.rpc('create_storage_policy', {
      name: 'Users can read their invoice files',
      bucket_name: BUCKET_NAME,
      operation: 'SELECT',
      actor_role: 'authenticated',
      check_expression: 'true' // Allow authenticated users to read files
    });
    
    if (selectPolicyError) {
      console.warn('Error setting SELECT policy:', selectPolicyError);
    } else {
      console.log('SELECT policy created successfully');
    }
    
    // Allow users to update their files
    const { error: updatePolicyError } = await supabase.rpc('create_storage_policy', {
      name: 'Users can update their invoice files',
      bucket_name: BUCKET_NAME,
      operation: 'UPDATE',
      actor_role: 'authenticated',
      check_expression: 'true' // Allow authenticated users to update files
    });
    
    if (updatePolicyError) {
      console.warn('Error setting UPDATE policy:', updatePolicyError);
    } else {
      console.log('UPDATE policy created successfully');
    }
    
    // Allow users to delete their files
    const { error: deletePolicyError } = await supabase.rpc('create_storage_policy', {
      name: 'Users can delete their invoice files',
      bucket_name: BUCKET_NAME,
      operation: 'DELETE',
      actor_role: 'authenticated',
      check_expression: 'true' // Allow authenticated users to delete files
    });
    
    if (deletePolicyError) {
      console.warn('Error setting DELETE policy:', deletePolicyError);
    } else {
      console.log('DELETE policy created successfully');
    }
    
    console.log('Storage bucket setup completed!');
    
  } catch (error) {
    console.error('Error setting up storage:', error);
  }
}

createBucket(); 