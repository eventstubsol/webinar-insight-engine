
import { corsHeaders } from '../../cors.ts';
import { getZoomJwtToken } from '../../auth.ts';
import { checkDatabaseCache } from '../sync/databaseCache.ts';
import { fetchUserInfo } from '../sync/userInfoFetcher.ts';
import { handleEmptySync } from '../sync/emptySyncHandler.ts';
import { validateZoomScopes } from '../sync/scopeValidator.ts';
import { processFixedWebinars } from './fixedWebinarProcessor.ts';
import { recordComprehensiveSync, recordFailedSync } from './syncHistoryManager.ts';
import { buildFinalResponse } from './responseBuilder.ts';

export async function handleFixedListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[fixed-zoom-api][list-webinars] 🚀 FIXED SYNC: Starting webinar sync with ACTUAL END_TIME data collection`);
  console.log(`[fixed-zoom-api][list-webinars] 🎯 FIXED FEATURES: Proper completion detection, actual timing data from Zoom API`);
  console.log(`[fixed-zoom-api][list-webinars] Force sync: ${force_sync}, User: ${user.id}`);
  console.log(`[fixed-zoom-api][list-webinars] Current timestamp: ${new Date().toISOString()}`);
  
  try {
    // Check database cache first if not forcing sync
    const cacheResult = await checkDatabaseCache(supabase, user.id, force_sync);
    if (cacheResult.shouldUseCachedData) {
      console.log(`[fixed-zoom-api][list-webinars] 📦 Using cached data, skipping fixed sync`);
      return new Response(JSON.stringify(cacheResult.cacheResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get token and validate scopes
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    console.log('[fixed-zoom-api][list-webinars] Got Zoom token, validating scopes');
    
    // FIXED: Validate OAuth scopes for historical data access
    const scopeValidation = await validateZoomScopes(token);
    console.log(`[fixed-zoom-api][list-webinars] 🔐 FIXED SCOPE VALIDATION RESULTS:`);
    console.log(`[fixed-zoom-api][list-webinars]   - Has required scopes: ${scopeValidation.hasRequiredScopes}`);
    console.log(`[fixed-zoom-api][list-webinars]   - Has reporting access: ${scopeValidation.hasReportingAccess}`);
    console.log(`[fixed-zoom-api][list-webinars]   - Missing scopes: ${scopeValidation.missingScopes.join(', ')}`);
    
    if (!scopeValidation.hasRequiredScopes) {
      console.warn(`[fixed-zoom-api][list-webinars] ⚠️ Missing required OAuth scopes for full functionality`);
      scopeValidation.recommendations.forEach(rec => {
        console.warn(`[fixed-zoom-api][list-webinars] 💡 Recommendation: ${rec}`);
      });
    }
    
    const meData = await fetchUserInfo(token);
    console.log(`[fixed-zoom-api][list-webinars] Got user info for: ${meData.email}, ID: ${meData.id}`);

    // Get existing webinars for comparison
    const { data: existingWebinars, error: existingError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id);
      
    if (existingError) {
      console.error('[fixed-zoom-api][list-webinars] Error fetching existing webinars:', existingError);
    }
    
    let syncResults = { newWebinars: 0, updatedWebinars: 0, preservedWebinars: 0 };
    let statsResult = {
      totalWebinarsInDB: 0,
      oldestPreservedDate: null,
      newestWebinarDate: null,
      dataRange: { oldest: null, newest: null }
    };
    let instanceSyncResults = {
      totalInstancesSynced: 0,
      webinarsWithInstancessynced: 0,
      instanceSyncErrors: 0,
      actualDataFetched: 0,
      apiCallsSuccessful: 0,
      apiCallsFailed: 0
    };
    
    // Process webinars with fixed logic
    const processingResult = await processFixedWebinars(
      token,
      meData,
      supabase,
      user,
      existingWebinars || []
    );
    
    if (processingResult.allWebinars && processingResult.allWebinars.length > 0) {
      syncResults = processingResult.syncResults;
      statsResult = processingResult.statsResult;
      instanceSyncResults = processingResult.instanceSyncResults;
      
      // Record fixed sync in history with detailed information
      await recordComprehensiveSync(
        supabase,
        user.id,
        syncResults,
        processingResult.historicalCount,
        processingResult.upcomingCount,
        processingResult.completedCount,
        processingResult.enhancedCount,
        statsResult.totalWebinarsInDB,
        scopeValidation,
        instanceSyncResults
      );
    } else {
      // Handle empty sync result
      await handleEmptySync(supabase, user.id, syncResults, statsResult);
    }
    
    // Build and return fixed final response
    const response = await buildFinalResponse(
      supabase,
      user.id,
      processingResult?.allWebinars || [],
      syncResults,
      statsResult,
      scopeValidation,
      instanceSyncResults
    );
    
    console.log(`[fixed-zoom-api][list-webinars] 🎉 FIXED SYNC COMPLETE WITH ACTUAL DATA:`);
    console.log(`[fixed-zoom-api][list-webinars]   - Instances synced: ${instanceSyncResults.totalInstancesSynced}`);
    console.log(`[fixed-zoom-api][list-webinars]   - Actual data fetched: ${instanceSyncResults.actualDataFetched}`);
    console.log(`[fixed-zoom-api][list-webinars]   - Successful API calls: ${instanceSyncResults.apiCallsSuccessful}`);
    console.log(`[fixed-zoom-api][list-webinars]   - Failed API calls: ${instanceSyncResults.apiCallsFailed}`);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[fixed-zoom-api][list-webinars] ❌ Error in FIXED SYNC action:', error);
    
    // Record failed sync in history
    await recordFailedSync(supabase, user.id, error);
    
    throw error;
  }
}
