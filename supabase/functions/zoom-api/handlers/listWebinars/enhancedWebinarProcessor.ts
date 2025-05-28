
import { fetchWebinarsFromZoomAPI, performNonDestructiveUpsert } from '../sync/nonDestructiveSync.ts';
import { syncBasicWebinarData, enhanceWithPastWebinarData } from '../sync/basicWebinarSyncer.ts';
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
  };
}

export async function processEnhancedWebinars(
  token: string,
  meData: any,
  supabase: any,
  user: any,
  existingWebinars: any[]
): Promise<EnhancedWebinarProcessingResult> {
  console.log(`[enhanced-webinar-processor] 🚀 Starting ENHANCED webinar processing with improved end_time calculation`);
  
  // STEP 1: Fetch webinars using proper API endpoints
  console.log(`[enhanced-webinar-processor] 🚀 STEP 1: Fetching webinars with ENHANCED API endpoint strategy`);
  const allWebinars = await fetchWebinarsFromZoomAPI(token, meData.id);
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
    instanceSyncErrors: 0
  };
  
  if (allWebinars && allWebinars.length > 0) {
    // STEP 2: Process basic webinar data
    console.log(`[enhanced-webinar-processor] 📊 STEP 2: Processing ${allWebinars.length} webinars with ENHANCED field mapping`);
    const basicWebinars = await syncBasicWebinarData(allWebinars, token, user.id);
    
    // STEP 3: Enhanced with past webinar data
    console.log(`[enhanced-webinar-processor] 🎯 STEP 3: Enhancing completed webinars with actual timing data`);
    console.log(`[enhanced-webinar-processor] 📈 Expected to enhance: ${completionAnalysis.completed.length} completed webinars`);
    
    const enhancedWebinars = await enhanceWithPastWebinarData(basicWebinars, token);
    
    // STEP 3.5: Log enhancement results
    logEnhancementResults(enhancedWebinars);
    
    // STEP 4: Store in database
    console.log(`[enhanced-webinar-processor] 💾 STEP 4: Storing webinars in database with ENHANCED field mapping`);
    syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);
    
    // STEP 5: ENHANCED INSTANCE SYNC - Focus on end_time column population
    console.log(`[enhanced-webinar-processor] 🎯 STEP 5: ENHANCED instance sync with focus on end_time column`);
    instanceSyncResults = await syncEnhancedWebinarInstancesForWebinars(enhancedWebinars, token, supabase, user.id);
    
    // Calculate comprehensive statistics
    statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);
  }
  
  const enhancedCount = allWebinars.filter(w => w._enhanced_with_past_data === true).length;
  const completedCount = completionAnalysis.completed.length;
  
  console.log(`[enhanced-webinar-processor] 🎉 ENHANCED PROCESSING COMPLETE:`);
  console.log(`[enhanced-webinar-processor]   - Webinars processed: ${allWebinars.length}`);
  console.log(`[enhanced-webinar-processor]   - Instances synced: ${instanceSyncResults.totalInstancesSynced}`);
  console.log(`[enhanced-webinar-processor]   - Webinars with instances: ${instanceSyncResults.webinarsWithInstancessynced}`);
  console.log(`[enhanced-webinar-processor]   - Instance sync errors: ${instanceSyncResults.instanceSyncErrors}`);
  
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
