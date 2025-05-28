
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

// Main handler function with simplified implementation
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any): Promise<Response> {
  console.log(`[zoom-api][list-webinars] 🚀 Starting webinar list handler`);
  
  try {
    const { force_sync = false } = await req.json().catch(() => ({}));
    
    if (!credentials) {
      console.log('[zoom-api][list-webinars] No credentials found');
      return new Response(JSON.stringify({ 
        webinars: [],
        summary: {
          total: 0,
          historical: 0,
          upcoming: 0,
          completed: 0,
          message: 'No Zoom credentials configured'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // First try to get from database if not forcing sync
    if (!force_sync) {
      const { data: dbWebinars, error: dbError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });
      
      if (!dbError && dbWebinars && dbWebinars.length > 0) {
        console.log(`[zoom-api][list-webinars] Found ${dbWebinars.length} webinars in database`);
        return new Response(JSON.stringify({
          webinars: dbWebinars,
          summary: {
            total: dbWebinars.length,
            historical: dbWebinars.filter(w => w.status === 'ended').length,
            upcoming: dbWebinars.filter(w => w.status === 'waiting').length,
            completed: dbWebinars.filter(w => w.status === 'ended').length,
            message: 'Retrieved from database'
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // If forcing sync or no data in DB, fetch from Zoom API
    console.log('[zoom-api][list-webinars] Fetching from Zoom API');
    
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Get user data
    const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!meResponse.ok) {
      throw new Error('Failed to fetch user data from Zoom API');
    }
    
    const meData = await meResponse.json();
    console.log(`[zoom-api][list-webinars] User: ${meData.email}`);
    
    // Fetch webinars from multiple endpoints
    const webinars = [];
    
    // Get upcoming webinars
    try {
      const upcomingResponse = await fetch(`https://api.zoom.us/v2/users/${meData.id}/webinars?page_size=300`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json();
        if (upcomingData.webinars) {
          webinars.push(...upcomingData.webinars.map(w => ({ ...w, data_source: 'upcoming' })));
        }
      }
    } catch (error) {
      console.error('[zoom-api][list-webinars] Error fetching upcoming webinars:', error);
    }
    
    // Get past webinars
    try {
      const pastResponse = await fetch(`https://api.zoom.us/v2/report/users/${meData.id}/webinars?page_size=300`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastResponse.ok) {
        const pastData = await pastResponse.json();
        if (pastData.webinars) {
          webinars.push(...pastData.webinars.map(w => ({ ...w, data_source: 'past' })));
        }
      }
    } catch (error) {
      console.error('[zoom-api][list-webinars] Error fetching past webinars:', error);
    }
    
    // Sync to database
    let successCount = 0;
    let errorCount = 0;
    
    for (const webinar of webinars) {
      try {
        const webinarData = {
          user_id: user.id,
          webinar_id: webinar.id.toString(),
          webinar_uuid: webinar.uuid || webinar.id.toString(),
          topic: webinar.topic || 'Untitled Webinar',
          start_time: webinar.start_time ? new Date(webinar.start_time).toISOString() : null,
          duration: webinar.duration || 0,
          timezone: webinar.timezone || null,
          agenda: webinar.agenda || null,
          host_id: webinar.host_id || meData.id,
          host_email: webinar.host_email || meData.email,
          status: webinar.status || 'unknown',
          type: webinar.type || 5,
          join_url: webinar.join_url || null,
          registration_url: webinar.registration_url || null,
          password: webinar.password || null,
          data_source: webinar.data_source || 'api',
          raw_data: webinar,
          last_synced_at: new Date().toISOString()
        };
        
        const { error: upsertError } = await supabase
          .from('zoom_webinars')
          .upsert(webinarData, {
            onConflict: 'user_id,webinar_id'
          });
        
        if (upsertError) {
          console.error('[zoom-api][list-webinars] Upsert error:', upsertError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error('[zoom-api][list-webinars] Error processing webinar:', error);
        errorCount++;
      }
    }
    
    // Record sync history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'webinars',
        status: errorCount === 0 ? 'success' : 'partial_success',
        items_synced: successCount,
        message: `Synced ${successCount} webinars, ${errorCount} errors`
      });
    
    console.log(`[zoom-api][list-webinars] Sync complete: ${successCount} success, ${errorCount} errors`);
    
    return new Response(JSON.stringify({
      webinars: webinars,
      summary: {
        total: webinars.length,
        historical: webinars.filter(w => w.data_source === 'past').length,
        upcoming: webinars.filter(w => w.data_source === 'upcoming').length,
        completed: webinars.filter(w => w.status === 'ended').length,
        synced: successCount,
        errors: errorCount,
        message: `Fetched ${webinars.length} webinars from Zoom API`
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][list-webinars] ❌ Error in handleListWebinars:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
