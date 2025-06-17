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
 * Formats the final response for the list webinars API
 */
export function formatListWebinarsResponse(
  finalWebinarsList: any[],
  allWebinars: any[],
  syncResults: SyncResults,
  statsResult: StatsResult
) {
  // Calculate registrant statistics from the enhanced webinars
  const registrantStats = {
    webinars_with_registrants: finalWebinarsList.filter(w => (w.registrants_count || 0) > 0).length,
    total_registrants: finalWebinarsList.reduce((sum, w) => sum + (w.registrants_count || 0), 0),
    avg_registrants_per_webinar: finalWebinarsList.length > 0 
      ? Math.round(finalWebinarsList.reduce((sum, w) => sum + (w.registrants_count || 0), 0) / finalWebinarsList.length * 100) / 100
      : 0
  };

  return new Response(JSON.stringify({
    webinars: finalWebinarsList,
    syncResults: {
      ...syncResults,
      totalWebinars: statsResult.totalWebinarsInDB,
      dataRange: statsResult.dataRange,
      // Enhanced registrant statistics
      registrantStats
    },
    message: 'Enhanced sync completed with registrant data integration',
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Logs detailed statistics about fetched webinar data
 */
export function logWebinarStatistics(allWebinars: any[]) {
  console.log(`[zoom-api][statistics] Final data analysis:`);
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
  }
}
