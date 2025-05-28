
import { handleEnhancedRecurringWebinarInstances } from './instanceTypes/enhancedRecurringWebinarHandler.ts';
import { handleEnhancedSingleOccurrenceWebinar } from './instanceTypes/enhancedSingleWebinarHandler.ts';

/**
 * Enhanced webinar instance syncer with improved end_time calculation and error handling
 */
export async function syncEnhancedWebinarInstancesForWebinars(webinars: any[], token: string, supabase: any, userId: string) {
  console.log(`[enhanced-instance-syncer] 🚀 Starting ENHANCED instance sync for ${webinars.length} webinars`);
  console.log(`[enhanced-instance-syncer] 🎯 FOCUS: Ensuring end_time column is properly populated for all instances`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[enhanced-instance-syncer] No webinars to sync instances for`);
    return {
      totalInstancesSynced: 0,
      webinarsWithInstancessynced: 0,
      instanceSyncErrors: 0
    };
  }
  
  // Process webinars in smaller batches to avoid timeouts
  const BATCH_SIZE = 5;
  let totalInstancesSynced = 0;
  let webinarsWithInstancessynced = 0;
  let instanceSyncErrors = 0;
  
  for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
    const batch = webinars.slice(i, i + BATCH_SIZE);
    console.log(`[enhanced-instance-syncer] Processing enhanced batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
    
    const batchPromises = batch.map(async (webinar) => {
      try {
        console.log(`[enhanced-instance-syncer] 🎯 Processing webinar: ${webinar.id} (${webinar.topic}) - Status: ${webinar.status}, Type: ${webinar.type}`);
        
        // Determine if this is a recurring webinar (type 6 or 9) or single occurrence (type 5)
        const isRecurring = webinar.type === 6 || webinar.type === 9;
        const isCompleted = webinar.status === 'ended' || webinar.status === 'aborted';
        
        console.log(`[enhanced-instance-syncer] 📊 Webinar analysis: isRecurring=${isRecurring}, isCompleted=${isCompleted}`);
        
        let instancesSynced = 0;
        
        if (isRecurring) {
          // For recurring webinars, use the enhanced instances handler
          console.log(`[enhanced-instance-syncer] 🔄 RECURRING WEBINAR: Fetching instances for ${webinar.id}`);
          instancesSynced = await handleEnhancedRecurringWebinarInstances(webinar, token, supabase, userId);
        } else {
          // For single-occurrence webinars, use the enhanced single handler
          console.log(`[enhanced-instance-syncer] 🎯 SINGLE WEBINAR: Handling ${webinar.id} (${isCompleted ? 'completed' : 'upcoming'})`);
          instancesSynced = await handleEnhancedSingleOccurrenceWebinar(webinar, token, supabase, userId, isCompleted);
        }
        
        if (instancesSynced > 0) {
          webinarsWithInstancessynced++;
        }
        
        console.log(`[enhanced-instance-syncer] ✅ Webinar ${webinar.id}: ${instancesSynced} instances synced`);
        return instancesSynced;
        
      } catch (error) {
        console.error(`[enhanced-instance-syncer] ❌ Error syncing instances for webinar ${webinar.id}:`, error);
        instanceSyncErrors++;
        return 0;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const batchTotal = batchResults.reduce((sum, count) => sum + count, 0);
    totalInstancesSynced += batchTotal;
    
    console.log(`[enhanced-instance-syncer] 📊 Enhanced batch ${Math.floor(i/BATCH_SIZE) + 1} completed: ${batchTotal} instances synced`);
  }
  
  console.log(`[enhanced-instance-syncer] 🎉 ENHANCED SYNC COMPLETE: ${totalInstancesSynced} total instances synced with improved end_time data`);
  console.log(`[enhanced-instance-syncer] 📊 Summary: ${webinarsWithInstancessynced} webinars had instances, ${instanceSyncErrors} errors`);
  
  return {
    totalInstancesSynced,
    webinarsWithInstancessynced,
    instanceSyncErrors
  };
}
