
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { refreshWebinarsFromAPI } from '../services/webinarApiService';
import { updateParticipantDataOperation } from './participantOperations';
import { executeWithProgressFeedback, OPERATION_TIMEOUT } from '../utils/timeoutUtils';

/**
 * Refresh webinars operation with enhanced timeout handling and progress feedback
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
  
  let isCompleted = false;
  let timeoutTriggered = false;
  let participantsUpdated = 0;
  let progressToast: any;
  
  try {
    console.log(`[refreshWebinarsOperation] Starting non-destructive refresh with force=${force} for user ${userId}`);
    
    // Show initial progress
    progressToast = toast({
      title: "Starting sync",
      description: "Preparing to sync webinar data...",
      duration: 0, // Don't auto-dismiss
    });

    // Make the API call with enhanced timeout and progress feedback
    const refreshData = await executeWithProgressFeedback(
      () => refreshWebinarsFromAPI(userId, force),
      (stage: string) => {
        // Update progress toast
        if (progressToast) {
          progressToast.dismiss();
        }
        progressToast = toast({
          title: "Syncing webinars",
          description: stage,
          duration: 0, // Don't auto-dismiss
        });
      }
    );
    
    isCompleted = true;

    // Dismiss progress toast
    if (progressToast) {
      progressToast.dismiss();
    }

    // Also update participant data for completed webinars (silently)
    try {
      const participantData = await updateParticipantDataOperation(userId, queryClient, true);
      participantsUpdated = participantData?.updated || 0;
    } catch (err) {
      console.error('[refreshWebinarsOperation] Error updating participant data:', err);
      // Don't throw here, as we want the main sync to succeed even if participant data fails
    }

    // Invalidate the query cache to force a refresh
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    
    // Show enhanced notification with non-destructive sync results
    if (refreshData.syncResults) {
      const { 
        newWebinars = 0, 
        updatedWebinars = 0, 
        preservedWebinars = 0, 
        totalWebinars = 0,
        dataRange 
      } = refreshData.syncResults;
      
      const syncMessage = `${newWebinars} new, ${updatedWebinars} updated, ${preservedWebinars} preserved`;
      const totalMessage = `Total: ${totalWebinars} webinars${dataRange?.oldest ? ` (from ${new Date(dataRange.oldest).toLocaleDateString()})` : ''}`;
      const participantMessage = participantsUpdated ? ` and participant data for ${participantsUpdated} webinars` : '';
      
      toast({
        title: 'Sync completed successfully',
        description: `${syncMessage}. ${totalMessage}${participantMessage}`,
        variant: 'default'
      });
    } else {
      // Fallback for backward compatibility
      toast({
        title: 'Webinars synced',
        description: 'Webinar data has been updated from Zoom',
        variant: 'default'
      });
    }
  } catch (err: any) {
    isCompleted = true;
    
    // Dismiss progress toast
    if (progressToast) {
      progressToast.dismiss();
    }
    
    console.error('[refreshWebinarsOperation] Error during refresh:', err);
    
    // Different error handling based on error type
    if (err?.message?.includes('timed out')) {
      timeoutTriggered = true;
      toast({
        title: 'Sync may be incomplete',
        description: 'The operation took longer than expected. Some data may still be processing. Please try again in a few minutes.',
        variant: 'warning'
      });
    } else {
      // Enhanced error handling
      let errorMessage = 'An unexpected error occurred';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Handle specific error types
      if (errorMessage.includes('scopes')) {
        toast({
          title: 'Missing OAuth Scopes',
          description: 'Please check your Zoom app configuration and add the required scopes',
          variant: 'destructive'
        });
      } else if (errorMessage.includes('credentials')) {
        toast({
          title: 'Authentication Error',
          description: 'Please check your Zoom credentials',
          variant: 'destructive'
        });
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        toast({
          title: 'Server Error',
          description: 'The sync operation encountered a server error. This may be due to processing a large amount of data. Please try again in a few minutes.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Sync failed',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    }
    
    throw err;
  } finally {
    // Ensure that even if there's an uncaught exception, we set isCompleted
    console.log(`[refreshWebinarsOperation] Operation completed: ${isCompleted}, timeout triggered: ${timeoutTriggered}`);
  }
}
