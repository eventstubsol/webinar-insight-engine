
import { corsHeaders } from '../../cors.ts';
import { getZoomJwtToken } from '../../auth.ts';
import { checkDatabaseCache } from '../sync/databaseCache.ts';
import { fetchUserInfo } from '../sync/userInfoFetcher.ts';
import { handleEmptySync } from '../sync/emptySyncHandler.ts';
import { validateZoomScopes } from '../sync/scopeValidator.ts';
import { processEnhancedWebinars } from './enhancedWebinarProcessor.ts';
import { recordComprehensiveSync, recordFailedSync } from './syncHistoryManager.ts';
import { buildFinalResponse } from './responseBuilder.ts';

export async function handleEnhancedListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[enhanced-zoom-api][list-webinars] 🚀 ENHANCED SYNC: Starting comprehensive webinar sync with improved end_time calculation`);
  console.log(`[enhanced-zoom-api][list-webinars] 🎯 ENHANCED FEATURES: Better API handling, enhanced error recovery, improved end_time population`);
  console.log(`[enhanced-zoom-api][list-webinars] Force sync: ${force_sync}, User: ${user.id}`);
  console.log(`[enhanced-zoom-api][list-webinars] Current timestamp: ${new Date().toISOString()}`);
  
  try {
    // Check database cache first if not forcing sync
    const cacheResult = await checkDatabaseCache(supabase, user.id, force_sync);
    if (cacheResult.shouldUseCachedData) {
      console.log(`[enhanced-zoom-api][list-webinars] 📦 Using cached data, skipping enhanced sync`);
      return new Response(JSON.stringify(cacheResult.cacheResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get token and validate scopes
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    console.log('[enhanced-zoom-api][list-webinars] Got Zoom token, validating scopes');
    
    // ENHANCED: Validate OAuth scopes for historical data access
    const scopeValidation = await validateZoomScopes(token);
    console.log(`[enhanced-zoom-api][list-webinars] 🔐 ENHANCED SCOPE VALIDATION RESULTS:`);
    console.log(`[enhanced-zoom-api][list-webinars]   - Has required scopes: ${scopeValidation.hasRequiredScopes}`);
    console.log(`[enhanced-zoom-api][list-webinars]   - Has reporting access: ${scopeValidation.hasReportingAccess}`);
    console.log(`[enhanced-zoom-api][list-webinars]   - Missing scopes: ${scopeValidation.missingScopes.join(', ')}`);
    
    if (!scopeValidation.hasRequiredScopes) {
      console.warn(`[enhanced-zoom-api][list-webinars] ⚠️ Missing required OAuth scopes for full functionality`);
      scopeValidation.recommendations.forEach(rec => {
        console.warn(`[enhanced-zoom-api][list-webinars] 💡 Recommendation: ${rec}`);
      });
    }
    
    const meData = await fetchUserInfo(token);
    console.log(`[enhanced-zoom-api][list-webinars] Got user info for: ${meData.email}, ID: ${meData.id}`);

    // Get existing webinars for comparison
    const { data: existingWebinars, error: existingError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id);
      
    if (existingError) {
      console.error('[enhanced-zoom-api][list-webinars] Error fetching existing webinars:', existingError);
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
      instanceSyncErrors: 0
    };
    
    // Process webinars with enhanced logic
    const processingResult = await processEnhancedWebinars(
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
      
      // Record enhanced sync in history with detailed information
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
    
    // Build and return enhanced final response
    const response = await buildFinalResponse(
      supabase,
      user.id,
      processingResult?.allWebinars || [],
      syncResults,
      statsResult,
      scopeValidation,
      instanceSyncResults
    );
    
    console.log(`[enhanced-zoom-api][list-webinars] 🎉 ENHANCED SYNC COMPLETE: ${instanceSyncResults.totalInstancesSynced} instances synced with improved end_time data`);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[enhanced-zoom-api][list-webinars] ❌ Error in ENHANCED SYNC action:', error);
    
    // Record failed sync in history
    await recordFailedSync(supabase, user.id, error);
    
    throw error;
  }
}
