
import { enhanceWebinarsWithHostInfo } from './hostInfoProcessor.ts';
import { enhanceWebinarsWithPanelistData } from './panellistDataProcessor.ts';
import { enhanceWebinarsWithParticipantData } from './participantDataProcessor.ts';
import { enhanceWebinarsWithRegistrantData } from './registrantDataProcessor.ts';
import { enhanceWebinarsWithRecordingData, storeRecordingData } from './recordingDataProcessor.ts';
import { batchEnhanceWebinarsWithDetailedSettings } from './webinarDetailProcessor.ts';
import { enhanceWebinarsWithComprehensiveTimingData } from './actualTimingDataProcessor.ts';
import { syncWebinarInstancesForWebinars } from './webinarInstanceSyncer.ts';

/**
 * Orchestrates the comprehensive enhancement of webinar data with all available information sources
 * ENHANCED: Now includes batch-processed registrant data syncing with graceful degradation
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] Starting ENHANCED enhancement process for ${webinars.length} webinars`);
  console.log(`[zoom-api][enhancement-orchestrator] 🎯 OPTIMIZED: Now includes batch-processed registrant data syncing!`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhancement-orchestrator] No webinars to enhance`);
    return [];
  }
  
  try {
    // Process webinars in smaller batches to avoid timeouts
    const BATCH_SIZE = 20;
    const enhancedWebinars = [];
    
    for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
      const batch = webinars.slice(i, i + BATCH_SIZE);
      console.log(`[zoom-api][enhancement-orchestrator] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
      
      // Step 1: Enhance with host information
      console.log(`[zoom-api][enhancement-orchestrator] Step 1/8: Enhancing batch with host information`);
      const webinarsWithHostInfo = await enhanceWebinarsWithHostInfo(batch, token);
      
      // Step 2: Enhance with panelist data
      console.log(`[zoom-api][enhancement-orchestrator] Step 2/8: Enhancing batch with panelist data`);
      const webinarsWithPanelistInfo = await enhanceWebinarsWithPanelistData(webinarsWithHostInfo, token);
      
      // Step 3: 🔥 OPTIMIZED: Enhance with registrant data using batch processing
      console.log(`[zoom-api][enhancement-orchestrator] Step 3/8: 🚀 OPTIMIZED - Enhancing batch with registrant data (batch processed)`);
      let webinarsWithRegistrantInfo = webinarsWithPanelistInfo;
      if (supabase && userId) {
        try {
          // Use timeout protection for registrant enhancement
          webinarsWithRegistrantInfo = await Promise.race([
            enhanceWebinarsWithRegistrantData(webinarsWithPanelistInfo, token, supabase, userId),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Registrant enhancement timeout')), 30000) // 30 second timeout
            )
          ]) as any[];
          
          console.log(`[zoom-api][enhancement-orchestrator] ✅ Registrant enhancement completed successfully`);
        } catch (registrantError) {
          console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Registrant enhancement failed, continuing without registrant data:`, registrantError);
          // Continue with original webinars if registrant enhancement fails
          webinarsWithRegistrantInfo = webinarsWithPanelistInfo.map(w => ({
            ...w,
            registrants_count: 0,
            _enhanced_with_registrants: false,
            _registrants_error: registrantError.message || 'Enhancement timeout'
          }));
        }
      } else {
        console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Skipping registrant syncing - supabase or userId not provided`);
        webinarsWithRegistrantInfo = webinarsWithPanelistInfo.map(w => ({
          ...w,
          registrants_count: 0,
          _enhanced_with_registrants: false,
          _registrants_skip_reason: 'Missing supabase client or userId'
        }));
      }
      
      // Step 4: Skip participant data for initial sync (can be done separately)
      console.log(`[zoom-api][enhancement-orchestrator] Step 4/8: Skipping participant data for faster sync`);
      const webinarsWithParticipantInfo = webinarsWithRegistrantInfo;
      
      // Step 5: Enhance with recording data for completed webinars
      console.log(`[zoom-api][enhancement-orchestrator] Step 5/8: Enhancing batch with recording data`);
      const webinarsWithRecordings = await enhanceWebinarsWithRecordingData(webinarsWithParticipantInfo, token);
      
      // Step 6: Skip detailed settings for initial sync (can be done separately)
      console.log(`[zoom-api][enhancement-orchestrator] Step 6/8: Skipping detailed settings for faster sync`);
      const webinarsWithDetailedSettings = webinarsWithRecordings;
      
      // Step 7: Sync webinar instances with correct API endpoints
      console.log(`[zoom-api][enhancement-orchestrator] Step 7/8: Syncing instances with correct API usage`);
      if (supabase && userId) {
        await syncWebinarInstancesForWebinars(webinarsWithDetailedSettings, token, supabase, userId);
      } else {
        console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Skipping instance syncing - supabase or userId not provided`);
      }
      
      // Step 8: Enhance with actual timing data from instances
      console.log(`[zoom-api][enhancement-orchestrator] Step 8/8: Enhancing batch with timing data from instances`);
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
      
      // Step 9: Store recording data in database if supabase client is provided
      if (supabase && userId) {
        console.log(`[zoom-api][enhancement-orchestrator] Step 9: Storing recording data for batch`);
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
    
    // Calculate comprehensive enhancement statistics including registrants
    const enhancementStats = {
      total_webinars: enhancedWebinars.length,
      completed_webinars: enhancedWebinars.filter(w => w.status === 'ended').length,
      upcoming_webinars: enhancedWebinars.filter(w => w.status !== 'ended').length,
      single_occurrence: enhancedWebinars.filter(w => w.type === 5).length,
      recurring_webinars: enhancedWebinars.filter(w => w.type === 6 || w.type === 9).length,
      
      // Host enhancement
      with_host_info: enhancedWebinars.filter(w => w.host_name || w.host_info?.display_name).length,
      
      // Panelist enhancement  
      with_panelist_data: enhancedWebinars.filter(w => w.panelists && w.panelists.length > 0).length,
      
      // 🔥 OPTIMIZED: Registrant enhancement statistics with batch processing
      with_registrant_data: enhancedWebinars.filter(w => w._enhanced_with_registrants === true).length,
      total_registrants: enhancedWebinars.reduce((sum, w) => sum + (w.registrants_count || 0), 0),
      registrants_stored: enhancedWebinars.reduce((sum, w) => sum + (w._registrants_stored_count || 0), 0),
      failed_registrant_enhancement: enhancedWebinars.filter(w => w._enhanced_with_registrants === false).length,
      batch_failed_registrants: enhancedWebinars.filter(w => w._batch_failed === true).length,
      
      // Participant enhancement
      with_participant_data: enhancedWebinars.filter(w => w.registrants_count > 0 || w.participants_count > 0).length,
      
      // Recording enhancement
      with_recording_data: enhancedWebinars.filter(w => w.has_recordings).length,
      
      // Detailed settings enhancement
      with_detailed_settings: enhancedWebinars.filter(w => w._enhanced_with_details === true).length,
      failed_detail_enhancement: enhancedWebinars.filter(w => w._enhanced_with_details === false).length,
      
      // Timing enhancement from instances
      with_actual_timing: enhancedWebinars.filter(w => w.actual_start_time).length,
      with_actual_duration: enhancedWebinars.filter(w => w.actual_duration).length,
      enhanced_from_instances: enhancedWebinars.filter(w => w._enhanced_with_timing === true).length,
      enhanced_from_past_api: enhancedWebinars.filter(w => w._enhanced_with_past_api === true).length,
      
      // URL and configuration data
      with_join_urls: enhancedWebinars.filter(w => w.join_url).length,
      with_registration_urls: enhancedWebinars.filter(w => w.registration_url).length,
      with_passwords: enhancedWebinars.filter(w => w.password).length
    };
    
    console.log(`[zoom-api][enhancement-orchestrator] 🎉 OPTIMIZED REGISTRANT SYNC COMPLETED SUCCESSFULLY!`);
    console.log(`[zoom-api][enhancement-orchestrator] ═══════════════════════════════════════════════════════`);
    console.log(`[zoom-api][enhancement-orchestrator] 📊 OPTIMIZED BATCH-PROCESSED REGISTRANT STATISTICS:`);
    console.log(`[zoom-api][enhancement-orchestrator] ═══════════════════════════════════════════════════════`);
    console.log(`[zoom-api][enhancement-orchestrator] 📈 Overview:`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Total webinars: ${enhancementStats.total_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Completed webinars: ${enhancementStats.completed_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Upcoming webinars: ${enhancementStats.upcoming_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator] `);
    console.log(`[zoom-api][enhancement-orchestrator] 👥 REGISTRANT DATA (BATCH PROCESSED):`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Webinars with registrant data: ${enhancementStats.with_registrant_data}/${enhancementStats.total_webinars} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Total registrants found: ${enhancementStats.total_registrants}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Registrants stored in DB: ${enhancementStats.registrants_stored}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Failed registrant enhancements: ${enhancementStats.failed_registrant_enhancement}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Batch failures: ${enhancementStats.batch_failed_registrants}`);
    console.log(`[zoom-api][enhancement-orchestrator] `);
    console.log(`[zoom-api][enhancement-orchestrator] 🕒 TIMING DATA:`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With actual timing: ${enhancementStats.with_actual_timing}/${enhancementStats.total_webinars} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Enhanced from instances: ${enhancementStats.enhanced_from_instances}`);
    console.log(`[zoom-api][enhancement-orchestrator] ═══════════════════════════════════════════════════════`);
    
    console.log(`[zoom-api][enhancement-orchestrator] 🔧 OPTIMIZED REGISTRANT SYNC INTEGRATION COMPLETE: Now using batch processing with graceful degradation`);
    
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][enhancement-orchestrator] ❌ Error during OPTIMIZED registrant sync process:`, error);
    throw error;
  }
}
