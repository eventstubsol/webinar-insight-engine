
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

// Handle enhancing duration data for completed webinars
export async function handleEnhanceDuration(req: Request, supabase: any, user: any, credentials: any, webinarId?: string) {
  console.log(`[zoom-api][enhance-duration] Starting duration enhancement for user: ${user.id}`);
  
  try {
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Get webinars to enhance (specific one or all completed without duration)
    let webinarsToEnhance = [];
    
    if (webinarId) {
      // Enhance specific webinar
      const { data: webinar } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id)
        .eq('webinar_id', webinarId)
        .single();
        
      if (webinar) {
        webinarsToEnhance = [webinar];
      }
    } else {
      // Enhance all completed webinars missing duration
      const { data: webinars } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['ended', 'stopped'])
        .is('actual_duration', null);
        
      webinarsToEnhance = webinars || [];
    }
    
    console.log(`[zoom-api][enhance-duration] Found ${webinarsToEnhance.length} webinars to enhance`);
    
    const results = {
      processed: 0,
      enhanced: 0,
      errors: [],
      durations_found: []
    };
    
    for (const webinar of webinarsToEnhance) {
      try {
        console.log(`[zoom-api][enhance-duration] Processing webinar ${webinar.webinar_id}`);
        results.processed++;
        
        // Try multiple methods to get duration data
        const durationData = await fetchDurationFromMultipleSources(token, webinar);
        
        if (durationData) {
          console.log(`[zoom-api][enhance-duration] Found duration data for webinar ${webinar.webinar_id}:`, durationData);
          
          // Update the webinar with duration data
          const { error: updateError } = await supabase
            .from('zoom_webinars')
            .update({
              actual_duration: durationData.duration,
              actual_start_time: durationData.start_time || webinar.actual_start_time,
              actual_end_time: durationData.end_time,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('webinar_id', webinar.webinar_id);
            
          if (updateError) {
            console.error(`[zoom-api][enhance-duration] Error updating webinar ${webinar.webinar_id}:`, updateError);
            results.errors.push(`Failed to update webinar ${webinar.webinar_id}: ${updateError.message}`);
          } else {
            results.enhanced++;
            results.durations_found.push({
              webinar_id: webinar.webinar_id,
              topic: webinar.topic,
              duration: durationData.duration,
              method: durationData.method
            });
            console.log(`[zoom-api][enhance-duration] ✅ Successfully updated webinar ${webinar.webinar_id} with duration: ${durationData.duration} minutes`);
          }
        } else {
          console.warn(`[zoom-api][enhance-duration] No duration data found for webinar ${webinar.webinar_id}`);
          results.errors.push(`No duration data available for webinar ${webinar.webinar_id}`);
        }
        
      } catch (webinarError) {
        console.error(`[zoom-api][enhance-duration] Error processing webinar ${webinar.webinar_id}:`, webinarError);
        results.errors.push(`Error processing webinar ${webinar.webinar_id}: ${webinarError.message}`);
      }
    }
    
    console.log(`[zoom-api][enhance-duration] Duration enhancement completed: ${results.enhanced}/${results.processed} webinars enhanced`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Enhanced duration data for ${results.enhanced} out of ${results.processed} webinars`,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][enhance-duration] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Fetch duration data from multiple Zoom API sources
async function fetchDurationFromMultipleSources(token: string, webinar: any) {
  console.log(`[zoom-api][fetch-duration] Trying multiple sources for webinar ${webinar.webinar_id}`);
  
  // Method 1: Try past webinar by ID
  let durationData = await fetchDurationFromPastWebinar(token, webinar.webinar_id);
  if (durationData) {
    return { ...durationData, method: 'past_webinar_by_id' };
  }
  
  // Method 2: Try past webinar by UUID (if available)
  if (webinar.webinar_uuid) {
    durationData = await fetchDurationFromPastWebinar(token, webinar.webinar_uuid);
    if (durationData) {
      return { ...durationData, method: 'past_webinar_by_uuid' };
    }
  }
  
  // Method 3: Try instances API
  durationData = await fetchDurationFromInstances(token, webinar.webinar_id);
  if (durationData) {
    return { ...durationData, method: 'instances_api' };
  }
  
  // Method 4: Calculate from start/end times if available in raw_data
  durationData = calculateDurationFromRawData(webinar);
  if (durationData) {
    return { ...durationData, method: 'calculated_from_raw_data' };
  }
  
  console.log(`[zoom-api][fetch-duration] No duration data found from any source for webinar ${webinar.webinar_id}`);
  return null;
}

// Fetch duration from past webinar API
async function fetchDurationFromPastWebinar(token: string, webinarIdentifier: string) {
  try {
    console.log(`[zoom-api][fetch-duration] Trying past webinar API for: ${webinarIdentifier}`);
    
    // Try with proper encoding
    const encodedId = encodeURIComponent(webinarIdentifier);
    const response = await fetch(`https://api.zoom.us/v2/past_webinars/${encodedId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[zoom-api][fetch-duration] 🔍 Raw past webinar response for ${webinarIdentifier}:`, JSON.stringify(data, null, 2));
      
      // Extract duration from various possible fields
      const duration = data.duration || data.actual_duration || data.total_minutes || data.meeting_duration;
      const startTime = data.start_time || data.actual_start_time;
      const endTime = data.end_time || data.actual_end_time;
      
      if (duration) {
        console.log(`[zoom-api][fetch-duration] ✅ Found duration: ${duration} minutes from past webinar API`);
        return {
          duration: parseInt(duration),
          start_time: startTime,
          end_time: endTime
        };
      }
      
      console.log(`[zoom-api][fetch-duration] ⚠️ Past webinar API returned data but no duration field found`);
    } else {
      const errorText = await response.text();
      console.log(`[zoom-api][fetch-duration] Past webinar API failed for ${webinarIdentifier}: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error(`[zoom-api][fetch-duration] Error calling past webinar API for ${webinarIdentifier}:`, error);
  }
  
  return null;
}

// Fetch duration from instances API
async function fetchDurationFromInstances(token: string, webinarId: string) {
  try {
    console.log(`[zoom-api][fetch-duration] Trying instances API for: ${webinarId}`);
    
    const response = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`[zoom-api][fetch-duration] 🔍 Raw instances response for ${webinarId}:`, JSON.stringify(data, null, 2));
      
      if (data.webinars && data.webinars.length > 0) {
        // Get the most recent instance
        const latestInstance = data.webinars[data.webinars.length - 1];
        const duration = latestInstance.duration || latestInstance.actual_duration;
        
        if (duration) {
          console.log(`[zoom-api][fetch-duration] ✅ Found duration: ${duration} minutes from instances API`);
          return {
            duration: parseInt(duration),
            start_time: latestInstance.start_time,
            end_time: latestInstance.end_time
          };
        }
      }
      
      console.log(`[zoom-api][fetch-duration] ⚠️ Instances API returned data but no duration found`);
    } else {
      const errorText = await response.text();
      console.log(`[zoom-api][fetch-duration] Instances API failed for ${webinarId}: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error(`[zoom-api][fetch-duration] Error calling instances API for ${webinarId}:`, error);
  }
  
  return null;
}

// Calculate duration from existing raw data
function calculateDurationFromRawData(webinar: any) {
  try {
    console.log(`[zoom-api][fetch-duration] Trying to calculate duration from raw data for: ${webinar.webinar_id}`);
    
    const rawData = webinar.raw_data;
    if (!rawData) return null;
    
    // Try to find duration in raw data
    if (rawData.duration) {
      console.log(`[zoom-api][fetch-duration] ✅ Found duration in raw_data: ${rawData.duration} minutes`);
      return {
        duration: parseInt(rawData.duration),
        start_time: rawData.start_time || rawData.actual_start_time,
        end_time: rawData.end_time || rawData.actual_end_time
      };
    }
    
    // Try to calculate from start/end times
    const startTime = rawData.start_time || rawData.actual_start_time;
    const endTime = rawData.end_time || rawData.actual_end_time;
    
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMs = end.getTime() - start.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      
      if (durationMinutes > 0) {
        console.log(`[zoom-api][fetch-duration] ✅ Calculated duration from start/end times: ${durationMinutes} minutes`);
        return {
          duration: durationMinutes,
          start_time: startTime,
          end_time: endTime
        };
      }
    }
    
    console.log(`[zoom-api][fetch-duration] ⚠️ Could not calculate duration from raw data`);
  } catch (error) {
    console.error(`[zoom-api][fetch-duration] Error calculating duration from raw data:`, error);
  }
  
  return null;
}
