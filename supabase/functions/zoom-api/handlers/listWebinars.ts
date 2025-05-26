
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

// Enhanced timeout handling with better error recovery
const OPERATION_TIMEOUT = 50000; // 50 seconds (Edge Function limit is 60s)
const ENHANCEMENT_TIMEOUT = 25000; // Reduced to 25 seconds for enhancement phase
const CIRCUIT_BREAKER_THRESHOLD = 3; // Number of failures before circuit opens

// Handle listing webinars with improved error handling and timeout protection
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] Starting non-destructive sync for user: ${user.id}, force_sync: ${force_sync}`);
  console.log(`[zoom-api][list-webinars] Current timestamp: ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  
  try {
    // Check database cache first if not forcing sync
    const cacheResult = await checkDatabaseCache(supabase, user.id, force_sync);
    if (cacheResult.shouldUseCachedData) {
      console.log(`[zoom-api][list-webinars] Using cached data, operation completed in ${Date.now() - startTime}ms`);
      return new Response(JSON.stringify(cacheResult.cacheResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get token and fetch user info with improved timeout handling
    let token;
    try {
      const tokenPromise = getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
      token = await Promise.race([
        tokenPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Token generation timeout')), 10000))
      ]);
    } catch (error) {
      console.error('[zoom-api][list-webinars] Token generation failed:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
    
    console.log('[zoom-api][list-webinars] Got Zoom token, fetching user info and webinars');
    
    let meData;
    try {
      meData = await fetchUserInfo(token);
      console.log(`[zoom-api][list-webinars] Got user info for: ${meData.email}, ID: ${meData.id}`);
    } catch (error) {
      console.error('[zoom-api][list-webinars] User info fetch failed:', error);
      throw new Error(`Failed to fetch user information: ${error.message}`);
    }

    // Fetch webinars from Zoom API with improved timeout protection
    console.log(`[zoom-api][list-webinars] Fetching webinars from API (${Date.now() - startTime}ms elapsed)`);
    let allWebinars;
    try {
      const webinarsPromise = fetchWebinarsFromZoomAPI(token, meData.id);
      allWebinars = await Promise.race([
        webinarsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Webinars fetch timeout')), 20000))
      ]);
    } catch (error) {
      console.error('[zoom-api][list-webinars] Webinars fetch failed:', error);
      throw new Error(`Failed to fetch webinars: ${error.message}`);
    }
    
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
      const enhancementStartTime = Date.now();
      console.log(`[zoom-api][list-webinars] Starting enhancement phase (${enhancementStartTime - startTime}ms elapsed)`);
      
      // Enhance webinars with improved timeout protection and graceful degradation
      let enhancedWebinars = [...allWebinars]; // Start with basic data
      try {
        const enhancementPromise = enhanceWebinarsWithAllData(allWebinars, token, supabase, user.id);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Enhancement timeout')), ENHANCEMENT_TIMEOUT)
        );
        
        enhancedWebinars = await Promise.race([enhancementPromise, timeoutPromise]);
        console.log(`[zoom-api][list-webinars] Enhancement completed successfully in ${Date.now() - enhancementStartTime}ms`);
      } catch (error) {
        console.warn(`[zoom-api][list-webinars] Enhancement failed, using basic webinar data:`, error.message);
        // Continue with basic webinar data - this prevents the 500 error
        enhancedWebinars = allWebinars;
      }
      
      // Perform non-destructive upsert with error handling
      console.log(`[zoom-api][list-webinars] Starting database upsert (${Date.now() - startTime}ms elapsed)`);
      try {
        syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
      } catch (error) {
        console.error('[zoom-api][list-webinars] Database upsert failed:', error);
        throw new Error(`Database update failed: ${error.message}`);
      }
      
      // Calculate comprehensive statistics
      try {
        statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);
      } catch (error) {
        console.warn('[zoom-api][list-webinars] Stats calculation failed:', error);
        // Continue without detailed stats
      }
      
      // Record sync in history with enhanced statistics including recording data
      const actualTimingCount = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration).length;
      const recordingStats = enhancedWebinars.filter(w => w.has_recordings).length;
      const totalTime = Date.now() - startTime;
      
      try {
        await recordSyncHistory(
          supabase,
          user.id,
          'webinars',
          'success',
          syncResults.newWebinars + syncResults.updatedWebinars,
          `Enhanced non-destructive sync completed in ${totalTime}ms: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated, ${syncResults.preservedWebinars} preserved. ${actualTimingCount} with actual timing data, ${recordingStats} with recordings. Total: ${statsResult.totalWebinarsInDB} webinars (${statsResult.oldestPreservedDate ? `from ${statsResult.oldestPreservedDate.split('T')[0]}` : 'all recent'})`
        );
      } catch (error) {
        console.warn('[zoom-api][list-webinars] Sync history recording failed:', error);
        // Continue without recording sync history
      }
      
      console.log(`[zoom-api][list-webinars] Sync completed successfully in ${totalTime}ms`);
    } else {
      // Handle empty sync result
      await handleEmptySync(supabase, user.id, syncResults, statsResult);
    }
    
    // Get final webinar list to return
    const finalWebinarsList = await getFinalWebinarsList(supabase, user.id);
    
    const totalOperationTime = Date.now() - startTime;
    console.log(`[zoom-api][list-webinars] Total operation completed in ${totalOperationTime}ms`);
    
    return formatListWebinarsResponse(finalWebinarsList, allWebinars, syncResults, statsResult);
    
  } catch (error) {
    const operationTime = Date.now() - startTime;
    console.error(`[zoom-api][list-webinars] Error in action after ${operationTime}ms:`, error);
    
    // Enhanced error categorization with better error messages
    let errorCategory = 'unknown';
    let errorMessage = error.message || 'Unknown error';
    
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      errorCategory = 'timeout';
      errorMessage = `Operation timed out after ${operationTime}ms. This may be due to processing too much data. Try again or contact support if the issue persists.`;
    } else if (errorMessage.includes('credentials') || errorMessage.includes('token') || errorMessage.includes('Authentication')) {
      errorCategory = 'authentication';
      errorMessage = 'Authentication failed. Please check your Zoom credentials and try again.';
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      errorCategory = 'rate_limit';
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (errorMessage.includes('Database')) {
      errorCategory = 'database';
      errorMessage = 'Database error occurred. Please try again.';
    }
    
    // Record failed sync in history with better error details
    try {
      await recordSyncHistory(
        supabase,
        user.id,
        'webinars',
        'error',
        0,
        `${errorCategory}: ${errorMessage} (after ${operationTime}ms)`
      );
    } catch (historyError) {
      console.warn('[zoom-api][list-webinars] Failed to record error in sync history:', historyError);
    }
    
    // Return a proper error response instead of throwing
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      category: errorCategory,
      duration: operationTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
