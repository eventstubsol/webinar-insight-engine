
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

// Handle syncing a single webinar's complete data
export async function handleSyncSingleWebinar(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  console.log(`[zoom-api][sync-single-webinar] Starting sync for webinar: ${webinarId}`);
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  let totalItemsSynced = 0;
  const syncResults = {
    webinar_updated: false,
    registrants_synced: 0,
    attendees_synced: 0,
    instances_synced: 0,
    error_details: []
  };
  
  try {
    // 1. Sync webinar metadata
    console.log(`[zoom-api][sync-single-webinar] Fetching webinar metadata for: ${webinarId}`);
    const webinarRes = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (webinarRes.ok) {
      const webinarData = await webinarRes.json();
      
      // Update webinar in database
      const { error: webinarError } = await supabase
        .from('zoom_webinars')
        .upsert({
          user_id: user.id,
          webinar_id: webinarData.id,
          webinar_uuid: webinarData.uuid,
          topic: webinarData.topic,
          start_time: webinarData.start_time,
          duration: webinarData.duration,
          timezone: webinarData.timezone,
          agenda: webinarData.agenda || '',
          host_email: webinarData.host_email,
          status: webinarData.status,
          type: webinarData.type,
          raw_data: webinarData,
          last_synced_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,webinar_id'
        });
      
      if (webinarError) {
        console.error(`[zoom-api][sync-single-webinar] Error updating webinar:`, webinarError);
        syncResults.error_details.push(`Webinar metadata: ${webinarError.message}`);
      } else {
        syncResults.webinar_updated = true;
        totalItemsSynced += 1;
        console.log(`[zoom-api][sync-single-webinar] Updated webinar metadata for: ${webinarId}`);
      }
    } else {
      const errorText = await webinarRes.text();
      console.error(`[zoom-api][sync-single-webinar] Failed to fetch webinar metadata:`, errorText);
      syncResults.error_details.push(`Webinar metadata: ${errorText}`);
    }
    
    // 2. Sync registrants
    console.log(`[zoom-api][sync-single-webinar] Fetching registrants for: ${webinarId}`);
    const registrantsRes = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?page_size=300`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (registrantsRes.ok) {
      const registrantsData = await registrantsRes.json();
      
      if (registrantsData.registrants && registrantsData.registrants.length > 0) {
        // Delete existing registrants for this webinar
        await supabase
          .from('zoom_webinar_participants')
          .delete()
          .eq('user_id', user.id)
          .eq('webinar_id', webinarId)
          .eq('participant_type', 'registrant');
        
        // Insert new registrants
        const registrantsToInsert = registrantsData.registrants.map((registrant: any) => ({
          user_id: user.id,
          webinar_id: webinarId,
          participant_type: 'registrant',
          participant_id: registrant.id,
          email: registrant.email,
          name: `${registrant.first_name} ${registrant.last_name}`.trim(),
          join_time: registrant.create_time,
          raw_data: registrant
        }));
        
        const { error: registrantsError } = await supabase
          .from('zoom_webinar_participants')
          .insert(registrantsToInsert);
        
        if (registrantsError) {
          console.error(`[zoom-api][sync-single-webinar] Error inserting registrants:`, registrantsError);
          syncResults.error_details.push(`Registrants: ${registrantsError.message}`);
        } else {
          syncResults.registrants_synced = registrantsData.registrants.length;
          totalItemsSynced += registrantsData.registrants.length;
          console.log(`[zoom-api][sync-single-webinar] Synced ${registrantsData.registrants.length} registrants for: ${webinarId}`);
        }
      }
    } else {
      const errorText = await registrantsRes.text();
      console.log(`[zoom-api][sync-single-webinar] No registrants found or error:`, errorText);
    }
    
    // 3. Sync attendees (for completed webinars)
    console.log(`[zoom-api][sync-single-webinar] Fetching attendees for: ${webinarId}`);
    const attendeesRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/participants?page_size=300`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (attendeesRes.ok) {
      const attendeesData = await attendeesRes.json();
      
      if (attendeesData.participants && attendeesData.participants.length > 0) {
        // Delete existing attendees for this webinar
        await supabase
          .from('zoom_webinar_participants')
          .delete()
          .eq('user_id', user.id)
          .eq('webinar_id', webinarId)
          .eq('participant_type', 'attendee');
        
        // Insert new attendees
        const attendeesToInsert = attendeesData.participants.map((attendee: any) => ({
          user_id: user.id,
          webinar_id: webinarId,
          participant_type: 'attendee',
          participant_id: attendee.id,
          email: attendee.user_email,
          name: attendee.name,
          join_time: attendee.join_time,
          leave_time: attendee.leave_time,
          duration: attendee.duration,
          raw_data: attendee
        }));
        
        const { error: attendeesError } = await supabase
          .from('zoom_webinar_participants')
          .insert(attendeesToInsert);
        
        if (attendeesError) {
          console.error(`[zoom-api][sync-single-webinar] Error inserting attendees:`, attendeesError);
          syncResults.error_details.push(`Attendees: ${attendeesError.message}`);
        } else {
          syncResults.attendees_synced = attendeesData.participants.length;
          totalItemsSynced += attendeesData.participants.length;
          console.log(`[zoom-api][sync-single-webinar] Synced ${attendeesData.participants.length} attendees for: ${webinarId}`);
        }
      }
    } else {
      const errorText = await attendeesRes.text();
      console.log(`[zoom-api][sync-single-webinar] No attendees found or error:`, errorText);
    }
    
    // 4. Sync webinar instances (for recurring webinars)
    console.log(`[zoom-api][sync-single-webinar] Fetching instances for: ${webinarId}`);
    const instancesRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (instancesRes.ok) {
      const instancesData = await instancesRes.json();
      
      if (instancesData.webinars && instancesData.webinars.length > 0) {
        // Process each instance
        for (const instance of instancesData.webinars) {
          const { error: instanceError } = await supabase
            .from('zoom_webinar_instances')
            .upsert({
              user_id: user.id,
              webinar_id: webinarId,
              webinar_uuid: instance.uuid,
              instance_id: instance.uuid,
              topic: instance.topic,
              start_time: instance.start_time,
              duration: instance.duration,
              raw_data: instance
            }, {
              onConflict: 'user_id,webinar_id,instance_id'
            });
          
          if (instanceError) {
            console.error(`[zoom-api][sync-single-webinar] Error inserting instance:`, instanceError);
            syncResults.error_details.push(`Instance ${instance.uuid}: ${instanceError.message}`);
          } else {
            syncResults.instances_synced += 1;
            totalItemsSynced += 1;
          }
        }
        
        console.log(`[zoom-api][sync-single-webinar] Synced ${instancesData.webinars.length} instances for: ${webinarId}`);
      }
    } else {
      const errorText = await instancesRes.text();
      console.log(`[zoom-api][sync-single-webinar] No instances found or error:`, errorText);
    }
    
    // Record sync in history
    const syncMessage = `Single webinar sync for ${webinarId}: ${syncResults.registrants_synced} registrants, ${syncResults.attendees_synced} attendees, ${syncResults.instances_synced} instances`;
    
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'single-webinar',
        status: syncResults.error_details.length > 0 ? 'partial_success' : 'success',
        items_synced: totalItemsSynced,
        message: syncMessage,
        sync_details: syncResults
      });
    
    console.log(`[zoom-api][sync-single-webinar] Completed sync for webinar: ${webinarId}, total items: ${totalItemsSynced}`);
    
    return new Response(JSON.stringify({
      success: true,
      webinar_id: webinarId,
      items_synced: totalItemsSynced,
      sync_results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error(`[zoom-api][sync-single-webinar] Error syncing webinar ${webinarId}:`, error);
    
    // Record failed sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'single-webinar',
        status: 'error',
        items_synced: totalItemsSynced,
        message: `Failed to sync webinar ${webinarId}: ${error.message}`,
        sync_details: { error: error.message, partial_results: syncResults }
      });
    
    throw error;
  }
}
