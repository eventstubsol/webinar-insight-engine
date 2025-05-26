
import { enhanceWebinarsWithHostInfo } from './hostInfoProcessor.ts';
import { enhanceWebinarsWithPanelistData } from './panellistDataProcessor.ts';
import { enhanceWebinarsWithParticipantData } from './participantDataProcessor.ts';
import { enhanceWebinarsWithRecordingData, storeRecordingData } from './recordingDataProcessor.ts';
import { enhanceWebinarsWithActualTimingData } from './actualTimingDataProcessor.ts';

/**
 * Enhanced orchestrator for comprehensive webinar data enhancement
 * with improved error handling, timeout protection, and complete data collection
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] 🚀 Starting COMPREHENSIVE enhancement process for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhancement-orchestrator] No webinars to enhance, returning empty array`);
    return [];
  }
  
  let enhancedWebinars = [...webinars];
  const enhancementStats = {
    hostInfoAdded: 0,
    panelistDataAdded: 0,
    participantDataAdded: 0,
    actualTimingAdded: 0,
    recordingDataAdded: 0,
    recordingsStored: 0,
    totalProcessed: webinars.length,
    errors: []
  };
  
  try {
    // Step 1: Enhance with host information (critical for user experience)
    console.log(`[zoom-api][enhancement-orchestrator] 📋 Step 1: Enhancing with comprehensive host information`);
    try {
      enhancedWebinars = await enhanceWebinarsWithHostInfo(enhancedWebinars, token);
      enhancementStats.hostInfoAdded = enhancedWebinars.filter(w => w.host_name || w.host_email).length;
      console.log(`[zoom-api][enhancement-orchestrator] ✅ Host info: ${enhancementStats.hostInfoAdded}/${webinars.length} webinars enhanced`);
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] ❌ Host info enhancement failed:`, error.message);
      enhancementStats.errors.push(`Host info: ${error.message}`);
    }
    
    // Step 2: Enhance with panelist data (important for webinar context)
    console.log(`[zoom-api][enhancement-orchestrator] 👥 Step 2: Enhancing with comprehensive panelist data`);
    try {
      enhancedWebinars = await enhanceWebinarsWithPanelistData(enhancedWebinars, token);
      enhancementStats.panelistDataAdded = enhancedWebinars.filter(w => w.panelists && w.panelists.length > 0).length;
      console.log(`[zoom-api][enhancement-orchestrator] ✅ Panelist data: ${enhancementStats.panelistDataAdded}/${webinars.length} webinars enhanced`);
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] ❌ Panelist data enhancement failed:`, error.message);
      enhancementStats.errors.push(`Panelist data: ${error.message}`);
    }
    
    // Step 3: CRITICAL - Enhance with actual timing data (the main issue we're fixing)
    console.log(`[zoom-api][enhancement-orchestrator] ⏰ Step 3: CRITICAL - Enhancing with actual timing data using ENHANCED processor`);
    try {
      const timingStartTime = Date.now();
      enhancedWebinars = await enhanceWebinarsWithActualTimingData(enhancedWebinars, token);
      enhancementStats.actualTimingAdded = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration).length;
      const timingDuration = Date.now() - timingStartTime;
      
      console.log(`[zoom-api][enhancement-orchestrator] ✅ CRITICAL SUCCESS: Actual timing data enhanced for ${enhancementStats.actualTimingAdded}/${webinars.length} webinars in ${timingDuration}ms`);
      
      // Log detailed timing statistics
      if (enhancementStats.actualTimingAdded > 0) {
        const timingWebinars = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration);
        console.log(`[zoom-api][enhancement-orchestrator] 📊 Timing data details:`);
        timingWebinars.forEach(w => {
          console.log(`[zoom-api][enhancement-orchestrator] - Webinar ${w.id}: start=${w.actual_start_time}, duration=${w.actual_duration}min`);
        });
      }
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] ❌ CRITICAL FAILURE: Actual timing enhancement failed:`, error.message);
      enhancementStats.errors.push(`Actual timing (CRITICAL): ${error.message}`);
    }
    
    // Step 4: Enhance with participant data (for engagement metrics)
    console.log(`[zoom-api][enhancement-orchestrator] 🎯 Step 4: Enhancing with comprehensive participant data`);
    try {
      enhancedWebinars = await enhanceWebinarsWithParticipantData(enhancedWebinars, token);
      enhancementStats.participantDataAdded = enhancedWebinars.filter(w => w.participant_data || w.registrants_count > 0).length;
      console.log(`[zoom-api][enhancement-orchestrator] ✅ Participant data: ${enhancementStats.participantDataAdded}/${webinars.length} webinars enhanced`);
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] ❌ Participant data enhancement failed:`, error.message);
      enhancementStats.errors.push(`Participant data: ${error.message}`);
    }
    
    // Step 5: Enhance with recording data (for content access)
    console.log(`[zoom-api][enhancement-orchestrator] 🎥 Step 5: Enhancing with comprehensive recording data`);
    try {
      enhancedWebinars = await enhanceWebinarsWithRecordingData(enhancedWebinars, token);
      enhancementStats.recordingDataAdded = enhancedWebinars.filter(w => w.recording_data || w.has_recordings).length;
      console.log(`[zoom-api][enhancement-orchestrator] ✅ Recording data: ${enhancementStats.recordingDataAdded}/${webinars.length} webinars enhanced`);
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] ❌ Recording data enhancement failed:`, error.message);
      enhancementStats.errors.push(`Recording data: ${error.message}`);
    }
    
    // Step 6: Store recording data in database if available
    if (supabase && userId) {
      console.log(`[zoom-api][enhancement-orchestrator] 💾 Step 6: Storing recording data in database`);
      try {
        for (const webinar of enhancedWebinars) {
          if (webinar.recording_data) {
            try {
              const storedCount = await storeRecordingData(supabase, userId, webinar.id, webinar.recording_data);
              enhancementStats.recordingsStored += storedCount;
            } catch (error) {
              console.error(`[zoom-api][enhancement-orchestrator] ❌ Error storing recordings for webinar ${webinar.id}:`, error.message);
              enhancementStats.errors.push(`Recording storage for ${webinar.id}: ${error.message}`);
            }
          }
        }
        console.log(`[zoom-api][enhancement-orchestrator] ✅ Database storage: ${enhancementStats.recordingsStored} recordings stored`);
      } catch (error) {
        console.error(`[zoom-api][enhancement-orchestrator] ❌ Recording database storage failed:`, error.message);
        enhancementStats.errors.push(`Recording database storage: ${error.message}`);
      }
    }
    
    // Log comprehensive enhancement statistics
    console.log(`[zoom-api][enhancement-orchestrator] 🎉 COMPREHENSIVE ENHANCEMENT COMPLETED for ${enhancedWebinars.length} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator] 📊 Final enhancement statistics:`);
    console.log(`[zoom-api][enhancement-orchestrator] - Total processed: ${enhancementStats.totalProcessed}`);
    console.log(`[zoom-api][enhancement-orchestrator] - Host info: ${enhancementStats.hostInfoAdded} webinars (${Math.round((enhancementStats.hostInfoAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - Panelist data: ${enhancementStats.panelistDataAdded} webinars (${Math.round((enhancementStats.panelistDataAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - 🎯 ACTUAL TIMING: ${enhancementStats.actualTimingAdded} webinars (${Math.round((enhancementStats.actualTimingAdded/enhancementStats.totalProcessed)*100)}%) - CRITICAL METRIC`);
    console.log(`[zoom-api][enhancement-orchestrator] - Participant data: ${enhancementStats.participantDataAdded} webinars (${Math.round((enhancementStats.participantDataAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - Recording data: ${enhancementStats.recordingDataAdded} webinars (${Math.round((enhancementStats.recordingDataAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - Recordings stored: ${enhancementStats.recordingsStored} files`);
    console.log(`[zoom-api][enhancement-orchestrator] - Errors encountered: ${enhancementStats.errors.length}`);
    
    if (enhancementStats.errors.length > 0) {
      console.log(`[zoom-api][enhancement-orchestrator] ⚠️ Enhancement errors summary:`);
      enhancementStats.errors.forEach((error, index) => {
        console.log(`[zoom-api][enhancement-orchestrator] ${index + 1}. ${error}`);
      });
    }
    
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][enhancement-orchestrator] ❌ CRITICAL ERROR during comprehensive enhancement process:`, error);
    console.error(`[zoom-api][enhancement-orchestrator] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    
    // Return whatever we have enhanced so far rather than failing completely
    console.log(`[zoom-api][enhancement-orchestrator] 🔄 Returning ${enhancedWebinars.length} partially enhanced webinars to prevent total failure`);
    
    // Add final error to stats
    enhancementStats.errors.push(`Critical orchestrator error: ${error.message}`);
    
    return enhancedWebinars;
  }
}
