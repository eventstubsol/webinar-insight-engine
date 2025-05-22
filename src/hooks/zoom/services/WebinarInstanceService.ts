
import { supabase } from '@/integrations/supabase/client';
import { BaseZoomService } from './base/BaseZoomService';

/**
 * WebinarInstanceService - Service for managing webinar instance data
 */
export class WebinarInstanceService extends BaseZoomService {
  /**
   * Fetch webinar instances from database
   */
  static async fetchWebinarInstancesFromDatabase(userId: string, webinarId?: string): Promise<any[] | null> {
    console.log('[WebinarInstanceService] Fetching webinar instances from database');
    
    let query = supabase
      .from('zoom_webinar_instances')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
      
    // If a specific webinar ID is provided, filter for just that webinar
    if (webinarId) {
      query = query.eq('webinar_id', webinarId);
    }
    
    const { data: dbInstances, error: dbError } = await query;
    
    if (dbError) {
      console.error('[WebinarInstanceService] Error:', dbError);
      return null;
    }
    
    if (!dbInstances || dbInstances.length === 0) {
      console.log('[WebinarInstanceService] No webinar instances found in database');
      return [];
    }
    
    console.log(`[WebinarInstanceService] Found ${dbInstances.length} webinar instances in database`);
    
    return dbInstances;
  }

  /**
   * Fetch webinar instances from API
   */
  static async fetchWebinarInstancesAPI(webinarId: string): Promise<any> {
    console.log(`[WebinarInstanceService] Fetching instances for webinar ID: ${webinarId}`);
    
    const data = await BaseZoomService.invokeEdgeFunction('get-webinar-instances', { webinar_id: webinarId });
    
    console.log(`[WebinarInstanceService] Retrieved ${data.instances?.length || 0} instances`);
    return data.instances || [];
  }

  /**
   * Fetch instance participants from API
   */
  static async fetchInstanceParticipantsAPI(webinarId: string, instanceId: string): Promise<any> {
    console.log(`[WebinarInstanceService] Fetching participants for webinar ID: ${webinarId}, instance ID: ${instanceId}`);
    
    const data = await BaseZoomService.invokeEdgeFunction('get-instance-participants', { 
      webinar_id: webinarId,
      instance_id: instanceId
    });
    
    return {
      registrants: data.registrants || [],
      attendees: data.attendees || []
    };
  }
}
