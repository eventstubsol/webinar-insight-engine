
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

/**
 * Get webinar participants handler
 * Fetches registrants and attendees for a specific webinar
 */
export async function handleGetWebinarParticipants(
  req: Request, 
  supabase: any, 
  user: any, 
  credentials: any,
  webinarId: string
): Promise<Response> {
  console.log(`[get-webinar-participants] Fetching participants for webinar: ${webinarId}`);
  
  try {
    // First try to get from database
    const { data: dbParticipants, error: dbError } = await supabase
      .from('zoom_webinar_participants')
      .select('*')
      .eq('user_id', user.id)
      .eq('webinar_id', webinarId);
    
    if (!dbError && dbParticipants && dbParticipants.length > 0) {
      console.log(`[get-webinar-participants] Found ${dbParticipants.length} participants in database`);
      
      // Separate registrants and attendees
      const registrants = dbParticipants.filter(p => p.participant_type === 'registrant');
      const attendees = dbParticipants.filter(p => p.participant_type === 'attendee');
      
      return new Response(JSON.stringify({ 
        success: true,
        registrants,
        attendees
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // If not in database, fetch from Zoom API
    console.log(`[get-webinar-participants] Fetching from Zoom API`);
    
    const token = await getZoomJwtToken(
      credentials.account_id, 
      credentials.client_id, 
      credentials.client_secret
    );
    
    // Fetch both registrants and attendees in parallel
    const [registrantsRes, attendeesRes] = await Promise.all([
      fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?page_size=300`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/participants?page_size=300`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    ]);
    
    const registrantsData = registrantsRes.ok ? await registrantsRes.json() : { registrants: [] };
    const attendeesData = attendeesRes.ok ? await attendeesRes.json() : { participants: [] };
    
    return new Response(JSON.stringify({ 
      success: true,
      registrants: registrantsData.registrants || [],
      attendees: attendeesData.participants || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[get-webinar-participants] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
