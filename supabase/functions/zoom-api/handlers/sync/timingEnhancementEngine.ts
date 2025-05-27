
import { syncWebinarInstances } from './webinarDataSyncer.ts';
import { fetchWebinarDetails, fetchPastWebinarByUUID } from './timingDataFetcher.ts';

/**
 * Timing Enhancement Engine - Core logic for enhancing webinars with actual timing data
 */

// Configuration constants
const API_CALL_TIMEOUT = 5000; // 5 seconds per API call

/**
 * Wrapper for API calls with timeout protection
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error(`API call timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]).catch(error => {
    console.warn(`[zoom-api][withTimeout] API call failed: ${error.message}`);
    return null;
  });
}

/**
 * Enhanced single webinar timing processor with timeout protection
 */
export async function enhanceSingleWebinarTiming(
  webinar: any, 
  token: string, 
  supabase: any, 
  userId: string
): Promise<any> {
  const webinarStartTime = new Date(webinar.start_time);
  const now = new Date();
  const isPastWebinar = webinarStartTime < now;
  
  console.log(`[zoom-api][enhanceSingleWebinarTiming] Processing webinar ${webinar.id} - Start time: ${webinar.start_time}, Status: ${webinar.status}, Is past: ${isPastWebinar}`);
  
  if (!isPastWebinar) {
    // For future webinars, just pass through
    return {
      ...webinar,
      _enhanced_with_timing: false,
      _timing_enhancement_note: 'Webinar not yet held',
      _timing_enhancement_timestamp: new Date().toISOString()
    };
  }
  
  console.log(`[zoom-api][enhanceSingleWebinarTiming] Processing past webinar: ${webinar.id}`);
  
  // Method 1: Try instances API first (most reliable)
  try {
    console.log(`[zoom-api][enhanceSingleWebinarTiming] Trying instances API for webinar ${webinar.id}`);
    
    const instancesResult = await withTimeout(
      syncWebinarInstances(supabase, { id: userId }, token, webinar.id.toString()),
      API_CALL_TIMEOUT
    );
    
    if (instancesResult && instancesResult.count > 0) {
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
        
        console.log(`[zoom-api][enhanceSingleWebinarTiming] ✅ Enhanced webinar ${webinar.id} with instances API data`);
        return {
          ...webinar,
          actual_start_time: actualStartTime,
          actual_duration: actualDuration,
          _enhanced_with_timing: true,
          _timing_enhancement_method: 'instances_api',
          _timing_enhancement_timestamp: new Date().toISOString()
        };
      }
    }
  } catch (error) {
    console.warn(`[zoom-api][enhanceSingleWebinarTiming] Instances API failed for webinar ${webinar.id}:`, error);
  }
  
  // Method 2: Try webinar details and occurrences
  try {
    const webinarDetails = await fetchWebinarDetails(webinar.id.toString(), token);
    
    if (webinarDetails && webinarDetails.occurrences && webinarDetails.occurrences.length > 0) {
      console.log(`[zoom-api][enhanceSingleWebinarTiming] Found ${webinarDetails.occurrences.length} occurrences for webinar ${webinar.id}`);
      
      // Find the most recent past occurrence
      const pastOccurrences = webinarDetails.occurrences.filter((occ: any) => {
        const occStart = new Date(occ.start_time);
        return occStart < now && occ.status === 'available';
      });
      
      if (pastOccurrences.length > 0) {
        // Use the most recent past occurrence
        const latestOccurrence = pastOccurrences[pastOccurrences.length - 1];
        console.log(`[zoom-api][enhanceSingleWebinarTiming] Using occurrence ${latestOccurrence.occurrence_id} for timing data`);
        
        // Try to fetch past webinar data using the occurrence ID
        const pastWebinarData = await fetchPastWebinarByUUID(latestOccurrence.occurrence_id, token);
        
        if (pastWebinarData) {
          console.log(`[zoom-api][enhanceSingleWebinarTiming] ✅ Enhanced webinar ${webinar.id} with occurrence timing data`);
          return {
            ...webinar,
            actual_start_time: pastWebinarData.start_time,
            actual_duration: pastWebinarData.duration,
            actual_end_time: pastWebinarData.end_time,
            participant_count: pastWebinarData.participants_count,
            _enhanced_with_timing: true,
            _timing_enhancement_method: 'occurrence_past_api',
            _timing_enhancement_timestamp: new Date().toISOString()
          };
        }
      }
    }
  } catch (error) {
    console.warn(`[zoom-api][enhanceSingleWebinarTiming] Occurrence method failed for webinar ${webinar.id}:`, error);
  }
  
  // Method 3: Try with webinar UUID (last resort)
  if (webinar.uuid) {
    try {
      console.log(`[zoom-api][enhanceSingleWebinarTiming] Trying to fetch past webinar data using UUID: ${webinar.uuid}`);
      
      const pastWebinarData = await fetchPastWebinarByUUID(webinar.uuid, token);
      
      if (pastWebinarData) {
        console.log(`[zoom-api][enhanceSingleWebinarTiming] ✅ Enhanced webinar ${webinar.id} with UUID timing data`);
        return {
          ...webinar,
          actual_start_time: pastWebinarData.start_time,
          actual_duration: pastWebinarData.duration,
          actual_end_time: pastWebinarData.end_time,
          participant_count: pastWebinarData.participants_count,
          _enhanced_with_timing: true,
          _timing_enhancement_method: 'uuid_past_api',
          _timing_enhancement_timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.warn(`[zoom-api][enhanceSingleWebinarTiming] UUID method failed for webinar ${webinar.id}:`, error);
    }
  }
  
  // If all methods failed
  console.log(`[zoom-api][enhanceSingleWebinarTiming] ⚠️ Could not get timing data for webinar ${webinar.id}`);
  return {
    ...webinar,
    _enhanced_with_timing: false,
    _timing_enhancement_error: 'No timing data available from any source',
    _timing_enhancement_timestamp: new Date().toISOString()
  };
}
