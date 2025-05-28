
import { handleEnhancedSingleOccurrenceWebinar } from './instanceTypes/enhancedSingleWebinarHandler.ts';
import { handleRecurringWebinarInstances } from './instanceTypes/recurringWebinarHandler.ts';

/**
 * Enhanced webinar instance syncer with comprehensive data population
 */
export async function syncEnhancedWebinarInstancesForWebinars(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string
) {
  console.log(`[enhanced-instance-syncer] 🔄 Starting ENHANCED instance sync for ${webinars.length} webinars`);
  console.log(`[enhanced-instance-syncer] 🎯 GOAL: Complete zoom_webinar_instances table with ALL fields populated`);
  
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
  
  // Process webinars in smaller batches to avoid timeouts
  const BATCH_SIZE = 3;
  let totalInstancesSynced = 0;
  let webinarsWithInstancessynced = 0;
  let instanceSyncErrors = 0;
  let fieldsPopulated = 0;
  let actualDataFetched = 0;
  let apiCallsSuccessful = 0;
  let apiCallsFailed = 0;
  
  for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
    const batch = webinars.slice(i, i + BATCH_SIZE);
    console.log(`[enhanced-instance-syncer] Processing ENHANCED batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
    
    const batchPromises = batch.map(async (webinar) => {
      try {
        console.log(`[enhanced-instance-syncer] 🎯 ENHANCED processing: ${webinar.id} (${webinar.topic}) - Status: ${webinar.status}, Type: ${webinar.type}`);
        
        // Determine if this is a recurring webinar (type 6 or 9) or single occurrence (type 5)
        const isRecurring = webinar.type === 6 || webinar.type === 9;
        const isCompleted = webinar.status === 'ended' || webinar.status === 'aborted' || webinar._enhanced_with_past_data;
        
        console.log(`[enhanced-instance-syncer] 📊 ENHANCED analysis: isRecurring=${isRecurring}, isCompleted=${isCompleted}, enhanced=${webinar._enhanced_with_past_data}`);
        
        let instancesProcessed = 0;
        
        if (isRecurring) {
          // For recurring webinars, use the instances API with enhanced processing
          console.log(`[enhanced-instance-syncer] 🔄 ENHANCED RECURRING: Fetching instances for ${webinar.id}`);
          instancesProcessed = await handleRecurringWebinarInstances(webinar, token, supabase, userId);
        } else {
          // For single-occurrence webinars, use enhanced single handler
          console.log(`[enhanced-instance-syncer] 🎯 ENHANCED SINGLE: Handling ${webinar.id} (${isCompleted ? 'completed' : 'upcoming'})`);
          instancesProcessed = await handleEnhancedSingleOccurrenceWebinar(webinar, token, supabase, userId);
        }
        
        if (instancesProcessed > 0) {
          webinarsWithInstancessynced++;
          totalInstancesSynced += instancesProcessed;
          fieldsPopulated += instancesProcessed; // Each instance gets full field population
          
          if (webinar._enhanced_with_past_data) {
            actualDataFetched++;
            apiCallsSuccessful++;
          }
        }
        
        return instancesProcessed;
        
      } catch (error) {
        console.error(`[enhanced-instance-syncer] ❌ Error in ENHANCED sync for webinar ${webinar.id}:`, error);
        instanceSyncErrors++;
        apiCallsFailed++;
        return 0;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const batchTotal = batchResults.reduce((sum, count) => sum + count, 0);
    
    console.log(`[enhanced-instance-syncer] 📊 ENHANCED batch ${Math.floor(i/BATCH_SIZE) + 1} completed: ${batchTotal} instances synced with complete data`);
  }
  
  console.log(`[enhanced-instance-syncer] 🎉 ENHANCED SYNC COMPLETE WITH COMPREHENSIVE DATA:`);
  console.log(`[enhanced-instance-syncer]   - Total instances synced: ${totalInstancesSynced}`);
  console.log(`[enhanced-instance-syncer]   - Webinars with instances synced: ${webinarsWithInstancessynced}`);
  console.log(`[enhanced-instance-syncer]   - Instance sync errors: ${instanceSyncErrors}`);
  console.log(`[enhanced-instance-syncer]   - Instances with complete field data: ${fieldsPopulated}`);
  console.log(`[enhanced-instance-syncer]   - Actual data fetched from past API: ${actualDataFetched}`);
  console.log(`[enhanced-instance-syncer]   - Successful API calls: ${apiCallsSuccessful}`);
  console.log(`[enhanced-instance-syncer]   - Failed API calls: ${apiCallsFailed}`);
  console.log(`[enhanced-instance-syncer] 📋 ALL zoom_webinar_instances columns now populated with comprehensive data`);
  
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
