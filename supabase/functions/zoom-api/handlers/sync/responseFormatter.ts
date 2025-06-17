
import { corsHeaders } from '../../cors.ts';

export interface SyncResults {
  newWebinars: number;
  updatedWebinars: number;
  preservedWebinars: number;
}

export interface StatsResult {
  totalWebinarsInDB: number;
  oldestPreservedDate: string | null;
  newestWebinarDate: string | null;
  dataRange: { oldest: string | null; newest: string | null };
}

/**
 * Formats the final response for the list webinars API with aggressive timeout protection metrics
 */
export function formatListWebinarsResponse(
  finalWebinarsList: any[],
  allWebinars: any[],
  syncResults: SyncResults,
  statsResult: StatsResult
) {
  // Calculate enhanced registrant statistics with aggressive timeout protection metrics
  const registrantStats = {
    webinars_with_registrants: finalWebinarsList.filter(w => (w.registrants_count || 0) > 0).length,
    total_registrants: finalWebinarsList.reduce((sum, w) => sum + (w.registrants_count || 0), 0),
    avg_registrants_per_webinar: finalWebinarsList.length > 0 
      ? Math.round(finalWebinarsList.reduce((sum, w) => sum + (w.registrants_count || 0), 0) / finalWebinarsList.length * 100) / 100
      : 0,
    
    // Enhanced timeout protection metrics
    successful_registrant_enhancements: finalWebinarsList.filter(w => w._enhanced_with_registrants === true).length,
    failed_registrant_enhancements: finalWebinarsList.filter(w => w._enhanced_with_registrants === false).length,
    batch_processing_failures: finalWebinarsList.filter(w => w._batch_failed === true).length,
    registrants_stored_in_db: finalWebinarsList.reduce((sum, w) => sum + (w._registrants_stored_count || 0), 0),
    
    // Aggressive timeout protection metrics
    timeout_protected_webinars: finalWebinarsList.filter(w => w._timeout_protection === true).length,
    volume_limited_webinars: finalWebinarsList.filter(w => w._volume_limited === true).length,
    orchestrator_timeout_protected: finalWebinarsList.filter(w => w._orchestrator_timeout_protection === true).length,
    skipped_due_to_time_constraints: finalWebinarsList.filter(w => w._registrants_skip_reason?.includes('time constraints')).length,
    
    // Processing efficiency metrics
    batch_processing_enabled: true,
    aggressive_timeout_protection: true,
    volume_limiting_enabled: true
  };

  return new Response(JSON.stringify({
    webinars: finalWebinarsList,
    syncResults: {
      ...syncResults,
      totalWebinars: statsResult.totalWebinarsInDB,
      dataRange: statsResult.dataRange,
      // Enhanced registrant statistics with aggressive timeout protection
      registrantStats
    },
    message: 'Optimized sync completed with aggressive timeout protection and registrant data integration',
    timestamp: new Date().toISOString(),
    performance: {
      batch_processing: 'enabled',
      rate_limiting: 'enabled',
      graceful_degradation: 'enabled',
      aggressive_timeout_protection: 'enabled',
      volume_limiting: 'enabled'
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Logs detailed statistics about fetched webinar data including aggressive timeout protection metrics
 */
export function logWebinarStatistics(allWebinars: any[]) {
  console.log(`[zoom-api][statistics] Final data analysis with aggressive timeout protection:`);
  console.log(`  - Total webinars fetched from all sources: ${allWebinars.length}`);
  
  if (allWebinars.length > 0) {
    // Analyze the date distribution
    const now = new Date();
    const pastWebinars = allWebinars.filter(w => new Date(w.start_time) < now);
    const futureWebinars = allWebinars.filter(w => new Date(w.start_time) >= now);
    
    console.log(`  - Past webinars: ${pastWebinars.length}`);
    console.log(`  - Future webinars: ${futureWebinars.length}`);
    
    // Show oldest and newest webinars from API
    const sortedByDate = [...allWebinars].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    if (sortedByDate.length > 0) {
      console.log(`  - Oldest API webinar: ${sortedByDate[0].id} on ${sortedByDate[0].start_time}`);
      console.log(`  - Newest API webinar: ${sortedByDate[sortedByDate.length - 1].id} on ${sortedByDate[sortedByDate.length - 1].start_time}`);
    }
    
    // Show status distribution
    const statusCounts = {};
    allWebinars.forEach(w => {
      statusCounts[w.status] = (statusCounts[w.status] || 0) + 1;
    });
    console.log(`  - Status distribution:`, statusCounts);
    
    // Enhanced aggressive timeout protection metrics
    const registrantEnhanced = allWebinars.filter(w => w._enhanced_with_registrants === true).length;
    const registrantFailed = allWebinars.filter(w => w._enhanced_with_registrants === false).length;
    const batchFailed = allWebinars.filter(w => w._batch_failed === true).length;
    const timeoutProtected = allWebinars.filter(w => w._timeout_protection === true).length;
    const volumeLimited = allWebinars.filter(w => w._volume_limited === true).length;
    const orchestratorTimeoutProtected = allWebinars.filter(w => w._orchestrator_timeout_protection === true).length;
    
    console.log(`  - Registrant enhancement success: ${registrantEnhanced}/${allWebinars.length}`);
    console.log(`  - Registrant enhancement failures: ${registrantFailed}/${allWebinars.length}`);
    console.log(`  - Batch processing failures: ${batchFailed}/${allWebinars.length}`);
    console.log(`  - Timeout protected webinars: ${timeoutProtected}/${allWebinars.length}`);
    console.log(`  - Volume limited webinars: ${volumeLimited}/${allWebinars.length}`);
    console.log(`  - Orchestrator timeout protected: ${orchestratorTimeoutProtected}/${allWebinars.length}`);
    console.log(`  - Aggressive timeout protection effectiveness: ${((registrantEnhanced + timeoutProtected + volumeLimited + orchestratorTimeoutProtected) / allWebinars.length * 100).toFixed(1)}%`);
  }
}
