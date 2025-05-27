
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
    
    // Get webinar instances from Zoom API
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[zoom-api][get-webinar-instances] API error:', errorData);
      
      if (errorData.code === 3001) {
        // This is a normal error for webinars without multiple instances
        console.log('[zoom-api][get-webinar-instances] Webinar has no instances or is not recurring');
        return new Response(JSON.stringify({ instances: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`Failed to fetch webinar instances: ${errorData.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    console.log(`[zoom-api][get-webinar-instances] Found ${data.instances?.length || 0} instances`);
    
    // Store instances in database
    if (data.instances && data.instances.length > 0) {
      // First, get the webinar details to associate with each instance
      const webinarResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!webinarResponse.ok) {
        console.warn(`[zoom-api][get-webinar-instances] Could not fetch webinar details for ${webinarId}`);
      }
      
      const webinarData = webinarResponse.ok ? await webinarResponse.json() : null;
      
      for (const instance of data.instances) {
        // For each instance, we need more detailed information like actual participants
        // We'll use the past_webinar endpoint with the specific instance UUID
        let instanceDetails = { ...instance };
        
        // Only try to get past webinar details if the instance has a uuid
        if (instance.uuid) {
          try {
            const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${instance.uuid}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (pastWebinarResponse.ok) {
              const pastWebinarData = await pastWebinarResponse.json();
              instanceDetails = { ...instanceDetails, ...pastWebinarData };
            }
          } catch (pastWebinarError) {
            console.warn(`[zoom-api][get-webinar-instances] Error fetching past webinar details for instance ${instance.uuid}:`, pastWebinarError);
          }
        }
        
        // Get participant & registrant counts for this instance
        let registrantsCount = 0;
        let participantsCount = 0;
        
        try {
          // Only try to get registrants if the instance has an ID
          if (instance.uuid) {
            const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?page_size=1&occurrence_id=${instance.uuid}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (registrantsResponse.ok) {
              const registrantsData = await registrantsResponse.json();
              registrantsCount = registrantsData.total_records || 0;
            }
          }
          
          // Only try to get participants if the instance has a UUID
          if (instance.uuid) {
            const participantsResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${instance.uuid}/participants?page_size=1`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (participantsResponse.ok) {
              const participantsData = await participantsResponse.json();
              participantsCount = participantsData.total_records || 0;
            }
          }
        } catch (countError) {
          console.warn(`[zoom-api][get-webinar-instances] Error fetching counts for instance ${instance.uuid}:`, countError);
        }
        
        // Prepare the instance data for database insertion with fallback topic
        const instanceToInsert = {
          user_id: user.id,
          webinar_id: webinarId,
          webinar_uuid: webinarData?.uuid || '',
          instance_id: instance.uuid || '',
          start_time: instance.start_time || null,
          end_time: instanceDetails.end_time || null,
          duration: webinarData?.duration || instanceDetails.duration || null,
          topic: webinarData?.topic || instanceDetails.topic || 'Untitled Webinar', // Always provide a topic
          status: instance.status || null,
          registrants_count: registrantsCount,
          participants_count: participantsCount,
          raw_data: instanceDetails
        };
        
        // Check if this instance already exists
        const { data: existingInstance } = await supabase
          .from('zoom_webinar_instances')
          .select('id')
          .eq('webinar_id', webinarId)
          .eq('instance_id', instance.uuid || '')
          .maybeSingle();
        
        if (existingInstance) {
          // Update existing instance
          const { error: updateError } = await supabase
            .from('zoom_webinar_instances')
            .update(instanceToInsert)
            .eq('id', existingInstance.id);
            
          if (updateError) {
            console.error(`[zoom-api][get-webinar-instances] Error updating instance:`, updateError);
          }
        } else {
          // Insert new instance
          const { error: insertError } = await supabase
            .from('zoom_webinar_instances')
            .insert(instanceToInsert);
            
          if (insertError) {
            console.error(`[zoom-api][get-webinar-instances] Error inserting instance:`, insertError);
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
          items_synced: data.instances.length,
          message: `Synced ${data.instances.length} instances for webinar ${webinarId}`
        });
    }
    
    return new Response(JSON.stringify({ instances: data.instances || [] }), {
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
