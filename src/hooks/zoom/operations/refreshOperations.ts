
import { QueryClient } from '@tanstack/react-query';
import { 
  refreshWebinarsFromAPI, 
  updateParticipantDataAPI 
} from '../services/apiService';
import { executeWithTimeout, OPERATION_TIMEOUT } from './timeoutUtils';
import { toast } from '@/hooks/use-toast';

/**
 * Refresh webinars operation with improved error handling and timeout safety
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
  
  try {
    console.log(`[refreshWebinarsOperation] Starting refresh with force=${force} for user ${userId}`);
    
    // Make the API call to fetch fresh data from Zoom with timeout protection
    const refreshData = await executeWithTimeout(
      () => refreshWebinarsFromAPI(userId, force),
      OPERATION_TIMEOUT,
      () => {
        timeoutTriggered = true;
        toast({
          title: 'Sync taking longer than expected',
          description: 'The operation may still be running in the background. Refresh the page to see updated data.',
          variant: 'default'
        });
      }
    );
    
    isCompleted = true;

    // Handle partial sync results
    if (refreshData.syncResults?.partial) {
      toast({
        title: 'Partial sync completed',
        description: `Updated ${refreshData.syncResults.itemsUpdated} of ${refreshData.syncResults.totalFetched} webinars. Some data may still be processing.`,
        variant: 'warning'
      });
    } else {
      // Also update participant data for completed webinars (silently)
      try {
        const { updateParticipantDataOperation } = await import('./participantOperations');
        const participantData = await updateParticipantDataOperation(userId, queryClient, true);
        participantsUpdated = participantData?.updated || 0;
      } catch (err) {
        console.error('[refreshWebinarsOperation] Error updating participant data:', err);
        // Don't throw here, as we want the main sync to succeed even if participant data fails
      }

      // Show a consolidated notification with both webinar and participant data
      if (refreshData.syncResults) {
        const webinarsUpdated = refreshData.syncResults.itemsUpdated || 0;
        
        toast({
          title: 'Sync completed successfully',
          description: `Updated ${webinarsUpdated} webinars${participantsUpdated ? ` and participant data for ${participantsUpdated} webinars` : ''}`,
          variant: 'success'
        });
      } else {
        toast({
          title: 'Webinars synced',
          description: `Webinar data has been updated from Zoom${participantsUpdated ? ` and participant data for ${participantsUpdated} webinars` : ''}`
        });
      }
    }

    // Invalidate the query cache to force a refresh
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    
  } catch (err: any) {
    isCompleted = true;
    
    console.error('[refreshWebinarsOperation] Error during refresh:', err);
    
    // Different error handling based on error type
    if (timeoutTriggered) {
      toast({
        title: 'Sync may be incomplete',
        description: 'The operation took too long. Data may be partially updated. Try refreshing the page.',
        variant: 'warning'
      });
    } else {
      // Handle specific error messages
      let errorMessage = err.message || 'Could not refresh webinar data';
      
      if (errorMessage.includes('504') || errorMessage.includes('Gateway Timeout')) {
        errorMessage = 'Sync is taking longer than expected. Your data may still be updating in the background.';
        toast({
          title: 'Sync timeout',
          description: errorMessage,
          variant: 'warning'
        });
      } else {
        const { showErrorNotification } = await import('../utils/notificationUtils');
        showErrorNotification(err, 'Sync failed');
      }
    }
    
    throw err;
  } finally {
    // Ensure that even if there's an uncaught exception, we set isCompleted
    // This flag can be used by the calling code to reset UI states
    console.log(`[refreshWebinarsOperation] Operation completed: ${isCompleted}`);
  }
}
