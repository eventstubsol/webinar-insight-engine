
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

// Handle getting actual timing data for a specific webinar
export async function handleGetActualTimingData(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  console.log(`[zoom-api][get-actual-timing] Fetching actual timing data for webinar: ${webinarId}`);
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  try {
    // Fetch from past webinars API to get actual timing data
    const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!pastWebinarResponse.ok) {
      const errorText = await pastWebinarResponse.text();
      console.log(`[zoom-api][get-actual-timing] Could not fetch past webinar data: ${errorText}`);
      throw new Error(`Failed to fetch actual timing data: ${errorText}`);
    }
    
    const pastWebinarData = await pastWebinarResponse.json();
    
    // Extract actual timing data
    const actualStartTime = pastWebinarData.actual_start_time || null;
    const actualDuration = pastWebinarData.actual_duration || pastWebinarData.duration || null;
    
    console.log(`[zoom-api][get-actual-timing] Found actual timing data:`, {
      actual_start_time: actualStartTime,
      actual_duration: actualDuration
    });
    
    // Update the webinar in the database with actual timing data
    if (actualStartTime || actualDuration) {
      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update({
          actual_start_time: actualStartTime,
          actual_duration: actualDuration,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId);
      
      if (updateError) {
        console.error(`[zoom-api][get-actual-timing] Error updating webinar:`, updateError);
        throw new Error(`Failed to update webinar with actual timing data: ${updateError.message}`);
      }
      
      console.log(`[zoom-api][get-actual-timing] Successfully updated webinar ${webinarId} with actual timing data`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      webinar_id: webinarId,
      actual_start_time: actualStartTime,
      actual_duration: actualDuration,
      past_webinar_data: pastWebinarData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error(`[zoom-api][get-actual-timing] Error fetching actual timing data:`, error);
    throw error;
  }
}
