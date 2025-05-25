
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ChunkedSyncProgress {
  dataType: string;
  currentChunk: number;
  totalChunks: number;
  processedWebinars: number;
  totalWebinars: number;
  isComplete: boolean;
  errors: number;
}

export interface ChunkedSyncOptions {
  dataTypes: string[];
  webinarIds: string[];
  chunkSize: number;
  onProgress?: (progress: ChunkedSyncProgress) => void;
}

/**
 * Orchestrate chunked sync operations from the frontend
 */
export async function executeChunkedSync(
  userId: string | undefined,
  queryClient: QueryClient,
  options: ChunkedSyncOptions
): Promise<void> {
  if (!userId) {
    toast({
      title: 'Authentication Required',
      description: 'You must be logged in to perform chunked sync',
      variant: 'destructive'
    });
    return;
  }

  console.log(`[executeChunkedSync] Starting chunked sync for ${options.dataTypes.length} data types`);
  console.log(`[executeChunkedSync] Processing ${options.webinarIds.length} webinars in chunks of ${options.chunkSize}`);

  try {
    for (const dataType of options.dataTypes) {
      await syncDataTypeInChunks(userId, dataType, options.webinarIds, options.chunkSize, options.onProgress);
    }

    // Invalidate all relevant queries to refresh the UI
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-participants'] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-instances'] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-chat'] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-polls'] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-questions'] }),
      queryClient.invalidateQueries({ queryKey: ['zoom-recordings'] })
    ]);

    toast({
      title: 'Chunked Sync Completed',
      description: `Successfully synced all data types for ${options.webinarIds.length} webinars`,
      variant: 'default'
    });

  } catch (error: any) {
    console.error('[executeChunkedSync] Error during chunked sync:', error);
    
    toast({
      title: 'Chunked Sync Failed',
      description: error.message || 'An unexpected error occurred during chunked sync',
      variant: 'destructive'
    });
    
    throw error;
  }
}

/**
 * Sync a specific data type across all webinars in chunks
 */
async function syncDataTypeInChunks(
  userId: string,
  dataType: string,
  webinarIds: string[],
  chunkSize: number,
  onProgress?: (progress: ChunkedSyncProgress) => void
): Promise<void> {
  const chunks = [];
  for (let i = 0; i < webinarIds.length; i += chunkSize) {
    chunks.push(webinarIds.slice(i, i + chunkSize));
  }

  console.log(`[syncDataTypeInChunks] Syncing ${dataType} in ${chunks.length} chunks`);

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    
    // Update progress
    if (onProgress) {
      onProgress({
        dataType,
        currentChunk: chunkIndex + 1,
        totalChunks: chunks.length,
        processedWebinars: chunkIndex * chunkSize,
        totalWebinars: webinarIds.length,
        isComplete: false,
        errors: 0
      });
    }

    try {
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: {
          action: 'chunked-sync',
          options: {
            dataType,
            webinarIds: chunk,
            batchSize: chunkSize,
            chunkIndex,
            totalChunks: chunks.length
          }
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to sync chunk');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log(`[syncDataTypeInChunks] Completed chunk ${chunkIndex + 1}/${chunks.length} for ${dataType}:`, data);

      // Small delay between chunks to prevent overwhelming the API
      if (chunkIndex < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error: any) {
      console.error(`[syncDataTypeInChunks] Error in chunk ${chunkIndex + 1} for ${dataType}:`, error);
      
      // Update progress with error
      if (onProgress) {
        onProgress({
          dataType,
          currentChunk: chunkIndex + 1,
          totalChunks: chunks.length,
          processedWebinars: chunkIndex * chunkSize,
          totalWebinars: webinarIds.length,
          isComplete: false,
          errors: 1
        });
      }
      
      // Continue with next chunk instead of failing completely
      toast({
        title: `Chunk ${chunkIndex + 1} Failed`,
        description: `Failed to sync ${dataType} for chunk ${chunkIndex + 1}. Continuing with next chunk.`,
        variant: 'destructive'
      });
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress({
      dataType,
      currentChunk: chunks.length,
      totalChunks: chunks.length,
      processedWebinars: webinarIds.length,
      totalWebinars: webinarIds.length,
      isComplete: true,
      errors: 0
    });
  }
}

/**
 * Get webinars that are eligible for detailed sync
 */
export async function getEligibleWebinars(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('webinar_id, topic, start_time, status')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });

    if (error) {
      throw error;
    }

    // Filter for completed webinars (most data is only available for completed webinars)
    const completedWebinars = data?.filter(w => w.status === 'ended') || [];
    
    console.log(`[getEligibleWebinars] Found ${completedWebinars.length} completed webinars eligible for detailed sync`);
    
    return completedWebinars;
  } catch (error) {
    console.error('[getEligibleWebinars] Error:', error);
    return [];
  }
}
