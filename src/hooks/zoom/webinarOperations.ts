
import { QueryClient } from '@tanstack/react-query';
import { refreshWebinarsFromAPI, updateParticipantDataAPI } from './services/webinarApiService';
import { toast } from '@/hooks/use-toast';

/**
 * Refreshes webinar data with date range filtering
 */
export async function refreshWebinarsOperation(
  userId: string | undefined, 
  queryClient: QueryClient, 
  force: boolean = false,
  startDate?: Date | string,
  endDate?: Date | string,
  batchSize: number = 2
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to refresh webinars');
  }
  
  try {
    console.log(`[refreshWebinarsOperation] Starting refresh with force=${force} and date filtering`);
    
    // Refresh webinars from API with date filtering
    const result = await refreshWebinarsFromAPI(userId, force, startDate, endDate, batchSize);
    
    // Invalidate query cache to force a refetch
    queryClient.invalidateQueries({ queryKey: ['zoom-webinars'] });
    
    console.log('[refreshWebinarsOperation] Webinars refreshed successfully:', result);
    
  } catch (error: any) {
    console.error('[refreshWebinarsOperation] Error refreshing webinars:', error);
    throw error;
  }
}

/**
 * Updates participant data for webinars
 */
export async function updateParticipantDataOperation(
  userId: string | undefined, 
  queryClient: QueryClient
): Promise<void> {
  if (!userId) {
    throw new Error('User ID is required to update participant data');
  }

  try {
    console.log('[updateParticipantDataOperation] Starting participant data update');
    
    // Call API to update participant data
    const result = await updateParticipantDataAPI();
    
    // Invalidate query cache to force a refetch
    queryClient.invalidateQueries({ queryKey: ['zoom-webinars'] });
    
    console.log('[updateParticipantDataOperation] Participant data updated:', result);
    
    toast({
      title: 'Participant data updated',
      description: `Updated ${result.updated} webinars with participant counts`,
      variant: 'default'
    });
    
  } catch (error: any) {
    console.error('[updateParticipantDataOperation] Error updating participant data:', error);
    
    toast({
      title: 'Failed to update participant data',
      description: error.message || 'An error occurred while updating participant data',
      variant: 'destructive'
    });
    
    throw error;
  }
}
