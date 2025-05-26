
import { syncWebinarInstances } from './webinarDataSyncer.ts';

/**
 * Enhance webinars with actual timing data from webinar instances
 * This processor fetches webinar instances for completed webinars to get actual start/end times
 */

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
  
  for (const webinar of webinars) {
    try {
      // Only process completed webinars (those with status 'ended' or past webinars)
      const webinarStartTime = new Date(webinar.start_time);
      const isCompleted = webinar.status === 'ended' || 
                         (webinarStartTime < new Date() && 
                          new Date().getTime() - webinarStartTime.getTime() > (webinar.duration || 60) * 60 * 1000);
      
      if (isCompleted) {
        console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Fetching instances for completed webinar: ${webinar.id}`);
        
        // Fetch and sync webinar instances to get actual timing data
        const instancesResult = await syncWebinarInstances(supabase, { id: userId }, token, webinar.id.toString());
        
        if (instancesResult.count > 0) {
          // Fetch the stored instances from database to get actual timing data
          const { data: instances, error: instancesError } = await supabase
            .from('zoom_webinar_instances')
            .select('*')
            .eq('user_id', userId)
            .eq('webinar_id', webinar.id.toString())
            .order('start_time', { ascending: false });
          
          if (!instancesError && instances && instances.length > 0) {
            // Use the most recent instance for timing data
            const latestInstance = instances[0];
            
            // Extract actual timing from instance data
            const actualStartTime = latestInstance.start_time || latestInstance.raw_data?.start_time;
            const actualDuration = latestInstance.duration || latestInstance.raw_data?.duration;
            
            // Enhance webinar with actual timing data
            const enhancedWebinar = {
              ...webinar,
              actual_start_time: actualStartTime,
              actual_duration: actualDuration,
              actual_end_time: actualStartTime && actualDuration ? 
                new Date(new Date(actualStartTime).getTime() + actualDuration * 60 * 1000).toISOString() : null,
              instance_count: instances.length,
              latest_instance_id: latestInstance.instance_id,
              _enhanced_with_timing: true,
              _timing_enhancement_timestamp: new Date().toISOString()
            };
            
            enhancedWebinars.push(enhancedWebinar);
            successfulTimingEnhancements++;
            
            console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] ✅ Enhanced webinar ${webinar.id} with actual timing data from ${instances.length} instances`);
          } else {
            console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] ⚠️ No instances found in database for webinar ${webinar.id}`);
            enhancedWebinars.push({
              ...webinar,
              _enhanced_with_timing: false,
              _timing_enhancement_error: 'No instances found in database',
              _timing_enhancement_timestamp: new Date().toISOString()
            });
            failedTimingEnhancements++;
          }
        } else {
          console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] ⚠️ No instances synced for webinar ${webinar.id}`);
          enhancedWebinars.push({
            ...webinar,
            _enhanced_with_timing: false,
            _timing_enhancement_error: 'No instances available from Zoom API',
            _timing_enhancement_timestamp: new Date().toISOString()
          });
          failedTimingEnhancements++;
        }
      } else {
        // For upcoming webinars, just pass through without timing enhancement
        enhancedWebinars.push({
          ...webinar,
          _enhanced_with_timing: false,
          _timing_enhancement_note: 'Webinar not yet completed',
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
 * Enhanced timing processor that combines instances and past webinar API data
 */
export async function enhanceWebinarsWithComprehensiveTimingData(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] Processing comprehensive timing data for ${webinars.length} webinars`);
  
  // First enhance with instance data
  const webinarsWithInstanceTiming = await enhanceWebinarsWithActualTimingData(webinars, token, supabase, userId);
  
  // Then enhance with past webinar API data for additional details
  const fullyEnhancedWebinars = [];
  
  for (const webinar of webinarsWithInstanceTiming) {
    if (webinar.status === 'ended' && !webinar.actual_start_time) {
      // Try to get timing data from past webinar API if instances didn't provide it
      try {
        const pastWebinarData = await fetchPastWebinarDetails(webinar.id.toString(), token);
        
        if (pastWebinarData) {
          const enhancedWebinar = {
            ...webinar,
            actual_start_time: pastWebinarData.start_time || webinar.actual_start_time,
            actual_duration: pastWebinarData.duration || webinar.actual_duration,
            actual_end_time: pastWebinarData.end_time,
            participant_count: pastWebinarData.total_participants || webinar.participants_count,
            _enhanced_with_past_api: true,
            _past_api_enhancement_timestamp: new Date().toISOString()
          };
          
          fullyEnhancedWebinars.push(enhancedWebinar);
          console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] ✅ Enhanced webinar ${webinar.id} with past webinar API data`);
        } else {
          fullyEnhancedWebinars.push(webinar);
        }
      } catch (error) {
        console.error(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] Error enhancing with past API for webinar ${webinar.id}:`, error);
        fullyEnhancedWebinars.push(webinar);
      }
    } else {
      fullyEnhancedWebinars.push(webinar);
    }
  }
  
  const timingStats = {
    total_webinars: fullyEnhancedWebinars.length,
    with_actual_timing: fullyEnhancedWebinars.filter(w => w.actual_start_time).length,
    enhanced_from_instances: fullyEnhancedWebinars.filter(w => w._enhanced_with_timing === true).length,
    enhanced_from_past_api: fullyEnhancedWebinars.filter(w => w._enhanced_with_past_api === true).length,
    completed_webinars: fullyEnhancedWebinars.filter(w => w.status === 'ended').length
  };
  
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] 🎉 Comprehensive timing enhancement completed!`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] 📊 Timing Statistics:`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Total webinars: ${timingStats.total_webinars}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - With actual timing: ${timingStats.with_actual_timing}/${timingStats.completed_webinars} completed webinars`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Enhanced from instances: ${timingStats.enhanced_from_instances}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Enhanced from past API: ${timingStats.enhanced_from_past_api}`);
  
  return fullyEnhancedWebinars;
}
