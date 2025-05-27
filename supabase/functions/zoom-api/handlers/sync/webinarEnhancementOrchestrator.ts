
import { enhanceWebinarsWithHostInfo } from './hostInfoProcessor.ts';
import { enhanceWebinarsWithPanelistData } from './panellistDataProcessor.ts';
import { enhanceWebinarsWithParticipantData } from './participantDataProcessor.ts';
import { enhanceWebinarsWithRecordingData, storeRecordingData } from './recordingDataProcessor.ts';
import { batchEnhanceWebinarsWithDetailedSettings } from './webinarDetailProcessor.ts';
import { enhanceWebinarsWithComprehensiveTimingData } from './actualTimingDataProcessor.ts';

/**
 * Enhanced orchestrator with two-phase strategy:
 * Phase 1: Essential enhancements (fast)
 * Phase 2: Timing enhancements (optional, can be done separately)
 */

/**
 * Phase 1: Essential enhancements only (excludes timing data)
 * This is fast and prevents timeouts during main sync
 */
export async function enhanceWebinarsWithEssentialData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] Starting PHASE 1: Essential enhancement process for ${webinars.length} webinars`);
  console.log(`[zoom-api][enhancement-orchestrator] 🚀 Phase 1 includes: Host Info → Panelists → Participants → Recordings → Detailed Settings`);
  console.log(`[zoom-api][enhancement-orchestrator] ⏰ Phase 2 (Timing Data) will be processed separately to prevent timeouts`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhancement-orchestrator] No webinars to enhance`);
    return [];
  }
  
  try {
    // Step 1: Enhance with host information
    console.log(`[zoom-api][enhancement-orchestrator] Step 1/5: Enhancing with host information`);
    const webinarsWithHostInfo = await enhanceWebinarsWithHostInfo(webinars, token);
    
    // Step 2: Enhance with panelist data
    console.log(`[zoom-api][enhancement-orchestrator] Step 2/5: Enhancing with panelist data`);
    const webinarsWithPanelistInfo = await enhanceWebinarsWithPanelistData(webinarsWithHostInfo, token);
    
    // Step 3: Enhance with participant data for completed webinars
    console.log(`[zoom-api][enhancement-orchestrator] Step 3/5: Enhancing with participant data`);
    const webinarsWithParticipantInfo = await enhanceWebinarsWithParticipantData(webinarsWithPanelistInfo, token);
    
    // Step 4: Enhance with recording data for completed webinars
    console.log(`[zoom-api][enhancement-orchestrator] Step 4/5: Enhancing with recording data`);
    const webinarsWithRecordings = await enhanceWebinarsWithRecordingData(webinarsWithParticipantInfo, token);
    
    // Step 5: Enhance with detailed settings data
    console.log(`[zoom-api][enhancement-orchestrator] Step 5/5: Enhancing with detailed settings`);
    const enhancedWebinars = await batchEnhanceWebinarsWithDetailedSettings(webinarsWithRecordings, token, 5);
    
    // Store recording data in database if supabase client is provided
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
    
    // Calculate essential enhancement statistics
    const enhancementStats = {
      total_webinars: enhancedWebinars.length,
      completed_webinars: enhancedWebinars.filter(w => w.status === 'ended').length,
      upcoming_webinars: enhancedWebinars.filter(w => w.status !== 'ended').length,
      
      // Host enhancement
      with_host_info: enhancedWebinars.filter(w => w.host_name || w.host_info?.display_name).length,
      
      // Panelist enhancement  
      with_panelist_data: enhancedWebinars.filter(w => w.panelists && w.panelists.length > 0).length,
      
      // Participant enhancement
      with_participant_data: enhancedWebinars.filter(w => w.registrants_count > 0 || w.participants_count > 0).length,
      
      // Recording enhancement
      with_recording_data: enhancedWebinars.filter(w => w.has_recordings).length,
      
      // Detailed settings enhancement
      with_detailed_settings: enhancedWebinars.filter(w => w._enhanced_with_details === true).length,
      failed_detail_enhancement: enhancedWebinars.filter(w => w._enhanced_with_details === false).length,
      
      // URL and configuration data
      with_join_urls: enhancedWebinars.filter(w => w.join_url).length,
      with_registration_urls: enhancedWebinars.filter(w => w.registration_url).length,
      with_passwords: enhancedWebinars.filter(w => w.password).length
    };
    
    console.log(`[zoom-api][enhancement-orchestrator] 🎉 PHASE 1 ENHANCEMENT COMPLETED SUCCESSFULLY!`);
    console.log(`[zoom-api][enhancement-orchestrator] ═══════════════════════════════════════════════════════`);
    console.log(`[zoom-api][enhancement-orchestrator] 📊 PHASE 1 ENHANCEMENT STATISTICS:`);
    console.log(`[zoom-api][enhancement-orchestrator] ═══════════════════════════════════════════════════════`);
    console.log(`[zoom-api][enhancement-orchestrator] 📈 Overview:`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Total webinars: ${enhancementStats.total_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Completed webinars: ${enhancementStats.completed_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Upcoming webinars: ${enhancementStats.upcoming_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator] `);
    console.log(`[zoom-api][enhancement-orchestrator] 👥 Host & People Data:`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With host info: ${enhancementStats.with_host_info}/${enhancementStats.total_webinars} (${Math.round((enhancementStats.with_host_info/enhancementStats.total_webinars)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With panelist data: ${enhancementStats.with_panelist_data}/${enhancementStats.total_webinars} (${Math.round((enhancementStats.with_panelist_data/enhancementStats.total_webinars)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With participant data: ${enhancementStats.with_participant_data}/${enhancementStats.total_webinars} (${Math.round((enhancementStats.with_participant_data/enhancementStats.total_webinars)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] `);
    console.log(`[zoom-api][enhancement-orchestrator] 🎥 Media & Content:`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With recording data: ${enhancementStats.with_recording_data}/${enhancementStats.total_webinars} (${Math.round((enhancementStats.with_recording_data/enhancementStats.total_webinars)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] `);
    console.log(`[zoom-api][enhancement-orchestrator] ⚙️ Settings & Configuration:`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With detailed settings: ${enhancementStats.with_detailed_settings}/${enhancementStats.total_webinars} (${Math.round((enhancementStats.with_detailed_settings/enhancementStats.total_webinars)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With join URLs: ${enhancementStats.with_join_urls}/${enhancementStats.total_webinars} (${Math.round((enhancementStats.with_join_urls/enhancementStats.total_webinars)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With registration URLs: ${enhancementStats.with_registration_urls}/${enhancementStats.total_webinars} (${Math.round((enhancementStats.with_registration_urls/enhancementStats.total_webinars)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With passwords: ${enhancementStats.with_passwords}/${enhancementStats.total_webinars} (${Math.round((enhancementStats.with_passwords/enhancementStats.total_webinars)*100)}%)`);
    console.log(`[zoom-api][enhancement-orchestrator] `);
    console.log(`[zoom-api][enhancement-orchestrator] ⏰ TIMING DATA:`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Timing enhancement SKIPPED in Phase 1 to prevent timeouts`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Use 'Update Participant Data' or dedicated timing sync for Phase 2`);
    console.log(`[zoom-api][enhancement-orchestrator] ═══════════════════════════════════════════════════════`);
    
    if (enhancementStats.failed_detail_enhancement > 0) {
      console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Failed to enhance ${enhancementStats.failed_detail_enhancement} webinars with detailed settings`);
    }
    
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][enhancement-orchestrator] ❌ Error during PHASE 1 enhancement process:`, error);
    throw error;
  }
}

/**
 * Phase 2: Timing enhancement only (can be run separately)
 * This is the potentially slow operation that caused timeouts
 */
export async function enhanceWebinarsWithTimingDataOnly(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] Starting PHASE 2: Timing enhancement process for ${webinars.length} webinars`);
  console.log(`[zoom-api][enhancement-orchestrator] 🕒 This phase focuses ONLY on actual timing data enhancement`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhancement-orchestrator] No webinars to enhance with timing data`);
    return [];
  }
  
  try {
    // Only do timing enhancement
    const enhancedWebinars = await enhanceWebinarsWithComprehensiveTimingData(
      webinars, 
      token, 
      supabase, 
      userId
    );
    
    const timingStats = {
      total_webinars: enhancedWebinars.length,
      completed_webinars: enhancedWebinars.filter(w => w.status === 'ended').length,
      with_actual_timing: enhancedWebinars.filter(w => w.actual_start_time).length,
      enhanced_successfully: enhancedWebinars.filter(w => w._enhanced_with_timing === true).length,
    };
    
    console.log(`[zoom-api][enhancement-orchestrator] 🎉 PHASE 2 TIMING ENHANCEMENT COMPLETED!`);
    console.log(`[zoom-api][enhancement-orchestrator] 📊 Timing Statistics:`);
    console.log(`[zoom-api][enhancement-orchestrator] - Total webinars: ${timingStats.total_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator] - Completed webinars: ${timingStats.completed_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator] - With actual timing: ${timingStats.with_actual_timing}`);
    console.log(`[zoom-api][enhancement-orchestrator] - Successfully enhanced: ${timingStats.enhanced_successfully}`);
    
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][enhancement-orchestrator] ❌ Error during PHASE 2 timing enhancement:`, error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility - now uses Phase 1 only
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] Using legacy enhanceWebinarsWithAllData - defaulting to Phase 1 only`);
  return await enhanceWebinarsWithEssentialData(webinars, token, supabase, userId);
}
