
import { enhanceWebinarsWithHostInfo } from './hostInfoProcessor.ts';
import { enhanceWebinarsWithPanelistData } from './panellistDataProcessor.ts';
import { enhanceWebinarsWithParticipantData } from './participantDataProcessor.ts';
import { enhanceWebinarsWithRecordingData, storeRecordingData } from './recordingDataProcessor.ts';
import { batchEnhanceWebinarsWithDetailedSettings } from './webinarDetailProcessor.ts';

/**
 * Orchestrates the enhancement of webinar data with host, panelist, participant, recording, and detailed settings information
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] Starting comprehensive enhancement process for ${webinars.length} webinars`);
  
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
    
    // Step 4: Enhance with recording data for completed webinars
    console.log(`[zoom-api][enhancement-orchestrator] Step 4: Enhancing with recording data`);
    const webinarsWithRecordings = await enhanceWebinarsWithRecordingData(webinarsWithParticipantInfo, token);
    
    // Step 5: 🔥 NEW - Enhance with detailed settings data
    console.log(`[zoom-api][enhancement-orchestrator] Step 5: Enhancing with detailed settings (NEW)`);
    const enhancedWebinars = await batchEnhanceWebinarsWithDetailedSettings(webinarsWithRecordings, token, 5);
    
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
    
    // Calculate enhancement statistics
    const enhancementStats = {
      total_webinars: enhancedWebinars.length,
      with_host_info: enhancedWebinars.filter(w => w.host_name || w.host_info?.display_name).length,
      with_panelist_data: enhancedWebinars.filter(w => w.panelists && w.panelists.length > 0).length,
      with_participant_data: enhancedWebinars.filter(w => w.registrants_count > 0 || w.participants_count > 0).length,
      with_recording_data: enhancedWebinars.filter(w => w.has_recordings).length,
      with_detailed_settings: enhancedWebinars.filter(w => w._enhanced_with_details === true).length,
      failed_detail_enhancement: enhancedWebinars.filter(w => w._enhanced_with_details === false).length
    };
    
    console.log(`[zoom-api][enhancement-orchestrator] 🎉 Comprehensive enhancement completed successfully!`);
    console.log(`[zoom-api][enhancement-orchestrator] 📊 Enhancement Statistics:`);
    console.log(`[zoom-api][enhancement-orchestrator] - Total webinars: ${enhancementStats.total_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator] - With host info: ${enhancementStats.with_host_info}/${enhancementStats.total_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator] - With panelist data: ${enhancementStats.with_panelist_data}/${enhancementStats.total_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator] - With participant data: ${enhancementStats.with_participant_data}/${enhancementStats.total_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator] - With recording data: ${enhancementStats.with_recording_data}/${enhancementStats.total_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator] - 🔥 With detailed settings: ${enhancementStats.with_detailed_settings}/${enhancementStats.total_webinars}`);
    
    if (enhancementStats.failed_detail_enhancement > 0) {
      console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Failed to enhance ${enhancementStats.failed_detail_enhancement} webinars with detailed settings`);
    }
    
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][enhancement-orchestrator] ❌ Error during comprehensive enhancement process:`, error);
    throw error;
  }
}
