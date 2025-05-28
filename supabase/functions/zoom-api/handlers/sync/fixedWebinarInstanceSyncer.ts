
import { handleFixedRecurringWebinarInstances } from './instanceTypes/fixedRecurringWebinarHandler.ts';
import { handleFixedSingleOccurrenceWebinar } from './instanceTypes/fixedSingleWebinarHandler.ts';

/**
 * Fixed webinar instance syncer with proper actual timing data collection
 * Now correctly handles multiple instances per recurring webinar
 */
export async function syncFixedWebinarInstancesForWebinars(webinars: any[], token: string, supabase: any, userId: string) {
  console.log(`[fixed-instance-syncer] 🚀 Starting FIXED instance sync for ${webinars.length} webinars`);
  console.log(`[fixed-instance-syncer] 🎯 FOCUS: Creating ALL instances for recurring webinars, not just one per webinar`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[fixed-instance-syncer] No webinars to sync instances for`);
    return {
      totalInstancesSynced: 0,
      webinarsWithInstancessynced: 0,
      instanceSyncErrors: 0,
      actualDataFetched: 0,
      apiCallsSuccessful: 0,
      apiCallsFailed: 0
    };
  }
  
  // Analyze webinar types first
  const recurringWebinars = webinars.filter(w => w.type === 6 || w.type === 9);
  const singleWebinars = webinars.filter(w => w.type !== 6 && w.type !== 9);
  
  console.log(`[fixed-instance-syncer] 📊 Webinar analysis:`);
  console.log(`[fixed-instance-syncer]   - Recurring webinars (type 6/9): ${recurringWebinars.length}`);
  console.log(`[fixed-instance-syncer]   - Single webinars (other types): ${singleWebinars.length}`);
  console.log(`[fixed-instance-syncer]   - Expected instances: ${singleWebinars.length} + (multiple per recurring webinar)`);
  
  // Process webinars in smaller batches to avoid timeouts
  const BATCH_SIZE = 5;
  let totalInstancesSynced = 0;
  let webinarsWithInstancessynced = 0;
  let instanceSyncErrors = 0;
  let actualDataFetched = 0;
  let apiCallsSuccessful = 0;
  let apiCallsFailed = 0;
  
  for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
    const batch = webinars.slice(i, i + BATCH_SIZE);
    console.log(`[fixed-instance-syncer] Processing fixed batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
    
    const batchPromises = batch.map(async (webinar) => {
      try {
        console.log(`[fixed-instance-syncer] 🎯 Processing webinar: ${webinar.id} (${webinar.topic})`);
        console.log(`[fixed-instance-syncer] 📊 Webinar details: Status=${webinar.status}, Type=${webinar.type}, Start=${webinar.start_time}`);
        
        // Determine if this is a recurring webinar (type 6 or 9) or single occurrence (type 5)
        const isRecurring = webinar.type === 6 || webinar.type === 9;
        const isCompleted = webinar.status === 'ended' || webinar.status === 'aborted';
        
        console.log(`[fixed-instance-syncer] 📊 Classification: isRecurring=${isRecurring}, isCompleted=${isCompleted}`);
        
        let instancesSynced = 0;
        
        if (isRecurring) {
          // For recurring webinars, use the fixed instances handler
          console.log(`[fixed-instance-syncer] 🔄 RECURRING WEBINAR: Fetching ALL instances for ${webinar.id}`);
          instancesSynced = await handleFixedRecurringWebinarInstances(webinar, token, supabase, userId);
          console.log(`[fixed-instance-syncer] 📊 Recurring webinar ${webinar.id} created ${instancesSynced} instances`);
        } else {
          // For single-occurrence webinars, use the fixed single handler
          console.log(`[fixed-instance-syncer] 🎯 SINGLE WEBINAR: Handling ${webinar.id} (${isCompleted ? 'completed' : 'upcoming'})`);
          instancesSynced = await handleFixedSingleOccurrenceWebinar(webinar, token, supabase, userId, isCompleted);
          console.log(`[fixed-instance-syncer] 📊 Single webinar ${webinar.id} created ${instancesSynced} instances`);
        }
        
        if (instancesSynced > 0) {
          webinarsWithInstancessynced++;
          actualDataFetched++;
          apiCallsSuccessful++;
        }
        
        console.log(`[fixed-instance-syncer] ✅ Webinar ${webinar.id}: ${instancesSynced} instances synced`);
        return instancesSynced;
        
      } catch (error) {
        console.error(`[fixed-instance-syncer] ❌ Error syncing instances for webinar ${webinar.id}:`, error);
        instanceSyncErrors++;
        apiCallsFailed++;
        return 0;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const batchTotal = batchResults.reduce((sum, count) => sum + count, 0);
    totalInstancesSynced += batchTotal;
    
    console.log(`[fixed-instance-syncer] 📊 Fixed batch ${Math.floor(i/BATCH_SIZE) + 1} completed: ${batchTotal} instances synced`);
  }
  
  console.log(`[fixed-instance-syncer] 🎉 FIXED SYNC COMPLETE WITH MULTIPLE INSTANCES SUPPORT:`);
  console.log(`[fixed-instance-syncer]   - Total instances synced: ${totalInstancesSynced}`);
  console.log(`[fixed-instance-syncer]   - Webinars with instances: ${webinarsWithInstancessynced}`);
  console.log(`[fixed-instance-syncer]   - Sync errors: ${instanceSyncErrors}`);
  console.log(`[fixed-instance-syncer]   - Actual data fetched: ${actualDataFetched}`);
  console.log(`[fixed-instance-syncer]   - Successful API calls: ${apiCallsSuccessful}`);
  console.log(`[fixed-instance-syncer]   - Failed API calls: ${apiCallsFailed}`);
  console.log(`[fixed-instance-syncer] 🔧 NOTE: Recurring webinars now create multiple instances as expected`);
  
  return {
    totalInstancesSynced,
    webinarsWithInstancessynced,
    instanceSyncErrors,
    actualDataFetched,
    apiCallsSuccessful,
    apiCallsFailed
  };
}
