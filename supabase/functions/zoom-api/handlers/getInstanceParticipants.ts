
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

// Handle getting participants for a specific instance
export async function handleGetInstanceParticipants(req: Request, supabase: any, user: any, credentials: any, webinarId: string, instanceId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  if (!instanceId) {
    throw new Error('Instance ID is required');
  }
  
  console.log(`[zoom-api][get-instance-participants] Fetching participants for webinar ID: ${webinarId}, instance ID: ${instanceId}`);
  
  try {
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Get the database ID for this instance
    const { data: dbInstance, error: dbInstanceError } = await supabase
      .from('zoom_webinar_instances')
      .select('id')
      .eq('webinar_id', webinarId)
      .eq('instance_id', instanceId)
      .maybeSingle();
    
    if (dbInstanceError || !dbInstance) {
      throw new Error(`Instance not found in database: ${dbInstanceError?.message || 'Unknown error'}`);
    }
    
    // Make API requests for registrants and attendees
    const [registrantsRes, attendeesRes] = await Promise.all([
      fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?occurrence_id=${instanceId}&page_size=300`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`https://api.zoom.us/v2/past_webinars/${instanceId}/participants?page_size=300`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    ]);
    
    const [registrantsData, attendeesData] = await Promise.all([
      registrantsRes.json(),
      attendeesRes.json()
    ]);
    
    // Store participants in database
    if (registrantsRes.ok && registrantsData.registrants && registrantsData.registrants.length > 0) {
      // Delete existing registrants for this instance
      await supabase
        .from('zoom_webinar_instance_participants')
        .delete()
        .eq('user_id', user.id)
        .eq('instance_id', dbInstance.id)
        .eq('participant_type', 'registrant');
      
      // Insert new registrants
      const registrantsToInsert = registrantsData.registrants.map((registrant: any) => ({
        user_id: user.id,
        instance_id: dbInstance.id,
        webinar_id: webinarId,
        participant_type: 'registrant',
        participant_id: registrant.id,
        email: registrant.email,
        name: `${registrant.first_name} ${registrant.last_name}`.trim(),
        join_time: registrant.create_time,
        raw_data: registrant
      }));
      
      await supabase
        .from('zoom_webinar_instance_participants')
        .insert(registrantsToInsert);
    }
    
    if (attendeesRes.ok && attendeesData.participants && attendeesData.participants.length > 0) {
      // Delete existing attendees for this instance
      await supabase
        .from('zoom_webinar_instance_participants')
        .delete()
        .eq('user_id', user.id)
        .eq('instance_id', dbInstance.id)
        .eq('participant_type', 'attendee');
      
      // Insert new attendees
      const attendeesToInsert = attendeesData.participants.map((attendee: any) => ({
        user_id: user.id,
        instance_id: dbInstance.id,
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
      
      await supabase
        .from('zoom_webinar_instance_participants')
        .insert(attendeesToInsert);
    }
    
    // Record sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'instance_participants',
        status: 'success',
        items_synced: (registrantsData.registrants?.length || 0) + (attendeesData.participants?.length || 0),
        message: `Synced ${registrantsData.registrants?.length || 0} registrants and ${attendeesData.participants?.length || 0} attendees for instance ${instanceId}`
      });
    
    return new Response(JSON.stringify({
      registrants: registrantsRes.ok ? registrantsData.registrants || [] : [],
      attendees: attendeesRes.ok ? attendeesData.participants || [] : []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][get-instance-participants] Error:', error);
    
    // Record failed sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'instance_participants',
        status: 'error',
        items_synced: 0,
        message: error.message || 'Unknown error'
      });
    
    throw error;
  }
}
