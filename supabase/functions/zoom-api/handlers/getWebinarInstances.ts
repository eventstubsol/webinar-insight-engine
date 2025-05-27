
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { fetchRecurringWebinarInstances } from './instances/recurringInstancesFetcher.ts';
import { createSingleWebinarInstance } from './instances/singleInstanceCreator.ts';
import { processInstanceForDatabase, upsertInstanceData } from './instances/instanceDataProcessor.ts';
import { logInstanceSyncHistory } from './instances/syncHistoryLogger.ts';

// Handle getting instances of a webinar
export async function handleGetWebinarInstances(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  if (!webinarId) {
    console.error('[zoom-api][get-webinar-instances] ❌ Missing webinar ID');
    throw new Error('Webinar ID is required');
  }
  
  console.log(`[zoom-api][get-webinar-instances] 🔄 Starting instance fetch for webinar ID: ${webinarId}`);
  
  try {
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // First, get the webinar details to determine its type
    console.log(`[zoom-api][get-webinar-instances] 📡 Fetching webinar details for ${webinarId}`);
    const webinarResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!webinarResponse.ok) {
      const errorData = await webinarResponse.json().catch(() => ({ message: 'Unknown API error' }));
      console.error('[zoom-api][get-webinar-instances] ❌ Failed to fetch webinar details:', errorData);
      throw new Error(`Failed to fetch webinar details: ${errorData.message || 'Unknown error'}`);
    }
    
    const webinarData = await webinarResponse.json();
    const isRecurring = webinarData.type === 6 || webinarData.type === 9;
    const isCompleted = webinarData.status === 'ended' || webinarData.status === 'aborted';
    
    console.log(`[zoom-api][get-webinar-instances] 📊 Webinar ${webinarId} analysis: type=${webinarData.type}, status=${webinarData.status}, isRecurring=${isRecurring}, isCompleted=${isCompleted}`);
    
    let instances = [];
    
    try {
      if (isRecurring) {
        // For recurring webinars, fetch instances
        console.log(`[zoom-api][get-webinar-instances] 🔄 Processing recurring webinar`);
        instances = await fetchRecurringWebinarInstances(webinarId, token, webinarData);
      } else {
        // For single-occurrence webinars, create a synthetic instance
        console.log(`[zoom-api][get-webinar-instances] 🔄 Processing single-occurrence webinar`);
        instances = await createSingleWebinarInstance(webinarId, token, webinarData, isCompleted);
      }
    } catch (error) {
      console.error(`[zoom-api][get-webinar-instances] ❌ Error fetching/creating instances:`, error);
      await logInstanceSyncHistory(supabase, user.id, webinarId, [], isRecurring, false, error.message);
      throw error;
    }
    
    // Store instances in database
    if (instances && instances.length > 0) {
      console.log(`[zoom-api][get-webinar-instances] 💾 Storing ${instances.length} instances in database`);
      
      let successCount = 0;
      for (const instance of instances) {
        try {
          const instanceId = instance.uuid || instance.id || 'unknown';
          console.log(`[zoom-api][get-webinar-instances] 🔄 Processing instance ${instanceId}`);
          
          // Prepare the instance data for database insertion
          const instanceToInsert = await processInstanceForDatabase(instance, webinarData, webinarId, user.id);
          
          // Upsert the instance data
          await upsertInstanceData(supabase, instanceToInsert, webinarId, instanceId);
          successCount++;
        } catch (error) {
          console.error(`[zoom-api][get-webinar-instances] ❌ Error processing instance:`, error);
          // Continue with other instances
        }
      }
      
      console.log(`[zoom-api][get-webinar-instances] ✅ Successfully processed ${successCount}/${instances.length} instances`);
      
      // Record sync in history
      await logInstanceSyncHistory(supabase, user.id, webinarId, instances, isRecurring, successCount > 0);
    } else {
      console.log(`[zoom-api][get-webinar-instances] ℹ️ No instances found for webinar ${webinarId}`);
      await logInstanceSyncHistory(supabase, user.id, webinarId, [], isRecurring, true);
    }
    
    console.log(`[zoom-api][get-webinar-instances] ✅ Completed instance fetch for webinar ${webinarId}`);
    return new Response(JSON.stringify({ instances: instances || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][get-webinar-instances] ❌ Error in handleGetWebinarInstances:', error);
    
    // Ensure error is logged to history if not already done
    try {
      await logInstanceSyncHistory(supabase, user.id, webinarId, [], false, false, error.message || 'Unknown error');
    } catch (logError) {
      console.error('[zoom-api][get-webinar-instances] ❌ Failed to log error to history:', logError);
    }
    
    throw error;
  }
}
