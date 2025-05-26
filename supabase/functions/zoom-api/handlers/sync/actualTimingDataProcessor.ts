
import { syncWebinarInstances } from './webinarDataSyncer.ts';

/**
 * Enhance webinars with actual timing data from webinar instances and past webinar API
 * This processor fetches webinar instances and past webinar details for completed webinars to get actual start/end times
 */

/**
 * Properly encode UUID for Zoom API calls
 */
function encodeWebinarUUID(uuid: string): string {
  // Zoom UUIDs can contain special characters like /, +, = that need proper encoding
  return encodeURIComponent(uuid);
}

/**
 * Fetch past webinar details to get actual execution data
 */
export async function fetchPastWebinarDetails(
  webinarUUID: string,
  token: string
): Promise<any> {
  console.log(`[zoom-api][fetchPastWebinarDetails] Fetching past webinar details for UUID: ${webinarUUID}`);
  
  try {
    // Properly encode the UUID for the API call
    const encodedUUID = encodeWebinarUUID(webinarUUID);
    const apiUrl = `https://api.zoom.us/v2/past_webinars/${encodedUUID}`;
    
    console.log(`[zoom-api][fetchPastWebinarDetails] Making API call to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const pastWebinarData = await response.json();
      console.log(`[zoom-api][fetchPastWebinarDetails] ✅ Successfully fetched past webinar details for UUID: ${webinarUUID}`, {
        start_time: pastWebinarData.start_time,
        end_time: pastWebinarData.end_time,
        duration: pastWebinarData.duration,
        total_participants: pastWebinarData.total_participants
      });
      return pastWebinarData;
    } else {
      const errorText = await response.text();
      console.warn(`[zoom-api][fetchPastWebinarDetails] ⚠️ Failed to fetch past webinar details for UUID ${webinarUUID}: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error(`[zoom-api][fetchPastWebinarDetails] ❌ Error fetching past webinar details for UUID ${webinarUUID}:`, error);
    return null;
  }
}

/**
 * Enhanced timing processor that gets actual timing data from past webinar API
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
  
  for (const webinar of webinars) {
    try {
      // Only process completed webinars (those with status 'ended')
      const isCompleted = webinar.status === 'ended';
      
      if (isCompleted && webinar.uuid) {
        console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Fetching actual timing for completed webinar: ${webinar.id} (UUID: ${webinar.uuid})`);
        
        // Fetch actual timing data from past webinar API
        const pastWebinarData = await fetchPastWebinarDetails(webinar.uuid, token);
        
        if (pastWebinarData) {
          // Extract actual timing from past webinar data
          const actualStartTime = pastWebinarData.start_time;
          const actualEndTime = pastWebinarData.end_time;
          const actualDuration = pastWebinarData.duration;
          const actualParticipants = pastWebinarData.total_participants;
          
          // Enhance webinar with actual timing data
          const enhancedWebinar = {
            ...webinar,
            actual_start_time: actualStartTime,
            actual_end_time: actualEndTime,
            actual_duration: actualDuration,
            participants_count: actualParticipants || webinar.participants_count,
            _enhanced_with_timing: true,
            _timing_enhancement_source: 'past_webinar_api',
            _timing_enhancement_timestamp: new Date().toISOString()
          };
          
          enhancedWebinars.push(enhancedWebinar);
          successfulTimingEnhancements++;
          
          console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] ✅ Enhanced webinar ${webinar.id} with actual timing data:`, {
            actual_start_time: actualStartTime,
            actual_duration: actualDuration,
            participants: actualParticipants
          });
        } else {
          console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] ⚠️ No timing data available from past webinar API for ${webinar.id}`);
          enhancedWebinars.push({
            ...webinar,
            _enhanced_with_timing: false,
            _timing_enhancement_error: 'No timing data available from past webinar API',
            _timing_enhancement_timestamp: new Date().toISOString()
          });
          failedTimingEnhancements++;
        }
      } else if (!isCompleted) {
        // For upcoming webinars, just pass through without timing enhancement
        enhancedWebinars.push({
          ...webinar,
          _enhanced_with_timing: false,
          _timing_enhancement_note: 'Webinar not yet completed',
          _timing_enhancement_timestamp: new Date().toISOString()
        });
      } else {
        console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] ⚠️ Missing UUID for completed webinar ${webinar.id}`);
        enhancedWebinars.push({
          ...webinar,
          _enhanced_with_timing: false,
          _timing_enhancement_error: 'Missing webinar UUID',
          _timing_enhancement_timestamp: new Date().toISOString()
        });
        failedTimingEnhancements++;
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
  
  return enhancedWebinars;
}

/**
 * Comprehensive timing processor that combines instances and past webinar API data
 */
export async function enhanceWebinarsWithComprehensiveTimingData(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] Processing comprehensive timing data for ${webinars.length} webinars`);
  
  // Use the enhanced timing processor
  const enhancedWebinars = await enhanceWebinarsWithActualTimingData(webinars, token, supabase, userId);
  
  const timingStats = {
    total_webinars: enhancedWebinars.length,
    with_actual_timing: enhancedWebinars.filter(w => w.actual_start_time).length,
    enhanced_successfully: enhancedWebinars.filter(w => w._enhanced_with_timing === true).length,
    completed_webinars: enhancedWebinars.filter(w => w.status === 'ended').length
  };
  
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] 🎉 Comprehensive timing enhancement completed!`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] 📊 Timing Statistics:`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Total webinars: ${timingStats.total_webinars}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - With actual timing: ${timingStats.with_actual_timing}/${timingStats.completed_webinars} completed webinars`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Enhanced successfully: ${timingStats.enhanced_successfully}`);
  
  return enhancedWebinars;
}
