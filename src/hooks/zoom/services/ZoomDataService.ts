
import { QandAService } from './QandAService';
import { PollsService } from './PollsService';
import { RecordingsService } from './RecordingsService';
import { EngagementService } from './EngagementService';
import { BaseZoomService } from './base/BaseZoomService';

/**
 * ZoomDataService - Main service for fetching and managing Zoom webinar data
 * This service coordinates all the other specialized services
 */
export class ZoomDataService extends BaseZoomService {
  // Expose methods from QandAService
  static fetchWebinarQAndA = QandAService.fetchWebinarQAndA;
  
  // Expose methods from PollsService
  static fetchWebinarPolls = PollsService.fetchWebinarPolls;
  static fetchPollResponses = PollsService.fetchPollResponses;
  
  // Expose methods from RecordingsService
  static fetchWebinarRecordings = RecordingsService.fetchWebinarRecordings;
  
  // Expose methods from EngagementService
  static fetchWebinarEngagement = EngagementService.fetchWebinarEngagement;
  static fetchWebinarChat = EngagementService.fetchWebinarChat;
  
  /**
   * Trigger a full data sync for a webinar to fetch all available data
   */
  static async syncAllWebinarData(userId: string, webinarId: string) {
    try {
      console.log(`[ZoomDataService] Starting full data sync for webinar ID: ${webinarId}`);
      
      // Call the Zoom API edge function to fetch all additional data
      const data = await this.invokeEdgeFunction('get-webinar-extended-data', { webinar_id: webinarId });
      
      this.showToast(
        "Data sync completed",
        "All webinar data has been synchronized"
      );
      
      return data;
    } catch (error) {
      console.error('[ZoomDataService] Error syncing webinar data:', error);
      this.showToast(
        "Data sync failed",
        "Could not synchronize webinar data",
        "destructive"
      );
      throw error;
    }
  }
}
