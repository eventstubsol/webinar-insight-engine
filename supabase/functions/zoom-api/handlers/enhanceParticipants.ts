
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

export async function handleEnhanceParticipants(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  console.log(`[zoom-api][enhance-participants] Starting participant enhancement for webinar: ${webinarId}`);
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  try {
    // Fetch registrants and attendees data
    const [registrantsResponse, attendeesResponse] = await Promise.all([
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
    
    const registrantsData = registrantsResponse.ok ? await registrantsResponse.json() : { registrants: [], total_records: 0 };
    const attendeesData = attendeesResponse.ok ? await attendeesResponse.json() : { participants: [], total_records: 0 };
    
    // Update webinar with participant data
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        raw_data: supabase.raw(`
          raw_data || jsonb_build_object(
            'registrants', '${JSON.stringify(registrantsData.registrants || [])}',
            'attendees', '${JSON.stringify(attendeesData.participants || [])}',
            'registrants_count', ${registrantsData.total_records || 0},
            'participants_count', ${attendeesData.total_records || 0},
            'participants_enhanced_at', '${new Date().toISOString()}'
          )
        `),
        last_synced_at: new Date().toISOString()
      })
      .eq('webinar_id', webinarId)
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('[zoom-api][enhance-participants] Database update error:', updateError);
      throw new Error('Failed to update participant data');
    }
    
    console.log(`[zoom-api][enhance-participants] Successfully enhanced participant data for webinar ${webinarId}`);
    console.log(`[zoom-api][enhance-participants] Registrants: ${registrantsData.total_records}, Attendees: ${attendeesData.total_records}`);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        registrants_count: registrantsData.total_records || 0,
        participants_count: attendeesData.total_records || 0,
        registrants: registrantsData.registrants || [],
        attendees: attendeesData.participants || []
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][enhance-participants] Error:', error);
    throw new Error(`Failed to enhance participant data: ${error.message}`);
  }
}
