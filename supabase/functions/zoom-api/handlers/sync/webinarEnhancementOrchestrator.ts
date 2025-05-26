
import { enhanceWebinarsWithHostInfo } from './hostInfoProcessor.ts';
import { enhanceWebinarsWithPanelistData } from './panellistDataProcessor.ts';
import { enhanceWebinarsWithParticipantData } from './participantDataProcessor.ts';
import { enhanceWebinarsWithRecordingData, storeRecordingData } from './recordingDataProcessor.ts';
import { enhanceWebinarsWithActualTimingData } from './actualTimingDataProcessor.ts';

/**
 * Enhanced orchestrator with improved timeout handling and sequential processing
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] 🚀 Starting ENHANCED comprehensive enhancement process for ${webinars.length} webinars`);
  
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

  // Enhanced timeout and retry configuration
  const STEP_TIMEOUT = 30000; // 30 seconds per enhancement step
  const CRITICAL_STEP_TIMEOUT = 45000; // 45 seconds for critical timing step
  const MAX_RETRIES = 2;
  
  // Helper function for timeout-protected enhancement with retry logic
  async function executeEnhancementStep(
    stepName: string, 
    enhancementFunction: () => Promise<any[]>, 
    timeout: number = STEP_TIMEOUT,
    retries: number = MAX_RETRIES
  ): Promise<any[]> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[zoom-api][enhancement-orchestrator] 🔄 ${stepName} - Attempt ${attempt}/${retries}`);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${stepName} timeout after ${timeout}ms`)), timeout);
        });
        
        const result = await Promise.race([enhancementFunction(), timeoutPromise]) as any[];
        console.log(`[zoom-api][enhancement-orchestrator] ✅ ${stepName} completed successfully on attempt ${attempt}`);
        return result;
        
      } catch (error) {
        console.error(`[zoom-api][enhancement-orchestrator] ❌ ${stepName} failed on attempt ${attempt}:`, error.message);
        enhancementStats.errors.push(`${stepName} attempt ${attempt}: ${error.message}`);
        
        if (attempt === retries) {
          console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ ${stepName} failed after ${retries} attempts, continuing with current data`);
          throw error;
        }
        
        // Brief delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    return enhancedWebinars; // Fallback
  }
  
  try {
    // Step 1: Host information (non-critical but important)
    console.log(`[zoom-api][enhancement-orchestrator] 📋 Step 1: ENHANCED host information with retry logic`);
    try {
      enhancedWebinars = await executeEnhancementStep(
        'Host Info Enhancement',
        () => enhanceWebinarsWithHostInfo(enhancedWebinars, token)
      );
      enhancementStats.hostInfoAdded = enhancedWebinars.filter(w => w.host_name || w.host_email).length;
      console.log(`[zoom-api][enhancement-orchestrator] ✅ Host info: ${enhancementStats.hostInfoAdded}/${webinars.length} webinars enhanced`);
    } catch (error) {
      console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Host info enhancement failed, continuing: ${error.message}`);
    }
    
    // Step 2: CRITICAL - Actual timing data (the main issue we're fixing)
    console.log(`[zoom-api][enhancement-orchestrator] ⏰ Step 2: CRITICAL - ENHANCED actual timing data with extended timeout`);
    try {
      enhancedWebinars = await executeEnhancementStep(
        'CRITICAL Actual Timing Enhancement',
        () => enhanceWebinarsWithActualTimingData(enhancedWebinars, token),
        CRITICAL_STEP_TIMEOUT, // Extended timeout for critical step
        3 // More retries for critical data
      );
      enhancementStats.actualTimingAdded = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration).length;
      console.log(`[zoom-api][enhancement-orchestrator] ✅ CRITICAL SUCCESS: Actual timing data enhanced for ${enhancementStats.actualTimingAdded}/${webinars.length} webinars`);
      
      // Enhanced logging for timing success
      if (enhancementStats.actualTimingAdded > 0) {
        const timingWebinars = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration);
        console.log(`[zoom-api][enhancement-orchestrator] 📊 TIMING SUCCESS DETAILS:`);
        timingWebinars.slice(0, 5).forEach(w => { // Log first 5 for brevity
          console.log(`[zoom-api][enhancement-orchestrator] - Webinar ${w.id}: start=${w.actual_start_time}, duration=${w.actual_duration}min`);
        });
        if (timingWebinars.length > 5) {
          console.log(`[zoom-api][enhancement-orchestrator] ... and ${timingWebinars.length - 5} more webinars with timing data`);
        }
      }
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] ❌ CRITICAL FAILURE: Actual timing enhancement failed after all retries: ${error.message}`);
      enhancementStats.errors.push(`CRITICAL Actual timing (FAILED AFTER RETRIES): ${error.message}`);
    }
    
    // Step 3: Panelist data (important for context)
    console.log(`[zoom-api][enhancement-orchestrator] 👥 Step 3: ENHANCED panelist data with retry logic`);
    try {
      enhancedWebinars = await executeEnhancementStep(
        'Panelist Data Enhancement',
        () => enhanceWebinarsWithPanelistData(enhancedWebinars, token)
      );
      enhancementStats.panelistDataAdded = enhancedWebinars.filter(w => w.panelists && w.panelists.length > 0).length;
      console.log(`[zoom-api][enhancement-orchestrator] ✅ Panelist data: ${enhancementStats.panelistDataAdded}/${webinars.length} webinars enhanced`);
    } catch (error) {
      console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Panelist enhancement failed, continuing: ${error.message}`);
    }
    
    // Step 4: Participant data (for engagement metrics) - non-blocking
    console.log(`[zoom-api][enhancement-orchestrator] 🎯 Step 4: ENHANCED participant data with retry logic`);
    try {
      enhancedWebinars = await executeEnhancementStep(
        'Participant Data Enhancement',
        () => enhanceWebinarsWithParticipantData(enhancedWebinars, token)
      );
      enhancementStats.participantDataAdded = enhancedWebinars.filter(w => w.participant_data || w.registrants_count > 0).length;
      console.log(`[zoom-api][enhancement-orchestrator] ✅ Participant data: ${enhancementStats.participantDataAdded}/${webinars.length} webinars enhanced`);
    } catch (error) {
      console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Participant enhancement failed, continuing: ${error.message}`);
    }
    
    // Step 5: Recording data (for content access) - non-blocking
    console.log(`[zoom-api][enhancement-orchestrator] 🎥 Step 5: ENHANCED recording data with retry logic`);
    try {
      enhancedWebinars = await executeEnhancementStep(
        'Recording Data Enhancement',
        () => enhanceWebinarsWithRecordingData(enhancedWebinars, token)
      );
      enhancementStats.recordingDataAdded = enhancedWebinars.filter(w => w.recording_data || w.has_recordings).length;
      console.log(`[zoom-api][enhancement-orchestrator] ✅ Recording data: ${enhancementStats.recordingDataAdded}/${webinars.length} webinars enhanced`);
    } catch (error) {
      console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Recording enhancement failed, continuing: ${error.message}`);
    }
    
    // Step 6: Store recording data in database if available - non-blocking
    if (supabase && userId) {
      console.log(`[zoom-api][enhancement-orchestrator] 💾 Step 6: ENHANCED recording storage with error handling`);
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
        console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Recording storage failed, continuing: ${error.message}`);
      }
    }
    
    // ENHANCED final statistics and validation
    console.log(`[zoom-api][enhancement-orchestrator] 🎉 ENHANCED COMPREHENSIVE ENHANCEMENT COMPLETED for ${enhancedWebinars.length} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator] 📊 FINAL ENHANCED STATISTICS:`);
    console.log(`[zoom-api][enhancement-orchestrator] - Total processed: ${enhancementStats.totalProcessed}`);
    console.log(`[zoom-api][enhancement-orchestrator] - Host info: ${enhancementStats.hostInfoAdded} webinars (${Math.round((enhancementStats.hostInfoAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - 🎯 ACTUAL TIMING: ${enhancementStats.actualTimingAdded} webinars (${Math.round((enhancementStats.actualTimingAdded/enhancementStats.totalProcessed)*100)}%) - CRITICAL SUCCESS METRIC`);
    console.log(`[zoom-api][enhancement-orchestrator] - Panelist data: ${enhancementStats.panelistDataAdded} webinars (${Math.round((enhancementStats.panelistDataAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - Participant data: ${enhancementStats.participantDataAdded} webinars (${Math.round((enhancementStats.participantDataAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - Recording data: ${enhancementStats.recordingDataAdded} webinars (${Math.round((enhancementStats.recordingDataAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - Recordings stored: ${enhancementStats.recordingsStored} files`);
    console.log(`[zoom-api][enhancement-orchestrator] - Total errors: ${enhancementStats.errors.length}`);
    
    if (enhancementStats.errors.length > 0) {
      console.log(`[zoom-api][enhancement-orchestrator] ⚠️ ENHANCEMENT ERRORS SUMMARY:`);
      enhancementStats.errors.forEach((error, index) => {
        console.log(`[zoom-api][enhancement-orchestrator] ${index + 1}. ${error}`);
      });
    }
    
    // Final validation check for critical timing data
    const finalTimingCount = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration).length;
    if (finalTimingCount > 0) {
      console.log(`[zoom-api][enhancement-orchestrator] ✅ 🎯 FINAL VALIDATION: ${finalTimingCount} webinars have actual timing data`);
    } else {
      console.log(`[zoom-api][enhancement-orchestrator] ⚠️ 🎯 FINAL VALIDATION: No webinars have actual timing data - this may indicate an issue`);
    }
    
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][enhancement-orchestrator] ❌ CRITICAL ERROR during enhanced comprehensive enhancement process:`, error);
    console.error(`[zoom-api][enhancement-orchestrator] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    
    // Return whatever we have enhanced so far with error summary
    console.log(`[zoom-api][enhancement-orchestrator] 🔄 Returning ${enhancedWebinars.length} partially enhanced webinars to prevent total failure`);
    
    enhancementStats.errors.push(`Critical orchestrator error: ${error.message}`);
    
    return enhancedWebinars;
  }
}
