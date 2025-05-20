
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

// Type for file upload result
export interface FileUploadResult {
  path: string;
  publicUrl: string | null;
  error: Error | null;
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
 * Download a file from a bucket
 */
export async function downloadFile(bucket: string, path: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error("Error downloading file:", error);
    toast({
      title: "Download failed",
      description: (error as Error).message,
      variant: "destructive"
    });
    return null;
  }
}

/**
 * Delete a file from a bucket
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    toast({
      title: "Delete failed",
      description: (error as Error).message,
      variant: "destructive"
    });
    return false;
  }
}

/**
 * List files in a specific path of a bucket
 */
export async function listFiles(bucket: string, path: string = "") {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error("Error listing files:", error);
    toast({
      title: "Error listing files",
      description: (error as Error).message,
      variant: "destructive"
    });
    return [];
  }
}

/**
 * Create a bucket if it doesn't exist (admin only)
 */
export async function createBucket(name: string, isPublic: boolean = false) {
  try {
    const { error } = await supabase.storage.createBucket(name, {
      public: isPublic
    });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error creating bucket:", error);
    return false;
  }
}
