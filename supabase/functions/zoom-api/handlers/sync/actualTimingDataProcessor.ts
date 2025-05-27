import { syncWebinarInstances } from './webinarDataSyncer.ts';

/**
 * Enhance webinars with actual timing data from webinar instances
 * This processor fetches webinar instances for completed webinars to get actual start/end times
 */

/**
 * Fetch past webinar details using UUID to get actual execution data
 */
export async function fetchPastWebinarByUUID(
  webinarUUID: string,
  token: string
): Promise<any> {
  console.log(`[zoom-api][fetchPastWebinarByUUID] Fetching past webinar details by UUID: ${webinarUUID}`);
  
  try {
    // Encode the UUID properly for the URL
    const encodedUUID = encodeURIComponent(encodeURIComponent(webinarUUID));
    const response = await fetch(`https://api.zoom.us/v2/past_webinars/${encodedUUID}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const pastWebinarData = await response.json();
      console.log(`[zoom-api][fetchPastWebinarByUUID] ✅ Successfully fetched past webinar details for UUID: ${webinarUUID}`);
      console.log(`[zoom-api][fetchPastWebinarByUUID] 📊 Past webinar data - duration: ${pastWebinarData.duration}, start_time: ${pastWebinarData.start_time}, end_time: ${pastWebinarData.end_time}`);
      return pastWebinarData;
    } else {
      const errorText = await response.text();
      console.warn(`[zoom-api][fetchPastWebinarByUUID] ⚠️ Failed to fetch past webinar details for UUID ${webinarUUID}: ${response.status} - ${errorText}`);
      
      // If 404, try without double encoding
      if (response.status === 404) {
        const simpleResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarUUID}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (simpleResponse.ok) {
          const pastWebinarData = await simpleResponse.json();
          console.log(`[zoom-api][fetchPastWebinarByUUID] ✅ Successfully fetched with simple UUID encoding`);
          console.log(`[zoom-api][fetchPastWebinarByUUID] 📊 Past webinar data - duration: ${pastWebinarData.duration}, start_time: ${pastWebinarData.start_time}, end_time: ${pastWebinarData.end_time}`);
          return pastWebinarData;
        }
      }
      
      return null;
    }
  } catch (error) {
    console.error(`[zoom-api][fetchPastWebinarByUUID] ❌ Error fetching past webinar details for UUID ${webinarUUID}:`, error);
    return null;
  }
}

/**
 * Fetch webinar details to check if it has been held
 */
export async function fetchWebinarDetails(
  webinarId: string,
  token: string
): Promise<any> {
  console.log(`[zoom-api][fetchWebinarDetails] Fetching webinar details for: ${webinarId}`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const webinarData = await response.json();
      console.log(`[zoom-api][fetchWebinarDetails] ✅ Successfully fetched webinar details for: ${webinarId}`);
      return webinarData;
    } else {
      const errorText = await response.text();
      console.warn(`[zoom-api][fetchWebinarDetails] ⚠️ Failed to fetch webinar details for ${webinarId}: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error(`[zoom-api][fetchWebinarDetails] ❌ Error fetching webinar details for ${webinarId}:`, error);
    return null;
  }
}

/**
 * Enhance webinars with actual timing data by fetching and syncing webinar instances
 */
export async function enhanceWebinarsWithActualTimingData(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Processing actual timing data for ${webinars.length} webinars`);
  
  const enhancedWebinars = [];
  let successfulTimingEnhancements = 0;
  let failedTimingEnhancements = 0;
  let webinarsWithDuration = 0;
  
  for (const webinar of webinars) {
    try {
      // Check if webinar is in the past (scheduled time has passed)
      const webinarStartTime = new Date(webinar.start_time);
      const now = new Date();
      const isPastWebinar = webinarStartTime < now;
      
      console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Webinar ${webinar.id} - Start time: ${webinar.start_time}, Status: ${webinar.status}, Is past: ${isPastWebinar}`);
      
      if (isPastWebinar) {
        console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Processing past webinar: ${webinar.id}`);
        
        // First, try to get detailed webinar data to check occurrences
        const webinarDetails = await fetchWebinarDetails(webinar.id.toString(), token);
        
        // Check if webinar has occurrences (instances)
        if (webinarDetails && webinarDetails.occurrences && webinarDetails.occurrences.length > 0) {
          console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Found ${webinarDetails.occurrences.length} occurrences for webinar ${webinar.id}`);
          
          // Find the most recent past occurrence
          const pastOccurrences = webinarDetails.occurrences.filter((occ: any) => {
            const occStart = new Date(occ.start_time);
            return occStart < now && occ.status === 'available';
          });
          
          if (pastOccurrences.length > 0) {
            // Use the most recent past occurrence
            const latestOccurrence = pastOccurrences[pastOccurrences.length - 1];
            console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Using occurrence ${latestOccurrence.occurrence_id} for timing data`);
            
            // Try to fetch past webinar data using the occurrence ID
            const pastWebinarData = await fetchPastWebinarByUUID(latestOccurrence.occurrence_id, token);
            
            if (pastWebinarData) {
              // Log the duration we received
              console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] 📊 DURATION DATA for webinar ${webinar.id}: ${pastWebinarData.duration} minutes`);
              
              if (pastWebinarData.duration) {
                webinarsWithDuration++;
              }
              
              const enhancedWebinar = {
                ...webinar,
                actual_start_time: pastWebinarData.start_time,
                actual_duration: pastWebinarData.duration,
                actual_end_time: pastWebinarData.end_time,
                participant_count: pastWebinarData.participants_count,
                _enhanced_with_timing: true,
                _timing_enhancement_method: 'occurrence_past_api',
                _timing_enhancement_timestamp: new Date().toISOString()
              };
              
              enhancedWebinars.push(enhancedWebinar);
              successfulTimingEnhancements++;
              console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] ✅ Enhanced webinar ${webinar.id} with occurrence timing data - duration: ${pastWebinarData.duration}`);
              continue;
            }
          }
        }
        
        // If no occurrences or occurrence method failed, try with webinar UUID
        if (webinar.uuid) {
          console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Trying to fetch past webinar data using UUID: ${webinar.uuid}`);
          
          const pastWebinarData = await fetchPastWebinarByUUID(webinar.uuid, token);
          
          if (pastWebinarData) {
            // Log the duration we received
            console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] 📊 DURATION DATA for webinar ${webinar.id}: ${pastWebinarData.duration} minutes`);
            
            if (pastWebinarData.duration) {
              webinarsWithDuration++;
            }
            
            const enhancedWebinar = {
              ...webinar,
              actual_start_time: pastWebinarData.start_time,
              actual_duration: pastWebinarData.duration,
              actual_end_time: pastWebinarData.end_time,
              participant_count: pastWebinarData.participants_count,
              _enhanced_with_timing: true,
              _timing_enhancement_method: 'uuid_past_api',
              _timing_enhancement_timestamp: new Date().toISOString()
            };
            
            enhancedWebinars.push(enhancedWebinar);
            successfulTimingEnhancements++;
            console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] ✅ Enhanced webinar ${webinar.id} with UUID timing data - duration: ${pastWebinarData.duration}`);
            continue;
          }
        }
        
        // If both methods failed, try instances API as fallback
        console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Falling back to instances API for webinar ${webinar.id}`);
        
        const instancesResult = await syncWebinarInstances(supabase, { id: userId }, token, webinar.id.toString());
        
        if (instancesResult.count > 0) {
          // Fetch the stored instances from database
          const { data: instances } = await supabase
            .from('zoom_webinar_instances')
            .select('*')
            .eq('user_id', userId)
            .eq('webinar_id', webinar.id.toString())
            .order('start_time', { ascending: false });
          
          if (instances && instances.length > 0) {
            const latestInstance = instances[0];
            const actualStartTime = latestInstance.start_time || latestInstance.raw_data?.start_time;
            const actualDuration = latestInstance.duration || latestInstance.raw_data?.duration;
            
            if (actualDuration) {
              webinarsWithDuration++;
            }
            
            const enhancedWebinar = {
              ...webinar,
              actual_start_time: actualStartTime,
              actual_duration: actualDuration,
              _enhanced_with_timing: true,
              _timing_enhancement_method: 'instances_api',
              _timing_enhancement_timestamp: new Date().toISOString()
            };
            
            enhancedWebinars.push(enhancedWebinar);
            successfulTimingEnhancements++;
            console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] ✅ Enhanced webinar ${webinar.id} with instances API data - duration: ${actualDuration}`);
            continue;
          }
        }
        
        // If all methods failed
        console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] ⚠️ Could not get timing data for webinar ${webinar.id}`);
        enhancedWebinars.push({
          ...webinar,
          _enhanced_with_timing: false,
          _timing_enhancement_error: 'No timing data available from any source',
          _timing_enhancement_timestamp: new Date().toISOString()
        });
        failedTimingEnhancements++;
      } else {
        // For future webinars, just pass through
        enhancedWebinars.push({
          ...webinar,
          _enhanced_with_timing: false,
          _timing_enhancement_note: 'Webinar not yet held',
          _timing_enhancement_timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`[zoom-api][enhanceWebinarsWithActualTimingData] ❌ Error enhancing timing for webinar ${webinar.id}:`, error);
      
      enhancedWebinars.push({
        ...webinar,
        _enhanced_with_timing: false,
        _timing_enhancement_error: error.message,
        _timing_enhancement_timestamp: new Date().toISOString()
      });
      failedTimingEnhancements++;
    }
  }
  
  console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] 🎉 Timing enhancement completed: ${successfulTimingEnhancements} successful, ${failedTimingEnhancements} failed`);
  console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] 📊 Webinars with actual_duration data: ${webinarsWithDuration}/${successfulTimingEnhancements} enhanced webinars`);
  
  return enhancedWebinars;
}

/**
 * Fetch past webinar details to get actual execution data
 */
export async function fetchPastWebinarDetails(
  webinarId: string,
  token: string
): Promise<any> {
  console.log(`[zoom-api][fetchPastWebinarDetails] Fetching past webinar details for: ${webinarId}`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const pastWebinarData = await response.json();
      console.log(`[zoom-api][fetchPastWebinarDetails] ✅ Successfully fetched past webinar details for: ${webinarId}`);
      console.log(`[zoom-api][fetchPastWebinarDetails] 📊 Past webinar data - duration: ${pastWebinarData.duration}`);
      return pastWebinarData;
    } else {
      const errorText = await response.text();
      console.warn(`[zoom-api][fetchPastWebinarDetails] ⚠️ Failed to fetch past webinar details for ${webinarId}: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error(`[zoom-api][fetchPastWebinarDetails] ❌ Error fetching past webinar details for ${webinarId}:`, error);
    return null;
  }
}

/**
 * Enhanced timing processor that combines multiple data sources
 */
export async function enhanceWebinarsWithComprehensiveTimingData(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] Processing comprehensive timing data for ${webinars.length} webinars`);
  
  // Use the new enhanced timing processor
  const enhancedWebinars = await enhanceWebinarsWithActualTimingData(webinars, token, supabase, userId);
  
  const timingStats = {
    total_webinars: enhancedWebinars.length,
    with_actual_timing: enhancedWebinars.filter(w => w.actual_start_time).length,
    with_actual_duration: enhancedWebinars.filter(w => w.actual_duration).length,
    enhanced_successfully: enhancedWebinars.filter(w => w._enhanced_with_timing === true).length,
    past_webinars: enhancedWebinars.filter(w => {
      const start = new Date(w.start_time);
      return start < new Date();
    }).length,
    methods: {
      occurrence_past_api: enhancedWebinars.filter(w => w._timing_enhancement_method === 'occurrence_past_api').length,
      uuid_past_api: enhancedWebinars.filter(w => w._timing_enhancement_method === 'uuid_past_api').length,
      instances_api: enhancedWebinars.filter(w => w._timing_enhancement_method === 'instances_api').length
    }
  };
  
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] 🎉 Comprehensive timing enhancement completed!`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] 📊 Timing Statistics:`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Total webinars: ${timingStats.total_webinars}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Past webinars: ${timingStats.past_webinars}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - With actual timing: ${timingStats.with_actual_timing}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - With actual duration: ${timingStats.with_actual_duration}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Enhancement methods:`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData]   • Occurrence API: ${timingStats.methods.occurrence_past_api}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData]   • UUID API: ${timingStats.methods.uuid_past_api}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData]   • Instances API: ${timingStats.methods.instances_api}`);
  
  return enhancedWebinars;
}
