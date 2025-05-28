
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { fetchWebinarsFromZoomAPI, performNonDestructiveUpsert } from './sync/nonDestructiveSync.ts';
import { syncBasicWebinarData, enhanceWithPastWebinarData } from './sync/basicWebinarSyncer.ts';
import { calculateSyncStats, recordSyncHistory } from './sync/syncStatsCalculator.ts';
import { checkDatabaseCache } from './sync/databaseCache.ts';
import { formatListWebinarsResponse, logWebinarStatistics, SyncResults, StatsResult } from './sync/responseFormatter.ts';
import { fetchUserInfo } from './sync/userInfoFetcher.ts';
import { handleEmptySync } from './sync/emptySyncHandler.ts';
import { getFinalWebinarsList } from './sync/finalWebinarsListFetcher.ts';

// FIXED: Handle listing webinars with proper data source separation
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] 🔄 Starting FIXED webinar sync for user: ${user.id}, force_sync: ${force_sync}`);
  console.log(`[zoom-api][list-webinars] 🎯 CRITICAL FIX: Proper data source separation and past webinar integration`);
  console.log(`[zoom-api][list-webinars] Current timestamp: ${new Date().toISOString()}`);
  
  try {
    // Check database cache first if not forcing sync
    const cacheResult = await checkDatabaseCache(supabase, user.id, force_sync);
    if (cacheResult.shouldUseCachedData) {
      return new Response(JSON.stringify(cacheResult.cacheResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get token and fetch user info
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    console.log('[zoom-api][list-webinars] Got Zoom token, fetching user info and webinars');
    
    const meData = await fetchUserInfo(token);
    console.log(`[zoom-api][list-webinars] Got user info for: ${meData.email}, ID: ${meData.id}`);

    // STEP 1: Fetch basic webinars from /users/{userId}/webinars (no assumptions about fields)
    const allWebinars = await fetchWebinarsFromZoomAPI(token, meData.id);
    logWebinarStatistics(allWebinars);
    
    // Get existing webinars for comparison
    const { data: existingWebinars, error: existingError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id);
      
    if (existingError) {
      console.error('[zoom-api][list-webinars] Error fetching existing webinars:', existingError);
    }
    
    let syncResults: SyncResults = { newWebinars: 0, updatedWebinars: 0, preservedWebinars: 0 };
    let statsResult: StatsResult = {
      totalWebinarsInDB: 0,
      oldestPreservedDate: null,
      newestWebinarDate: null,
      dataRange: { oldest: null, newest: null }
    };
    
    // Process webinars if any exist
    if (allWebinars && allWebinars.length > 0) {
      // STEP 2: Process basic webinar data (only fields that exist in basic API)
      console.log(`[zoom-api][list-webinars] 📊 Processing ${allWebinars.length} basic webinars`);
      const basicWebinars = await syncBasicWebinarData(allWebinars, token, user.id);
      
      // STEP 3: FIXED - Enhance with past webinar data for completed webinars
      console.log(`[zoom-api][list-webinars] 🎯 FIXED: Enhancing completed webinars with actual timing data`);
      const enhancedWebinars = await enhanceWithPastWebinarData(basicWebinars, token);
      
      // STEP 4: Store in database
      syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
      
      // Calculate comprehensive statistics
      statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);
      
      const enhancedCount = enhancedWebinars.filter(w => w._enhanced_with_past_data).length;
      const completedCount = enhancedWebinars.filter(w => w._completion_analysis?.isCompleted).length;
      
      // Record sync in history with detailed information
      await recordSyncHistory(
        supabase,
        user.id,
        'webinars',
        'success',
        syncResults.newWebinars + syncResults.updatedWebinars,
        `FIXED sync with past data integration: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated, ${syncResults.preservedWebinars} preserved. ${completedCount} completed webinars identified, ${enhancedCount} enhanced with actual timing data. Total: ${statsResult.totalWebinarsInDB} webinars`
      );
    } else {
      // Handle empty sync result
      await handleEmptySync(supabase, user.id, syncResults, statsResult);
    }
    
    // Get final webinar list to return
    const finalWebinarsList = await getFinalWebinarsList(supabase, user.id);
    
    return formatListWebinarsResponse(finalWebinarsList, allWebinars, syncResults, statsResult);
    
  } catch (error) {
    console.error('[zoom-api][list-webinars] Error in FIXED sync action:', error);
    
    // Record failed sync in history
    await recordSyncHistory(
      supabase,
      user.id,
      'webinars',
      'error',
      0,
      `FIXED sync error: ${error.message || 'Unknown error'}`
    );
    
    throw error;
  }
}
