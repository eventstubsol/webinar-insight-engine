
import { enhanceWebinarsWithHostInfo } from './hostInfoProcessor.ts';
import { enhanceWebinarsWithPanelistData } from './panellistDataProcessor.ts';
import { enhanceWebinarsWithParticipantData } from './participantDataProcessor.ts';
import { enhanceWebinarsWithRecordingData, storeRecordingData } from './recordingDataProcessor.ts';
import { enhanceWebinarsWithActualTimingData } from './actualTimingDataProcessor.ts';

/**
 * OPTIMIZED orchestrator with batch processing and circuit breaker patterns
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] 🚀 Starting OPTIMIZED enhancement process for ${webinars.length} webinars`);
  
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

  // OPTIMIZED timeout configuration with priority handling
  const STEP_TIMEOUT = 12000; // Reduced to 12 seconds per step
  const CRITICAL_STEP_TIMEOUT = 20000; // 20 seconds for critical timing step
  const MAX_RETRIES = 2; // Reduced retries to save time
  
  // Circuit breaker configuration
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 2;
  
  // Helper function for timeout-protected enhancement with circuit breaker
  async function executeEnhancementStep(
    stepName: string, 
    enhancementFunction: () => Promise<any[]>, 
    timeout: number = STEP_TIMEOUT,
    retries: number = MAX_RETRIES,
    isCritical: boolean = false
  ): Promise<any[]> {
    
    // Circuit breaker check
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && !isCritical) {
      console.warn(`[zoom-api][enhancement-orchestrator] 🔴 Circuit breaker OPEN for ${stepName}, skipping non-critical step`);
      enhancementStats.errors.push(`${stepName}: Skipped due to circuit breaker`);
      return enhancedWebinars;
    }
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[zoom-api][enhancement-orchestrator] 🔄 ${stepName} - Attempt ${attempt}/${retries}`);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${stepName} timeout after ${timeout}ms`)), timeout);
        });
        
        const result = await Promise.race([enhancementFunction(), timeoutPromise]) as any[];
        console.log(`[zoom-api][enhancement-orchestrator] ✅ ${stepName} completed successfully on attempt ${attempt}`);
        
        // Reset circuit breaker on success
        consecutiveFailures = 0;
        return result;
        
      } catch (error) {
        console.error(`[zoom-api][enhancement-orchestrator] ❌ ${stepName} failed on attempt ${attempt}:`, error.message);
        enhancementStats.errors.push(`${stepName} attempt ${attempt}: ${error.message}`);
        
        if (attempt === retries) {
          consecutiveFailures++;
          console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ ${stepName} failed after ${retries} attempts, circuit breaker count: ${consecutiveFailures}`);
          
          if (isCritical) {
            throw error; // Still throw for critical steps
          } else {
            break; // Break for non-critical steps
          }
        }
        
        // Brief delay before retry (shorter for optimization)
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
    
    return enhancedWebinars; // Fallback
  }
  
  try {
    // Step 1: CRITICAL - Actual timing data (highest priority)
    console.log(`[zoom-api][enhancement-orchestrator] ⏰ Step 1: CRITICAL - OPTIMIZED actual timing data with priority processing`);
    try {
      enhancedWebinars = await executeEnhancementStep(
        'CRITICAL Actual Timing Enhancement',
        () => enhanceWebinarsWithActualTimingData(enhancedWebinars, token),
        CRITICAL_STEP_TIMEOUT,
        3, // More retries for critical data
        true // Mark as critical
      );
      enhancementStats.actualTimingAdded = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration).length;
      console.log(`[zoom-api][enhancement-orchestrator] ✅ CRITICAL SUCCESS: Actual timing data enhanced for ${enhancementStats.actualTimingAdded}/${webinars.length} webinars`);
      
      // Log success details for critical timing data
      if (enhancementStats.actualTimingAdded > 0) {
        const timingWebinars = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration);
        console.log(`[zoom-api][enhancement-orchestrator] 📊 TIMING SUCCESS DETAILS:`);
        timingWebinars.slice(0, 3).forEach(w => {
          console.log(`[zoom-api][enhancement-orchestrator] - Webinar ${w.id}: start=${w.actual_start_time}, duration=${w.actual_duration}min`);
        });
        if (timingWebinars.length > 3) {
          console.log(`[zoom-api][enhancement-orchestrator] ... and ${timingWebinars.length - 3} more webinars with timing data`);
        }
      }
    } catch (error) {
      console.error(`[zoom-api][enhancement-orchestrator] ❌ CRITICAL FAILURE: Actual timing enhancement failed after all retries: ${error.message}`);
      enhancementStats.errors.push(`CRITICAL Actual timing (FAILED AFTER RETRIES): ${error.message}`);
    }
    
    // Step 2: Host information (important but not critical)
    console.log(`[zoom-api][enhancement-orchestrator] 📋 Step 2: OPTIMIZED host information with circuit breaker`);
    try {
      enhancedWebinars = await executeEnhancementStep(
        'Host Info Enhancement',
        () => enhanceWebinarsWithHostInfo(enhancedWebinars, token),
        STEP_TIMEOUT,
        MAX_RETRIES,
        false
      );
      enhancementStats.hostInfoAdded = enhancedWebinars.filter(w => w.host_name || w.host_email).length;
      console.log(`[zoom-api][enhancement-orchestrator] ✅ Host info: ${enhancementStats.hostInfoAdded}/${webinars.length} webinars enhanced`);
    } catch (error) {
      console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Host info enhancement failed, continuing: ${error.message}`);
    }
    
    // Step 3: Panelist data (optimization: only if circuit breaker allows)
    if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      console.log(`[zoom-api][enhancement-orchestrator] 👥 Step 3: OPTIMIZED panelist data with circuit breaker`);
      try {
        enhancedWebinars = await executeEnhancementStep(
          'Panelist Data Enhancement',
          () => enhanceWebinarsWithPanelistData(enhancedWebinars, token),
          STEP_TIMEOUT,
          MAX_RETRIES,
          false
        );
        enhancementStats.panelistDataAdded = enhancedWebinars.filter(w => w.panelists && w.panelists.length > 0).length;
        console.log(`[zoom-api][enhancement-orchestrator] ✅ Panelist data: ${enhancementStats.panelistDataAdded}/${webinars.length} webinars enhanced`);
      } catch (error) {
        console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Panelist enhancement failed, continuing: ${error.message}`);
      }
    } else {
      console.log(`[zoom-api][enhancement-orchestrator] 🔴 Skipping panelist data due to circuit breaker`);
    }
    
    // Step 4: Participant data (optimization: skip if circuit breaker is open)
    if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      console.log(`[zoom-api][enhancement-orchestrator] 🎯 Step 4: OPTIMIZED participant data with circuit breaker`);
      try {
        enhancedWebinars = await executeEnhancementStep(
          'Participant Data Enhancement',
          () => enhanceWebinarsWithParticipantData(enhancedWebinars, token),
          STEP_TIMEOUT,
          1, // Reduced retries for participant data
          false
        );
        enhancementStats.participantDataAdded = enhancedWebinars.filter(w => w.participant_data || w.registrants_count > 0).length;
        console.log(`[zoom-api][enhancement-orchestrator] ✅ Participant data: ${enhancementStats.participantDataAdded}/${webinars.length} webinars enhanced`);
      } catch (error) {
        console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Participant enhancement failed, continuing: ${error.message}`);
      }
    } else {
      console.log(`[zoom-api][enhancement-orchestrator] 🔴 Skipping participant data due to circuit breaker`);
    }
    
    // Step 5: Recording data (optimization: skip if circuit breaker is open)
    if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      console.log(`[zoom-api][enhancement-orchestrator] 🎥 Step 5: OPTIMIZED recording data with circuit breaker`);
      try {
        enhancedWebinars = await executeEnhancementStep(
          'Recording Data Enhancement',
          () => enhanceWebinarsWithRecordingData(enhancedWebinars, token),
          STEP_TIMEOUT,
          1, // Reduced retries for recording data
          false
        );
        enhancementStats.recordingDataAdded = enhancedWebinars.filter(w => w.recording_data || w.has_recordings).length;
        console.log(`[zoom-api][enhancement-orchestrator] ✅ Recording data: ${enhancementStats.recordingDataAdded}/${webinars.length} webinars enhanced`);
      } catch (error) {
        console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Recording enhancement failed, continuing: ${error.message}`);
      }
    } else {
      console.log(`[zoom-api][enhancement-orchestrator] 🔴 Skipping recording data due to circuit breaker`);
    }
    
    // Step 6: Store recording data (optimization: limited processing)
    if (supabase && userId && consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      console.log(`[zoom-api][enhancement-orchestrator] 💾 Step 6: OPTIMIZED recording storage with error handling`);
      try {
        // Only process first 5 webinars with recording data to save time
        const webinarsWithRecordings = enhancedWebinars.filter(w => w.recording_data).slice(0, 5);
        
        for (const webinar of webinarsWithRecordings) {
          try {
            const storedCount = await storeRecordingData(supabase, userId, webinar.id, webinar.recording_data);
            enhancementStats.recordingsStored += storedCount;
          } catch (error) {
            console.error(`[zoom-api][enhancement-orchestrator] ❌ Error storing recordings for webinar ${webinar.id}:`, error.message);
            enhancementStats.errors.push(`Recording storage for ${webinar.id}: ${error.message}`);
          }
        }
        console.log(`[zoom-api][enhancement-orchestrator] ✅ Database storage: ${enhancementStats.recordingsStored} recordings stored (limited processing)`);
      } catch (error) {
        console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Recording storage failed, continuing: ${error.message}`);
      }
    } else {
      console.log(`[zoom-api][enhancement-orchestrator] 🔴 Skipping recording storage due to circuit breaker or missing params`);
    }
    
    // OPTIMIZED final statistics and validation
    console.log(`[zoom-api][enhancement-orchestrator] 🎉 OPTIMIZED ENHANCEMENT COMPLETED for ${enhancedWebinars.length} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator] 📊 FINAL OPTIMIZED STATISTICS:`);
    console.log(`[zoom-api][enhancement-orchestrator] - Total processed: ${enhancementStats.totalProcessed}`);
    console.log(`[zoom-api][enhancement-orchestrator] - 🎯 ACTUAL TIMING: ${enhancementStats.actualTimingAdded} webinars (${Math.round((enhancementStats.actualTimingAdded/enhancementStats.totalProcessed)*100)}%) - CRITICAL SUCCESS METRIC`);
    console.log(`[zoom-api][enhancement-orchestrator] - Host info: ${enhancementStats.hostInfoAdded} webinars (${Math.round((enhancementStats.hostInfoAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - Panelist data: ${enhancementStats.panelistDataAdded} webinars (${Math.round((enhancementStats.panelistDataAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - Participant data: ${enhancementStats.participantDataAdded} webinars (${Math.round((enhancementStats.participantDataAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - Recording data: ${enhancementStats.recordingDataAdded} webinars (${Math.round((enhancementStats.recordingDataAdded/enhancementStats.totalProcessed)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] - Recordings stored: ${enhancementStats.recordingsStored} files`);
    console.log(`[zoom-api][enhancement-orchestrator] - Total errors: ${enhancementStats.errors.length}`);
    console.log(`[zoom-api][enhancement-orchestrator] - Circuit breaker failures: ${consecutiveFailures}`);
    
    if (enhancementStats.errors.length > 0) {
      console.log(`[zoom-api][enhancement-orchestrator] ⚠️ ENHANCEMENT ERRORS SUMMARY:`);
      enhancementStats.errors.slice(0, 5).forEach((error, index) => { // Limit error logging
        console.log(`[zoom-api][enhancement-orchestrator] ${index + 1}. ${error}`);
      });
      if (enhancementStats.errors.length > 5) {
        console.log(`[zoom-api][enhancement-orchestrator] ... and ${enhancementStats.errors.length - 5} more errors`);
      }
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
    console.error(`[zoom-api][enhancement-orchestrator] ❌ CRITICAL ERROR during optimized enhancement process:`, error);
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
