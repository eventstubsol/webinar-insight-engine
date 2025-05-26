
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { startAsyncWebinarSync, pollSyncJob } from '../services/apiOperations';
import { updateParticipantDataOperation } from './participantOperations';

/**
 * ASYNC refresh webinars operation with real-time progress updates
 */
export async function refreshWebinarsOperation(
  userId: string | undefined,
  queryClient: QueryClient,
  force: boolean = false
): Promise<void> {
  if (!userId) {
    toast({
      title: 'Authentication Required',
      description: 'You must be logged in to refresh webinars',
      variant: 'destructive'
    });
    return;
  }
  
  let progressToast: any = null;
  
  try {
    console.log(`[refreshWebinarsOperation] Starting ASYNC sync with force=${force} for user ${userId}`);
    
    // Start async sync job
    const asyncResult = await startAsyncWebinarSync(userId, force);
    
    if (!asyncResult.success || !asyncResult.job_id) {
      throw new Error(asyncResult.error || 'Failed to start sync job');
    }
    
    const jobId = asyncResult.job_id;
    console.log(`[refreshWebinarsOperation] Async sync started with job ID: ${jobId}`);
    
    // Show immediate cached data if available
    if (asyncResult.cached_data?.webinars) {
      console.log(`[refreshWebinarsOperation] Using cached data while sync processes in background`);
      await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    }
    
    // Show progress toast
    progressToast = toast({
      title: 'Syncing webinars...',
      description: 'Starting sync process...',
      variant: 'default',
      duration: 30000 // Keep toast visible longer
    });
    
    // Poll for progress updates
    const finalResult = await pollSyncJob(
      jobId,
      (progress) => {
        console.log(`[refreshWebinarsOperation] Progress update:`, progress);
        
        // Update progress toast
        if (progressToast) {
          const percentage = progress.progress || 0;
          const processedItems = progress.processed_items || 0;
          const totalItems = progress.total_items || 0;
          
          let description = `Progress: ${percentage}%`;
          if (totalItems > 0) {
            description += ` (${processedItems}/${totalItems} items)`;
          }
          
          if (progress.metadata?.step) {
            description += ` - ${progress.metadata.step.replace(/_/g, ' ')}`;
          }
          
          // Update existing toast (simplified approach)
          toast({
            title: 'Syncing webinars...',
            description,
            variant: 'default',
            duration: 5000
          });
        }
      },
      2000, // Poll every 2 seconds
      150   // 5 minutes timeout
    );
    
    // Sync completed successfully
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    
    // Show success message
    toast({
      title: 'Sync completed successfully',
      description: `${finalResult.results?.webinars_processed || 0} webinars synced`,
      variant: 'default'
    });
    
    // Optional: Update participant data in background
    try {
      console.log('[refreshWebinarsOperation] Starting participant data update in background');
      await updateParticipantDataOperation(userId, queryClient, true);
    } catch (err) {
      console.warn('[refreshWebinarsOperation] Participant data update failed (non-critical):', err);
    }
    
    console.log(`[refreshWebinarsOperation] ASYNC sync completed successfully`);
    
  } catch (err: any) {
    console.error('[refreshWebinarsOperation] Error during ASYNC refresh:', err);
    
    // Enhanced error handling
    let errorMessage = 'An unexpected error occurred';
    let errorTitle = 'Sync failed';
    
    if (err?.message) {
      errorMessage = err.message;
      
      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorTitle = 'Sync timeout';
        errorMessage = 'The sync operation took too long. Some data may still be processing in the background.';
      } else if (errorMessage.includes('credentials') || errorMessage.includes('Authentication')) {
        errorTitle = 'Authentication Error';
        errorMessage = 'Please check your Zoom credentials';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorTitle = 'Rate limit exceeded';
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
    }
    
    toast({
      title: errorTitle,
      description: errorMessage,
      variant: 'destructive'
    });
    
    throw err;
  }
}
