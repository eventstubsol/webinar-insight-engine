
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

// CRITICAL FIX: Optimized timeout handling with hierarchical structure
const OPERATION_TIMEOUT = 55000; // 55 seconds total - within 60s global timeout
const ENHANCEMENT_TIMEOUT = 45000; // 45 seconds for enhancement phase
const API_CALL_TIMEOUT = 10000; // 10 seconds for individual API calls
const WEBINAR_FETCH_TIMEOUT = 15000; // 15 seconds for webinar fetching

// NEW: Batch processing configuration
const BATCH_SIZE = 10; // Process webinars in batches of 10
const PRIORITY_BATCH_SIZE = 5; // Smaller batches for priority items

// Handle listing webinars with ENHANCED error handling and batch processing
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] Starting OPTIMIZED batch-processed sync for user: ${user.id}, force_sync: ${force_sync}`);
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
    
    // Token generation with timeout protection
    let token;
    try {
      console.log(`[zoom-api][list-webinars] Generating Zoom token with timeout protection`);
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
    
    // User info fetching with timeout protection
    let meData;
    try {
      console.log(`[zoom-api][list-webinars] Fetching user info with timeout protection`);
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

    // Webinars fetching with optimized timeout
    console.log(`[zoom-api][list-webinars] Fetching webinars from API with optimized timeout (${Date.now() - startTime}ms elapsed)`);
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
      console.log(`[zoom-api][list-webinars] Starting BATCH-PROCESSED enhancement phase (${enhancementStartTime - startTime}ms elapsed)`);
      
      // CRITICAL FIX: Batch-processed enhancement with circuit breaker pattern
      let enhancedWebinars = [...allWebinars]; // Start with basic data
      let enhancementStats = {
        totalProcessed: 0,
        actualTimingAdded: 0,
        hostInfoAdded: 0,
        errors: []
      };
      
      try {
        console.log(`[zoom-api][list-webinars] 🎯 CRITICAL: Starting BATCH enhancement with ${BATCH_SIZE} webinar batches`);
        
        // NEW: Priority processing - separate webinars with/without timing data
        const webinarsNeedingTiming = allWebinars.filter(w => !w.actual_start_time && !w.actual_duration);
        const webinarsWithTiming = allWebinars.filter(w => w.actual_start_time || w.actual_duration);
        
        console.log(`[zoom-api][list-webinars] Priority queue: ${webinarsNeedingTiming.length} need timing, ${webinarsWithTiming.length} have timing`);
        
        // Process priority webinars first (those needing timing data)
        if (webinarsNeedingTiming.length > 0) {
          enhancedWebinars = await processBatchedEnhancement(
            webinarsNeedingTiming, 
            token, 
            supabase, 
            user.id, 
            PRIORITY_BATCH_SIZE,
            enhancementStartTime
          );
          
          // Merge with webinars that already have timing data
          enhancedWebinars = [...enhancedWebinars, ...webinarsWithTiming];
        }
        
        console.log(`[zoom-api][list-webinars] ✅ BATCH ENHANCEMENT COMPLETED successfully in ${Date.now() - enhancementStartTime}ms`);
        
        // Calculate enhancement results
        const timingCount = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration).length;
        const hostCount = enhancedWebinars.filter(w => w.host_email || w.host_name).length;
        
        enhancementStats = {
          totalProcessed: enhancedWebinars.length,
          actualTimingAdded: timingCount,
          hostInfoAdded: hostCount,
          errors: []
        };
        
        console.log(`[zoom-api][list-webinars] 📊 BATCH RESULTS:`);
        console.log(`[zoom-api][list-webinars] - 🎯 ACTUAL TIMING DATA: ${timingCount}/${allWebinars.length} webinars (${Math.round((timingCount/allWebinars.length)*100)}%) - CRITICAL SUCCESS METRIC`);
        console.log(`[zoom-api][list-webinars] - Host info: ${hostCount}/${allWebinars.length} webinars (${Math.round((hostCount/allWebinars.length)*100)}%)`);
        
      } catch (error) {
        console.error(`[zoom-api][list-webinars] ❌ ENHANCEMENT FAILED after ${Date.now() - enhancementStartTime}ms:`, error.message);
        
        // Circuit breaker: Continue with basic webinar data
        enhancedWebinars = allWebinars;
        console.log(`[zoom-api][list-webinars] 🔄 CIRCUIT BREAKER: Continuing with ${enhancedWebinars.length} basic webinar records`);
        
        enhancementStats.errors.push(`Enhancement failed: ${error.message}`);
      }
      
      // Database upsert with batch processing
      console.log(`[zoom-api][list-webinars] Starting OPTIMIZED database upsert (${Date.now() - startTime}ms elapsed)`);
      try {
        syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
        console.log(`[zoom-api][list-webinars] ✅ Database upsert completed: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated, ${syncResults.preservedWebinars} preserved`);
      } catch (error) {
        console.error('[zoom-api][list-webinars] Database upsert failed:', error);
        throw new Error(`Database update failed: ${error.message}`);
      }
      
      // Calculate comprehensive statistics
      try {
        statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);
      } catch (error) {
        console.warn('[zoom-api][list-webinars] Stats calculation failed:', error);
      }
      
      // Record sync history with enhancement statistics
      const totalTime = Date.now() - startTime;
      try {
        await recordSyncHistory(
          supabase,
          user.id,
          'webinars',
          enhancementStats.errors.length > 0 ? 'warning' : 'success',
          syncResults.newWebinars + syncResults.updatedWebinars,
          `BATCH-PROCESSED sync completed in ${totalTime}ms: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated, ${syncResults.preservedWebinars} preserved. TIMING DATA: ${enhancementStats.actualTimingAdded}/${allWebinars.length} webinars (${Math.round((enhancementStats.actualTimingAdded/allWebinars.length)*100)}%). Total: ${statsResult.totalWebinarsInDB} webinars in database.${enhancementStats.errors.length > 0 ? ` Errors: ${enhancementStats.errors.length}` : ''}`
        );
      } catch (error) {
        console.warn('[zoom-api][list-webinars] Sync history recording failed:', error);
      }
      
      console.log(`[zoom-api][list-webinars] 🎉 BATCH-PROCESSED SYNC COMPLETED successfully in ${totalTime}ms`);
      console.log(`[zoom-api][list-webinars] 🎯 FINAL TIMING DATA STATUS: ${enhancementStats.actualTimingAdded}/${allWebinars.length} webinars have actual timing data`);
    } else {
      // Handle empty sync result
      await handleEmptySync(supabase, user.id, syncResults, statsResult);
    }
    
    // Get final webinar list to return
    const finalWebinarsList = await getFinalWebinarsList(supabase, user.id);
    
    const totalOperationTime = Date.now() - startTime;
    console.log(`[zoom-api][list-webinars] 🏁 Total BATCH-PROCESSED operation completed in ${totalOperationTime}ms`);
    
    return formatListWebinarsResponse(finalWebinarsList, allWebinars, syncResults, statsResult);
    
  } catch (error) {
    const operationTime = Date.now() - startTime;
    console.error(`[zoom-api][list-webinars] ❌ CRITICAL ERROR in BATCH-PROCESSED sync after ${operationTime}ms:`, error);
    
    // Enhanced error categorization
    let errorCategory = 'unknown';
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      errorCategory = 'timeout';
      errorMessage = `Operation timed out after ${operationTime}ms. The sync process has been optimized for large datasets. Please try again.`;
      statusCode = 408;
    } else if (errorMessage.includes('credentials') || errorMessage.includes('token') || errorMessage.includes('Authentication')) {
      errorCategory = 'authentication';
      errorMessage = 'Authentication failed. Please check your Zoom credentials and try again.';
      statusCode = 401;
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      errorCategory = 'rate_limit';
      errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      statusCode = 429;
    } else if (errorMessage.includes('Database') || errorMessage.includes('database')) {
      errorCategory = 'database';
      errorMessage = 'Database error occurred. Please try again.';
      statusCode = 503;
    }
    
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
    
    // Record failed sync in history
    try {
      await recordSyncHistory(
        supabase,
        user.id,
        'webinars',
        'error',
        0,
        `BATCH-PROCESSED sync ${errorCategory}: ${errorMessage} (after ${operationTime}ms). Original error: ${error.message}`
      );
    } catch (historyError) {
      console.warn('[zoom-api][list-webinars] Failed to record error in sync history:', historyError);
    }
    
    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// NEW: Batch processing function with circuit breaker pattern
async function processBatchedEnhancement(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string, 
  batchSize: number,
  startTime: number
): Promise<any[]> {
  console.log(`[zoom-api][batch-enhancement] Starting batch processing for ${webinars.length} webinars in batches of ${batchSize}`);
  
  const enhancedWebinars = [...webinars];
  const batches = [];
  
  // Split into batches
  for (let i = 0; i < webinars.length; i += batchSize) {
    batches.push(webinars.slice(i, i + batchSize));
  }
  
  console.log(`[zoom-api][batch-enhancement] Created ${batches.length} batches for processing`);
  
  // Process each batch with timeout protection
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchStartTime = Date.now();
    const remainingTime = ENHANCEMENT_TIMEOUT - (batchStartTime - startTime);
    
    if (remainingTime <= 5000) { // Less than 5 seconds remaining
      console.warn(`[zoom-api][batch-enhancement] ⏰ Insufficient time remaining (${remainingTime}ms), stopping batch processing`);
      break;
    }
    
    console.log(`[zoom-api][batch-enhancement] Processing batch ${i + 1}/${batches.length} (${batch.length} webinars)`);
    
    try {
      // Import and use the existing enhancement function but with timeout
      const { enhanceWebinarsWithAllData } = await import('./sync/webinarEnhancementOrchestrator.ts');
      
      const batchTimeout = Math.min(15000, remainingTime - 1000); // 15s max or remaining time minus 1s buffer
      const enhancementPromise = enhanceWebinarsWithAllData(batch, token, supabase, userId);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Batch ${i + 1} timeout`)), batchTimeout)
      );
      
      const enhancedBatch = await Promise.race([enhancementPromise, timeoutPromise]);
      
      // Replace the batch in the enhanced webinars array
      const startIdx = i * batchSize;
      for (let j = 0; j < enhancedBatch.length; j++) {
        if (startIdx + j < enhancedWebinars.length) {
          enhancedWebinars[startIdx + j] = enhancedBatch[j];
        }
      }
      
      console.log(`[zoom-api][batch-enhancement] ✅ Batch ${i + 1} completed in ${Date.now() - batchStartTime}ms`);
      
    } catch (error) {
      console.error(`[zoom-api][batch-enhancement] ❌ Batch ${i + 1} failed:`, error.message);
      
      // Circuit breaker: Continue with next batch instead of failing entirely
      if (error.message.includes('timeout')) {
        console.log(`[zoom-api][batch-enhancement] ⏰ Batch ${i + 1} timed out, continuing with remaining batches`);
      } else {
        console.log(`[zoom-api][batch-enhancement] 🔄 Batch ${i + 1} failed, continuing with remaining batches`);
      }
    }
  }
  
  console.log(`[zoom-api][batch-enhancement] Batch processing completed for ${enhancedWebinars.length} webinars`);
  return enhancedWebinars;
}
