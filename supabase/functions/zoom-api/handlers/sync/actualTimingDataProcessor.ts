
/**
 * Fetches actual timing data for ended webinars from the past_webinars endpoint
 * with improved error handling, batching, timeout protection, and enhanced status detection
 */
export async function enhanceWebinarsWithActualTimingData(webinars: any[], token: string): Promise<any[]> {
  console.log(`[zoom-api][actual-timing-processor] Starting actual timing data enhancement for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    return webinars;
  }
  
  // Filter for webinars that need actual timing data with improved logic
  const webinarsNeedingTimingData = webinars.filter(webinar => {
    const status = webinar.status?.toLowerCase();
    const hasActualData = webinar.actual_start_time || webinar.actual_duration;
    
    // ENHANCED: Check multiple UUID fields more thoroughly
    const possibleUuids = [
      webinar.uuid,
      webinar.webinar_uuid, 
      webinar.id?.toString(),
      webinar.webinar_id?.toString()
    ].filter(Boolean);
    
    const hasValidUuid = possibleUuids.length > 0 && possibleUuids.some(uuid => 
      uuid && typeof uuid === 'string' && uuid.length > 10
    );
    
    // IMPROVED: Enhanced status detection logic
    let shouldFetchTiming = false;
    const now = new Date();
    
    // Check if explicitly ended or aborted
    if (status === 'ended' || status === 'aborted') {
      shouldFetchTiming = true;
    }
    // Check if status is undefined/null but webinar should be ended based on time
    else if (!status || status === 'undefined') {
      if (webinar.start_time && webinar.duration) {
        const startTime = new Date(webinar.start_time);
        const endTime = new Date(startTime.getTime() + (webinar.duration * 60 * 1000));
        
        if (now > endTime) {
          shouldFetchTiming = true;
        }
      }
    }
    
    console.log(`[actual-timing-processor] Webinar ${webinar.id}: status=${status}, shouldFetchTiming=${shouldFetchTiming}, hasActualData=${hasActualData}, hasValidUuid=${hasValidUuid}, uuids=[${possibleUuids.join(', ')}]`);
    
    return shouldFetchTiming && !hasActualData && hasValidUuid;
  });
  
  if (webinarsNeedingTimingData.length === 0) {
    console.log(`[zoom-api][actual-timing-processor] No webinars requiring timing data found`);
    return webinars;
  }
  
  console.log(`[zoom-api][actual-timing-processor] Found ${webinarsNeedingTimingData.length} webinars requiring timing data`);
  
  // Create a map for efficient lookup
  const webinarMap = new Map(webinars.map(w => [w.id || w.webinar_id, w]));
  
  // Process in batches to prevent timeouts
  const BATCH_SIZE = 5;
  const API_TIMEOUT = 10000; // 10 seconds per API call
  
  let processedCount = 0;
  let successCount = 0;
  
  for (let i = 0; i < webinarsNeedingTimingData.length; i += BATCH_SIZE) {
    const batch = webinarsNeedingTimingData.slice(i, i + BATCH_SIZE);
    console.log(`[zoom-api][actual-timing-processor] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(webinarsNeedingTimingData.length / BATCH_SIZE)}`);
    
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
          console.log(`[zoom-api][actual-timing-processor] ✅ Enhanced webinar ${webinarId} with actual timing data: start=${result.value.actual_start_time}, duration=${result.value.actual_duration}`);
        }
      } else {
        console.warn(`[zoom-api][actual-timing-processor] ❌ Failed to get timing data for webinar ${webinarId}:`, 
          result.status === 'rejected' ? result.reason : 'Unknown error');
      }
    });
    
    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < webinarsNeedingTimingData.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`[zoom-api][actual-timing-processor] Completed processing: ${successCount}/${processedCount} webinars enhanced with actual timing data`);
  
  // Return the updated webinars array
  return Array.from(webinarMap.values());
}

/**
 * Process individual webinar timing data with timeout protection and enhanced status detection
 */
async function processWebinarTimingData(webinar: any, token: string, timeout: number): Promise<any | null> {
  const webinarId = webinar.id || webinar.webinar_id;
  
  // ENHANCED: Try multiple UUID fields in order of preference
  const possibleUuids = [
    webinar.uuid,           // Most common field
    webinar.webinar_uuid,   // Alternative field
    webinar.id?.toString(), // Sometimes ID can be used as UUID
    webinar.webinar_id?.toString()
  ].filter(Boolean);
  
  // Find the first valid UUID (should be a string with reasonable length)
  const webinarUuid = possibleUuids.find(uuid => 
    uuid && typeof uuid === 'string' && uuid.length > 10
  );
  
  if (!webinarUuid) {
    console.log(`[zoom-api][actual-timing-processor] ❌ No valid UUID found for webinar ${webinarId}. Checked: [${possibleUuids.join(', ')}]`);
    return null;
  }
  
  try {
    console.log(`[zoom-api][actual-timing-processor] 🔍 Fetching past webinar data for ${webinarId} using UUID: ${webinarUuid}`);
    
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
        console.log(`[zoom-api][actual-timing-processor] ⚠️ Past webinar data not found for ${webinarId} (404), webinar may not have been started or completed yet`);
        return null;
      } else {
        const errorText = await response.text();
        console.error(`[zoom-api][actual-timing-processor] ❌ API call failed for ${webinarId}: ${response.status} - ${errorText}`);
        throw new Error(`API call failed with status ${response.status}: ${errorText}`);
      }
    }
    
    const pastWebinarData = await response.json();
    console.log(`[zoom-api][actual-timing-processor] ✅ Successfully fetched past webinar data for ${webinarId}`);
    console.log(`[zoom-api][actual-timing-processor] 📊 Raw timing data: start_time=${pastWebinarData.start_time}, duration=${pastWebinarData.duration}, end_time=${pastWebinarData.end_time}`);
    
    // Extract and validate actual timing data
    const actualStartTime = pastWebinarData.start_time || null;
    const actualEndTime = pastWebinarData.end_time || null;
    let actualDuration = pastWebinarData.duration || null;
    
    // Calculate duration if we have start and end times but no duration
    if (actualStartTime && actualEndTime && !actualDuration) {
      const startMs = new Date(actualStartTime).getTime();
      const endMs = new Date(actualEndTime).getTime();
      actualDuration = Math.round((endMs - startMs) / (1000 * 60)); // Duration in minutes
      console.log(`[zoom-api][actual-timing-processor] ⚡ Calculated duration: ${actualDuration} minutes`);
    }
    
    const result = {
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
    
    console.log(`[zoom-api][actual-timing-processor] 🎯 Returning enhanced data for ${webinarId}:`, {
      actual_start_time: result.actual_start_time,
      actual_duration: result.actual_duration,
      actual_end_time: result.actual_end_time
    });
    
    return result;
    
  } catch (error) {
    console.error(`[zoom-api][actual-timing-processor] ❌ Error fetching past webinar data for ${webinarId}:`, error);
    return null;
  }
}
