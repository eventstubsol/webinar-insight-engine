
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

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
      console.log(`[zoom-api][get-webinar-instances] Fetching instances for recurring webinar ${webinarId}`);
      instances = await fetchRecurringWebinarInstances(webinarId, token, webinarData);
    } else {
      // For single-occurrence webinars, create a synthetic instance
      console.log(`[zoom-api][get-webinar-instances] Creating instance data for single-occurrence webinar ${webinarId}`);
      instances = await createSingleWebinarInstance(webinarId, token, webinarData, isCompleted);
    }
    
    // Store instances in database
    if (instances && instances.length > 0) {
      for (const instance of instances) {
        console.log(`[zoom-api][get-webinar-instances] Processing instance ${instance.uuid || instance.id}`);
        
        // Prepare the instance data for database insertion
        const instanceToInsert = {
          user_id: user.id,
          webinar_id: webinarId,
          webinar_uuid: webinarData.uuid || '',
          instance_id: instance.uuid || instance.id || '',
          start_time: instance.start_time || null,
          end_time: instance.end_time || null,
          duration: instance.duration || null,
          topic: webinarData.topic || instance.topic || 'Untitled Webinar',
          status: instance.status || null,
          registrants_count: instance.registrants_count || 0,
          participants_count: instance.participants_count || 0,
          raw_data: {
            ...instance,
            _webinar_data: webinarData
          }
        };
        
        // Check if this instance already exists
        const { data: existingInstance } = await supabase
          .from('zoom_webinar_instances')
          .select('id')
          .eq('webinar_id', webinarId)
          .eq('instance_id', instance.uuid || instance.id || '')
          .maybeSingle();
        
        if (existingInstance) {
          // Update existing instance
          const { error: updateError } = await supabase
            .from('zoom_webinar_instances')
            .update(instanceToInsert)
            .eq('id', existingInstance.id);
            
          if (updateError) {
            console.error(`[zoom-api][get-webinar-instances] Error updating instance:`, updateError);
          } else {
            console.log(`[zoom-api][get-webinar-instances] ✅ Updated instance ${instance.uuid || instance.id} with duration: ${instance.duration}`);
          }
        } else {
          // Insert new instance
          const { error: insertError } = await supabase
            .from('zoom_webinar_instances')
            .insert(instanceToInsert);
            
          if (insertError) {
            console.error(`[zoom-api][get-webinar-instances] Error inserting instance:`, insertError);
          } else {
            console.log(`[zoom-api][get-webinar-instances] ✅ Inserted instance ${instance.uuid || instance.id} with duration: ${instance.duration}`);
          }
        }
      }
      
      // Record sync in history
      await supabase
        .from('zoom_sync_history')
        .insert({
          user_id: user.id,
          sync_type: 'webinar_instances',
          status: 'success',
          items_synced: instances.length,
          message: `Synced ${instances.length} instances for webinar ${webinarId} (${isRecurring ? 'recurring' : 'single-occurrence'})`
        });
    }
    
    return new Response(JSON.stringify({ instances: instances || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][get-webinar-instances] Error:', error);
    
    // Record failed sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'webinar_instances',
        status: 'error',
        items_synced: 0,
        message: error.message || 'Unknown error'
      });
    
    throw error;
  }
}

/**
 * Fetch instances for recurring webinars
 */
async function fetchRecurringWebinarInstances(webinarId: string, token: string, webinarData: any): Promise<any[]> {
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.warn(`[zoom-api][get-webinar-instances] Failed to fetch instances: ${errorData.message}`);
      return [];
    }
    
    const data = await response.json();
    const instances = data.instances || [];
    
    // Process each instance to get actual completion data if needed
    const processedInstances = [];
    for (const instance of instances) {
      const processedInstance = await processInstance(instance, token, webinarData);
      processedInstances.push(processedInstance);
    }
    
    return processedInstances;
    
  } catch (error) {
    console.error(`[zoom-api][get-webinar-instances] Error fetching recurring instances:`, error);
    return [];
  }
}

/**
 * Create instance data for single-occurrence webinars
 */
async function createSingleWebinarInstance(webinarId: string, token: string, webinarData: any, isCompleted: boolean): Promise<any[]> {
  let actualData = null;
  
  if (isCompleted) {
    // For completed single-occurrence webinars, fetch actual data
    try {
      console.log(`[zoom-api][get-webinar-instances] Fetching actual data for completed single webinar ${webinarId}`);
      const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastResponse.ok) {
        actualData = await pastResponse.json();
        console.log(`[zoom-api][get-webinar-instances] ✅ Got actual data: duration=${actualData.duration}, participants=${actualData.participants_count}`);
      } else {
        console.warn(`[zoom-api][get-webinar-instances] Could not fetch past webinar data for ${webinarId}`);
      }
    } catch (error) {
      console.warn(`[zoom-api][get-webinar-instances] Error fetching past webinar data:`, error);
    }
  }
  
  // Calculate end time for completed webinars
  let endTime = null;
  if (isCompleted) {
    const duration = actualData?.duration || webinarData.duration;
    if (actualData?.end_time) {
      endTime = actualData.end_time;
    } else if ((actualData?.start_time || webinarData.start_time) && duration) {
      const startDate = new Date(actualData?.start_time || webinarData.start_time);
      const endDate = new Date(startDate.getTime() + (duration * 60000));
      endTime = endDate.toISOString();
    }
  }
  
  // Create synthetic instance
  const instance = {
    id: webinarData.uuid || webinarId,
    uuid: webinarData.uuid || webinarId,
    start_time: actualData?.start_time || webinarData.start_time,
    end_time: endTime,
    duration: actualData?.duration || webinarData.duration,
    status: isCompleted ? (webinarData.status || 'ended') : (webinarData.status || 'waiting'),
    topic: webinarData.topic,
    participants_count: actualData?.participants_count || 0,
    registrants_count: 0, // Will be updated separately if needed
    _is_single_occurrence: true,
    _is_completed: isCompleted,
    _duration_source: actualData?.duration ? 'past_webinar_api' : 'scheduled',
    _actual_data: actualData,
    _webinar_data: webinarData
  };
  
  return [instance];
}

/**
 * Process an individual instance to get complete data
 */
async function processInstance(instance: any, token: string, webinarData: any): Promise<any> {
  const isCompleted = instance.status === 'ended' || instance.status === 'aborted';
  
  if (isCompleted && instance.uuid) {
    // For completed instances, fetch actual data
    try {
      console.log(`[zoom-api][get-webinar-instances] Fetching actual data for completed instance ${instance.uuid}`);
      const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${instance.uuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastResponse.ok) {
        const actualData = await pastResponse.json();
        console.log(`[zoom-api][get-webinar-instances] ✅ Got actual data for instance ${instance.uuid}: duration=${actualData.duration}`);
        
        return {
          ...instance,
          duration: actualData.duration || instance.duration || webinarData.duration,
          end_time: actualData.end_time || instance.end_time,
          participants_count: actualData.participants_count || 0,
          _duration_source: 'past_webinar_api',
          _actual_data: actualData
        };
      }
    } catch (error) {
      console.warn(`[zoom-api][get-webinar-instances] Error fetching actual data for instance ${instance.uuid}:`, error);
    }
  }
  
  // Return instance with scheduled data
  return {
    ...instance,
    duration: instance.duration || webinarData.duration,
    participants_count: 0,
    _duration_source: instance.duration ? 'instance_api' : 'scheduled'
  };
}
