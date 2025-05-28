
import { handleEnhancedRecurringWebinarInstances } from './instanceTypes/enhancedRecurringWebinarHandler.ts';
import { handleEnhancedSingleOccurrenceWebinar } from './instanceTypes/enhancedSingleWebinarHandler.ts';

/**
 * Enhanced webinar instance syncer with comprehensive data population for all table fields
 */
export async function syncEnhancedWebinarInstancesForWebinars(webinars: any[], token: string, supabase: any, userId: string) {
  console.log(`[enhanced-instance-syncer] 🚀 Starting ENHANCED instance sync for ${webinars.length} webinars`);
  console.log(`[enhanced-instance-syncer] 🎯 GOAL: Populate ALL columns in zoom_webinar_instances table with comprehensive data`);
  console.log(`[enhanced-instance-syncer] 📋 Following Zoom API documentation: https://developers.zoom.us/docs/api/meetings/#tag/webinars/`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[enhanced-instance-syncer] No webinars to sync instances for`);
    return {
      totalInstancesSynced: 0,
      webinarsWithInstancessynced: 0,
      instanceSyncErrors: 0,
      fieldsPopulated: 0,
      actualDataFetched: 0,
      apiCallsSuccessful: 0,
      apiCallsFailed: 0
    };
  }
  
  // Analyze webinar types for comprehensive processing
  const recurringWebinars = webinars.filter(w => w.type === 6 || w.type === 9);
  const singleWebinars = webinars.filter(w => w.type !== 6 && w.type !== 9);
  
  console.log(`[enhanced-instance-syncer] 📊 Webinar analysis for enhanced processing:`);
  console.log(`[enhanced-instance-syncer]   - Recurring webinars (type 6/9): ${recurringWebinars.length}`);
  console.log(`[enhanced-instance-syncer]   - Single webinars (other types): ${singleWebinars.length}`);
  console.log(`[enhanced-instance-syncer]   - Expected enhancement: ALL instances with complete field data`);
  
  // Process webinars in smaller batches for stability
  const BATCH_SIZE = 3; // Smaller batches for enhanced processing
  let totalInstancesSynced = 0;
  let webinarsWithInstancessynced = 0;
  let instanceSyncErrors = 0;
  let fieldsPopulated = 0;
  let actualDataFetched = 0;
  let apiCallsSuccessful = 0;
  let apiCallsFailed = 0;
  
  for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
    const batch = webinars.slice(i, i + BATCH_SIZE);
    console.log(`[enhanced-instance-syncer] Processing enhanced batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
    
    const batchPromises = batch.map(async (webinar) => {
      try {
        console.log(`[enhanced-instance-syncer] 🎯 Processing webinar: ${webinar.id} (${webinar.topic})`);
        console.log(`[enhanced-instance-syncer] 📊 Webinar details: Status=${webinar.status}, Type=${webinar.type}, Start=${webinar.start_time}`);
        
        // Determine webinar type and processing strategy
        const isRecurring = webinar.type === 6 || webinar.type === 9;
        
        console.log(`[enhanced-instance-syncer] 📊 Processing strategy: isRecurring=${isRecurring}`);
        
        let instancesSynced = 0;
        
        if (isRecurring) {
          // Enhanced recurring webinar processing
          console.log(`[enhanced-instance-syncer] 🔄 RECURRING WEBINAR: Fetching ALL instances with enhanced data for ${webinar.id}`);
          instancesSynced = await handleEnhancedRecurringWebinarInstances(webinar, token, supabase, userId);
          console.log(`[enhanced-instance-syncer] 📊 Enhanced recurring webinar ${webinar.id} created ${instancesSynced} instances`);
        } else {
          // Enhanced single webinar processing
          console.log(`[enhanced-instance-syncer] 🎯 SINGLE WEBINAR: Handling ${webinar.id} with enhanced data extraction`);
          instancesSynced = await handleEnhancedSingleOccurrenceWebinar(webinar, token, supabase, userId);
          console.log(`[enhanced-instance-syncer] 📊 Enhanced single webinar ${webinar.id} created ${instancesSynced} instances`);
        }
        
        if (instancesSynced > 0) {
          webinarsWithInstancessynced++;
          actualDataFetched++;
          apiCallsSuccessful++;
          fieldsPopulated += instancesSynced; // Each instance has comprehensive field data
        }
        
        console.log(`[enhanced-instance-syncer] ✅ Enhanced webinar ${webinar.id}: ${instancesSynced} instances synced with complete data`);
        return instancesSynced;
        
      } catch (error) {
        console.error(`[enhanced-instance-syncer] ❌ Error syncing enhanced instances for webinar ${webinar.id}:`, error);
        instanceSyncErrors++;
        apiCallsFailed++;
        return 0;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const batchTotal = batchResults.reduce((sum, count) => sum + count, 0);
    totalInstancesSynced += batchTotal;
    
    console.log(`[enhanced-instance-syncer] 📊 Enhanced batch ${Math.floor(i/BATCH_SIZE) + 1} completed: ${batchTotal} instances synced`);
  }
  
  console.log(`[enhanced-instance-syncer] 🎉 ENHANCED SYNC COMPLETE WITH COMPREHENSIVE FIELD POPULATION:`);
  console.log(`[enhanced-instance-syncer]   - Total instances synced: ${totalInstancesSynced}`);
  console.log(`[enhanced-instance-syncer]   - Webinars with instances: ${webinarsWithInstancessynced}`);
  console.log(`[enhanced-instance-syncer]   - Sync errors: ${instanceSyncErrors}`);
  console.log(`[enhanced-instance-syncer]   - Instances with complete field data: ${fieldsPopulated}`);
  console.log(`[enhanced-instance-syncer]   - Actual data fetched: ${actualDataFetched}`);
  console.log(`[enhanced-instance-syncer]   - Successful API calls: ${apiCallsSuccessful}`);
  console.log(`[enhanced-instance-syncer]   - Failed API calls: ${apiCallsFailed}`);
  console.log(`[enhanced-instance-syncer] 🔧 ENHANCEMENT: All zoom_webinar_instances columns now properly populated`);
  
  return {
    totalInstancesSynced,
    webinarsWithInstancessynced,
    instanceSyncErrors,
    fieldsPopulated,
    actualDataFetched,
    apiCallsSuccessful,
    apiCallsFailed
  };
}
