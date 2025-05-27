
import { enhanceWebinarsWithHostInfo } from './hostInfoProcessor.ts';
import { enhanceWebinarsWithPanelistData } from './panellistDataProcessor.ts';
import { enhanceWebinarsWithParticipantData } from './participantDataProcessor.ts';
import { enhanceWebinarsWithRecordingData, storeRecordingData } from './recordingDataProcessor.ts';
import { batchEnhanceWebinarsWithDetailedSettings } from './webinarDetailProcessor.ts';
import { enhanceWebinarsWithComprehensiveTimingData } from './actualTimingDataProcessor.ts';

/**
 * Orchestrates the comprehensive enhancement of webinar data with all available information sources
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] Starting COMPREHENSIVE enhancement process for ${webinars.length} webinars`);
  console.log(`[zoom-api][enhancement-orchestrator] 🚀 This will include: Host Info → Panelists → Participants → Recordings → Detailed Settings → Actual Timing Data`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhancement-orchestrator] No webinars to enhance`);
    return [];
  }
  
  try {
    // Process webinars in smaller batches to avoid timeouts
    const BATCH_SIZE = 20; // Process 20 webinars at a time
    const enhancedWebinars = [];
    
    for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
      const batch = webinars.slice(i, i + BATCH_SIZE);
      console.log(`[zoom-api][enhancement-orchestrator] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
      
      // Step 1: Enhance with host information
      console.log(`[zoom-api][enhancement-orchestrator] Step 1/6: Enhancing batch with host information`);
      const webinarsWithHostInfo = await enhanceWebinarsWithHostInfo(batch, token);
      
      // Step 2: Enhance with panelist data (only for webinars that need it)
      console.log(`[zoom-api][enhancement-orchestrator] Step 2/6: Enhancing batch with panelist data`);
      const webinarsWithPanelistInfo = await enhanceWebinarsWithPanelistData(webinarsWithHostInfo, token);
      
      // Step 3: Skip participant data for initial sync (can be done separately)
      console.log(`[zoom-api][enhancement-orchestrator] Step 3/6: Skipping participant data for faster sync`);
      const webinarsWithParticipantInfo = webinarsWithPanelistInfo; // Skip for now
      
      // Step 4: Enhance with recording data for completed webinars
      console.log(`[zoom-api][enhancement-orchestrator] Step 4/6: Enhancing batch with recording data`);
      const webinarsWithRecordings = await enhanceWebinarsWithRecordingData(webinarsWithParticipantInfo, token);
      
      // Step 5: Skip detailed settings for initial sync (can be done separately)
      console.log(`[zoom-api][enhancement-orchestrator] Step 5/6: Skipping detailed settings for faster sync`);
      const webinarsWithDetailedSettings = webinarsWithRecordings; // Skip for now
      
      // Step 6: Enhance with actual timing data
      console.log(`[zoom-api][enhancement-orchestrator] Step 6/6: Enhancing batch with ACTUAL TIMING DATA`);
      let batchEnhancedWebinars = webinarsWithDetailedSettings;
      
      if (supabase && userId) {
        batchEnhancedWebinars = await enhanceWebinarsWithComprehensiveTimingData(
          webinarsWithDetailedSettings, 
          token, 
          supabase, 
          userId
        );
      } else {
        console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Skipping timing enhancement - supabase or userId not provided`);
      }
      
      // Step 7: Store recording data in database if supabase client is provided
      if (supabase && userId) {
        console.log(`[zoom-api][enhancement-orchestrator] Step 7: Storing recording data for batch`);
        let totalRecordingsStored = 0;
        
        for (const webinar of batchEnhancedWebinars) {
          if (webinar.recording_data) {
            try {
              const storedCount = await storeRecordingData(supabase, userId, webinar.id, webinar.recording_data);
              totalRecordingsStored += storedCount;
            } catch (error) {
              console.error(`[zoom-api][enhancement-orchestrator] Error storing recordings for webinar ${webinar.id}:`, error);
            }
          }
        }
        
        console.log(`[zoom-api][enhancement-orchestrator] Stored ${totalRecordingsStored} recordings in database for batch`);
      }
      
      // Add batch results to the final array
      enhancedWebinars.push(...batchEnhancedWebinars);
    }
    
    // Calculate comprehensive enhancement statistics
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
      
      // 🔥 NEW: Actual timing enhancement
      with_actual_timing: enhancedWebinars.filter(w => w.actual_start_time).length,
      with_actual_duration: enhancedWebinars.filter(w => w.actual_duration).length,
      enhanced_from_instances: enhancedWebinars.filter(w => w._enhanced_with_timing === true).length,
      enhanced_from_past_api: enhancedWebinars.filter(w => w._enhanced_with_past_api === true).length,
      
      // URL and configuration data
      with_join_urls: enhancedWebinars.filter(w => w.join_url).length,
      with_registration_urls: enhancedWebinars.filter(w => w.registration_url).length,
      with_passwords: enhancedWebinars.filter(w => w.password).length
    };
    
    console.log(`[zoom-api][enhancement-orchestrator] 🎉 COMPREHENSIVE ENHANCEMENT COMPLETED SUCCESSFULLY!`);
    console.log(`[zoom-api][enhancement-orchestrator] ═══════════════════════════════════════════════════════`);
    console.log(`[zoom-api][enhancement-orchestrator] 📊 FINAL ENHANCEMENT STATISTICS:`);
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
    console.log(`[zoom-api][enhancement-orchestrator] 🕒 ACTUAL TIMING DATA (CRITICAL):`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With actual timing: ${enhancementStats.with_actual_timing}/${enhancementStats.completed_webinars} completed webinars (${enhancementStats.completed_webinars > 0 ? Math.round((enhancementStats.with_actual_timing/enhancementStats.completed_webinars)*100) : 0}%)`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With actual duration: ${enhancementStats.with_actual_duration}/${enhancementStats.completed_webinars} completed webinars (${enhancementStats.completed_webinars > 0 ? Math.round((enhancementStats.with_actual_duration/enhancementStats.completed_webinars)*100) : 0}%)`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Enhanced from instances: ${enhancementStats.enhanced_from_instances}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Enhanced from past API: ${enhancementStats.enhanced_from_past_api}`);
    console.log(`[zoom-api][enhancement-orchestrator] ═══════════════════════════════════════════════════════`);
    
    if (enhancementStats.failed_detail_enhancement > 0) {
      console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Failed to enhance ${enhancementStats.failed_detail_enhancement} webinars with detailed settings`);
    }
    
    if (enhancementStats.completed_webinars > enhancementStats.with_actual_timing) {
      const missingTiming = enhancementStats.completed_webinars - enhancementStats.with_actual_timing;
      console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ ${missingTiming} completed webinars still missing actual timing data`);
    }
    
    if (enhancementStats.completed_webinars > enhancementStats.with_actual_duration) {
      const missingDuration = enhancementStats.completed_webinars - enhancementStats.with_actual_duration;
      console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ ${missingDuration} completed webinars still missing actual duration data`);
    }
    
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][enhancement-orchestrator] ❌ Error during COMPREHENSIVE enhancement process:`, error);
    throw error;
  }
}
