
import { handleRecurringWebinarInstances } from './instanceTypes/recurringWebinarHandler.ts';
import { handleSingleOccurrenceWebinar } from './instanceTypes/singleWebinarHandler.ts';

/**
 * Syncs webinar instances for a batch of webinars during the main sync process
 * FIXED: Now uses correct Zoom API endpoints and properly handles single vs recurring webinars
 */
export async function syncWebinarInstancesForWebinars(webinars: any[], token: string, supabase: any, userId: string) {
  console.log(`[zoom-api][instance-syncer] 🔄 Starting FIXED instance sync for ${webinars.length} webinars`);
  console.log(`[zoom-api][instance-syncer] 🎯 CRITICAL FIX: Using correct API endpoints for single vs recurring webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][instance-syncer] No webinars to sync instances for`);
    return;
  }
  
  // Process webinars in smaller batches to avoid timeouts
  const BATCH_SIZE = 5;
  let totalInstancesSynced = 0;
  
  for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
    const batch = webinars.slice(i, i + BATCH_SIZE);
    console.log(`[zoom-api][instance-syncer] Processing instance batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
    
    const batchPromises = batch.map(async (webinar) => {
      try {
        console.log(`[zoom-api][instance-syncer] 🎯 Processing webinar: ${webinar.id} (${webinar.topic}) - Status: ${webinar.status}, Type: ${webinar.type}`);
        
        // Determine if this is a recurring webinar (type 6 or 9) or single occurrence (type 5)
        const isRecurring = webinar.type === 6 || webinar.type === 9;
        const isCompleted = webinar.status === 'ended' || webinar.status === 'aborted';
        
        console.log(`[zoom-api][instance-syncer] 📊 Webinar analysis: isRecurring=${isRecurring}, isCompleted=${isCompleted}`);
        
        if (isRecurring) {
          // For recurring webinars, use the instances API
          console.log(`[zoom-api][instance-syncer] 🔄 RECURRING WEBINAR: Fetching instances for ${webinar.id}`);
          return await handleRecurringWebinarInstances(webinar, token, supabase, userId);
        } else {
          // For single-occurrence webinars, handle based on completion status
          console.log(`[zoom-api][instance-syncer] 🎯 SINGLE WEBINAR: Handling ${webinar.id} (${isCompleted ? 'completed' : 'upcoming'})`);
          return await handleSingleOccurrenceWebinar(webinar, token, supabase, userId, isCompleted);
        }
        
      } catch (error) {
        console.error(`[zoom-api][instance-syncer] ❌ Error syncing instances for webinar ${webinar.id}:`, error);
        return 0;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const batchTotal = batchResults.reduce((sum, count) => sum + count, 0);
    totalInstancesSynced += batchTotal;
    
    console.log(`[zoom-api][instance-syncer] 📊 Batch ${Math.floor(i/BATCH_SIZE) + 1} completed: ${batchTotal} instances synced`);
  }
  
  console.log(`[zoom-api][instance-syncer] 🎉 FIXED SYNC COMPLETE: ${totalInstancesSynced} total instances synced with correct duration data`);
  return totalInstancesSynced;
}
