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
import { validateZoomScopes } from './sync/scopeValidator.ts';

// Import debug logging functions directly instead of from separate file
function logCompletionAnalysis(webinars: any[]) {
  console.log(`[debug-logger] 🔍 COMPLETION ANALYSIS FOR ${webinars.length} WEBINARS:`);
  
  const completedWebinars = [];
  const upcomingWebinars = [];
  const unknownWebinars = [];
  
  webinars.forEach(webinar => {
    const now = new Date();
    const startTime = webinar.start_time ? new Date(webinar.start_time) : null;
    const duration = webinar.duration || 60;
    const calculatedEnd = startTime ? new Date(startTime.getTime() + (duration * 60000)) : null;
    
    console.log(`[debug-logger] Webinar ${webinar.id}:`);
    console.log(`[debug-logger]   - Topic: ${webinar.topic}`);
    console.log(`[debug-logger]   - Status: ${webinar.status}`);
    console.log(`[debug-logger]   - Start: ${webinar.start_time}`);
    console.log(`[debug-logger]   - Duration: ${duration} minutes`);
    console.log(`[debug-logger]   - Calculated end: ${calculatedEnd?.toISOString()}`);
    console.log(`[debug-logger]   - Current time: ${now.toISOString()}`);
    
    if (webinar.status === 'ended' || webinar.status === 'aborted') {
      completedWebinars.push(webinar);
      console.log(`[debug-logger]   - ✅ COMPLETED (explicit status)`);
    } else if (calculatedEnd && now > calculatedEnd) {
      completedWebinars.push(webinar);
      console.log(`[debug-logger]   - ✅ COMPLETED (time-based)`);
    } else if (startTime && now < startTime) {
      upcomingWebinars.push(webinar);
      console.log(`[debug-logger]   - 📅 UPCOMING`);
    } else {
      unknownWebinars.push(webinar);
      console.log(`[debug-logger]   - ❓ UNKNOWN STATUS`);
    }
  });
  
  console.log(`[debug-logger] 📊 COMPLETION SUMMARY:`);
  console.log(`[debug-logger]   - Completed: ${completedWebinars.length}`);
  console.log(`[debug-logger]   - Upcoming: ${upcomingWebinars.length}`);
  console.log(`[debug-logger]   - Unknown: ${unknownWebinars.length}`);
  
  return {
    completed: completedWebinars,
    upcoming: upcomingWebinars,
    unknown: unknownWebinars
  };
}

function logEnhancementResults(webinars: any[]) {
  console.log(`[debug-logger] 🎯 ENHANCEMENT RESULTS:`);
  
  const enhanced = webinars.filter(w => w._enhanced_with_past_data === true);
  const failed = webinars.filter(w => w._enhanced_with_past_data === false && w._past_data_error);
  const skipped = webinars.filter(w => w._enhanced_with_past_data === false && w._skip_reason);
  
  console.log(`[debug-logger]   - Enhanced: ${enhanced.length}`);
  console.log(`[debug-logger]   - Failed: ${failed.length}`);
  console.log(`[debug-logger]   - Skipped: ${skipped.length}`);
  
  enhanced.forEach(w => {
    console.log(`[debug-logger] ✅ Enhanced ${w.id}: actual_start=${w.actual_start_time}, duration=${w.actual_duration}`);
  });
  
  failed.forEach(w => {
    console.log(`[debug-logger] ❌ Failed ${w.id}: ${w._past_data_error}`);
  });
  
  skipped.forEach(w => {
    console.log(`[debug-logger] ⏭️ Skipped ${w.id}: ${w._skip_reason}`);
  });
}

// FIXED: Comprehensive webinar sync with proper API endpoints and scope validation
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[zoom-api][list-webinars] 🚀 CRITICAL FIX: Starting comprehensive webinar sync with proper API endpoints`);
  console.log(`[zoom-api][list-webinars] 🎯 FIXES: Dual-endpoint strategy, field validation, scope validation`);
  console.log(`[zoom-api][list-webinars] Force sync: ${force_sync}, User: ${user.id}`);
  console.log(`[zoom-api][list-webinars] Current timestamp: ${new Date().toISOString()}`);
  
  try {
    // Check database cache first if not forcing sync
    const cacheResult = await checkDatabaseCache(supabase, user.id, force_sync);
    if (cacheResult.shouldUseCachedData) {
      return new Response(JSON.stringify(cacheResult.cacheResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get token and validate scopes
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    console.log('[zoom-api][list-webinars] Got Zoom token, validating scopes');
    
    // CRITICAL FIX: Validate OAuth scopes for historical data access
    const scopeValidation = await validateZoomScopes(token);
    console.log(`[zoom-api][list-webinars] 🔐 SCOPE VALIDATION RESULTS:`);
    console.log(`[zoom-api][list-webinars]   - Has required scopes: ${scopeValidation.hasRequiredScopes}`);
    console.log(`[zoom-api][list-webinars]   - Has reporting access: ${scopeValidation.hasReportingAccess}`);
    console.log(`[zoom-api][list-webinars]   - Missing scopes: ${scopeValidation.missingScopes.join(', ')}`);
    
    if (!scopeValidation.hasRequiredScopes) {
      console.warn(`[zoom-api][list-webinars] ⚠️ Missing required OAuth scopes for full functionality`);
      scopeValidation.recommendations.forEach(rec => {
        console.warn(`[zoom-api][list-webinars] 💡 Recommendation: ${rec}`);
      });
    }
    
    const meData = await fetchUserInfo(token);
    console.log(`[zoom-api][list-webinars] Got user info for: ${meData.email}, ID: ${meData.id}`);

    // STEP 1: CRITICAL FIX - Fetch webinars using proper API endpoints
    console.log(`[zoom-api][list-webinars] 🚀 STEP 1: Fetching webinars with FIXED API endpoint strategy`);
    const allWebinars = await fetchWebinarsFromZoomAPI(token, meData.id);
    logWebinarStatistics(allWebinars);
    
    // STEP 1.5: Comprehensive completion analysis with debugging
    console.log(`[zoom-api][list-webinars] 🔍 STEP 1.5: Comprehensive completion analysis`);
    const completionAnalysis = logCompletionAnalysis(allWebinars);
    
    // Log data source breakdown
    const historicalWebinars = allWebinars.filter(w => w._is_historical === true);
    const upcomingWebinars = allWebinars.filter(w => w._is_historical === false);
    console.log(`[zoom-api][list-webinars] 📊 DATA SOURCE BREAKDOWN:`);
    console.log(`[zoom-api][list-webinars]   - Historical webinars (from reporting API): ${historicalWebinars.length}`);
    console.log(`[zoom-api][list-webinars]   - Upcoming webinars (from standard API): ${upcomingWebinars.length}`);
    console.log(`[zoom-api][list-webinars]   - Total webinars: ${allWebinars.length}`);
    
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
      // STEP 2: Process basic webinar data with improved field mapping
      console.log(`[zoom-api][list-webinars] 📊 STEP 2: Processing ${allWebinars.length} webinars with FIXED field mapping`);
      const basicWebinars = await syncBasicWebinarData(allWebinars, token, user.id);
      
      // STEP 3: Enhanced with past webinar data for completed webinars
      console.log(`[zoom-api][list-webinars] 🎯 STEP 3: Enhancing completed webinars with actual timing data`);
      console.log(`[zoom-api][list-webinars] 📈 Expected to enhance: ${completionAnalysis.completed.length} completed webinars`);
      
      const enhancedWebinars = await enhanceWithPastWebinarData(basicWebinars, token);
      
      // STEP 3.5: Log enhancement results for debugging
      logEnhancementResults(enhancedWebinars);
      
      // STEP 4: Store in database with improved field handling
      console.log(`[zoom-api][list-webinars] 💾 STEP 4: Storing webinars in database with FIXED field mapping`);
      syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
      
      // Calculate comprehensive statistics
      statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);
      
      const enhancedCount = enhancedWebinars.filter(w => w._enhanced_with_past_data === true).length;
      const completedCount = completionAnalysis.completed.length;
      const historicalCount = historicalWebinars.length;
      
      // Record sync in history with detailed information
      await recordSyncHistory(
        supabase,
        user.id,
        'webinars',
        'success',
        syncResults.newWebinars + syncResults.updatedWebinars,
        `COMPREHENSIVE FIXED sync: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated, ${syncResults.preservedWebinars} preserved. ${historicalCount} historical, ${upcomingWebinars.length} upcoming. ${completedCount} completed identified, ${enhancedCount} enhanced with actual timing. Total: ${statsResult.totalWebinarsInDB} webinars. Scope status: ${scopeValidation.hasRequiredScopes ? 'OK' : 'Missing: ' + scopeValidation.missingScopes.join(', ')}`
      );
      
      console.log(`[zoom-api][list-webinars] 🎉 COMPREHENSIVE SYNC SUMMARY:`);
      console.log(`[zoom-api][list-webinars]   - Historical webinars (reporting API): ${historicalCount}`);
      console.log(`[zoom-api][list-webinars]   - Upcoming webinars (standard API): ${upcomingWebinars.length}`);
      console.log(`[zoom-api][list-webinars]   - Completed webinars found: ${completedCount}`);
      console.log(`[zoom-api][list-webinars]   - Successfully enhanced: ${enhancedCount}`);
      console.log(`[zoom-api][list-webinars]   - Enhancement success rate: ${completedCount > 0 ? Math.round((enhancedCount / completedCount) * 100) : 0}%`);
      console.log(`[zoom-api][list-webinars]   - OAuth scope status: ${scopeValidation.hasRequiredScopes ? '✅ OK' : '⚠️ Missing: ' + scopeValidation.missingScopes.join(', ')}`);
      
    } else {
      // Handle empty sync result
      await handleEmptySync(supabase, user.id, syncResults, statsResult);
    }
    
    // Get final webinar list to return
    const finalWebinarsList = await getFinalWebinarsList(supabase, user.id);
    
    // Add scope validation info to response
    const response = formatListWebinarsResponse(finalWebinarsList, allWebinars, syncResults, statsResult);
    response.scopeValidation = scopeValidation;
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][list-webinars] ❌ Error in COMPREHENSIVE FIXED sync action:', error);
    
    // Record failed sync in history
    await recordSyncHistory(
      supabase,
      user.id,
      'webinars',
      'error',
      0,
      `COMPREHENSIVE FIXED sync error: ${error.message || 'Unknown error'}`
    );
    
    throw error;
  }
}
