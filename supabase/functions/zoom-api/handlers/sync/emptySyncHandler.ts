
import { SyncResults, StatsResult } from './responseFormatter.ts';
import { recordSyncHistory } from './syncStatsCalculator.ts';

// Handles the case when no webinars are found in the API
export async function handleEmptySync(
  supabase: any, 
  userId: string, 
  syncResults: SyncResults, 
  statsResult: StatsResult
) {
  const { data: finalWebinars } = await supabase
    .from('zoom_webinars')
    .select('*')
    .eq('user_id', userId);
  
  statsResult.totalWebinarsInDB = finalWebinars?.length || 0;
  syncResults.preservedWebinars = statsResult.totalWebinarsInDB;
  
  await recordSyncHistory(
    supabase,
    userId,
    'webinars',
    'success',
    0,
    `No webinars found in API, preserved ${syncResults.preservedWebinars} existing webinars in database`
  );
    
  console.log(`[zoom-api][empty-sync] No webinars found in API, but preserved ${syncResults.preservedWebinars} existing webinars`);
}
