
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

// ENHANCED timeout handling with better error recovery and more aggressive timeouts
const OPERATION_TIMEOUT = 40000; // Reduced from 45s to 40s for better reliability
const ENHANCEMENT_TIMEOUT = 35000; // Increased to 35 seconds for enhancement phase - this is the critical fix
const API_CALL_TIMEOUT = 10000; // Increased to 10 seconds for individual API calls
const WEBINAR_FETCH_TIMEOUT = 20000; // 20 seconds for webinar fetching

// Handle listing webinars with ENHANCED error handling and timeout protection
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] Starting ENHANCED non-destructive sync for user: ${user.id}, force_sync: ${force_sync}`);
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
    
    // ENHANCED token generation with timeout protection
    let token;
    try {
      console.log(`[zoom-api][list-webinars] Generating Zoom token with enhanced timeout protection`);
      const tokenPromise = getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
      token = await Promise.race([
        tokenPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Token generation timeout')), API_CALL_TIMEOUT))
      ]);
      console.log(`[zoom-api][list-webinars] ✅ Token generation successful`);
    } catch (error) {
      console.error('[zoom-api][list-webinars] Token generation failed:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
    
    // ENHANCED user info fetching with timeout protection
    let meData;
    try {
      console.log(`[zoom-api][list-webinars] Fetching user info with enhanced timeout protection`);
      const userInfoPromise = fetchUserInfo(token);
      meData = await Promise.race([
        userInfoPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('User info fetch timeout')), API_CALL_TIMEOUT))
      ]);
      console.log(`[zoom-api][list-webinars] ✅ Got user info for: ${meData.email}, ID: ${meData.id}`);
    } catch (error) {
      console.error('[zoom-api][list-webinars] User info fetch failed:', error);
      throw new Error(`Failed to fetch user information: ${error.message}`);
    }

    // ENHANCED webinars fetching with improved timeout protection
    console.log(`[zoom-api][list-webinars] Fetching webinars from API with enhanced timeout (${Date.now() - startTime}ms elapsed)`);
    let allWebinars;
    try {
      const webinarsPromise = fetchWebinarsFromZoomAPI(token, meData.id);
      allWebinars = await Promise.race([
        webinarsPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Webinars fetch timeout')), WEBINAR_FETCH_TIMEOUT))
      ]);
      console.log(`[zoom-api][list-webinars] ✅ Successfully fetched ${allWebinars?.length || 0} webinars from API`);
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
      console.log(`[zoom-api][list-webinars] Starting ENHANCED comprehensive enhancement phase (${enhancementStartTime - startTime}ms elapsed)`);
      
      // CRITICAL FIX: Enhanced webinars with comprehensive data collection and EXTENDED timeout
      let enhancedWebinars = [...allWebinars]; // Start with basic data
      try {
        console.log(`[zoom-api][list-webinars] 🎯 CRITICAL: Starting enhancement with EXTENDED timeout of ${ENHANCEMENT_TIMEOUT}ms`);
        const enhancementPromise = enhanceWebinarsWithAllData(allWebinars, token, supabase, user.id);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Enhancement timeout')), ENHANCEMENT_TIMEOUT)
        );
        
        enhancedWebinars = await Promise.race([enhancementPromise, timeoutPromise]);
        console.log(`[zoom-api][list-webinars] ✅ ENHANCED COMPREHENSIVE ENHANCEMENT COMPLETED successfully in ${Date.now() - enhancementStartTime}ms`);
        
        // ENHANCED logging of enhancement results with actual timing focus
        const timingCount = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration).length;
        const hostCount = enhancedWebinars.filter(w => w.host_email || w.host_name).length;
        const panelistCount = enhancedWebinars.filter(w => w.panelists && w.panelists.length > 0).length;
        const recordingCount = enhancedWebinars.filter(w => w.has_recordings || w.recording_data).length;
        
        console.log(`[zoom-api][list-webinars] 📊 ENHANCED RESULTS:`);
        console.log(`[zoom-api][list-webinars] - 🎯 ACTUAL TIMING DATA: ${timingCount}/${allWebinars.length} webinars (${Math.round((timingCount/allWebinars.length)*100)}%) - CRITICAL SUCCESS METRIC`);
        console.log(`[zoom-api][list-webinars] - Host info: ${hostCount}/${allWebinars.length} webinars (${Math.round((hostCount/allWebinars.length)*100)}%)`);
        console.log(`[zoom-api][list-webinars] - Panelist data: ${panelistCount}/${allWebinars.length} webinars (${Math.round((panelistCount/allWebinars.length)*100)}%)`);
        console.log(`[zoom-api][list-webinars] - Recording data: ${recordingCount}/${allWebinars.length} webinars (${Math.round((recordingCount/allWebinars.length)*100)}%)`);
        
        // CRITICAL: Log sample timing data for verification
        if (timingCount > 0) {
          const timingWebinars = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration);
          console.log(`[zoom-api][list-webinars] 🎯 SAMPLE TIMING DATA VERIFICATION:`);
          timingWebinars.slice(0, 3).forEach(w => {
            console.log(`[zoom-api][list-webinars] - Webinar ${w.id}: start=${w.actual_start_time}, duration=${w.actual_duration}min, status=${w.status}`);
          });
        }
        
      } catch (error) {
        console.error(`[zoom-api][list-webinars] ❌ CRITICAL: Enhancement failed after ${Date.now() - enhancementStartTime}ms:`, error.message);
        console.error(`[zoom-api][list-webinars] Enhancement error details:`, {
          message: error.message,
          stack: error.stack?.substring(0, 300)
        });
        
        // ENHANCED fallback strategy: continue with basic webinar data but log the failure clearly
        enhancedWebinars = allWebinars;
        console.log(`[zoom-api][list-webinars] 🔄 FALLBACK: Continuing with ${enhancedWebinars.length} basic webinar records (no enhancement)`);
        
        // Record the enhancement failure for debugging
        try {
          await recordSyncHistory(
            supabase,
            user.id,
            'webinars',
            'warning',
            enhancedWebinars.length,
            `Enhancement failed after ${Date.now() - enhancementStartTime}ms: ${error.message}. Continuing with basic data.`
          );
        } catch (historyError) {
          console.warn('[zoom-api][list-webinars] Failed to record enhancement failure in sync history:', historyError);
        }
      }
      
      // ENHANCED database upsert with better error handling
      console.log(`[zoom-api][list-webinars] Starting ENHANCED database upsert (${Date.now() - startTime}ms elapsed)`);
      try {
        syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
        console.log(`[zoom-api][list-webinars] ✅ ENHANCED database upsert completed: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated, ${syncResults.preservedWebinars} preserved`);
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
      
      // ENHANCED sync history recording with actual timing statistics
      const actualTimingCount = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration).length;
      const recordingStats = enhancedWebinars.filter(w => w.has_recordings || w.recording_data).length;
      const hostInfoCount = enhancedWebinars.filter(w => w.host_email || w.host_name).length;
      const panelistInfoCount = enhancedWebinars.filter(w => w.panelists && w.panelists.length > 0).length;
      const totalTime = Date.now() - startTime;
      
      try {
        await recordSyncHistory(
          supabase,
          user.id,
          'webinars',
          'success',
          syncResults.newWebinars + syncResults.updatedWebinars,
          `ENHANCED comprehensive sync completed in ${totalTime}ms: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated, ${syncResults.preservedWebinars} preserved. CRITICAL TIMING DATA: ${actualTimingCount}/${allWebinars.length} webinars (${Math.round((actualTimingCount/allWebinars.length)*100)}%). Other enhancements: ${recordingStats} recordings, ${hostInfoCount} host info, ${panelistInfoCount} panelists. Total: ${statsResult.totalWebinarsInDB} webinars in database.`
        );
      } catch (error) {
        console.warn('[zoom-api][list-webinars] Sync history recording failed:', error);
        // Continue without recording sync history
      }
      
      console.log(`[zoom-api][list-webinars] 🎉 ENHANCED COMPREHENSIVE SYNC COMPLETED successfully in ${totalTime}ms`);
      console.log(`[zoom-api][list-webinars] 🎯 FINAL TIMING DATA STATUS: ${actualTimingCount}/${allWebinars.length} webinars have actual timing data`);
    } else {
      // Handle empty sync result
      await handleEmptySync(supabase, user.id, syncResults, statsResult);
    }
    
    // Get final webinar list to return
    const finalWebinarsList = await getFinalWebinarsList(supabase, user.id);
    
    const totalOperationTime = Date.now() - startTime;
    console.log(`[zoom-api][list-webinars] 🏁 Total ENHANCED operation completed in ${totalOperationTime}ms`);
    
    return formatListWebinarsResponse(finalWebinarsList, allWebinars, syncResults, statsResult);
    
  } catch (error) {
    const operationTime = Date.now() - startTime;
    console.error(`[zoom-api][list-webinars] ❌ CRITICAL ERROR in ENHANCED comprehensive sync after ${operationTime}ms:`, error);
    
    // ENHANCED error categorization with better error messages and more specific handling
    let errorCategory = 'unknown';
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      errorCategory = 'timeout';
      errorMessage = `Operation timed out after ${operationTime}ms. The sync process is being optimized for large datasets. Please try again in a moment.`;
      statusCode = 408; // Request Timeout
    } else if (errorMessage.includes('credentials') || errorMessage.includes('token') || errorMessage.includes('Authentication')) {
      errorCategory = 'authentication';
      errorMessage = 'Authentication failed. Please check your Zoom credentials and try again.';
      statusCode = 401; // Unauthorized
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      errorCategory = 'rate_limit';
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      statusCode = 429; // Too Many Requests
    } else if (errorMessage.includes('Database') || errorMessage.includes('database')) {
      errorCategory = 'database';
      errorMessage = 'Database error occurred. Please try again.';
      statusCode = 503; // Service Unavailable
    } else if (errorMessage.includes('Enhancement') || errorMessage.includes('enhancement')) {
      errorCategory = 'enhancement';
      errorMessage = 'Data enhancement failed, but basic sync may have succeeded. Please try again.';
      statusCode = 502; // Bad Gateway
    }
    
    // ENHANCED error response with better debugging information
    const errorResponse = {
      success: false,
      error: errorMessage,
      category: errorCategory,
      duration: operationTime,
      timestamp: new Date().toISOString(),
      debug: {
        originalError: error.message,
        stack: error.stack?.substring(0, 200)
      }
    };
    
    // Record failed sync in history with ENHANCED error details
    try {
      await recordSyncHistory(
        supabase,
        user.id,
        'webinars',
        'error',
        0,
        `ENHANCED sync ${errorCategory}: ${errorMessage} (after ${operationTime}ms). Original error: ${error.message}`
      );
    } catch (historyError) {
      console.warn('[zoom-api][list-webinars] Failed to record error in sync history:', historyError);
    }
    
    // Return proper error response with appropriate status code
    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
