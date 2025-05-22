
import { BaseZoomService } from './base/BaseZoomService';

/**
 * ParticipantService - Service for managing webinar participant data
 */
export class ParticipantService extends BaseZoomService {
  /**
   * Update participant data for webinars
   */
  static async updateParticipantDataAPI(): Promise<any> {
    console.log('[ParticipantService] Updating participant data');
    
    const data = await BaseZoomService.invokeEdgeFunction('update-webinar-participants');
    
    console.log('[ParticipantService] Update completed:', data);
    return data;
  }
}
