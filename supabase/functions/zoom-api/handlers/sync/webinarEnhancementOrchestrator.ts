
import { enhanceWebinarsWithHostInfo } from './hostInfoProcessor.ts';
import { enhanceWebinarsWithPanelistData } from './panellistDataProcessor.ts';
import { enhanceWebinarsWithParticipantData } from './participantDataProcessor.ts';
import { enhanceWebinarsWithRegistrantData } from './registrantDataProcessor.ts';
import { enhanceWebinarsWithRecordingData, storeRecordingData } from './recordingDataProcessor.ts';
import { batchEnhanceWebinarsWithDetailedSettings } from './webinarDetailProcessor.ts';
import { enhanceWebinarsWithComprehensiveTimingData } from './actualTimingDataProcessor.ts';
import { syncWebinarInstancesForWebinars } from './webinarInstanceSyncer.ts';

/**
 * Orchestrates the comprehensive enhancement of webinar data with aggressive timeout protection
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][enhancement-orchestrator] Starting ENHANCED enhancement process with aggressive timeout protection for ${webinars.length} webinars`);
  console.log(`[zoom-api][enhancement-orchestrator] 🚀 TIMEOUT PROTECTION: Implementing aggressive fallback strategy!`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhancement-orchestrator] No webinars to enhance`);
    return [];
  }
  
  const orchestratorStartTime = Date.now();
  const MAX_ORCHESTRATOR_TIME = 40000; // 40 seconds total for all enhancement
  
  try {
    // Process webinars in smaller batches to avoid timeouts
    const BATCH_SIZE = 20;
    const enhancedWebinars = [];
    
    for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
      // Check if we're approaching timeout
      const elapsed = Date.now() - orchestratorStartTime;
      if (elapsed > MAX_ORCHESTRATOR_TIME) {
        console.warn(`[zoom-api][enhancement-orchestrator] Orchestrator timeout protection activated, processing remaining webinars with minimal enhancement`);
        
        // Add remaining webinars with minimal processing
        const remainingWebinars = webinars.slice(i).map(w => ({
          ...w,
          registrants_count: 0,
          _enhanced_with_registrants: false,
          _orchestrator_timeout_protection: true
        }));
        enhancedWebinars.push(...remainingWebinars);
        break;
      }
      
      const batch = webinars.slice(i, i + BATCH_SIZE);
      console.log(`[zoom-api][enhancement-orchestrator] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
      
      // Step 1: Enhance with host information (fast)
      console.log(`[zoom-api][enhancement-orchestrator] Step 1/8: Enhancing batch with host information`);
      const webinarsWithHostInfo = await enhanceWebinarsWithHostInfo(batch, token);
      
      // Step 2: Enhance with panelist data (fast)
      console.log(`[zoom-api][enhancement-orchestrator] Step 2/8: Enhancing batch with panelist data`);
      const webinarsWithPanelistInfo = await enhanceWebinarsWithPanelistData(webinarsWithHostInfo, token);
      
      // Step 3: 🚀 AGGRESSIVE TIMEOUT PROTECTION: Enhance with registrant data using strict limits
      console.log(`[zoom-api][enhancement-orchestrator] Step 3/8: 🚀 AGGRESSIVE TIMEOUT PROTECTION - Enhancing batch with registrant data`);
      let webinarsWithRegistrantInfo = webinarsWithPanelistInfo;
      if (supabase && userId) {
        try {
          // Use aggressive timeout protection for registrant enhancement
          const registrantTimeout = Math.min(30000, MAX_ORCHESTRATOR_TIME - (Date.now() - orchestratorStartTime) - 5000);
          if (registrantTimeout > 10000) { // Only try if we have at least 10 seconds
            webinarsWithRegistrantInfo = await Promise.race([
              enhanceWebinarsWithRegistrantData(webinarsWithPanelistInfo, token, supabase, userId),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Registrant enhancement timeout')), registrantTimeout)
              )
            ]) as any[];
            
            console.log(`[zoom-api][enhancement-orchestrator] ✅ Registrant enhancement completed successfully`);
          } else {
            console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Skipping registrant enhancement due to time constraints (${registrantTimeout}ms remaining)`);
            webinarsWithRegistrantInfo = webinarsWithPanelistInfo.map(w => ({
              ...w,
              registrants_count: 0,
              _enhanced_with_registrants: false,
              _registrants_skip_reason: 'Skipped due to time constraints'
            }));
          }
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
      
      // Step 5: Skip recording data if we're running out of time
      console.log(`[zoom-api][enhancement-orchestrator] Step 5/8: Checking if we have time for recording data`);
      let webinarsWithRecordings = webinarsWithParticipantInfo;
      const timeRemaining = MAX_ORCHESTRATOR_TIME - (Date.now() - orchestratorStartTime);
      if (timeRemaining > 8000) { // Only if we have at least 8 seconds
        try {
          webinarsWithRecordings = await Promise.race([
            enhanceWebinarsWithRecordingData(webinarsWithParticipantInfo, token),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Recording enhancement timeout')), 5000)
            )
          ]) as any[];
        } catch (recordingError) {
          console.warn(`[zoom-api][enhancement-orchestrator] Recording enhancement skipped due to timeout`);
          webinarsWithRecordings = webinarsWithParticipantInfo;
        }
      } else {
        console.warn(`[zoom-api][enhancement-orchestrator] Skipping recording enhancement due to time constraints`);
      }
      
      // Step 6: Skip detailed settings for initial sync (can be done separately)
      console.log(`[zoom-api][enhancement-orchestrator] Step 6/8: Skipping detailed settings for faster sync`);
      const webinarsWithDetailedSettings = webinarsWithRecordings;
      
      // Step 7: Skip instance syncing if running out of time
      console.log(`[zoom-api][enhancement-orchestrator] Step 7/8: Checking if we have time for instance syncing`);
      const timeLeft = MAX_ORCHESTRATOR_TIME - (Date.now() - orchestratorStartTime);
      if (supabase && userId && timeLeft > 5000) {
        try {
          await Promise.race([
            syncWebinarInstancesForWebinars(webinarsWithDetailedSettings, token, supabase, userId),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Instance sync timeout')), 3000)
            )
          ]);
        } catch (instanceError) {
          console.warn(`[zoom-api][enhancement-orchestrator] Instance syncing skipped due to timeout`);
        }
      } else {
        console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Skipping instance syncing - insufficient time or missing params`);
      }
      
      // Step 8: Skip timing enhancement if running out of time
      console.log(`[zoom-api][enhancement-orchestrator] Step 8/8: Checking if we have time for timing data`);
      let batchEnhancedWebinars = webinarsWithDetailedSettings;
      
      const finalTimeRemaining = MAX_ORCHESTRATOR_TIME - (Date.now() - orchestratorStartTime);
      if (supabase && userId && finalTimeRemaining > 3000) {
        try {
          batchEnhancedWebinars = await Promise.race([
            enhanceWebinarsWithComprehensiveTimingData(
              webinarsWithDetailedSettings, 
              token, 
              supabase, 
              userId
            ),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timing enhancement timeout')), 2000)
            )
          ]) as any[];
        } catch (timingError) {
          console.warn(`[zoom-api][enhancement-orchestrator] Timing enhancement skipped due to timeout`);
          batchEnhancedWebinars = webinarsWithDetailedSettings;
        }
      } else {
        console.warn(`[zoom-api][enhancement-orchestrator] ⚠️ Skipping timing enhancement - insufficient time`);
      }
      
      // Step 9: Skip recording storage if running out of time
      const veryFinalTimeRemaining = MAX_ORCHESTRATOR_TIME - (Date.now() - orchestratorStartTime);
      if (supabase && userId && veryFinalTimeRemaining > 2000) {
        console.log(`[zoom-api][enhancement-orchestrator] Step 9: Storing recording data for batch`);
        let totalRecordingsStored = 0;
        
        for (const webinar of batchEnhancedWebinars) {
          if (webinar.recording_data && veryFinalTimeRemaining > 1000) {
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
    
    const totalElapsed = Date.now() - orchestratorStartTime;
    
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
      
      // 🚀 AGGRESSIVE TIMEOUT PROTECTION: Registrant enhancement statistics
      with_registrant_data: enhancedWebinars.filter(w => w._enhanced_with_registrants === true).length,
      total_registrants: enhancedWebinars.reduce((sum, w) => sum + (w.registrants_count || 0), 0),
      registrants_stored: enhancedWebinars.reduce((sum, w) => sum + (w._registrants_stored_count || 0), 0),
      failed_registrant_enhancement: enhancedWebinars.filter(w => w._enhanced_with_registrants === false).length,
      batch_failed_registrants: enhancedWebinars.filter(w => w._batch_failed === true).length,
      timeout_protected_webinars: enhancedWebinars.filter(w => w._timeout_protection === true).length,
      volume_limited_webinars: enhancedWebinars.filter(w => w._volume_limited === true).length,
      orchestrator_timeout_protected: enhancedWebinars.filter(w => w._orchestrator_timeout_protection === true).length,
      
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
      with_passwords: enhancedWebinars.filter(w => w.password).length,
      
      // Performance metrics
      total_processing_time: totalElapsed
    };
    
    console.log(`[zoom-api][enhancement-orchestrator] 🎉 AGGRESSIVE TIMEOUT PROTECTION COMPLETED SUCCESSFULLY!`);
    console.log(`[zoom-api][enhancement-orchestrator] ═══════════════════════════════════════════════════════`);
    console.log(`[zoom-api][enhancement-orchestrator] 📊 AGGRESSIVE TIMEOUT PROTECTION STATISTICS:`);
    console.log(`[zoom-api][enhancement-orchestrator] ═══════════════════════════════════════════════════════`);
    console.log(`[zoom-api][enhancement-orchestrator] ⏱️  Total processing time: ${totalElapsed}ms (max: ${MAX_ORCHESTRATOR_TIME}ms)`);
    console.log(`[zoom-api][enhancement-orchestrator] 📈 Overview:`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Total webinars: ${enhancementStats.total_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Completed webinars: ${enhancementStats.completed_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Upcoming webinars: ${enhancementStats.upcoming_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator] `);
    console.log(`[zoom-api][enhancement-orchestrator] 👥 REGISTRANT DATA (AGGRESSIVE TIMEOUT PROTECTION):`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Webinars with registrant data: ${enhancementStats.with_registrant_data}/${enhancementStats.total_webinars} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Total registrants found: ${enhancementStats.total_registrants}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Registrants stored in DB: ${enhancementStats.registrants_stored}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Failed registrant enhancements: ${enhancementStats.failed_registrant_enhancement}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Timeout protected webinars: ${enhancementStats.timeout_protected_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Volume limited webinars: ${enhancementStats.volume_limited_webinars}`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Orchestrator timeout protected: ${enhancementStats.orchestrator_timeout_protected}`);
    console.log(`[zoom-api][enhancement-orchestrator] `);
    console.log(`[zoom-api][enhancement-orchestrator] 🕒 TIMING DATA:`);
    console.log(`[zoom-api][enhancement-orchestrator]   • With actual timing: ${enhancementStats.with_actual_timing}/${enhancementStats.total_webinars} webinars`);
    console.log(`[zoom-api][enhancement-orchestrator]   • Enhanced from instances: ${enhancementStats.enhanced_from_instances}`);
    console.log(`[zoom-api][enhancement-orchestrator] ═══════════════════════════════════════════════════════`);
    
    console.log(`[zoom-api][enhancement-orchestrator] 🚀 AGGRESSIVE TIMEOUT PROTECTION COMPLETE: Successfully processed webinars within time limits`);
    
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][enhancement-orchestrator] ❌ Error during AGGRESSIVE TIMEOUT PROTECTION process:`, error);
    throw error;
  }
}
