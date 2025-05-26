
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { startAsyncWebinarSync, pollSyncJob } from '../services/apiOperations';
import { updateParticipantDataOperation } from './participantOperations';

/**
 * COMPREHENSIVE async refresh webinars operation with proper timing data fetching
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
    console.log(`[refreshWebinarsOperation] Starting COMPREHENSIVE async sync with TIMING DATA FOCUS for user ${userId}`);
    
    // Start comprehensive async sync job with timing data priority
    const asyncResult = await startAsyncWebinarSync(userId, force);
    
    if (!asyncResult.success || !asyncResult.job_id) {
      throw new Error(asyncResult.error || 'Failed to start comprehensive sync job');
    }
    
    const jobId = asyncResult.job_id;
    console.log(`[refreshWebinarsOperation] Comprehensive async sync started with job ID: ${jobId}`);
    
    // Show immediate cached data if available
    if (asyncResult.cached_data?.webinars) {
      console.log(`[refreshWebinarsOperation] Using cached data while comprehensive sync processes timing data`);
      await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    }
    
    // Show initial progress toast
    progressToast = toast({
      title: 'Starting comprehensive timing data sync...',
      description: 'Fetching webinar metadata and actual timing data (2-5 minutes)',
      variant: 'default',
      duration: 60000
    });
    
    // Poll for progress updates with comprehensive timing focus
    const finalResult = await pollSyncJob(
      jobId,
      (progress) => {
        console.log(`[refreshWebinarsOperation] Timing data sync progress:`, progress);
        
        const percentage = progress.progress || 0;
        const currentStage = progress.metadata?.current_stage || 'processing';
        const stages = progress.metadata?.stages || {};
        
        let description = `Stage: ${currentStage.replace(/_/g, ' ')} - ${percentage}%`;
        
        // Add timing-specific progress details
        if (stages[currentStage]) {
          const stageInfo = stages[currentStage];
          if (stageInfo.message) {
            description += ` - ${stageInfo.message}`;
          }
          
          // Show timing data specific progress
          if (currentStage === 'enhancement_timing_data') {
            description += ' (Fetching actual start times and durations)';
          }
        }
        
        // Show estimated time for timing data operations
        if (percentage < 50) {
          description += ' (2-4 minutes remaining for timing data)';
        } else if (percentage < 80) {
          description += ' (1-2 minutes remaining)';
        }
        
        toast({
          title: 'Timing data sync in progress...',
          description,
          variant: 'default',
          duration: 10000
        });
      },
      3000, // Poll every 3 seconds
      240   // 12 minutes timeout for comprehensive timing operations
    );
    
    // Comprehensive sync completed successfully
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    
    // Enhanced success message with timing data results
    const results = finalResult.results || {};
    const webinarsProcessed = results.webinars_processed || 0;
    const timingDataEnhanced = results.timing_data_enhanced || 0;
    const stagesCompleted = results.total_stages_completed || 0;
    
    toast({
      title: 'Comprehensive timing data sync completed!',
      description: `Processed ${webinarsProcessed} webinars, enhanced ${timingDataEnhanced} with actual timing data across ${stagesCompleted} stages. All metadata, participants, instances, recordings, and timing data synced.`,
      variant: 'default',
      duration: 8000
    });
    
    console.log(`[refreshWebinarsOperation] COMPREHENSIVE timing data sync completed successfully`);
    console.log(`[refreshWebinarsOperation] Timing data enhanced for ${timingDataEnhanced} webinars`);
    
  } catch (err: any) {
    console.error('[refreshWebinarsOperation] Error during COMPREHENSIVE timing data refresh:', err);
    
    // Enhanced error handling for timing data sync
    let errorMessage = 'An unexpected error occurred during timing data sync';
    let errorTitle = 'Timing data sync failed';
    
    if (err?.message) {
      errorMessage = err.message;
      
      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorTitle = 'Sync timeout';
        errorMessage = 'The timing data sync took longer than expected. Some data may still be processing. Please check your webinars and try again if needed.';
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
