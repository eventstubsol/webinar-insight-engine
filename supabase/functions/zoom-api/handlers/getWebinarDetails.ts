
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

/**
 * Get webinar details handler
 * Fetches detailed information about a specific webinar
 */
export async function handleGetWebinarDetails(
  req: Request, 
  supabase: any, 
  user: any, 
  credentials: any,
  webinarId: string
): Promise<Response> {
  console.log(`[get-webinar-details] Fetching details for webinar: ${webinarId}`);
  
  try {
    // First try to get from database
    const { data: dbWebinar, error: dbError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id)
      .eq('webinar_id', webinarId)
      .single();
    
    if (!dbError && dbWebinar) {
      console.log(`[get-webinar-details] Found webinar in database`);
      return new Response(JSON.stringify({ 
        success: true,
        webinar: dbWebinar 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // If not in database, fetch from Zoom API
    console.log(`[get-webinar-details] Fetching from Zoom API`);
    
    const token = await getZoomJwtToken(
      credentials.account_id, 
      credentials.client_id, 
      credentials.client_secret
    );
    
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[get-webinar-details] Zoom API error:`, errorText);
      throw new Error(`Zoom API error: ${response.status} ${errorText}`);
    }
    
    const webinarData = await response.json();
    
    return new Response(JSON.stringify({ 
      success: true,
      webinar: webinarData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[get-webinar-details] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
