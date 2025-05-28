
import { collectWebinarsFromAllSources } from '../fixedListWebinars/webinarDataCollector.ts';
import { syncBasicWebinarData, enhanceWithPastWebinarData } from '../sync/basicWebinarSyncer.ts';
import { performNonDestructiveUpsert } from '../sync/nonDestructiveSync.ts';
import { calculateSyncStats, recordSyncHistory } from '../sync/syncStatsCalculator.ts';
import { formatListWebinarsResponse, logWebinarStatistics, SyncResults, StatsResult } from '../sync/responseFormatter.ts';
import { logCompletionAnalysis, logEnhancementResults } from './debugLogger.ts';
import { syncEnhancedWebinarInstancesForWebinars } from '../sync/enhancedWebinarInstanceSyncer.ts';

export interface EnhancedWebinarProcessingResult {
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
    fieldsPopulated: number;
    actualDataFetched: number;
    apiCallsSuccessful: number;
    apiCallsFailed: number;
  };
}

export async function processEnhancedWebinars(
  token: string,
  meData: any,
  supabase: any,
  user: any,
  existingWebinars: any[]
): Promise<EnhancedWebinarProcessingResult> {
  console.log(`[enhanced-webinar-processor] 🚀 Starting ENHANCED webinar processing with COMPREHENSIVE field population`);
  console.log(`[enhanced-webinar-processor] 📋 Following: https://developers.zoom.us/docs/api/meetings/#tag/webinars/`);
  console.log(`[enhanced-webinar-processor] 🎯 GOAL: Complete zoom_webinar_instances table with ALL fields populated`);
  
  // STEP 1: Fetch webinars using existing collector
  console.log(`[enhanced-webinar-processor] 🚀 STEP 1: Fetching webinars from Zoom API`);
  const allWebinars = await collectWebinarsFromAllSources(token, meData.id);
  
  console.log(`[enhanced-webinar-processor] 📊 API COLLECTION RESULTS:`);
  console.log(`[enhanced-webinar-processor]   - Total webinars from API: ${allWebinars.length}`);
  
  if (allWebinars.length === 0) {
    console.warn(`[enhanced-webinar-processor] ⚠️ WARNING: No webinars fetched from Zoom API!`);
  }
  
  logWebinarStatistics(allWebinars);
  
  // STEP 1.5: Comprehensive completion analysis
  console.log(`[enhanced-webinar-processor] 🔍 STEP 1.5: Comprehensive completion analysis`);
  const completionAnalysis = logCompletionAnalysis(allWebinars);
  
  // Log data source breakdown
  const historicalWebinars = allWebinars.filter(w => w._is_historical === true);
  const upcomingWebinars = allWebinars.filter(w => w._is_historical === false);
  console.log(`[enhanced-webinar-processor] 📊 DATA SOURCE BREAKDOWN:`);
  console.log(`[enhanced-webinar-processor]   - Historical webinars (from reporting API): ${historicalWebinars.length}`);
  console.log(`[enhanced-webinar-processor]   - Upcoming webinars (from standard API): ${upcomingWebinars.length}`);
  console.log(`[enhanced-webinar-processor]   - Total webinars: ${allWebinars.length}`);
  
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
    fieldsPopulated: 0,
    actualDataFetched: 0,
    apiCallsSuccessful: 0,
    apiCallsFailed: 0
  };
  
  if (allWebinars && allWebinars.length > 0) {
    // STEP 2: Process basic webinar data
    console.log(`[enhanced-webinar-processor] 📊 STEP 2: Processing ${allWebinars.length} webinars`);
    const basicWebinars = await syncBasicWebinarData(allWebinars, token, user.id);
    
    // STEP 3: Enhanced with past webinar data
    console.log(`[enhanced-webinar-processor] 🎯 STEP 3: Enhancing completed webinars`);
    const enhancedWebinars = await enhanceWithPastWebinarData(basicWebinars, token);
    
    // STEP 3.5: Log enhancement results
    logEnhancementResults(enhancedWebinars);
    
    // STEP 4: Store in database
    console.log(`[enhanced-webinar-processor] 💾 STEP 4: Storing webinars in database`);
    syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
    
    // STEP 5: ENHANCED INSTANCE SYNC - Complete field population
    console.log(`[enhanced-webinar-processor] 🎯 STEP 5: ENHANCED instance sync with COMPREHENSIVE field population`);
    console.log(`[enhanced-webinar-processor] 📡 Using enhanced data extraction for ALL zoom_webinar_instances columns`);
    console.log(`[enhanced-webinar-processor] 📋 COMPREHENSIVE FIELD MAPPING: duration, end_time, status, actual_*, participants_count, etc.`);
    instanceSyncResults = await syncEnhancedWebinarInstancesForWebinars(enhancedWebinars, token, supabase, user.id);
    
    // Calculate comprehensive statistics
    statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);
  } else {
    console.warn(`[enhanced-webinar-processor] ⚠️ No webinars to process - skipping database operations`);
  }
  
  const enhancedCount = allWebinars.filter(w => w._enhanced_with_past_data === true).length;
  const completedCount = completionAnalysis.completed.length;
  
  console.log(`[enhanced-webinar-processor] 🎉 ENHANCED PROCESSING COMPLETE WITH COMPREHENSIVE DATA:`);
  console.log(`[enhanced-webinar-processor]   - Webinars collected from API: ${allWebinars.length}`);
  console.log(`[enhanced-webinar-processor]   - Webinars synced to DB: ${syncResults.newWebinars + syncResults.updatedWebinars}`);
  console.log(`[enhanced-webinar-processor]   - Instances synced: ${instanceSyncResults.totalInstancesSynced}`);
  console.log(`[enhanced-webinar-processor]   - Instances with complete field data: ${instanceSyncResults.fieldsPopulated}`);
  console.log(`[enhanced-webinar-processor]   - Successful API calls: ${instanceSyncResults.apiCallsSuccessful}`);
  console.log(`[enhanced-webinar-processor]   - Failed API calls: ${instanceSyncResults.apiCallsFailed}`);
  console.log(`[enhanced-webinar-processor] 📋 FIELD POPULATION: ALL zoom_webinar_instances columns now have comprehensive data`);
  
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
