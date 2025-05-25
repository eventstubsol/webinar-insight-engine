
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { fetchWebinarsFromZoomAPI, performNonDestructiveUpsert } from './sync/nonDestructiveSync.ts';
import { enhanceWebinarsWithAllData } from './sync/webinarEnhancementOrchestrator.ts';
import { calculateSyncStats, recordSyncHistory } from './sync/syncStatsCalculator.ts';
import { checkDatabaseCache } from './sync/databaseCache.ts';
import { formatListWebinarsResponse, logWebinarStatistics, SyncResults, StatsResult } from './sync/responseFormatter.ts';

// Handle listing webinars with non-destructive upsert-based sync
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] Starting non-destructive sync for user: ${user.id}, force_sync: ${force_sync}`);
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
      // Enhance webinars with all additional data (host, panelist, participant info)
      const enhancedWebinars = await enhanceWebinarsWithAllData(allWebinars, token);
      
      // Perform non-destructive upsert
      syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
      
      // Calculate comprehensive statistics
      statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);
      
      // Record sync in history with enhanced statistics
      await recordSyncHistory(
        supabase,
        user.id,
        'webinars',
        'success',
        syncResults.newWebinars + syncResults.updatedWebinars,
        `Non-destructive sync with host and panelist resolution: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated, ${syncResults.preservedWebinars} preserved. Total: ${statsResult.totalWebinarsInDB} webinars (${statsResult.oldestPreservedDate ? `from ${statsResult.oldestPreservedDate.split('T')[0]}` : 'all recent'})`
      );
    } else {
      // Handle empty sync result
      await handleEmptySync(supabase, user.id, syncResults, statsResult);
    }
    
    // Get final webinar list to return
    const finalWebinarsList = await getFinalWebinarsList(supabase, user.id);
    
    return formatListWebinarsResponse(finalWebinarsList, allWebinars, syncResults, statsResult);
    
  } catch (error) {
    console.error('[zoom-api][list-webinars] Error in action:', error);
    
    // Record failed sync in history
    await recordSyncHistory(
      supabase,
      user.id,
      'webinars',
      'error',
      0,
      error.message || 'Unknown error'
    );
    
    throw error; // Let the main error handler format the response
  }
}

/**
 * Fetches user information from Zoom API
 */
async function fetchUserInfo(token: string) {
  const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!meResponse.ok) {
    const meData = await meResponse.json();
    console.error('[zoom-api][list-webinars] Failed to get user info:', meData);
    
    // Handle missing OAuth scopes error specifically
    if (meData.code === 4711 || meData.message?.includes('scopes')) {
      throw new Error('Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin');
    }
    
    // Handle other API error codes
    if (meData.code === 124) {
      throw new Error('Invalid Zoom access token. Please check your credentials.');
    } else if (meData.code === 1001) {
      throw new Error('User not found or does not exist in this account.');
    } else {
      throw new Error(`Failed to get user info: ${meData.message || 'Unknown error'}`);
    }
  }
  
  return await meResponse.json();
}

/**
 * Handles the case when no webinars are found in the API
 */
async function handleEmptySync(supabase: any, userId: string, syncResults: SyncResults, statsResult: StatsResult) {
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
    
  console.log(`[zoom-api][list-webinars] No webinars found in API, but preserved ${syncResults.preservedWebinars} existing webinars`);
}

/**
 * Gets the final list of webinars to return to the client
 */
async function getFinalWebinarsList(supabase: any, userId: string) {
  const { data: allDbWebinars, error: allDbError } = await supabase
    .from('zoom_webinars')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });
  
  return allDbWebinars?.map(w => ({
    id: w.webinar_id,
    uuid: w.webinar_uuid,
    topic: w.topic,
    start_time: w.start_time,
    duration: w.duration,
    timezone: w.timezone,
    agenda: w.agenda || '',
    host_email: w.host_email,
    host_id: w.host_id,
    status: w.status,
    type: w.type,
    ...w.raw_data
  })) || [];
}
