import { syncWebinarInstances } from './webinarDataSyncer.ts';

/**
 * Enhance webinars with actual timing data from webinar instances
 * This processor fetches webinar instances for completed webinars to get actual start/end times
 */

// Configuration constants
const API_CALL_TIMEOUT = 5000; // 5 seconds per API call
const BATCH_SIZE = 5; // Process 5 webinars at a time
const BATCH_DELAY = 1000; // 1 second delay between batches
const MAX_CONSECUTIVE_FAILURES = 3; // Circuit breaker threshold
const PROCESSING_TIME_LIMIT = 25000; // 25 seconds total limit (leaving 5s buffer)

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
    const fetchPromise = fetch(`https://api.zoom.us/v2/past_webinars/${encodedUUID}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const response = await withTimeout(fetchPromise, API_CALL_TIMEOUT);
    
    if (!response) {
      console.warn(`[zoom-api][fetchPastWebinarByUUID] ⚠️ API call timed out for UUID: ${webinarUUID}`);
      return null;
    }
    
    if (response.ok) {
      const pastWebinarData = await response.json();
      console.log(`[zoom-api][fetchPastWebinarByUUID] ✅ Successfully fetched past webinar details for UUID: ${webinarUUID}`);
      return pastWebinarData;
    } else {
      const errorText = await response.text();
      console.warn(`[zoom-api][fetchPastWebinarByUUID] ⚠️ Failed to fetch past webinar details for UUID ${webinarUUID}: ${response.status} - ${errorText}`);
      
      // If 404, try without double encoding
      if (response.status === 404) {
        const simplePromise = fetch(`https://api.zoom.us/v2/past_webinars/${webinarUUID}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const simpleResponse = await withTimeout(simplePromise, API_CALL_TIMEOUT);
        
        if (simpleResponse && simpleResponse.ok) {
          const pastWebinarData = await simpleResponse.json();
          console.log(`[zoom-api][fetchPastWebinarByUUID] ✅ Successfully fetched with simple UUID encoding`);
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
    const fetchPromise = fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const response = await withTimeout(fetchPromise, API_CALL_TIMEOUT);
    
    if (!response) {
      console.warn(`[zoom-api][fetchWebinarDetails] ⚠️ API call timed out for webinar: ${webinarId}`);
      return null;
    }
    
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
 * Enhanced single webinar timing processor with timeout protection
 */
async function enhanceSingleWebinarTiming(
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

/**
 * Enhance webinars with actual timing data by fetching and syncing webinar instances
 * Now with batch processing and circuit breaker logic
 */
export async function enhanceWebinarsWithActualTimingData(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Processing actual timing data for ${webinars.length} webinars with timeout protection`);
  
  const startTime = Date.now();
  const enhancedWebinars = [];
  let successfulTimingEnhancements = 0;
  let failedTimingEnhancements = 0;
  let consecutiveFailures = 0;
  let batchNumber = 0;
  
  // Process webinars in batches to prevent timeout
  for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
    batchNumber++;
    const batch = webinars.slice(i, i + BATCH_SIZE);
    
    console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Processing batch ${batchNumber}/${Math.ceil(webinars.length / BATCH_SIZE)} (${batch.length} webinars)`);
    
    // Check if we're approaching time limit
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > PROCESSING_TIME_LIMIT) {
      console.warn(`[zoom-api][enhanceWebinarsWithActualTimingData] ⚠️ Approaching time limit, processing remaining webinars without timing enhancement`);
      
      // Add remaining webinars without timing enhancement
      for (let j = i; j < webinars.length; j++) {
        enhancedWebinars.push({
          ...webinars[j],
          _enhanced_with_timing: false,
          _timing_enhancement_error: 'Skipped due to time limit',
          _timing_enhancement_timestamp: new Date().toISOString()
        });
      }
      break;
    }
    
    // Circuit breaker: stop if too many consecutive failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(`[zoom-api][enhanceWebinarsWithActualTimingData] ⚠️ Circuit breaker activated: ${consecutiveFailures} consecutive failures`);
      
      // Add remaining webinars without timing enhancement
      for (let j = i; j < webinars.length; j++) {
        enhancedWebinars.push({
          ...webinars[j],
          _enhanced_with_timing: false,
          _timing_enhancement_error: 'Circuit breaker activated',
          _timing_enhancement_timestamp: new Date().toISOString()
        });
      }
      break;
    }
    
    // Process batch in parallel but with individual timeouts
    const batchPromises = batch.map(webinar => 
      enhanceSingleWebinarTiming(webinar, token, supabase, userId)
    );
    
    try {
      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        enhancedWebinars.push(result);
        
        if (result._enhanced_with_timing === true) {
          successfulTimingEnhancements++;
          consecutiveFailures = 0; // Reset consecutive failures
        } else {
          failedTimingEnhancements++;
          consecutiveFailures++;
        }
      }
      
      // Add delay between batches to prevent overwhelming the API
      if (i + BATCH_SIZE < webinars.length) {
        console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
      
    } catch (error) {
      console.error(`[zoom-api][enhanceWebinarsWithActualTimingData] ❌ Error processing batch ${batchNumber}:`, error);
      
      // Add batch webinars with error status
      for (const webinar of batch) {
        enhancedWebinars.push({
          ...webinar,
          _enhanced_with_timing: false,
          _timing_enhancement_error: `Batch processing error: ${error.message}`,
          _timing_enhancement_timestamp: new Date().toISOString()
        });
        failedTimingEnhancements++;
        consecutiveFailures++;
      }
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`[zoom-api][enhanceWebinarsWithActualTimingData] 🎉 Timing enhancement completed in ${totalTime}ms: ${successfulTimingEnhancements} successful, ${failedTimingEnhancements} failed`);
  
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
    const fetchPromise = fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const response = await withTimeout(fetchPromise, API_CALL_TIMEOUT);
    
    if (!response) {
      console.warn(`[zoom-api][fetchPastWebinarDetails] ⚠️ API call timed out for webinar: ${webinarId}`);
      return null;
    }
    
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
 * Enhanced timing processor that combines multiple data sources
 */
export async function enhanceWebinarsWithComprehensiveTimingData(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] Processing comprehensive timing data for ${webinars.length} webinars with enhanced timeout protection`);
  
  // Use the new enhanced timing processor
  const enhancedWebinars = await enhanceWebinarsWithActualTimingData(webinars, token, supabase, userId);
  
  const timingStats = {
    total_webinars: enhancedWebinars.length,
    with_actual_timing: enhancedWebinars.filter(w => w.actual_start_time).length,
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
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData] - Enhancement methods:`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData]   • Occurrence API: ${timingStats.methods.occurrence_past_api}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData]   • UUID API: ${timingStats.methods.uuid_past_api}`);
  console.log(`[zoom-api][enhanceWebinarsWithComprehensiveTimingData]   • Instances API: ${timingStats.methods.instances_api}`);
  
  return enhancedWebinars;
}
