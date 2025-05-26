
import { supabase } from '@/integrations/supabase/client';
import { ZoomWebinar } from '../types';

/**
 * Centralized database operations for Zoom data
 */
export class ZoomDatabaseService {
  async getWebinars(userId: string): Promise<ZoomWebinar[]> {
    console.log('[ZoomDatabaseService] Fetching webinars from database');
    
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
    
    if (error) {
      console.error('[ZoomDatabaseService] Error fetching webinars:', error);
      throw new Error(`Failed to fetch webinars: ${error.message}`);
    }
    
    return this.transformWebinars(data || []);
  }

  async getWebinarInstances(userId: string, webinarId?: string) {
    console.log('[ZoomDatabaseService] Fetching webinar instances');
    
    let query = supabase
      .from('zoom_webinar_instances')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
      
    if (webinarId) {
      query = query.eq('webinar_id', webinarId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[ZoomDatabaseService] Error fetching instances:', error);
      throw new Error(`Failed to fetch instances: ${error.message}`);
    }
    
    return data || [];
  }

  async getSyncHistory(userId: string, limit: number = 10) {
    console.log('[ZoomDatabaseService] Fetching sync history');
    
    const { data, error } = await supabase
      .from('zoom_sync_history')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_type', 'webinars')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[ZoomDatabaseService] Error fetching sync history:', error);
      return [];
    }
    
    return data || [];
  }

  private transformWebinars(dbWebinars: any[]): ZoomWebinar[] {
    return dbWebinars.map(item => {
      let parsedRawData: Record<string, any> = {};
      
      if (item.raw_data) {
        if (typeof item.raw_data === 'string') {
          try {
            parsedRawData = JSON.parse(item.raw_data);
          } catch (e) {
            console.error('Failed to parse raw_data:', e);
          }
        } else {
          parsedRawData = item.raw_data as Record<string, any>;
        }
      }
      
      return {
        id: item.webinar_id,
        uuid: item.webinar_uuid,
        topic: item.topic,
        start_time: item.start_time,
        duration: item.duration,
        timezone: item.timezone,
        agenda: item.agenda || '',
        host_email: item.host_email,
        status: item.status,
        type: item.type,
        registrants_count: parsedRawData?.registrants_count || 0,
        participants_count: parsedRawData?.participants_count || 0,
        raw_data: parsedRawData
      };
    });
  }
}

export const zoomDatabaseService = new ZoomDatabaseService();
