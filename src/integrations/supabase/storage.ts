import { supabase } from "./client";

/**
 * Initialize all required buckets using the storage-init edge function
 */
export async function initializeStorage() {
  try {
    const { data, error } = await supabase.functions.invoke('storage-init');
    
    if (error) {
      console.error('Error initializing storage:', error);
      return false;
    }
    
    if (data.results) {
      // Log results for each bucket
      data.results.forEach((result: any) => {
        if (result.success) {
          if (result.alreadyExists) {
            console.log(`Bucket ${result.bucket} already exists`);
          } else {
            console.log(`Successfully created bucket: ${result.bucket}`);
          }
        } else {
          console.error(`Failed to create bucket ${result.bucket}:`, result.error);
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Exception during storage initialization:', error);
    return false;
  }
}

/**
 * Upload a file to a specific bucket
 */
export async function uploadFile(
  bucket: string,
  file: File,
  userId: string,
  folderPath: string = ""
): Promise<FileUploadResult> {
  try {
    // Create folder path with user ID for proper organization
    const userFolder = `${userId}/${folderPath}`.replace(/\/+$/, "");
    
    // Generate a unique filename with timestamp and random string
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 10);
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExt}`;
    
    // Full path in the bucket
    const filePath = folderPath ? `${userFolder}/${fileName}` : `${userId}/${fileName}`;
    
    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    // Get the public URL
    const { data } = await supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return { 
      path: filePath, 
      publicUrl: data?.publicUrl || null, 
      error: null 
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return { path: "", publicUrl: null, error: error as Error };
  }
}

/**
 * Download a file from a specific bucket
 */
export async function downloadFile(
  bucket: string,
  filePath: string
): Promise<FileDownloadResult> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);
    
    if (error) throw error;
    
    return { 
      path: filePath, 
      file: data, 
      error: null 
    };
  } catch (error) {
    console.error("Error downloading file:", error);
    return { path: "", file: null, error: error as Error };
  }
}

/**
 * Delete a file from a specific bucket
 */
export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<FileDeleteResult> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) throw error;
    
    return { 
      path: filePath, 
      error: null 
    };
  } catch (error) {
    console.error("Error deleting file:", error);
    return { path: "", error: error as Error };
  }
}

/**
 * List all files in a specific bucket
 */
export async function listFiles(
  bucket: string,
  folderPath: string = ""
): Promise<FileListResult> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folderPath);
    
    if (error) throw error;
    
    return { 
      path: folderPath, 
      files: data, 
      error: null 
    };
  } catch (error) {
    console.error("Error listing files:", error);
    return { path: "", files: [], error: error as Error };
  }
}

/**
 * Create a new bucket
 */
export async function createBucket(
  bucketName: string,
  public: boolean = false
): Promise<BucketCreateResult> {
  try {
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: public
    });
    
    if (error) throw error;
    
    return { 
      bucket: bucketName, 
      error: null 
    };
  } catch (error) {
    console.error("Error creating bucket:", error);
    return { bucket: "", error: error as Error };
  }
}

/**
 * Type for file upload result
 */
export interface FileUploadResult {
  path: string;
  publicUrl: string | null;
  error: Error | null;
}

/**
 * Type for file download result
 */
export interface FileDownloadResult {
  path: string;
  file: File | null;
  error: Error | null;
}

/**
 * Type for file delete result
 */
export interface FileDeleteResult {
  path: string;
  error: Error | null;
}

/**
 * Type for file list result
 */
export interface FileListResult {
  path: string;
  files: any[];
  error: Error | null;
}

/**
 * Type for bucket create result
 */
export interface BucketCreateResult {
  bucket: string;
  error: Error | null;
}
