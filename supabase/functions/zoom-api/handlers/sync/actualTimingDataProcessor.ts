
/**
 * COMPREHENSIVE timing data processor with relaxed filtering and improved UUID handling
 */
export async function enhanceWebinarsWithActualTimingData(webinars: any[], token: string): Promise<any[]> {
  console.log(`[zoom-api][actual-timing-processor] 🚀 Starting COMPREHENSIVE timing data enhancement for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][actual-timing-processor] No webinars provided, returning empty array`);
    return webinars;
  }
  
  // COMPREHENSIVE filtering with time-based approach as primary method
  const webinarsNeedingTimingData = webinars.filter(webinar => {
    const status = webinar.status?.toLowerCase();
    const hasActualData = webinar.actual_start_time || webinar.actual_duration;
    
    // Skip if already has timing data
    if (hasActualData) {
      console.log(`[actual-timing-processor] ✅ Webinar ${webinar.id}: already has timing data, skipping`);
      return false;
    }
    
    // RELAXED UUID validation - accept more formats
    const possibleIds = [
      webinar.uuid,
      webinar.webinar_uuid, 
      webinar.id?.toString(),
      webinar.webinar_id?.toString()
    ].filter(Boolean);
    
    const hasValidId = possibleIds.length > 0 && possibleIds.some(id => {
      if (!id || typeof id !== 'string') return false;
      
      // Accept base64-like UUIDs (with special chars) OR numeric IDs
      const isBase64Like = /[=\-+/]/.test(id) && id.length > 15;
      const isNumericId = /^\d{11,12}$/.test(id); // Zoom webinar IDs are typically 11-12 digits
      const isReasonableLength = id.length >= 10;
      
      return (isBase64Like || isNumericId) && isReasonableLength;
    });
    
    if (!hasValidId) {
      console.log(`[actual-timing-processor] ❌ Webinar ${webinar.id}: no valid UUID/ID found. Available: ${possibleIds.join(', ')}`);
      return false;
    }
    
    // PRIMARY: Time-based detection (most reliable)
    const now = new Date();
    let shouldFetchTiming = false;
    
    if (webinar.start_time) {
      const startTime = new Date(webinar.start_time);
      const scheduledDuration = webinar.duration || 60; // Default 60 minutes if not specified
      const scheduledEndTime = new Date(startTime.getTime() + (scheduledDuration * 60 * 1000));
      
      // Add 15-minute buffer for webinars that run over time
      const bufferTime = 15 * 60 * 1000; // 15 minutes
      const endTimeWithBuffer = new Date(scheduledEndTime.getTime() + bufferTime);
      
      if (now > endTimeWithBuffer) {
        shouldFetchTiming = true;
        console.log(`[actual-timing-processor] ⏰ Webinar ${webinar.id}: TIME-BASED detection indicates completion`);
        console.log(`[actual-timing-processor] - Start: ${startTime.toISOString()}`);
        console.log(`[actual-timing-processor] - Scheduled End: ${scheduledEndTime.toISOString()}`);
        console.log(`[actual-timing-processor] - End + Buffer: ${endTimeWithBuffer.toISOString()}`);
        console.log(`[actual-timing-processor] - Current: ${now.toISOString()}`);
      } else {
        console.log(`[actual-timing-processor] ⏳ Webinar ${webinar.id}: still within scheduled time + buffer`);
        console.log(`[actual-timing-processor] - End + Buffer: ${endTimeWithBuffer.toISOString()} vs Current: ${now.toISOString()}`);
      }
    }
    
    // SECONDARY: Status-based detection (fallback)
    if (!shouldFetchTiming) {
      if (status === 'ended' || status === 'aborted') {
        shouldFetchTiming = true;
        console.log(`[actual-timing-processor] 📋 Webinar ${webinar.id}: STATUS-BASED detection (status: '${status}')`);
      } else if (!status || status === 'undefined' || status === 'null') {
        // For NULL status, only try if it's an old webinar (more than 1 day old)
        if (webinar.start_time) {
          const startTime = new Date(webinar.start_time);
          const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
          
          if (startTime < oneDayAgo) {
            shouldFetchTiming = true;
            console.log(`[actual-timing-processor] 🔍 Webinar ${webinar.id}: NULL status but old webinar (started: ${startTime.toISOString()})`);
          } else {
            console.log(`[actual-timing-processor] ⚠️ Webinar ${webinar.id}: NULL status and recent webinar, skipping`);
          }
        }
      } else {
        console.log(`[actual-timing-processor] ⏭️ Webinar ${webinar.id}: status '${status}' indicates not completed yet`);
      }
    }
    
    console.log(`[actual-timing-processor] 📊 Webinar ${webinar.id} DECISION: shouldFetch=${shouldFetchTiming}, status=${status}, hasValidId=${hasValidId}`);
    
    return shouldFetchTiming;
  });
  
  if (webinarsNeedingTimingData.length === 0) {
    console.log(`[zoom-api][actual-timing-processor] ✅ No webinars requiring timing data enhancement found`);
    return webinars;
  }
  
  console.log(`[zoom-api][actual-timing-processor] 🎯 Found ${webinarsNeedingTimingData.length} webinars requiring timing data enhancement`);
  
  // Create a map for efficient lookup and updates
  const webinarMap = new Map(webinars.map(w => [w.id || w.webinar_id, w]));
  
  // Process webinars sequentially to avoid rate limits
  const API_TIMEOUT = 12000; // 12 seconds per API call
  const RATE_LIMIT_DELAY = 1000; // 1 second delay between calls
  
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  
  console.log(`[zoom-api][actual-timing-processor] 🔄 Starting sequential processing of ${webinarsNeedingTimingData.length} webinars`);
  
  for (const webinar of webinarsNeedingTimingData) {
    try {
      const result = await processWebinarTimingDataComprehensive(webinar, token, API_TIMEOUT);
      const webinarId = webinar.id || webinar.webinar_id;
      processedCount++;
      
      if (result) {
        const updatedWebinar = webinarMap.get(webinarId);
        if (updatedWebinar) {
          // CRITICAL: Ensure timing data is properly merged
          Object.assign(updatedWebinar, {
            actual_start_time: result.actual_start_time,
            actual_duration: result.actual_duration,
            actual_end_time: result.actual_end_time,
            participants_count: result.participants_count || updatedWebinar.participants_count,
            raw_data: {
              ...updatedWebinar.raw_data,
              past_webinar_data: result.raw_data?.past_webinar_data
            }
          });
          
          successCount++;
          console.log(`[zoom-api][actual-timing-processor] ✅ 🎯 SUCCESS: Enhanced webinar ${webinarId}`);
          console.log(`[zoom-api][actual-timing-processor] - actual_start_time: ${result.actual_start_time}`);
          console.log(`[zoom-api][actual-timing-processor] - actual_duration: ${result.actual_duration} minutes`);
          console.log(`[zoom-api][actual-timing-processor] - participants_count: ${result.participants_count}`);
        }
      } else {
        errorCount++;
        console.warn(`[zoom-api][actual-timing-processor] ❌ Failed to get timing data for webinar ${webinarId}`);
      }
      
      // Rate limiting delay
      if (processedCount < webinarsNeedingTimingData.length) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
      
    } catch (error) {
      errorCount++;
      const webinarId = webinar.id || webinar.webinar_id;
      console.error(`[zoom-api][actual-timing-processor] ❌ Exception processing webinar ${webinarId}:`, error.message);
    }
  }
  
  console.log(`[zoom-api][actual-timing-processor] 🏁 COMPREHENSIVE PROCESSING COMPLETED:`);
  console.log(`[zoom-api][actual-timing-processor] - Processed: ${processedCount} webinars`);
  console.log(`[zoom-api][actual-timing-processor] - 🎯 SUCCESSFUL: ${successCount} webinars enhanced with timing data`);
  console.log(`[zoom-api][actual-timing-processor] - Failed: ${errorCount} webinars`);
  console.log(`[zoom-api][actual-timing-processor] - Success rate: ${processedCount > 0 ? Math.round((successCount / processedCount) * 100) : 0}%`);
  
  // Final validation
  const finalWebinars = Array.from(webinarMap.values());
  const finalTimingCount = finalWebinars.filter(w => w.actual_start_time || w.actual_duration).length;
  console.log(`[zoom-api][actual-timing-processor] 🎯 FINAL RESULT: ${finalTimingCount} total webinars now have actual timing data`);
  
  return finalWebinars;
}

/**
 * COMPREHENSIVE individual webinar timing data processor with multiple ID strategies
 */
async function processWebinarTimingDataComprehensive(webinar: any, token: string, timeout: number): Promise<any | null> {
  const webinarId = webinar.id || webinar.webinar_id;
  
  console.log(`[timing-processor] 🔍 Processing webinar ${webinarId} for timing data`);
  
  // COMPREHENSIVE ID extraction with multiple strategies
  const idCandidates = [
    { field: 'uuid', value: webinar.uuid, priority: 1, type: 'base64' },
    { field: 'webinar_uuid', value: webinar.webinar_uuid, priority: 2, type: 'base64' },
    { field: 'id', value: webinar.id?.toString(), priority: 3, type: 'numeric' },
    { field: 'webinar_id', value: webinar.webinar_id?.toString(), priority: 4, type: 'numeric' }
  ].filter(candidate => {
    if (!candidate.value || typeof candidate.value !== 'string') return false;
    
    if (candidate.type === 'base64') {
      // Base64-like UUID validation (relaxed)
      const hasSpecialChars = /[=\-+/]/.test(candidate.value);
      const isLongEnough = candidate.value.length > 15;
      const looksLikeBase64 = /^[A-Za-z0-9+/=\-_]+$/.test(candidate.value);
      
      return hasSpecialChars && isLongEnough && looksLikeBase64;
    } else {
      // Numeric ID validation
      const isNumeric = /^\d{11,12}$/.test(candidate.value);
      return isNumeric;
    }
  }).sort((a, b) => a.priority - b.priority);
  
  if (idCandidates.length === 0) {
    console.log(`[timing-processor] ❌ No valid UUID/ID found for webinar ${webinarId}`);
    console.log(`[timing-processor] Available fields: ${JSON.stringify({
      uuid: webinar.uuid,
      webinar_uuid: webinar.webinar_uuid,
      id: webinar.id,
      webinar_id: webinar.webinar_id
    })}`);
    return null;
  }
  
  console.log(`[timing-processor] 📋 Found ${idCandidates.length} valid ID candidates for webinar ${webinarId}`);
  
  // Try each valid ID candidate with comprehensive encoding strategies
  for (const [candidateIndex, candidate] of idCandidates.entries()) {
    console.log(`[timing-processor] 🔄 Trying ID candidate ${candidateIndex + 1}/${idCandidates.length}: ${candidate.field} = ${candidate.value} (${candidate.type})`);
    
    // Different encoding strategies based on ID type
    let encodingVariants = [];
    
    if (candidate.type === 'base64') {
      encodingVariants = [
        candidate.value, // Original
        encodeURIComponent(candidate.value), // Standard URL encoding
        candidate.value.replace(/\+/g, '%2B').replace(/\//g, '%2F').replace(/=/g, '%3D'), // Manual encoding
        candidate.value.replace(/\//g, '_').replace(/\+/g, '-'), // URL-safe base64
        candidate.value.replace(/\//g, '%2F'), // Only encode forward slashes
        candidate.value.replace(/=/g, '%3D'), // Only encode equals signs
      ];
    } else {
      // For numeric IDs, try as-is (they shouldn't need encoding)
      encodingVariants = [candidate.value];
    }
    
    for (const [variantIndex, encodedValue] of encodingVariants.entries()) {
      try {
        console.log(`[timing-processor] 🚀 API attempt ${variantIndex + 1}/${encodingVariants.length} for ${webinarId}: ${encodedValue.substring(0, 30)}...`);
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API call timeout')), timeout);
        });
        
        // Create API call promise
        const apiUrl = `https://api.zoom.us/v2/past_webinars/${encodedValue}`;
        const apiPromise = fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`[timing-processor] 📡 Making API call to: ${apiUrl}`);
        
        // Race against timeout
        const response = await Promise.race([apiPromise, timeoutPromise]) as Response;
        
        console.log(`[timing-processor] 📨 API response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log(`[timing-processor] ⚠️ 404 for webinar ${webinarId} with ${candidate.field} variant ${variantIndex + 1}`);
            continue; // Try next variant
          } else if (response.status === 429) {
            console.log(`[timing-processor] ⚠️ Rate limit (429) for webinar ${webinarId}, adding delay`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay for rate limit
            continue; // Try again
          } else {
            const errorText = await response.text().catch(() => 'Unable to read error response');
            console.error(`[timing-processor] ❌ API error ${response.status} for ${webinarId}: ${errorText}`);
            continue; // Try next variant
          }
        }
        
        const pastWebinarData = await response.json();
        console.log(`[timing-processor] ✅ 🎯 SUCCESS! Retrieved timing data for ${webinarId} using ${candidate.field} variant ${variantIndex + 1}`);
        
        // Enhanced timing data extraction and validation
        const actualStartTime = pastWebinarData.start_time;
        const actualEndTime = pastWebinarData.end_time;
        let actualDuration = pastWebinarData.duration;
        
        console.log(`[timing-processor] 📊 Raw timing data for ${webinarId}:`);
        console.log(`[timing-processor] - start_time: ${actualStartTime}`);
        console.log(`[timing-processor] - end_time: ${actualEndTime}`);
        console.log(`[timing-processor] - duration: ${actualDuration}`);
        console.log(`[timing-processor] - participants_count: ${pastWebinarData.participants_count}`);
        
        // Calculate duration if missing but we have start/end times
        if (actualStartTime && actualEndTime && !actualDuration) {
          const startMs = new Date(actualStartTime).getTime();
          const endMs = new Date(actualEndTime).getTime();
          actualDuration = Math.round((endMs - startMs) / (1000 * 60)); // Duration in minutes
          console.log(`[timing-processor] ⚡ Calculated duration for ${webinarId}: ${actualDuration} minutes`);
        }
        
        // Validate the extracted data
        if (!actualStartTime && !actualDuration) {
          console.warn(`[timing-processor] ⚠️ No valid timing data found for ${webinarId}, trying next variant`);
          continue;
        }
        
        const result = {
          actual_start_time: actualStartTime,
          actual_duration: actualDuration,
          actual_end_time: actualEndTime,
          participants_count: pastWebinarData.participants_count || webinar.participants_count || 0,
          raw_data: {
            past_webinar_data: pastWebinarData
          }
        };
        
        console.log(`[timing-processor] 🎯 Final enhanced result for ${webinarId}:`, {
          actual_start_time: result.actual_start_time,
          actual_duration: result.actual_duration,
          actual_end_time: result.actual_end_time,
          participants_count: result.participants_count
        });
        
        return result; // Success!
        
      } catch (error) {
        console.error(`[timing-processor] ❌ Error with ${candidate.field} variant ${variantIndex + 1} for ${webinarId}:`, error.message);
        
        // Continue to next variant
        if (variantIndex < encodingVariants.length - 1) {
          continue;
        }
      }
    }
  }
  
  console.log(`[timing-processor] ❌ All ID candidates and variants exhausted for webinar ${webinarId}`);
  return null;
}
