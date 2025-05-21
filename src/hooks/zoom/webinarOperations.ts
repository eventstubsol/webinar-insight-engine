
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

/**
 * Refresh webinars operation
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
  
  console.log(`[refreshWebinarsOperation] Starting refresh with force=${force} for user ${userId}`);
  
  try {
    // Make the API call to fetch fresh data from Zoom
    const refreshData = await refreshWebinarsFromAPI(userId, force);
    
    // Show appropriate toast based on sync results
    if (refreshData.syncResults) {
      showSyncSuccessNotification(refreshData.syncResults);
    } else {
      toast({
        title: 'Webinars synced',
        description: 'Webinar data has been updated from Zoom'
      });
    }

    // Invalidate the query cache to force a refresh
    await queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] });
  } catch (err: any) {
    console.error('[refreshWebinarsOperation] Error during refresh:', err);
    showErrorNotification(err, 'Sync failed');
    throw err;
  }
}

/**
 * Update participant data operation
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
    const data = await updateParticipantDataAPI();
    
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
