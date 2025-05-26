
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { startAsyncWebinarSync, pollSyncJob } from '../services/apiOperations';
import { updateParticipantDataOperation } from './participantOperations';

/**
 * COMPREHENSIVE async refresh webinars operation with multi-stage processing
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
    console.log(`[refreshWebinarsOperation] Starting COMPREHENSIVE async sync with force=${force} for user ${userId}`);
    
    // Start comprehensive async sync job
    const asyncResult = await startAsyncWebinarSync(userId, force);
    
    if (!asyncResult.success || !asyncResult.job_id) {
      throw new Error(asyncResult.error || 'Failed to start comprehensive sync job');
    }
    
    const jobId = asyncResult.job_id;
    console.log(`[refreshWebinarsOperation] Comprehensive async sync started with job ID: ${jobId}`);
    
    // Show immediate cached data if available
    if (asyncResult.cached_data?.webinars) {
      console.log(`[refreshWebinarsOperation] Using cached data while comprehensive sync processes in background`);
      await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    }
    
    // Show initial progress toast
    progressToast = toast({
      title: 'Starting comprehensive sync...',
      description: 'Initializing multi-stage webinar data sync (2-5 minutes)',
      variant: 'default',
      duration: 60000 // Keep toast visible longer for comprehensive sync
    });
    
    // Poll for progress updates with extended timeout for comprehensive sync
    const finalResult = await pollSyncJob(
      jobId,
      (progress) => {
        console.log(`[refreshWebinarsOperation] Comprehensive sync progress:`, progress);
        
        // Enhanced progress display with stage information
        const percentage = progress.progress || 0;
        const currentStage = progress.metadata?.current_stage || 'processing';
        const stages = progress.metadata?.stages || {};
        
        let description = `Stage: ${currentStage.replace(/_/g, ' ')} - ${percentage}%`;
        
        // Add stage-specific details
        if (stages[currentStage]) {
          const stageInfo = stages[currentStage];
          if (stageInfo.message) {
            description += ` - ${stageInfo.message}`;
          }
        }
        
        // Show estimated time remaining for longer operations
        if (percentage < 50) {
          description += ' (2-4 minutes remaining)';
        } else if (percentage < 80) {
          description += ' (1-2 minutes remaining)';
        }
        
        // Update progress toast
        toast({
          title: 'Comprehensive sync in progress...',
          description,
          variant: 'default',
          duration: 10000
        });
      },
      3000, // Poll every 3 seconds for comprehensive sync
      200   // 10 minutes timeout for comprehensive operations
    );
    
    // Comprehensive sync completed successfully
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    
    // Enhanced success message with comprehensive results
    const results = finalResult.results || {};
    const webinarsProcessed = results.webinars_processed || 0;
    const stagesCompleted = results.total_stages_completed || 0;
    
    toast({
      title: 'Comprehensive sync completed successfully',
      description: `Processed ${webinarsProcessed} webinars across ${stagesCompleted} stages. All data including metadata, participants, instances, recordings, and enhancements have been synced.`,
      variant: 'default',
      duration: 8000
    });
    
    console.log(`[refreshWebinarsOperation] COMPREHENSIVE sync completed successfully`);
    
  } catch (err: any) {
    console.error('[refreshWebinarsOperation] Error during COMPREHENSIVE refresh:', err);
    
    // Enhanced error handling for comprehensive sync
    let errorMessage = 'An unexpected error occurred during comprehensive sync';
    let errorTitle = 'Comprehensive sync failed';
    
    if (err?.message) {
      errorMessage = err.message;
      
      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorTitle = 'Sync timeout';
        errorMessage = 'The comprehensive sync took longer than expected. Some data may still be processing. Please check your webinars and try again if needed.';
      } else if (errorMessage.includes('credentials') || errorMessage.includes('Authentication')) {
        errorTitle = 'Authentication Error';
        errorMessage = 'Please check your Zoom credentials and try again.';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorTitle = 'Rate limit exceeded';
        errorMessage = 'Too many requests to Zoom API. Please wait a few minutes and try again.';
      }
    }
    
    toast({
      title: errorTitle,
      description: errorMessage,
      variant: 'destructive',
      duration: 10000
    });
    
    throw err;
  }
}
