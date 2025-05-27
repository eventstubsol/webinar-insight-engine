
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { fetchRecurringWebinarInstances } from './instances/recurringInstancesFetcher.ts';
import { createSingleWebinarInstance } from './instances/singleInstanceCreator.ts';
import { processInstanceForDatabase, upsertInstanceData } from './instances/instanceDataProcessor.ts';
import { logInstanceSyncHistory } from './instances/syncHistoryLogger.ts';

// Handle getting instances of a webinar
export async function handleGetWebinarInstances(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  console.log(`[zoom-api][get-webinar-instances] Fetching instances for webinar ID: ${webinarId}`);
  
  try {
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // First, get the webinar details to determine its type
    const webinarResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!webinarResponse.ok) {
      const errorData = await webinarResponse.json();
      console.error('[zoom-api][get-webinar-instances] Failed to fetch webinar details:', errorData);
      throw new Error(`Failed to fetch webinar details: ${errorData.message || 'Unknown error'}`);
    }
    
    const webinarData = await webinarResponse.json();
    const isRecurring = webinarData.type === 6 || webinarData.type === 9;
    const isCompleted = webinarData.status === 'ended' || webinarData.status === 'aborted';
    
    console.log(`[zoom-api][get-webinar-instances] Webinar ${webinarId} analysis: type=${webinarData.type}, status=${webinarData.status}, isRecurring=${isRecurring}, isCompleted=${isCompleted}`);
    
    let instances = [];
    
    if (isRecurring) {
      // For recurring webinars, fetch instances
      instances = await fetchRecurringWebinarInstances(webinarId, token, webinarData);
    } else {
      // For single-occurrence webinars, create a synthetic instance
      instances = await createSingleWebinarInstance(webinarId, token, webinarData, isCompleted);
    }
    
    // Store instances in database
    if (instances && instances.length > 0) {
      for (const instance of instances) {
        console.log(`[zoom-api][get-webinar-instances] Processing instance ${instance.uuid || instance.id}`);
        
        // Prepare the instance data for database insertion
        const instanceToInsert = await processInstanceForDatabase(instance, webinarData, webinarId, user.id);
        
        // Upsert the instance data
        await upsertInstanceData(supabase, instanceToInsert, webinarId, instance.uuid || instance.id || '');
      }
      
      // Record successful sync in history
      await logInstanceSyncHistory(supabase, user.id, webinarId, instances, isRecurring, true);
    }
    
    return new Response(JSON.stringify({ instances: instances || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][get-webinar-instances] Error:', error);
    
    // Record failed sync in history
    await logInstanceSyncHistory(supabase, user.id, webinarId, [], false, false, error.message || 'Unknown error');
    
    throw error;
  }
}
