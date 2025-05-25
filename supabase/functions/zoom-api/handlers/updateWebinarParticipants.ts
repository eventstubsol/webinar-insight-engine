
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

// Updated function to update participant counts for all webinars
export async function handleUpdateWebinarParticipants(req: Request, supabase: any, user: any, credentials: any) {
  console.log(`[zoom-api][update-participants] Starting action for user: ${user.id}`);
  
  try {
    // Get the request body with timeout guard
    let body;
    try {
      body = await req.json();
    } catch (e) {
      // If no body, just continue with all webinars
      body = {};
    }
    
    const specificWebinarId = body.webinar_id;
    const userId = body.user_id || user.id;
    
    // Get token for API calls
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Get webinars from database - UPDATED QUERY to include more past webinars
    const { data: webinars, error: webinarsError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
      
    if (webinarsError || !webinars || webinars.length === 0) {
      console.log('[zoom-api][update-participants] No webinars found in database');
      return new Response(JSON.stringify({ 
        message: 'No webinars found to update', 
        updated: 0,
        skipped: 0,
        errors: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Filter to get completed webinars using time-based logic
    const now = new Date();
    const completedWebinars = webinars.filter(webinar => {
      // Check explicitly for "ended" status or use time-based logic
      if (webinar.status === 'ended') {
        return true;
      }
      
      // Time-based logic: Check if webinar has already passed (start_time + duration)
      const startTime = new Date(webinar.start_time);
      const durationMs = (webinar.duration || 0) * 60 * 1000; // convert minutes to ms
      const endTime = new Date(startTime.getTime() + durationMs);
      
      return endTime < now; // Webinar has ended if end time is in the past
    });
    
    console.log(`[zoom-api][update-participants] Found ${completedWebinars.length} completed webinars out of ${webinars.length} total`);
      
    // Filter by specific webinar ID if provided
    const webinarsToProcess = specificWebinarId 
      ? completedWebinars.filter(w => w.webinar_id === specificWebinarId) 
      : completedWebinars;
      
    console.log(`[zoom-api][update-participants] Processing ${webinarsToProcess.length} webinars`);
    
    // Process each webinar to get participant counts
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const webinar of webinarsToProcess) {
      try {
        // Make parallel requests for registrants and attendees - FIX URL FROM OPENAI TO ZOOM API
        const [registrantsRes, attendeesRes] = await Promise.all([
          fetch(`https://api.zoom.us/v2/webinars/${webinar.webinar_id}/registrants?page_size=1`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`https://api.zoom.us/v2/past_webinars/${webinar.webinar_id}/participants?page_size=1`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);
        
        const [registrantsData, attendeesData] = await Promise.all([
          registrantsRes.ok ? registrantsRes.json() : { total_records: 0 },
          attendeesRes.ok ? attendeesRes.json() : { total_records: 0 }
        ]);
        
        // Update raw_data with participant counts and ensure status is set to "ended" for past webinars
        const updatedRawData = {
          ...webinar.raw_data,
          registrants_count: registrantsData.total_records || 0,
          participants_count: attendeesData.total_records || 0
        };
        
        // Update both the raw_data and set status to "ended" for past webinars
        const { error: updateError } = await supabase
          .from('zoom_webinars')
          .update({
            raw_data: updatedRawData,
            status: 'ended' // Explicitly set status to ended for past webinars
          })
          .eq('id', webinar.id);
        
        if (updateError) {
          console.error(`[zoom-api][update-participants] Error updating webinar ${webinar.webinar_id}:`, updateError);
          errors++;
        } else {
          console.log(`[zoom-api][update-participants] Updated webinar ${webinar.webinar_id} with registrants: ${updatedRawData.registrants_count}, participants: ${updatedRawData.participants_count}`);
          updated++;
        }
      } catch (err) {
        console.error(`[zoom-api][update-participants] Error processing webinar ${webinar.webinar_id}:`, err);
        errors++;
      }
    }
    
    // Record action in sync history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: userId,
        sync_type: 'participants_count',
        status: errors === 0 ? 'success' : 'partial',
        items_synced: updated,
        message: `Updated participant counts for ${updated} webinars, skipped ${skipped}, with ${errors} errors`
      });
    
    return new Response(JSON.stringify({ 
      message: `Updated participant counts for ${updated} webinars, skipped ${skipped}, with ${errors} errors`,
      updated,
      skipped,
      errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][update-participants] Error:', error);
    
    // Record failed sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'participants_count',
        status: 'error',
        items_synced: 0,
        message: error.message || 'Unknown error'
      });
    
    throw error;
  }
}
