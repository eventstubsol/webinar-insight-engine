
import { supabase } from '@/integrations/supabase/client';

/**
 * Centralized Zoom API client with consistent error handling
 */
export class ZoomApiClient {
  private async invokeFunction(action: string, params: Record<string, any> = {}) {
    console.log(`[ZoomApiClient] Invoking ${action} with params:`, params);
    
    const { data, error } = await supabase.functions.invoke('zoom-api', {
      body: { action, ...params }
    });
    
    if (error) {
      console.error(`[ZoomApiClient] ${action} function error:`, error);
      throw new Error(error.message || `Failed to invoke ${action}`);
    }
    
    if (data?.error) {
      console.error(`[ZoomApiClient] ${action} API error:`, data.error);
      throw new Error(data.error);
    }
    
    return data;
  }

  async listWebinars(forceSync: boolean = false) {
    return this.invokeFunction('list-webinars', { force_sync: forceSync });
  }

  async getWebinar(webinarId: string) {
    return this.invokeFunction('get-webinar', { webinar_id: webinarId });
  }

  async updateParticipantData() {
    return this.invokeFunction('update-webinar-participants');
  }

  async syncTimingData() {
    return this.invokeFunction('sync-timing-data');
  }

  async getWebinarInstances(webinarId: string) {
    return this.invokeFunction('get-webinar-instances', { webinar_id: webinarId });
  }

  async getInstanceParticipants(webinarId: string, instanceId: string) {
    return this.invokeFunction('get-instance-participants', { 
      webinar_id: webinarId, 
      instance_id: instanceId 
    });
  }

  async getWebinarRecordings(webinarId: string) {
    return this.invokeFunction('get-webinar-recordings', { webinar_id: webinarId });
  }
}

export const zoomApiClient = new ZoomApiClient();
