import { QueryClient } from '@tanstack/react-query';
import { 
  refreshWebinarsFromAPI, 
  updateParticipantDataAPI 
} from './services/webinarApiService';
import { 
  showSyncSuccessNotification, 
  showErrorNotification,
  showParticipantUpdateNotification
} from './utils/notificationUtils';
import { toast } from '@/hooks/use-toast';

// Operation timeout in milliseconds (45 seconds - allowing for edge function's 30s timeout)
const OPERATION_TIMEOUT = 45000;

/**
 * Execute a function with a timeout
 */
async function executeWithTimeout<T>(
  operation: () => Promise<T>, 
  timeoutMs: number, 
  onTimeout: () => void
): Promise<T> {
  let timeoutId: number;
  
  try {
    const result = await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs) as unknown as number;
      })
    ]);
    
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    
    // If it's a timeout error, run the timeout callback
    if (error.message && error.message.includes('timed out')) {
      onTimeout();
    }
    
    throw error;
  }
}

/**
 * Refresh webinars operation with non-destructive sync and improved error handling
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
    console.log(`[refreshWebinarsOperation] Starting non-destructive refresh with force=${force} for user ${userId}`);
    
    // Make the API call to fetch fresh data from Zoom with timeout protection
    const refreshData = await executeWithTimeout(
      () => refreshWebinarsFromAPI(userId, force),
      OPERATION_TIMEOUT,
      () => {
        timeoutTriggered = true;
        toast({
          title: 'Sync taking longer than expected',
          description: 'The operation is still running in the background. Historical data will be preserved.',
          variant: 'default'
        });
      }
    );
    
    isCompleted = true;

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
        title: 'Non-destructive sync completed',
        description: `${syncMessage}. ${totalMessage}${participantMessage}`,
        variant: 'default'
      });
    } else {
      // Fallback for backward compatibility
      showSyncSuccessNotification(refreshData);
    }
  } catch (err: any) {
    isCompleted = true;
    
    console.error('[refreshWebinarsOperation] Error during refresh:', err);
    
    // Different error handling based on error type
    if (timeoutTriggered) {
      toast({
        title: 'Sync may be incomplete',
        description: 'The operation took too long. Historical data has been preserved.',
        variant: 'warning'
      });
    } else {
      showErrorNotification(err, 'Non-destructive sync failed');
    }
    
    throw err;
  } finally {
    // Ensure that even if there's an uncaught exception, we set isCompleted
    // This flag can be used by the calling code to reset UI states
    console.log(`[refreshWebinarsOperation] Non-destructive operation completed: ${isCompleted}`);
  }
}

/**
 * Update participant data operation with improved error handling
 * @param silent When true, don't show success notifications
 */
export async function updateParticipantDataOperation(
  userId: string | undefined,
  queryClient: QueryClient,
  silent: boolean = false
): Promise<any> {
  if (!userId) {
    if (!silent) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to update participant data',
        variant: 'destructive'
      });
    }
    return null;
  }
  
  try {
    const data = await executeWithTimeout(
      () => updateParticipantDataAPI(),
      OPERATION_TIMEOUT,
      () => {
        if (!silent) {
          toast({
            title: 'Update taking longer than expected',
            description: 'The participant data update is still running in the background.',
            variant: 'default'
          });
        }
      }
    );
    
    // Only show toast if not silent mode
    if (!silent) {
      showParticipantUpdateNotification(data);
    }
    
    // Invalidate the query cache to force a refresh
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
    
    return data;
  } catch (err) {
    console.error('[updateParticipantDataOperation] Unhandled error:', err);
    
    if (!silent) {
      showErrorNotification(err, 'Update failed');
    }
    
    throw err;
  }
}
