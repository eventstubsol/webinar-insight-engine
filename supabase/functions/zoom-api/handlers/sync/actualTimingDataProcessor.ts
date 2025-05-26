
/**
 * Fetches actual timing data for ended webinars from the past_webinars endpoint
 * with improved error handling, batching, and timeout protection
 */
export async function enhanceWebinarsWithActualTimingData(webinars: any[], token: string): Promise<any[]> {
  console.log(`[zoom-api][actual-timing-processor] Starting actual timing data enhancement for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    return webinars;
  }
  
  // Filter for ended webinars that need actual timing data
  // Fix: Check for both 'ended' and 'aborted' status using the correct field
  const endedWebinars = webinars.filter(webinar => {
    const status = webinar.status?.toLowerCase();
    const hasActualData = webinar.actual_start_time || webinar.actual_duration;
    const hasUuid = webinar.webinar_uuid; // Fix: Use webinar_uuid instead of uuid
    
    return (status === 'ended' || status === 'aborted') && !hasActualData && hasUuid;
  });
  
  if (endedWebinars.length === 0) {
    console.log(`[zoom-api][actual-timing-processor] No ended webinars requiring timing data found`);
    return webinars;
  }
  
  console.log(`[zoom-api][actual-timing-processor] Found ${endedWebinars.length} ended webinars requiring timing data`);
  
  // Create a map for efficient lookup
  const webinarMap = new Map(webinars.map(w => [w.id || w.webinar_id, w]));
  
  // Process in batches to prevent timeouts
  const BATCH_SIZE = 5;
  const CONCURRENT_LIMIT = 3;
  const API_TIMEOUT = 10000; // 10 seconds per API call
  
  let processedCount = 0;
  let successCount = 0;
  
  for (let i = 0; i < endedWebinars.length; i += BATCH_SIZE) {
    const batch = endedWebinars.slice(i, i + BATCH_SIZE);
    console.log(`[zoom-api][actual-timing-processor] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(endedWebinars.length / BATCH_SIZE)}`);
    
    // Process batch with concurrency limit
    const batchPromises = batch.map(webinar => 
      processWebinarTimingData(webinar, token, API_TIMEOUT)
    );
    
    // Use allSettled to continue even if some fail
    const results = await Promise.allSettled(batchPromises);
    
    // Apply results to the webinar map
    results.forEach((result, index) => {
      const webinar = batch[index];
      const webinarId = webinar.id || webinar.webinar_id;
      processedCount++;
      
      if (result.status === 'fulfilled' && result.value) {
        const updatedWebinar = webinarMap.get(webinarId);
        if (updatedWebinar) {
          Object.assign(updatedWebinar, result.value);
          successCount++;
          console.log(`[zoom-api][actual-timing-processor] Enhanced webinar ${webinarId} with actual timing data`);
        }
      } else {
        console.warn(`[zoom-api][actual-timing-processor] Failed to get timing data for webinar ${webinarId}:`, 
          result.status === 'rejected' ? result.reason : 'Unknown error');
      }
    });
    
    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < endedWebinars.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`[zoom-api][actual-timing-processor] Completed processing: ${successCount}/${processedCount} webinars enhanced with actual timing data`);
  
  // Return the updated webinars array
  return Array.from(webinarMap.values());
}

/**
 * Process individual webinar timing data with timeout protection
 */
async function processWebinarTimingData(webinar: any, token: string, timeout: number): Promise<any | null> {
  const webinarId = webinar.id || webinar.webinar_id;
  const webinarUuid = webinar.webinar_uuid; // Fix: Use correct field name
  
  if (!webinarUuid) {
    console.log(`[zoom-api][actual-timing-processor] No UUID available for webinar ${webinarId}, skipping`);
    return null;
  }
  
  try {
    console.log(`[zoom-api][actual-timing-processor] Fetching past webinar data for ${webinarId} (UUID: ${webinarUuid})`);
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API call timeout')), timeout);
    });
    
    // Create API call promise
    const apiPromise = fetch(`https://api.zoom.us/v2/past_webinars/${webinarUuid}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Race against timeout
    const response = await Promise.race([apiPromise, timeoutPromise]) as Response;
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[zoom-api][actual-timing-processor] Past webinar data not found for ${webinarId}, may not have been started`);
        return null;
      } else {
        throw new Error(`API call failed with status ${response.status}`);
      }
    }
    
    const pastWebinarData = await response.json();
    console.log(`[zoom-api][actual-timing-processor] Successfully fetched past webinar data for ${webinarId}`);
    
    // Extract and validate actual timing data
    const actualStartTime = pastWebinarData.start_time || null;
    const actualEndTime = pastWebinarData.end_time || null;
    let actualDuration = pastWebinarData.duration || null;
    
    // Calculate duration if we have start and end times but no duration
    if (actualStartTime && actualEndTime && !actualDuration) {
      const startMs = new Date(actualStartTime).getTime();
      const endMs = new Date(actualEndTime).getTime();
      actualDuration = Math.round((endMs - startMs) / (1000 * 60)); // Duration in minutes
    }
    
    // Return the enhanced data
    return {
      actual_start_time: actualStartTime,
      actual_duration: actualDuration,
      actual_end_time: actualEndTime,
      // Also store additional metrics if available
      participants_count: pastWebinarData.participants_count || webinar.participants_count || 0,
      // Merge past webinar data into raw_data for complete information
      raw_data: {
        ...webinar.raw_data,
        past_webinar_data: pastWebinarData
      }
    };
    
  } catch (error) {
    console.error(`[zoom-api][actual-timing-processor] Error fetching past webinar data for ${webinarId}:`, error);
    return null;
  }
}
