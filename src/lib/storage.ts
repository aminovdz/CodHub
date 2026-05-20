import { supabase } from './supabase';

/**
 * Ensures the specified bucket exists and is public.
 * If not, attempts to create it.
 */
async function ensureBucketExists(bucketName: string) {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.warn('Could not list buckets:', listError);
      return;
    }
    
    const exists = buckets?.some(b => b.name === bucketName);
    if (!exists) {
      console.log(`Bucket "${bucketName}" not found. Attempting to create it...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      if (createError) {
        console.error(`Failed to create bucket "${bucketName}":`, createError);
      } else {
        console.log(`Successfully created public bucket "${bucketName}"`);
      }
    }
  } catch (err) {
    console.error('Error ensuring bucket exists:', err);
  }
}

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * Falls back to throwing a descriptive error if the upload fails.
 */
export async function uploadImageToSupabase(file: File, bucketName: string = 'images'): Promise<string> {
  // Ensure the bucket exists first
  await ensureBucketExists(bucketName);

  const fileExt = file.name.split('.').pop();
  const cleanFileName = file.name
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/[^a-zA-Z0-9]/g, "_") // sanitize special chars
    .toLowerCase();
  
  const fileName = `${cleanFileName}_${Date.now()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Supabase Storage upload error details:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get the public URL of the uploaded image
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrl;
}
