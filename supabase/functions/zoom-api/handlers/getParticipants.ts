
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

// Handle getting participants for a webinar
export async function handleGetParticipants(req: Request, supabase: any, user: any, credentials: any, id: string) {
  if (!id) {
    throw new Error('Webinar ID is required');
  }
  
  console.log(`[zoom-api][getParticipants] Starting participant fetch for webinar: ${id}`);
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  // First, get webinar details to check status
  let webinarDetails;
  try {
    const webinarRes = await fetch(`https://api.zoom.us/v2/webinars/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (webinarRes.ok) {
      webinarDetails = await webinarRes.json();
      console.log(`[zoom-api][getParticipants] Webinar ${id} details:`, {
        status: webinarDetails.status,
        start_time: webinarDetails.start_time,
        duration: webinarDetails.duration
      });
    } else {
      console.warn(`[zoom-api][getParticipants] Could not fetch webinar details for ${id}: ${webinarRes.status}`);
    }
  } catch (err) {
    console.warn(`[zoom-api][getParticipants] Error fetching webinar details:`, err);
  }
  
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
  
  console.log(`[zoom-api][getParticipants] API responses for webinar ${id}:`, {
    registrants: { status: registrantsRes.status, ok: registrantsRes.ok },
    attendees: { status: attendeesRes.status, ok: attendeesRes.ok }
  });
  
  let registrantsData = { registrants: [] };
  let attendeesData = { participants: [] };
  
  // Process registrants response
  if (registrantsRes.ok) {
    registrantsData = await registrantsRes.json();
    console.log(`[zoom-api][getParticipants] Successfully fetched ${registrantsData.registrants?.length || 0} registrants for webinar ${id}`);
  } else {
    const errorText = await registrantsRes.text();
    console.error(`[zoom-api][getParticipants] Failed to fetch registrants for webinar ${id}:`, {
      status: registrantsRes.status,
      statusText: registrantsRes.statusText,
      error: errorText
    });
  }
  
  // Process attendees response
  if (attendeesRes.ok) {
    attendeesData = await attendeesRes.json();
    console.log(`[zoom-api][getParticipants] Successfully fetched ${attendeesData.participants?.length || 0} attendees for webinar ${id}`);
  } else {
    const errorText = await attendeesRes.text();
    console.error(`[zoom-api][getParticipants] Failed to fetch attendees for webinar ${id}:`, {
      status: attendeesRes.status,
      statusText: attendeesRes.statusText,
      error: errorText
    });
    
    // Check if this is because the webinar hasn't ended yet
    if (attendeesRes.status === 404 && webinarDetails) {
      const now = new Date();
      const startTime = new Date(webinarDetails.start_time);
      const duration = webinarDetails.duration || 60;
      const estimatedEndTime = new Date(startTime.getTime() + duration * 60 * 1000);
      
      if (estimatedEndTime > now || webinarDetails.status !== 'ended') {
        console.log(`[zoom-api][getParticipants] Webinar ${id} hasn't ended yet, attendee data not available. Status: ${webinarDetails.status}, estimated end: ${estimatedEndTime.toISOString()}`);
      }
    }
  }
  
  // Store participants in database if we have data
  if (registrantsRes.ok && registrantsData.registrants && registrantsData.registrants.length > 0) {
    // Delete existing registrants for this webinar
    await supabase
      .from('zoom_webinar_participants')
      .delete()
      .eq('user_id', user.id)
      .eq('webinar_id', id)
      .eq('participant_type', 'registrant');
    
    // Insert new registrants
    const registrantsToInsert = registrantsData.registrants.map((registrant: any) => ({
      user_id: user.id,
      webinar_id: id,
      participant_type: 'registrant',
      participant_id: registrant.id,
      email: registrant.email,
      name: `${registrant.first_name} ${registrant.last_name}`.trim(),
      join_time: registrant.create_time,
      raw_data: registrant
    }));
    
    const { error: insertError } = await supabase
      .from('zoom_webinar_participants')
      .insert(registrantsToInsert);
      
    if (insertError) {
      console.error(`[zoom-api][getParticipants] Error inserting registrants:`, insertError);
    } else {
      console.log(`[zoom-api][getParticipants] Successfully stored ${registrantsToInsert.length} registrants in database`);
    }
  }
  
  if (attendeesRes.ok && attendeesData.participants && attendeesData.participants.length > 0) {
    // Delete existing attendees for this webinar
    await supabase
      .from('zoom_webinar_participants')
      .delete()
      .eq('user_id', user.id)
      .eq('webinar_id', id)
      .eq('participant_type', 'attendee');
    
    // Insert new attendees
    const attendeesToInsert = attendeesData.participants.map((attendee: any) => ({
      user_id: user.id,
      webinar_id: id,
      participant_type: 'attendee',
      participant_id: attendee.id,
      email: attendee.user_email,
      name: attendee.name,
      join_time: attendee.join_time,
      leave_time: attendee.leave_time,
      duration: attendee.duration,
      raw_data: attendee
    }));
    
    const { error: insertError } = await supabase
      .from('zoom_webinar_participants')
      .insert(attendeesToInsert);
      
    if (insertError) {
      console.error(`[zoom-api][getParticipants] Error inserting attendees:`, insertError);
    } else {
      console.log(`[zoom-api][getParticipants] Successfully stored ${attendeesToInsert.length} attendees in database`);
    }
  }
  
  // Record sync in history
  const syncMessage = `Synced ${registrantsData.registrants?.length || 0} registrants and ${attendeesData.participants?.length || 0} attendees`;
  console.log(`[zoom-api][getParticipants] ${syncMessage} for webinar ${id}`);
  
  await supabase
    .from('zoom_sync_history')
    .insert({
      user_id: user.id,
      sync_type: 'participants',
      status: 'success',
      items_synced: (registrantsData.registrants?.length || 0) + (attendeesData.participants?.length || 0),
      message: syncMessage
    });
  
  return new Response(JSON.stringify({
    registrants: registrantsRes.ok ? registrantsData.registrants || [] : [],
    attendees: attendeesRes.ok ? attendeesData.participants || [] : [],
    webinar_status: webinarDetails?.status || 'unknown',
    debug_info: {
      webinar_id: id,
      registrants_response: { status: registrantsRes.status, count: registrantsData.registrants?.length || 0 },
      attendees_response: { status: attendeesRes.status, count: attendeesData.participants?.length || 0 },
      webinar_details: webinarDetails ? {
        status: webinarDetails.status,
        start_time: webinarDetails.start_time,
        duration: webinarDetails.duration
      } : null
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
