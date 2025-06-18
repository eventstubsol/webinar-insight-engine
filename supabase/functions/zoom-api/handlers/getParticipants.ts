
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

// Handle getting participants for a webinar - UPDATED to use separate tables
export async function handleGetParticipants(req: Request, supabase: any, user: any, credentials: any, id: string) {
  if (!id) {
    throw new Error('Webinar ID is required');
  }
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  const [registrantsRes, attendeesRes] = await Promise.all([
    fetch(`https://api.zoom.us/v2/webinars/${id}/registrants?page_size=300`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }),
    fetch(`https://api.zoom.us/v2/past_webinars/${id}/participants?page_size=300`, {
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
  
  // Store registrants in zoom_webinar_registrants table
  if (registrantsRes.ok && registrantsData.registrants && registrantsData.registrants.length > 0) {
    // Delete existing registrants for this webinar
    await supabase
      .from('zoom_webinar_registrants')
      .delete()
      .eq('user_id', user.id)
      .eq('webinar_id', id);
    
    // Insert new registrants
    const registrantsToInsert = registrantsData.registrants.map((registrant: any) => ({
      user_id: user.id,
      webinar_id: id,
      registrant_id: registrant.id,
      email: registrant.email,
      first_name: registrant.first_name,
      last_name: registrant.last_name,
      registration_time: registrant.create_time,
      status: registrant.status,
      join_url: registrant.join_url,
      raw_data: registrant
    }));
    
    await supabase
      .from('zoom_webinar_registrants')
      .insert(registrantsToInsert);
  }
  
  // Store attendees in zoom_webinar_participants table
  if (attendeesRes.ok && attendeesData.participants && attendeesData.participants.length > 0) {
    // Delete existing attendees for this webinar
    await supabase
      .from('zoom_webinar_participants')
      .delete()
      .eq('user_id', user.id)
      .eq('webinar_id', id);
    
    // Insert new attendees
    const attendeesToInsert = attendeesData.participants.map((attendee: any) => ({
      user_id: user.id,
      webinar_id: id,
      participant_id: attendee.id,
      email: attendee.user_email,
      name: attendee.name,
      join_time: attendee.join_time,
      leave_time: attendee.leave_time,
      duration: attendee.duration,
      connection_type: attendee.connection_type,
      data_center: attendee.data_center,
      pc_name: attendee.pc_name,
      domain: attendee.domain,
      mac_addr: attendee.mac_addr,
      harddisk_id: attendee.harddisk_id,
      recording_consent: attendee.recording_consent || false,
      raw_data: attendee
    }));
    
    await supabase
      .from('zoom_webinar_participants')
      .insert(attendeesToInsert);
  }
  
  // Record sync in history
  await supabase
    .from('zoom_sync_history')
    .insert({
      user_id: user.id,
      sync_type: 'participants',
      status: 'success',
      items_synced: (registrantsData.registrants?.length || 0) + (attendeesData.participants?.length || 0),
      message: `Synced ${registrantsData.registrants?.length || 0} registrants and ${attendeesData.participants?.length || 0} attendees`
    });
  
  return new Response(JSON.stringify({
    registrants: registrantsRes.ok ? registrantsData.registrants || [] : [],
    attendees: attendeesRes.ok ? attendeesData.participants || [] : []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
