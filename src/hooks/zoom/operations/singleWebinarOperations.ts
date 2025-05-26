
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Sync a single webinar's complete data including metadata, participants, instances, and actual timing data.
 */
export async function syncSingleWebinarOperation(
  webinarId: string,
  userId?: string,
  queryClient?: QueryClient
): Promise<any> {
  console.log(`[syncSingleWebinarOperation] Starting sync for webinar: ${webinarId}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('zoom-api', {
      body: { 
        action: 'sync-single-webinar',
        webinar_id: webinarId
      }
    });
    
    if (error) {
      console.error('[syncSingleWebinarOperation] Error:', error);
      throw new Error(error.message || 'Failed to sync webinar');
    }
    
    if (data.error) {
      console.error('[syncSingleWebinarOperation] API error:', data.error);
      throw new Error(data.error);
    }
    
    console.log('[syncSingleWebinarOperation] Sync completed:', data);
    
    // Invalidate relevant queries to refetch data
    if (queryClient && userId) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['zoom-webinars', userId] }),
        queryClient.invalidateQueries({ queryKey: ['zoom-webinar-details', webinarId] }),
        queryClient.invalidateQueries({ queryKey: ['zoom-webinar-participants', webinarId] }),
        queryClient.invalidateQueries({ queryKey: ['zoom-webinar-instances', webinarId] })
      ]);
    }
    
    // Enhanced success message with host, panelist, and actual timing information
    const syncResults = data.sync_results || {};
    const hostResolved = syncResults.host_info_resolved ? 'host info resolved' : 'host info missing';
    const panelistInfo = syncResults.panelist_info_resolved ? 
      `${syncResults.panelists_count} panelists found` : 
      'no panelists assigned';
    const actualTimingInfo = syncResults.actual_timing_resolved ? 
      'actual timing data fetched' : 
      'no actual timing data available';
    const itemsCount = data.items_synced || 0;
    
    // Show success toast with detailed information including actual timing
    toast({
      title: 'Webinar synced successfully',
      description: `Updated ${itemsCount} items for webinar ${webinarId}. ${hostResolved}, ${panelistInfo}, ${actualTimingInfo}.`,
    });
    
    return data;
  } catch (error: any) {
    console.error('[syncSingleWebinarOperation] Operation failed:', error);
    
    // Show error toast
    toast({
      title: 'Sync failed',
      description: error.message || 'Failed to sync webinar data',
      variant: 'destructive'
    });
    
    throw error;
  }
}

/**
 * Get the last sync time for a specific webinar
 */
export async function getWebinarLastSyncTime(webinarId: string, userId: string): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('zoom_sync_history')
      .select('created_at')
      .eq('user_id', userId)
      .eq('sync_type', 'single-webinar')
      .like('message', `%${webinarId}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('[getWebinarLastSyncTime] Error:', error);
      return null;
    }
    
    return data ? new Date(data.created_at) : null;
  } catch (error) {
    console.error('[getWebinarLastSyncTime] Failed to get last sync time:', error);
    return null;
  }
}
