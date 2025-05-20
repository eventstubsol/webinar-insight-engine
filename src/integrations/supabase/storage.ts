
import { supabase } from "./client";

/**
 * Initialize all required buckets
 */
export async function initializeStorage() {
  const buckets = ['avatars', 'webinar_reports', 'webinar_exports', 'user_uploads'];
  
  for (const bucketName of buckets) {
    try {
      // Check if bucket exists first
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error(`Error checking if bucket ${bucketName} exists:`, listError);
        continue;
      }
      
      const bucketExists = existingBuckets.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        // Create the bucket if it doesn't exist
        const { error } = await supabase.storage.createBucket(bucketName, {
          public: bucketName === 'avatars' // Only avatars bucket is public
        });
        
        if (error) {
          console.error(`Error creating bucket ${bucketName}:`, error);
        } else {
          console.log(`Successfully created bucket: ${bucketName}`);
        }
      }
    } catch (error) {
      console.error(`Error initializing bucket ${bucketName}:`, error);
    }
  }
}
