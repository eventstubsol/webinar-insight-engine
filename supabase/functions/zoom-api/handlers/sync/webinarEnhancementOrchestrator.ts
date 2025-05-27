
/**
 * Minimal sync orchestrator - fetches only basic webinar data to prevent timeouts
 * Enhancement steps are skipped to ensure fast, reliable sync under 10 seconds
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string, supabase?: any, userId?: string) {
  console.log(`[zoom-api][minimal-sync] Starting MINIMAL sync process for ${webinars.length} webinars`);
  console.log(`[zoom-api][minimal-sync] 🚀 This will return basic webinar data only (no enhancements)`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][minimal-sync] No webinars to process`);
    return [];
  }
  
  try {
    // Return webinars with minimal processing - just ensure basic fields are present
    const minimalWebinars = webinars.map(webinar => {
      return {
        ...webinar,
        // Ensure required fields have defaults
        host_name: webinar.host_name || webinar.host_email || 'Unknown Host',
        panelists: [], // Empty array instead of undefined
        registrants_count: 0,
        participants_count: 0,
        has_recordings: false,
        _enhanced_with_details: false, // Mark as not enhanced
        _minimal_sync: true, // Flag to indicate this was a minimal sync
        last_synced_at: new Date().toISOString()
      };
    });
    
    // Calculate minimal sync statistics
    const syncStats = {
      total_webinars: minimalWebinars.length,
      completed_webinars: minimalWebinars.filter(w => w.status === 'ended').length,
      upcoming_webinars: minimalWebinars.filter(w => w.status !== 'ended').length,
      
      // All minimal sync stats
      with_host_info: minimalWebinars.filter(w => w.host_name && w.host_name !== 'Unknown Host').length,
      with_panelist_data: 0, // No panelist data in minimal sync
      with_participant_data: 0, // No participant data in minimal sync
      with_recording_data: 0, // No recording data in minimal sync
      with_detailed_settings: 0, // No detailed settings in minimal sync
      failed_detail_enhancement: 0,
      
      // URL and configuration data from basic API
      with_join_urls: minimalWebinars.filter(w => w.join_url).length,
      with_registration_urls: minimalWebinars.filter(w => w.registration_url).length,
      with_passwords: minimalWebinars.filter(w => w.password).length
    };
    
    console.log(`[zoom-api][minimal-sync] 🎉 MINIMAL SYNC COMPLETED SUCCESSFULLY!`);
    console.log(`[zoom-api][minimal-sync] ═══════════════════════════════════════════════════════`);
    console.log(`[zoom-api][minimal-sync] 📊 MINIMAL SYNC STATISTICS:`);
    console.log(`[zoom-api][minimal-sync] ═══════════════════════════════════════════════════════`);
    console.log(`[zoom-api][minimal-sync] 📈 Overview:`);
    console.log(`[zoom-api][minimal-sync]   • Total webinars: ${syncStats.total_webinars}`);
    console.log(`[zoom-api][minimal-sync]   • Completed webinars: ${syncStats.completed_webinars}`);
    console.log(`[zoom-api][minimal-sync]   • Upcoming webinars: ${syncStats.upcoming_webinars}`);
    console.log(`[zoom-api][minimal-sync] `);
    console.log(`[zoom-api][minimal-sync] 🔧 Basic Configuration:`);
    console.log(`[zoom-api][minimal-sync]   • With join URLs: ${syncStats.with_join_urls}/${syncStats.total_webinars} (${Math.round((syncStats.with_join_urls/syncStats.total_webinars)*100)}%)`);
    console.log(`[zoom-api][minimal-sync]   • With registration URLs: ${syncStats.with_registration_urls}/${syncStats.total_webinars} (${Math.round((syncStats.with_registration_urls/syncStats.total_webinars)*100)}%)`);
    console.log(`[zoom-api][minimal-sync]   • With passwords: ${syncStats.with_passwords}/${syncStats.total_webinars} (${Math.round((syncStats.with_passwords/syncStats.total_webinars)*100)}%)`);
    console.log(`[zoom-api][minimal-sync] `);
    console.log(`[zoom-api][minimal-sync] ⚡ ENHANCEMENT STATUS:`);
    console.log(`[zoom-api][minimal-sync]   • All enhancement steps SKIPPED for performance`);
    console.log(`[zoom-api][minimal-sync]   • Host info: Basic data only`);
    console.log(`[zoom-api][minimal-sync]   • Panelist data: Not loaded (0 webinars)`);
    console.log(`[zoom-api][minimal-sync]   • Participant data: Not loaded (0 webinars)`);
    console.log(`[zoom-api][minimal-sync]   • Recording data: Not loaded (0 webinars)`);
    console.log(`[zoom-api][minimal-sync]   • Detailed settings: Not loaded (0 webinars)`);
    console.log(`[zoom-api][minimal-sync]   • Timing data: Scheduled times only`);
    console.log(`[zoom-api][minimal-sync] `);
    console.log(`[zoom-api][minimal-sync] 💡 NEXT STEPS:`);
    console.log(`[zoom-api][minimal-sync]   • Use individual enhancement features to load detailed data`);
    console.log(`[zoom-api][minimal-sync]   • Enhancement can be triggered per webinar as needed`);
    console.log(`[zoom-api][minimal-sync]   • This approach prevents timeouts and provides fast sync`);
    console.log(`[zoom-api][minimal-sync] ═══════════════════════════════════════════════════════`);
    
    return minimalWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][minimal-sync] ❌ Error during minimal sync process:`, error);
    throw error;
  }
}
