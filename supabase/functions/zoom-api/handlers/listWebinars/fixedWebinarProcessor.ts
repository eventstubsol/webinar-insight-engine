
import { fetchWebinarsFromZoomAPI, performNonDestructiveUpsert } from '../sync/nonDestructiveSync.ts';
import { syncBasicWebinarData, enhanceWithPastWebinarData } from '../sync/basicWebinarSyncer.ts';
import { calculateSyncStats, recordSyncHistory } from '../sync/syncStatsCalculator.ts';
import { formatListWebinarsResponse, logWebinarStatistics, SyncResults, StatsResult } from '../sync/responseFormatter.ts';
import { logCompletionAnalysis, logEnhancementResults } from './debugLogger.ts';
import { syncFixedWebinarInstancesForWebinars } from '../sync/fixedWebinarInstanceSyncer.ts';
import { collectWebinarsFromAllSources } from '../fixedListWebinars/webinarDataCollector.ts';

export interface FixedWebinarProcessingResult {
  syncResults: SyncResults;
  statsResult: StatsResult;
  allWebinars: any[];
  enhancedCount: number;
  completedCount: number;
  historicalCount: number;
  upcomingCount: number;
  instanceSyncResults: {
    totalInstancesSynced: number;
    webinarsWithInstancessynced: number;
    instanceSyncErrors: number;
    actualDataFetched: number;
    apiCallsSuccessful: number;
    apiCallsFailed: number;
  };
}

export async function processFixedWebinars(
  token: string,
  meData: any,
  supabase: any,
  user: any,
  existingWebinars: any[]
): Promise<FixedWebinarProcessingResult> {
  console.log(`[fixed-webinar-processor] 🚀 Starting FIXED webinar processing with CORRECT Zoom API endpoints`);
  console.log(`[fixed-webinar-processor] 📋 Following: https://developers.zoom.us/docs/api/meetings/#tag/webinars/`);
  
  // STEP 1: Fetch webinars using the corrected data collector
  console.log(`[fixed-webinar-processor] 🚀 STEP 1: Fetching webinars from Zoom API`);
  const allWebinars = await collectWebinarsFromAllSources(token, meData.id);
  
  console.log(`[fixed-webinar-processor] 📊 API COLLECTION RESULTS:`);
  console.log(`[fixed-webinar-processor]   - Total webinars from API: ${allWebinars.length}`);
  
  if (allWebinars.length === 0) {
    console.warn(`[fixed-webinar-processor] ⚠️ WARNING: No webinars fetched from Zoom API!`);
    console.warn(`[fixed-webinar-processor] This could indicate:`);
    console.warn(`[fixed-webinar-processor]   - API credentials issues`);
    console.warn(`[fixed-webinar-processor]   - Missing OAuth scopes`);
    console.warn(`[fixed-webinar-processor]   - No webinars exist in Zoom account`);
  }
  
  logWebinarStatistics(allWebinars);
  
  // STEP 1.5: Comprehensive completion analysis
  console.log(`[fixed-webinar-processor] 🔍 STEP 1.5: Comprehensive completion analysis`);
  const completionAnalysis = logCompletionAnalysis(allWebinars);
  
  // Log data source breakdown
  const historicalWebinars = allWebinars.filter(w => w._is_historical === true);
  const upcomingWebinars = allWebinars.filter(w => w._is_historical === false);
  console.log(`[fixed-webinar-processor] 📊 DATA SOURCE BREAKDOWN:`);
  console.log(`[fixed-webinar-processor]   - Historical webinars (from reporting API): ${historicalWebinars.length}`);
  console.log(`[fixed-webinar-processor]   - Upcoming webinars (from standard API): ${upcomingWebinars.length}`);
  console.log(`[fixed-webinar-processor]   - Total webinars: ${allWebinars.length}`);
  
  let syncResults: SyncResults = { newWebinars: 0, updatedWebinars: 0, preservedWebinars: 0 };
  let statsResult: StatsResult = {
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
  
  if (allWebinars && allWebinars.length > 0) {
    // STEP 2: Process basic webinar data
    console.log(`[fixed-webinar-processor] 📊 STEP 2: Processing ${allWebinars.length} webinars with FIXED field mapping`);
    const basicWebinars = await syncBasicWebinarData(allWebinars, token, user.id);
    
    // STEP 3: Enhanced with past webinar data
    console.log(`[fixed-webinar-processor] 🎯 STEP 3: Enhancing completed webinars with CORRECT API endpoint data`);
    console.log(`[fixed-webinar-processor] 📈 Expected to enhance: ${completionAnalysis.completed.length} completed webinars`);
    
    const enhancedWebinars = await enhanceWithPastWebinarData(basicWebinars, token);
    
    // STEP 3.5: Log enhancement results
    logEnhancementResults(enhancedWebinars);
    
    // STEP 4: Store in database
    console.log(`[fixed-webinar-processor] 💾 STEP 4: Storing webinars in database with FIXED field mapping`);
    syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
    
    // STEP 5: CORRECT API INSTANCE SYNC - Focus on proper end_time collection
    console.log(`[fixed-webinar-processor] 🎯 STEP 5: CORRECT API instance sync with proper end_time calculation`);
    console.log(`[fixed-webinar-processor] 📡 Using correct Zoom API endpoints: GET /webinars/{id} and GET /webinars/{id}/instances`);
    console.log(`[fixed-webinar-processor] 📋 API COMPLIANCE: Following official Zoom API documentation`);
    instanceSyncResults = await syncFixedWebinarInstancesForWebinars(enhancedWebinars, token, supabase, user.id);
    
    // Calculate comprehensive statistics
    statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);
  } else {
    console.warn(`[fixed-webinar-processor] ⚠️ No webinars to process - skipping database operations`);
  }
  
  const enhancedCount = allWebinars.filter(w => w._enhanced_with_past_data === true).length;
  const completedCount = completionAnalysis.completed.length;
  
  console.log(`[fixed-webinar-processor] 🎉 CORRECT API PROCESSING COMPLETE:`);
  console.log(`[fixed-webinar-processor]   - Webinars collected from API: ${allWebinars.length}`);
  console.log(`[fixed-webinar-processor]   - Webinars synced to DB: ${syncResults.newWebinars + syncResults.updatedWebinars}`);
  console.log(`[fixed-webinar-processor]   - Instances synced: ${instanceSyncResults.totalInstancesSynced}`);
  console.log(`[fixed-webinar-processor]   - Successful API calls: ${instanceSyncResults.apiCallsSuccessful}`);
  console.log(`[fixed-webinar-processor]   - Failed API calls: ${instanceSyncResults.apiCallsFailed}`);
  console.log(`[fixed-webinar-processor] 📋 API COMPLIANCE: All calls use correct Zoom webinar endpoints`);
  
  return {
    syncResults,
    statsResult,
    allWebinars,
    enhancedCount,
    completedCount,
    historicalCount: historicalWebinars.length,
    upcomingCount: upcomingWebinars.length,
    instanceSyncResults
  };
}
