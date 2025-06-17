
import { supabase } from '@/integrations/supabase/client';

/**
 * NEW: Dedicated service for registrant background sync
 */
export class ParticipantSyncService {
  
  /**
   * Sync registrants for a single webinar
   */
  static async syncRegistrantsForWebinar(webinarId: string): Promise<any> {
    console.log(`[ParticipantSyncService] Starting registrant sync for webinar: ${webinarId}`);
    
    const { data, error } = await supabase.functions.invoke('zoom-api', {
      body: { 
        action: 'sync-registrants',
        webinar_id: webinarId
      }
    });
    
    if (error) {
      console.error(`[ParticipantSyncService] Error syncing registrants for webinar ${webinarId}:`, error);
      throw error;
    }
    
    console.log(`[ParticipantSyncService] Registrant sync completed for webinar ${webinarId}:`, data);
    return data;
  }
  
  /**
   * Sync registrants for multiple webinars
   */
  static async syncRegistrantsForWebinars(webinarIds: string[]): Promise<any> {
    console.log(`[ParticipantSyncService] Starting registrant sync for ${webinarIds.length} webinars`);
    
    const { data, error } = await supabase.functions.invoke('zoom-api', {
      body: { 
        action: 'sync-registrants',
        webinar_ids: webinarIds
      }
    });
    
    if (error) {
      console.error(`[ParticipantSyncService] Error syncing registrants for webinars:`, error);
      throw error;
    }
    
    console.log(`[ParticipantSyncService] Registrant sync completed for ${webinarIds.length} webinars:`, data);
    return data;
  }
  
  /**
   * Check which webinars need registrant sync
   */
  static async getWebinarsNeedingRegistrantSync(userId: string): Promise<string[]> {
    console.log(`[ParticipantSyncService] Checking webinars needing registrant sync for user: ${userId}`);
    
    // Get webinars that don't have registrant data or have zero registrants
    const { data: webinars, error } = await supabase
      .from('zoom_webinars')
      .select('webinar_id, registrants_count')
      .eq('user_id', userId)
      .or('registrants_count.is.null,registrants_count.eq.0');
    
    if (error) {
      console.error(`[ParticipantSyncService] Error checking webinars:`, error);
      throw error;
    }
    
    const webinarIds = webinars?.map(w => w.webinar_id) || [];
    console.log(`[ParticipantSyncService] Found ${webinarIds.length} webinars needing registrant sync`);
    
    return webinarIds;
  }
  
  /**
   * Get registrant sync status for webinars
   */
  static async getRegistrantSyncStatus(userId: string): Promise<any> {
    console.log(`[ParticipantSyncService] Getting registrant sync status for user: ${userId}`);
    
    // Get counts from both tables
    const [webinarsResult, participantsResult, registrantsResult] = await Promise.all([
      supabase
        .from('zoom_webinars')
        .select('webinar_id, registrants_count')
        .eq('user_id', userId),
      
      supabase
        .from('zoom_webinar_participants')
        .select('webinar_id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('participant_type', 'registrant'),
      
      supabase
        .from('zoom_webinar_registrants')
        .select('webinar_id', { count: 'exact' })
        .eq('user_id', userId)
    ]);
    
    const webinars = webinarsResult.data || [];
    const participantsCount = participantsResult.count || 0;
    const registrantsCount = registrantsResult.count || 0;
    
    const webinarsWithRegistrants = webinars.filter(w => (w.registrants_count || 0) > 0).length;
    const webinarsWithoutRegistrants = webinars.length - webinarsWithRegistrants;
    
    const status = {
      total_webinars: webinars.length,
      webinars_with_registrants: webinarsWithRegistrants,
      webinars_without_registrants: webinarsWithoutRegistrants,
      total_participants_records: participantsCount,
      total_registrants_records: registrantsCount,
      needs_sync: webinarsWithoutRegistrants > 0
    };
    
    console.log(`[ParticipantSyncService] Registrant sync status:`, status);
    return status;
  }
}
