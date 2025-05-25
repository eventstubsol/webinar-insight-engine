
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

/**
 * Handle fetching recordings for a specific webinar
 */
export async function handleGetWebinarRecordings(req: Request, supabase: any, user: any, credentials: any) {
  console.log(`[zoom-api][get-webinar-recordings] Starting recordings fetch for user: ${user.id}`);
  
  try {
    const { webinar_id } = await req.json();
    
    if (!webinar_id) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameter: webinar_id' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[zoom-api][get-webinar-recordings] Fetching recordings for webinar: ${webinar_id}`);
    
    // Get Zoom JWT token
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Check if webinar exists and belongs to user
    const { data: webinar, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id)
      .eq('webinar_id', webinar_id)
      .single();
    
    if (webinarError || !webinar) {
      return new Response(JSON.stringify({ 
        error: 'Webinar not found or access denied' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Fetch recordings from Zoom API
    const recordingsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}/recordings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    let recordingData = null;
    let recordings = [];
    
    if (recordingsResponse.ok) {
      recordingData = await recordingsResponse.json();
      recordings = recordingData.recordings || [];
      
      console.log(`[zoom-api][get-webinar-recordings] Found ${recordings.length} recordings for webinar ${webinar_id}`);
      
      // Store/update recordings in database
      if (recordings.length > 0) {
        const currentTimestamp = new Date().toISOString();
        
        for (const recording of recordings) {
          const recordingEntry = {
            user_id: user.id,
            webinar_id: webinar_id,
            recording_id: recording.id,
            instance_id: recordingData.instance_id || null,
            recording_type: recording.recording_type,
            file_type: recording.file_type || null,
            status: recording.status || 'completed',
            download_url: recording.download_url || null,
            play_url: recording.play_url || null,
            password: recording.password || null,
            duration: recording.recording_end && recording.recording_start 
              ? Math.round((new Date(recording.recording_end).getTime() - new Date(recording.recording_start).getTime()) / 1000 / 60)
              : null,
            file_size: recording.file_size || null,
            recording_start: recording.recording_start || null,
            recording_end: recording.recording_end || null,
            raw_data: recording,
            updated_at: currentTimestamp
          };
          
          // Upsert recording data
          const { error: upsertError } = await supabase
            .from('zoom_webinar_recordings')
            .upsert(recordingEntry, {
              onConflict: 'user_id,webinar_id,recording_id',
              ignoreDuplicates: false
            });
          
          if (upsertError) {
            console.error(`[zoom-api][get-webinar-recordings] Error storing recording ${recording.id}:`, upsertError);
          }
        }
      }
    } else if (recordingsResponse.status === 404) {
      console.log(`[zoom-api][get-webinar-recordings] No recordings found for webinar ${webinar_id}`);
    } else {
      const errorData = await recordingsResponse.json().catch(() => ({}));
      console.error(`[zoom-api][get-webinar-recordings] Error fetching recordings:`, errorData);
      
      return new Response(JSON.stringify({ 
        error: `Failed to fetch recordings: ${errorData.message || recordingsResponse.status}`,
        status: recordingsResponse.status
      }), {
        status: recordingsResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Return the recordings data
    return new Response(JSON.stringify({
      webinar_id,
      recordings,
      recording_count: recordings.length,
      has_recordings: recordings.length > 0,
      instance_id: recordingData?.instance_id || null,
      total_size: recordingData?.total_size || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][get-webinar-recordings] Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
