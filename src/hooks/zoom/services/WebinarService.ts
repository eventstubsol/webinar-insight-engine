
import { supabase } from '@/integrations/supabase/client';
import { BaseZoomService } from './base/BaseZoomService';
import { ZoomWebinar } from '../types';
import { DataValidator } from '../utils/validationUtils';

/**
 * WebinarService - Service for managing webinar data
 */
export class WebinarService extends BaseZoomService {
  /**
   * Fetch webinars from database with validation
   */
  static async fetchWebinarsFromDatabase(userId: string): Promise<ZoomWebinar[] | null> {
    console.log('[WebinarService] Fetching webinars from database');
    
    const { data: dbWebinars, error: dbError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
    
    if (dbError) {
      console.error('[WebinarService] Error:', dbError);
      return null;
    }
    
    if (!dbWebinars || dbWebinars.length === 0) {
      console.log('[WebinarService] No webinars found in database');
      return [];
    }
    
    console.log(`[WebinarService] Found ${dbWebinars.length} webinars in database`);
    
    // Transform and validate webinar data
    const validWebinars = WebinarService.transformDatabaseWebinars(dbWebinars)
      .filter(webinar => {
        try {
          // Validate each webinar
          DataValidator.validateWebinar(webinar);
          return true;
        } catch (error) {
          console.warn(`[WebinarService] Invalid webinar data for ${webinar.id || 'unknown'}: ${error.message}`);
          return false;
        }
      });
    
    return validWebinars;
  }

  /**
   * Transform database webinars to ZoomWebinar format
   */
  private static transformDatabaseWebinars(dbWebinars: any[]): ZoomWebinar[] {
    // Transform to ZoomWebinar format with proper type handling
    return dbWebinars.map(item => {
      // Parse the raw_data if it's a string, use as-is if it's already an object
      let parsedRawData: Record<string, any> = {};
      
      if (item.raw_data) {
        if (typeof item.raw_data === 'string') {
          try {
            parsedRawData = JSON.parse(item.raw_data);
          } catch (e) {
            console.error('Failed to parse raw_data:', e);
          }
        } else {
          // Assume it's already an object
          parsedRawData = item.raw_data as Record<string, any>;
        }
      }
      
      // Create a properly typed ZoomWebinar object
      const webinar: ZoomWebinar = {
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
      
      return webinar;
    });
  }

  /**
   * Fetch webinars from API with rate limiting
   */
  static async fetchWebinarsFromAPI(forceSync: boolean = false): Promise<ZoomWebinar[]> {
    console.log(`[WebinarService] Fetching webinars from API with force_sync=${forceSync}`);
    
    try {
      const data = await BaseZoomService.invokeEdgeFunction('list-webinars', { force_sync: forceSync });
      
      // Validate the returned data
      if (!data || !data.webinars || !Array.isArray(data.webinars)) {
        throw new Error('Invalid response format from API');
      }
      
      // Validate each webinar and filter out invalid ones
      const validWebinars = data.webinars.filter(webinar => {
        try {
          DataValidator.validateWebinar(webinar);
          return true;
        } catch (error) {
          console.warn(`[WebinarService] Invalid webinar data from API for ${webinar.id || 'unknown'}: ${error.message}`);
          return false;
        }
      });
      
      return validWebinars;
    } catch (error) {
      console.error('[WebinarService] API fetch error:', error);
      throw error;
    }
  }

  /**
   * Refresh webinars from API with force option
   */
  static async refreshWebinarsFromAPI(userId: string, force: boolean = false): Promise<any> {
    console.log(`[WebinarService] Starting refresh with force=${force}`);
    
    const refreshData = await BaseZoomService.invokeEdgeFunction('list-webinars', { force_sync: force });
    
    console.log('[WebinarService] Sync completed successfully:', refreshData);
    
    return refreshData;
  }
}

// Export these functions to maintain backward compatibility with webinarUtils.ts
export const fetchWebinarsFromDatabase = WebinarService.fetchWebinarsFromDatabase;
export const fetchWebinarsFromAPI = WebinarService.fetchWebinarsFromAPI;
