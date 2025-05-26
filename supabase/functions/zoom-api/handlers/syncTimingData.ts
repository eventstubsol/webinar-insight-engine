
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

export async function handleSyncTimingData(req: Request, supabase: any, user: any, credentials: any) {
  console.log(`[zoom-api][sync-timing-data] Starting timing data sync for user: ${user.id}`);
  
  try {
    // Get token for Zoom API calls
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    console.log('[zoom-api][sync-timing-data] Got Zoom token');
    
    // Fetch all ended webinars from database that don't have actual timing data
    const { data: webinars, error: fetchError } = await supabase
      .from('zoom_webinars')
      .select('id, webinar_id, webinar_uuid, topic, status')
      .eq('user_id', user.id)
      .eq('status', 'ended')
      .is('actual_start_time', null);
    
    if (fetchError) {
      console.error('[zoom-api][sync-timing-data] Error fetching webinars:', fetchError);
      throw new Error(`Failed to fetch webinars: ${fetchError.message}`);
    }
    
    if (!webinars || webinars.length === 0) {
      console.log('[zoom-api][sync-timing-data] No ended webinars without timing data found');
      return new Response(JSON.stringify({
        success: true,
        message: 'No webinars need timing data updates',
        updated: 0,
        total: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[zoom-api][sync-timing-data] Found ${webinars.length} webinars to update timing data`);
    
    let updatedCount = 0;
    const errors = [];
    
    // Process each webinar to get past webinar timing data
    for (const webinar of webinars) {
      try {
        console.log(`[zoom-api][sync-timing-data] Processing webinar: ${webinar.webinar_id} (${webinar.topic})`);
        
        // Use webinar_uuid if available, otherwise use webinar_id
        // CRITICAL: Properly encode the UUID for URL usage
        const webinarIdentifier = webinar.webinar_uuid || webinar.webinar_id;
        const encodedIdentifier = encodeURIComponent(webinarIdentifier);
        
        console.log(`[zoom-api][sync-timing-data] Using identifier: ${webinarIdentifier}, encoded: ${encodedIdentifier}`);
        
        // Call Zoom's past webinar API with properly encoded UUID
        const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${encodedIdentifier}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!pastWebinarResponse.ok) {
          const errorText = await pastWebinarResponse.text();
          console.log(`[zoom-api][sync-timing-data] No past webinar data for ${webinar.webinar_id}: ${pastWebinarResponse.status} - ${errorText}`);
          errors.push(`Webinar ${webinar.webinar_id}: ${pastWebinarResponse.status} - ${errorText}`);
          continue;
        }
        
        const pastWebinarData = await pastWebinarResponse.json();
        console.log(`[zoom-api][sync-timing-data] Got past webinar data for ${webinar.webinar_id}:`, {
          start_time: pastWebinarData.start_time,
          duration: pastWebinarData.duration,
          end_time: pastWebinarData.end_time
        });
        
        // Extract timing data
        const actualStartTime = pastWebinarData.start_time || null;
        const actualDuration = pastWebinarData.duration || null;
        const actualEndTime = pastWebinarData.end_time || null;
        
        // Update the webinar in database with actual timing data
        const { error: updateError } = await supabase
          .from('zoom_webinars')
          .update({
            actual_start_time: actualStartTime,
            actual_duration: actualDuration,
            actual_end_time: actualEndTime,
            last_synced_at: new Date().toISOString()
          })
          .eq('id', webinar.id);
        
        if (updateError) {
          console.error(`[zoom-api][sync-timing-data] Error updating webinar ${webinar.webinar_id}:`, updateError);
          errors.push(`Webinar ${webinar.webinar_id}: ${updateError.message}`);
          continue;
        }
        
        updatedCount++;
        console.log(`[zoom-api][sync-timing-data] Updated timing data for webinar ${webinar.webinar_id}: start=${actualStartTime}, duration=${actualDuration}`);
        
      } catch (error) {
        console.error(`[zoom-api][sync-timing-data] Error processing webinar ${webinar.webinar_id}:`, error);
        errors.push(`Webinar ${webinar.webinar_id}: ${error.message}`);
      }
    }
    
    console.log(`[zoom-api][sync-timing-data] Timing sync completed: ${updatedCount}/${webinars.length} webinars updated`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Updated timing data for ${updatedCount} webinars`,
      updated: updatedCount,
      total: webinars.length,
      errors: errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][sync-timing-data] Error in timing sync:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to sync timing data'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
