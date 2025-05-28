
import { collectWebinarsFromAllSources } from '../fixedListWebinars/webinarDataCollector.ts';
import { syncBasicWebinarData, enhanceWithPastWebinarData } from '../sync/basicWebinarSyncer.ts';
import { performNonDestructiveUpsert } from '../sync/nonDestructiveSync.ts';
import { calculateSyncStats, recordSyncHistory } from '../sync/syncStatsCalculator.ts';
import { formatListWebinarsResponse, logWebinarStatistics, SyncResults, StatsResult } from '../sync/responseFormatter.ts';
import { logCompletionAnalysis, logEnhancementResults } from './debugLogger.ts';
import { syncEnhancedWebinarInstancesForWebinars } from '../sync/enhancedWebinarInstanceSyncer.ts';
import { logInstanceSyncDebug } from '../sync/debugInstanceSync.ts';

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
  logInstanceSyncDebug('🚀 Starting ENHANCED webinar processing');
  
  // STEP 1: Fetch webinars using existing collector
  logInstanceSyncDebug('🚀 STEP 1: Fetching webinars from Zoom API');
  const allWebinars = await collectWebinarsFromAllSources(token, meData.id);
  
  logInstanceSyncDebug('📊 API COLLECTION RESULTS', {
    totalWebinars: allWebinars.length,
    sampleWebinar: allWebinars[0] || null
  });
  
  if (allWebinars.length === 0) {
    logInstanceSyncDebug('⚠️ WARNING: No webinars fetched from Zoom API!');
  }
  
  logWebinarStatistics(allWebinars);
  
  // STEP 1.5: Comprehensive completion analysis
  logInstanceSyncDebug('🔍 STEP 1.5: Comprehensive completion analysis');
  const completionAnalysis = logCompletionAnalysis(allWebinars);
  
  // Log data source breakdown
  const historicalWebinars = allWebinars.filter(w => w._is_historical === true);
  const upcomingWebinars = allWebinars.filter(w => w._is_historical === false);
  logInstanceSyncDebug('📊 DATA SOURCE BREAKDOWN', {
    historicalCount: historicalWebinars.length,
    upcomingCount: upcomingWebinars.length,
    totalCount: allWebinars.length
  });
  
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
    logInstanceSyncDebug('📊 STEP 2: Processing webinars');
    const basicWebinars = await syncBasicWebinarData(allWebinars, token, user.id);
    
    // STEP 3: Enhanced with past webinar data
    logInstanceSyncDebug('🎯 STEP 3: Enhancing completed webinars');
    const enhancedWebinars = await enhanceWithPastWebinarData(basicWebinars, token);
    
    // STEP 3.5: Log enhancement results
    logEnhancementResults(enhancedWebinars);
    
    // STEP 4: Store in database
    logInstanceSyncDebug('💾 STEP 4: Storing webinars in database');
    syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
    
    // STEP 5: CRITICAL INSTANCE SYNC WITH DEBUGGING
    logInstanceSyncDebug('🎯 STEP 5: CRITICAL instance sync with comprehensive debugging');
    logInstanceSyncDebug('📡 Using enhanced data extraction for ALL zoom_webinar_instances columns');
    
    // Pass the enhanced webinars to instance sync
    instanceSyncResults = await syncEnhancedWebinarInstancesForWebinars(enhancedWebinars, token, supabase, user.id);
    
    // Calculate comprehensive statistics
    statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);
  } else {
    logInstanceSyncDebug('⚠️ No webinars to process - skipping database operations');
  }
  
  const enhancedCount = allWebinars.filter(w => w._enhanced_with_past_data === true).length;
  const completedCount = completionAnalysis.completed.length;
  
  logInstanceSyncDebug('🎉 ENHANCED PROCESSING COMPLETE', {
    webinarsCollected: allWebinars.length,
    webinarsSynced: syncResults.newWebinars + syncResults.updatedWebinars,
    instancesSynced: instanceSyncResults.totalInstancesSynced,
    instancesWithCompleteData: instanceSyncResults.fieldsPopulated,
    successfulAPICalls: instanceSyncResults.apiCallsSuccessful,
    failedAPICalls: instanceSyncResults.apiCallsFailed
  });
  
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
