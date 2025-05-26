
import { enhanceWebinarsWithHostInfo } from './hostInfoProcessor.ts';
import { enhanceWebinarsWithPanelistData } from './panellistDataProcessor.ts';
import { enhanceWebinarsWithParticipantData } from './participantDataProcessor.ts';
import { enhanceWebinarsWithRecordingData, storeRecordingData } from './recordingDataProcessor.ts';
import { enhanceWebinarsWithActualTimingData } from './actualTimingDataProcessor.ts';

/**
 * Orchestrates the enhancement of webinar data with host, panelist, participant, actual timing, and recording information
 * with improved timeout handling and error recovery
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] Starting enhancement process for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhancement-orchestrator] No webinars to enhance`);
    return [];
  }
  
  let enhancedWebinars = [...webinars];
  const enhancementStats = {
    hostInfoAdded: 0,
    panelistDataAdded: 0,
    participantDataAdded: 0,
    actualTimingAdded: 0,
    recordingDataAdded: 0,
    recordingsStored: 0
  };
  
  try {
    // Step 1: Enhance with host information (usually fast)
    console.log(`[zoom-api][enhancement-orchestrator] Step 1: Enhancing with host information`);
    try {
      enhancedWebinars = await enhanceWebinarsWithHostInfo(enhancedWebinars, token);
      enhancementStats.hostInfoAdded = enhancedWebinars.filter(w => w.host_name || w.host_email).length;
      console.log(`[zoom-api][enhancement-orchestrator] Added host info to ${enhancementStats.hostInfoAdded} webinars`);
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] Host info enhancement failed:`, error);
      // Continue with other enhancements
    }
    
    // Step 2: Enhance with panelist data (usually fast)
    console.log(`[zoom-api][enhancement-orchestrator] Step 2: Enhancing with panelist data`);
    try {
      enhancedWebinars = await enhanceWebinarsWithPanelistData(enhancedWebinars, token);
      enhancementStats.panelistDataAdded = enhancedWebinars.filter(w => w.panelists && w.panelists.length > 0).length;
      console.log(`[zoom-api][enhancement-orchestrator] Added panelist data to ${enhancementStats.panelistDataAdded} webinars`);
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] Panelist data enhancement failed:`, error);
      // Continue with other enhancements
    }
    
    // Step 3: Enhance with participant data for completed webinars (can be slow)
    console.log(`[zoom-api][enhancement-orchestrator] Step 3: Enhancing with participant data`);
    try {
      enhancedWebinars = await enhanceWebinarsWithParticipantData(enhancedWebinars, token);
      enhancementStats.participantDataAdded = enhancedWebinars.filter(w => w.participant_data || w.registrants_count > 0).length;
      console.log(`[zoom-api][enhancement-orchestrator] Added participant data to ${enhancementStats.participantDataAdded} webinars`);
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] Participant data enhancement failed:`, error);
      // Continue with other enhancements
    }
    
    // Step 4: Enhance with actual timing data for ended webinars (critical fix)
    console.log(`[zoom-api][enhancement-orchestrator] Step 4: Enhancing with actual timing data`);
    try {
      enhancedWebinars = await enhanceWebinarsWithActualTimingData(enhancedWebinars, token);
      enhancementStats.actualTimingAdded = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration).length;
      console.log(`[zoom-api][enhancement-orchestrator] Added actual timing data to ${enhancementStats.actualTimingAdded} webinars`);
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] Actual timing enhancement failed:`, error);
      // Continue with other enhancements
    }
    
    // Step 5: Enhance with recording data for completed webinars (can be slow)
    console.log(`[zoom-api][enhancement-orchestrator] Step 5: Enhancing with recording data`);
    try {
      enhancedWebinars = await enhanceWebinarsWithRecordingData(enhancedWebinars, token);
      enhancementStats.recordingDataAdded = enhancedWebinars.filter(w => w.recording_data || w.has_recordings).length;
      console.log(`[zoom-api][enhancement-orchestrator] Added recording data to ${enhancementStats.recordingDataAdded} webinars`);
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] Recording data enhancement failed:`, error);
      // Continue with database storage
    }
    
    // Step 6: Store recording data in database if supabase client is provided
    if (supabase && userId) {
      console.log(`[zoom-api][enhancement-orchestrator] Step 6: Storing recording data in database`);
      try {
        for (const webinar of enhancedWebinars) {
          if (webinar.recording_data) {
            try {
              const storedCount = await storeRecordingData(supabase, userId, webinar.id, webinar.recording_data);
              enhancementStats.recordingsStored += storedCount;
            } catch (error) {
              console.error(`[zoom-api][enhancement-orchestrator] Error storing recordings for webinar ${webinar.id}:`, error);
              // Continue with other webinars
            }
          }
        }
        console.log(`[zoom-api][enhancement-orchestrator] Stored ${enhancementStats.recordingsStored} recordings in database`);
      } catch (error) {
        console.error(`[zoom-api][enhancement-orchestrator] Recording storage failed:`, error);
      }
    }
    
    // Log comprehensive enhancement statistics
    console.log(`[zoom-api][enhancement-orchestrator] Enhancement completed successfully for ${enhancedWebinars.length} webinars:`);
    console.log(`[zoom-api][enhancement-orchestrator] - Host info: ${enhancementStats.hostInfoAdded} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator] - Panelist data: ${enhancementStats.panelistDataAdded} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator] - Participant data: ${enhancementStats.participantDataAdded} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator] - Actual timing: ${enhancementStats.actualTimingAdded} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator] - Recording data: ${enhancementStats.recordingDataAdded} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator] - Recordings stored: ${enhancementStats.recordingsStored} files`);
    
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][enhancement-orchestrator] Critical error during enhancement process:`, error);
    // Return whatever we have enhanced so far rather than failing completely
    console.log(`[zoom-api][enhancement-orchestrator] Returning ${enhancedWebinars.length} partially enhanced webinars`);
    return enhancedWebinars;
  }
}
