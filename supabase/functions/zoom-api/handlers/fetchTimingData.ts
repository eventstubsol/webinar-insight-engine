
/**
 * Dedicated timing data fetch handler for past webinars
 */
export async function handleFetchTimingData(req: Request): Promise<Response> {
  console.log('[fetch-timing-data] Starting timing data fetch handler');
  
  try {
    const { webinar_id, webinar_uuid } = await req.json();
    
    if (!webinar_id) {
      return new Response(JSON.stringify({ 
        error: 'webinar_id is required' 
      }), { status: 400 });
    }
    
    console.log(`[fetch-timing-data] Processing webinar: ${webinar_id}, UUID: ${webinar_uuid}`);
    
    // Get user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), { status: 401 });
    }
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('[fetch-timing-data] User error:', userError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 });
    }
    
    console.log(`[fetch-timing-data] Authenticated user: ${user.id}`);
    
    // Get Zoom credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (credError || !credentials) {
      console.error('[fetch-timing-data] Credentials error:', credError);
      return new Response(JSON.stringify({ error: 'Zoom credentials not found' }), { status: 404 });
    }
    
    // Get access token
    let accessToken = credentials.access_token;
    if (!accessToken) {
      console.error('[fetch-timing-data] No access token available');
      return new Response(JSON.stringify({ error: 'No valid access token' }), { status: 401 });
    }
    
    // Fetch timing data from Zoom
    const timingResult = await fetchPastWebinarData(webinar_id, webinar_uuid, accessToken);
    
    if (!timingResult.success) {
      console.error('[fetch-timing-data] Failed to fetch timing data:', timingResult.error);
      return new Response(JSON.stringify({ 
        error: timingResult.error,
        details: timingResult.details 
      }), { status: 400 });
    }
    
    // Update database with timing data
    const updateResult = await updateWebinarTimingData(supabaseClient, user.id, webinar_id, timingResult.data);
    
    if (!updateResult.success) {
      console.error('[fetch-timing-data] Failed to update database:', updateResult.error);
      return new Response(JSON.stringify({ 
        error: 'Failed to update database',
        details: updateResult.error 
      }), { status: 500 });
    }
    
    console.log('[fetch-timing-data] Successfully fetched and stored timing data');
    
    return new Response(JSON.stringify({
      success: true,
      data: timingResult.data,
      message: 'Timing data fetched and stored successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[fetch-timing-data] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), { status: 500 });
  }
}

/**
 * Fetch past webinar data from Zoom API with comprehensive UUID handling
 */
async function fetchPastWebinarData(webinarId: string, webinarUuid: string, accessToken: string) {
  console.log(`[fetch-past-webinar] Starting fetch for webinar ${webinarId}`);
  
  // Prepare UUID candidates with different encoding strategies
  const uuidCandidates = [];
  
  if (webinarUuid) {
    uuidCandidates.push(
      webinarUuid, // Original
      encodeURIComponent(webinarUuid), // URL encoded
      webinarUuid.replace(/\+/g, '%2B').replace(/\//g, '%2F').replace(/=/g, '%3D'), // Manual encoding
      webinarUuid.replace(/\//g, '_').replace(/\+/g, '-'), // URL-safe base64
    );
  }
  
  // Also try the numeric webinar ID
  uuidCandidates.push(webinarId);
  
  console.log(`[fetch-past-webinar] Testing ${uuidCandidates.length} UUID candidates`);
  
  for (let i = 0; i < uuidCandidates.length; i++) {
    const candidate = uuidCandidates[i];
    const apiUrl = `https://api.zoom.us/v2/past_webinars/${candidate}`;
    
    console.log(`[fetch-past-webinar] Attempt ${i + 1}/${uuidCandidates.length}: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`[fetch-past-webinar] Response status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[fetch-past-webinar] SUCCESS! Retrieved timing data:`, {
          start_time: data.start_time,
          end_time: data.end_time,
          duration: data.duration,
          participants_count: data.participants_count
        });
        
        return {
          success: true,
          data: {
            actual_start_time: data.start_time,
            actual_end_time: data.end_time,
            actual_duration: data.duration,
            participants_count: data.participants_count,
            raw_past_webinar_data: data
          }
        };
      } else if (response.status === 404) {
        console.log(`[fetch-past-webinar] 404 for candidate: ${candidate}`);
        continue; // Try next candidate
      } else {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error(`[fetch-past-webinar] API error ${response.status}: ${errorText}`);
        continue; // Try next candidate
      }
    } catch (error) {
      console.error(`[fetch-past-webinar] Network error for candidate ${candidate}:`, error);
      continue; // Try next candidate
    }
  }
  
  return {
    success: false,
    error: 'No valid UUID/ID found for past webinar data',
    details: `Tested ${uuidCandidates.length} candidates: ${uuidCandidates.join(', ')}`
  };
}

/**
 * Update webinar timing data in database
 */
async function updateWebinarTimingData(supabaseClient: any, userId: string, webinarId: string, timingData: any) {
  console.log(`[update-timing-data] Updating webinar ${webinarId} with timing data`);
  
  try {
    const updatePayload = {
      actual_start_time: timingData.actual_start_time ? new Date(timingData.actual_start_time).toISOString() : null,
      actual_duration: timingData.actual_duration ? parseInt(timingData.actual_duration.toString()) : null,
      participants_count: timingData.participants_count || null,
      last_synced_at: new Date().toISOString(),
      raw_data: timingData.raw_past_webinar_data || {}
    };
    
    console.log('[update-timing-data] Update payload:', {
      actual_start_time: updatePayload.actual_start_time,
      actual_duration: updatePayload.actual_duration,
      participants_count: updatePayload.participants_count
    });
    
    const { data, error } = await supabaseClient
      .from('zoom_webinars')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('webinar_id', webinarId)
      .select('actual_start_time, actual_duration, participants_count, last_synced_at');
    
    if (error) {
      console.error('[update-timing-data] Database error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('[update-timing-data] Successfully updated database:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('[update-timing-data] Unexpected error:', error);
    return { success: false, error: error.message };
  }
}
