
import { enhanceWebinarsWithHostInfo } from './hostInfoProcessor.ts';
import { enhanceWebinarsWithPanelistData } from './panellistDataProcessor.ts';
import { enhanceWebinarsWithParticipantData } from './participantDataProcessor.ts';
import { enhanceWebinarsWithRecordingData, storeRecordingData } from './recordingDataProcessor.ts';
import { enhanceWebinarsWithInstanceData } from './instanceDataProcessor.ts';

/**
 * Orchestrates the enhancement of webinar data with host, panelist, participant, instance, and recording information
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] Starting enhancement process for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhancement-orchestrator] No webinars to enhance`);
    return [];
  }
  
  try {
    // Step 1: Enhance with host information
    console.log(`[zoom-api][enhancement-orchestrator] Step 1: Enhancing with host information`);
    const webinarsWithHostInfo = await enhanceWebinarsWithHostInfo(webinars, token);
    
    // Step 2: Enhance with panelist data
    console.log(`[zoom-api][enhancement-orchestrator] Step 2: Enhancing with panelist data`);
    const webinarsWithPanelistInfo = await enhanceWebinarsWithPanelistData(webinarsWithHostInfo, token);
    
    // Step 3: Enhance with participant data for completed webinars
    console.log(`[zoom-api][enhancement-orchestrator] Step 3: Enhancing with participant data`);
    const webinarsWithParticipantInfo = await enhanceWebinarsWithParticipantData(webinarsWithPanelistInfo, token);
    
    // Step 4: Enhance with instance data for actual timing information
    let webinarsWithInstanceInfo = webinarsWithParticipantInfo;
    if (supabase && userId) {
      console.log(`[zoom-api][enhancement-orchestrator] Step 4: Enhancing with instance data`);
      webinarsWithInstanceInfo = await enhanceWebinarsWithInstanceData(webinarsWithParticipantInfo, token, supabase, userId);
    } else {
      console.log(`[zoom-api][enhancement-orchestrator] Step 4: Skipping instance enhancement (missing supabase or userId)`);
    }
    
    // Step 5: Enhance with recording data for completed webinars
    console.log(`[zoom-api][enhancement-orchestrator] Step 5: Enhancing with recording data`);
    const enhancedWebinars = await enhanceWebinarsWithRecordingData(webinarsWithInstanceInfo, token);
    
    // Step 6: Store recording data in database if supabase client is provided
    if (supabase && userId) {
      console.log(`[zoom-api][enhancement-orchestrator] Step 6: Storing recording data in database`);
      let totalRecordingsStored = 0;
      
      for (const webinar of enhancedWebinars) {
        if (webinar.recording_data) {
          try {
            const storedCount = await storeRecordingData(supabase, userId, webinar.id, webinar.recording_data);
            totalRecordingsStored += storedCount;
          } catch (error) {
            console.error(`[zoom-api][enhancement-orchestrator] Error storing recordings for webinar ${webinar.id}:`, error);
          }
        }
      }
      
      console.log(`[zoom-api][enhancement-orchestrator] Stored ${totalRecordingsStored} recordings in database`);
    }
    
    console.log(`[zoom-api][enhancement-orchestrator] Enhancement completed successfully for ${enhancedWebinars.length} webinars`);
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][enhancement-orchestrator] Error during enhancement process:`, error);
    throw error;
  }
}
