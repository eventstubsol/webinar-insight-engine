
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
          description: 'The operation is still running in the background. You can continue using the app.',
          variant: 'default'
        });
      }
    );
    
    isCompleted = true;
    
    // Show appropriate toast based on sync results
    if (refreshData.syncResults) {
      showSyncSuccessNotification(refreshData.syncResults);
    } else {
      toast({
        title: 'Webinars synced',
        description: 'Webinar data has been updated from Zoom'
      });
    }

    // Also update participant data for completed webinars
    try {
      await updateParticipantDataOperation(userId, queryClient);
    } catch (err) {
      console.error('[refreshWebinarsOperation] Error updating participant data:', err);
      // Don't throw here, as we want the main sync to succeed even if participant data fails
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
        description: 'The operation took too long. Data may be partially updated.',
        variant: 'warning'
      });
    } else {
      showErrorNotification(err, 'Sync failed');
    }
    
    throw err;
  } finally {
    // Ensure that even if there's an uncaught exception, we set isCompleted
    // This flag can be used by the calling code to reset UI states
    console.log(`[refreshWebinarsOperation] Operation completed: ${isCompleted}`);
    
    // Could expose this value via a promise that resolves regardless of success/failure
  }
}

/**
 * Update participant data operation with improved error handling
 */
export async function updateParticipantDataOperation(
  userId: string | undefined,
  queryClient: QueryClient
): Promise<void> {
  if (!userId) {
    toast({
      title: 'Authentication Required',
      description: 'You must be logged in to update participant data',
      variant: 'destructive'
    });
    return;
  }
  
  try {
    const data = await executeWithTimeout(
      () => updateParticipantDataAPI(),
      OPERATION_TIMEOUT,
      () => {
        toast({
          title: 'Update taking longer than expected',
          description: 'The participant data update is still running in the background.',
          variant: 'default'
        });
      }
    );
    
    // Show toast with results
    showParticipantUpdateNotification(data);
    
    // Invalidate the query cache to force a refresh
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
  } catch (err) {
    console.error('[updateParticipantDataOperation] Unhandled error:', err);
    showErrorNotification(err, 'Update failed');
    throw err;
  }
}
