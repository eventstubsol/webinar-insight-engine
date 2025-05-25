
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
  return new Response(JSON.stringify({ 
    webinars: finalWebinarsList,
    source: 'api',
    syncResults: {
      itemsFetched: allWebinars?.length || 0,
      itemsUpdated: syncResults.newWebinars + syncResults.updatedWebinars,
      newWebinars: syncResults.newWebinars,
      updatedWebinars: syncResults.updatedWebinars,
      preservedWebinars: syncResults.preservedWebinars,
      totalWebinars: statsResult.totalWebinarsInDB,
      monthsSearched: 12,
      searchPeriods: [],
      dataRange: statsResult.dataRange,
      preservedHistoricalData: syncResults.preservedWebinars > 0
    }
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
