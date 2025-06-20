import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { fetchWebinarsFromZoomAPI, performNonDestructiveUpsert } from './sync/nonDestructiveSync.ts';
import { enhanceWebinarsWithAllData } from './sync/webinarEnhancementOrchestrator.ts';
import { calculateSyncStats, recordSyncHistory } from './sync/syncStatsCalculator.ts';
import { checkDatabaseCache } from './sync/databaseCache.ts';
import { formatListWebinarsResponse, logWebinarStatistics, SyncResults, StatsResult } from './sync/responseFormatter.ts';
import { fetchUserInfo } from './sync/userInfoFetcher.ts';
import { handleEmptySync } from './sync/emptySyncHandler.ts';
import { getFinalWebinarsList } from './sync/finalWebinarsListFetcher.ts';

// Handle listing webinars with enhanced registrant data integration
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] Starting REGISTRANT-ENHANCED sync for user: ${user.id}, force_sync: ${force_sync}`);
  console.log(`[zoom-api][list-webinars] 🔄 This sync now includes AUTOMATIC REGISTRANT DATA FETCHING!`);
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

    // Fetch webinars from Zoom API
    const allWebinars = await fetchWebinarsFromZoomAPI(token, meData.id);
    
    // Log detailed statistics about the fetched data
    logWebinarStatistics(allWebinars);
    
    // Get existing webinars for comparison and preservation count
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
      // 🔥 ENHANCED: Now includes automatic registrant data fetching
      console.log(`[zoom-api][list-webinars] 🚀 Starting REGISTRANT-ENHANCED enhancement with automatic registrant syncing`);
      const enhancedWebinars = await enhanceWebinarsWithAllData(allWebinars, token, supabase, user.id);
      
      // Perform non-destructive upsert
      syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
      
      // Calculate comprehensive statistics
      statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);
      
      // Get enhanced statistics including registrants
      const { data: instancesData, error: instancesError } = await supabase
        .from('zoom_webinar_instances')
        .select('webinar_id')
        .eq('user_id', user.id);
      
      const { data: registrantsData, error: registrantsError } = await supabase
        .from('zoom_webinar_participants')
        .select('webinar_id')
        .eq('user_id', user.id)
        .eq('participant_type', 'registrant');
      
      const instanceStats = instancesError ? 0 : (instancesData?.length || 0);
      const registrantStats = registrantsError ? 0 : (registrantsData?.length || 0);
      const completedWebinars = enhancedWebinars.filter(w => w.status === 'ended' || w.status === 'aborted').length;
      const recordingStats = enhancedWebinars.filter(w => w.has_recordings).length;
      const webinarsWithRegistrants = enhancedWebinars.filter(w => (w.registrants_count || 0) > 0).length;
      
      // Record enhanced sync in history with registrant information
      await recordSyncHistory(
        supabase,
        user.id,
        'webinars',
        'success',
        syncResults.newWebinars + syncResults.updatedWebinars,
        `REGISTRANT-ENHANCED sync: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated, ${syncResults.preservedWebinars} preserved. ${completedWebinars} completed webinars processed. ${instanceStats} instances synced. ${recordingStats} webinars with recordings. ${registrantStats} registrants synced across ${webinarsWithRegistrants} webinars. Total: ${statsResult.totalWebinarsInDB} webinars (${statsResult.oldestPreservedDate ? `from ${statsResult.oldestPreservedDate.split('T')[0]}` : 'all recent'})`
      );
    } else {
      // Handle empty sync result
      await handleEmptySync(supabase, user.id, syncResults, statsResult);
    }
    
    // Get final webinar list to return
    const finalWebinarsList = await getFinalWebinarsList(supabase, user.id);
    
    return formatListWebinarsResponse(finalWebinarsList, allWebinars, syncResults, statsResult);
    
  } catch (error) {
    console.error('[zoom-api][list-webinars] Error in registrant-enhanced sync action:', error);
    
    // Record failed sync in history
    await recordSyncHistory(
      supabase,
      user.id,
      'webinars',
      'error',
      0,
      `Registrant-enhanced sync error: ${error.message || 'Unknown error'}`
    );
    
    throw error; // Let the main error handler format the response
  }
}
