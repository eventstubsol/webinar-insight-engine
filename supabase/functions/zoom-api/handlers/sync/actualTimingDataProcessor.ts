
/**
 * Enhanced fetcher for actual timing data from past_webinars endpoint
 * with comprehensive error handling, improved UUID processing, and robust status detection
 */
export async function enhanceWebinarsWithActualTimingData(webinars: any[], token: string): Promise<any[]> {
  console.log(`[zoom-api][actual-timing-processor] 🚀 Starting ENHANCED timing data enhancement for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][actual-timing-processor] No webinars provided, returning empty array`);
    return webinars;
  }
  
  // Enhanced filter for webinars that need actual timing data
  const webinarsNeedingTimingData = webinars.filter(webinar => {
    const status = webinar.status?.toLowerCase();
    const hasActualData = webinar.actual_start_time || webinar.actual_duration;
    
    // COMPREHENSIVE UUID validation with multiple field checks
    const possibleUuids = [
      webinar.uuid,
      webinar.webinar_uuid, 
      webinar.id?.toString(),
      webinar.webinar_id?.toString()
    ].filter(Boolean);
    
    const hasValidUuid = possibleUuids.length > 0 && possibleUuids.some(uuid => {
      if (!uuid || typeof uuid !== 'string' || uuid.length < 10) return false;
      // Enhanced UUID validation: check for base64-like characteristics
      const hasSpecialChars = uuid.includes('=') || uuid.includes('-') || uuid.includes('/') || uuid.includes('+');
      const isLongEnough = uuid.length > 15; // Real UUIDs are typically longer
      const notJustNumbers = !/^\d+$/.test(uuid); // Not just numeric ID
      
      return (hasSpecialChars || isLongEnough) && notJustNumbers;
    });
    
    // ENHANCED status detection with comprehensive time-based fallback
    let shouldFetchTiming = false;
    const now = new Date();
    
    // Primary: Check explicit status
    if (status === 'ended' || status === 'aborted') {
      shouldFetchTiming = true;
      console.log(`[actual-timing-processor] ✅ Webinar ${webinar.id}: explicitly marked as '${status}'`);
    }
    // Secondary: Time-based detection for undefined/null status
    else if (!status || status === 'undefined' || status === 'null' || status === 'started') {
      if (webinar.start_time && webinar.duration) {
        const startTime = new Date(webinar.start_time);
        const scheduledEndTime = new Date(startTime.getTime() + (webinar.duration * 60 * 1000));
        
        // Add buffer time to account for webinars that run longer than scheduled
        const bufferTime = 30 * 60 * 1000; // 30 minutes buffer
        const endTimeWithBuffer = new Date(scheduledEndTime.getTime() + bufferTime);
        
        if (now > endTimeWithBuffer) {
          shouldFetchTiming = true;
          console.log(`[actual-timing-processor] ⏰ Webinar ${webinar.id}: time-based detection indicates completion (scheduled end + buffer: ${endTimeWithBuffer.toISOString()}, current: ${now.toISOString()})`);
        } else {
          console.log(`[actual-timing-processor] ⏳ Webinar ${webinar.id}: still within scheduled time + buffer`);
        }
      } else {
        console.log(`[actual-timing-processor] ⚠️ Webinar ${webinar.id}: missing timing info for time-based check`);
      }
    }
    // Tertiary: Try fetching for any webinar from the past (conservative approach)
    else if (webinar.start_time) {
      const startTime = new Date(webinar.start_time);
      const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      if (startTime < oneDayAgo) {
        shouldFetchTiming = true;
        console.log(`[actual-timing-processor] 🔍 Webinar ${webinar.id}: attempting fetch for old webinar (started: ${startTime.toISOString()})`);
      }
    }
    
    const shouldProcess = shouldFetchTiming && !hasActualData && hasValidUuid;
    
    console.log(`[actual-timing-processor] 📊 Webinar ${webinar.id} analysis: status=${status}, shouldFetchTiming=${shouldFetchTiming}, hasActualData=${hasActualData}, hasValidUuid=${hasValidUuid}, willProcess=${shouldProcess}`);
    
    return shouldProcess;
  });
  
  if (webinarsNeedingTimingData.length === 0) {
    console.log(`[zoom-api][actual-timing-processor] ✅ No webinars requiring timing data enhancement found`);
    return webinars;
  }
  
  console.log(`[zoom-api][actual-timing-processor] 🎯 Found ${webinarsNeedingTimingData.length} webinars requiring timing data enhancement`);
  
  // Create a map for efficient lookup
  const webinarMap = new Map(webinars.map(w => [w.id || w.webinar_id, w]));
  
  // Process in smaller batches with enhanced error handling
  const BATCH_SIZE = 2; // Smaller batches for better reliability
  const API_TIMEOUT = 6000; // Shorter timeout per API call
  
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < webinarsNeedingTimingData.length; i += BATCH_SIZE) {
    const batch = webinarsNeedingTimingData.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(webinarsNeedingTimingData.length / BATCH_SIZE);
    
    console.log(`[zoom-api][actual-timing-processor] 🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} webinars)`);
    
    // Process batch with concurrency limit and enhanced error handling
    const batchPromises = batch.map(webinar => 
      processWebinarTimingDataEnhanced(webinar, token, API_TIMEOUT)
    );
    
    // Use allSettled to continue even if some fail
    const results = await Promise.allSettled(batchPromises);
    
    // Apply results to the webinar map with detailed logging
    results.forEach((result, index) => {
      const webinar = batch[index];
      const webinarId = webinar.id || webinar.webinar_id;
      processedCount++;
      
      if (result.status === 'fulfilled' && result.value) {
        const updatedWebinar = webinarMap.get(webinarId);
        if (updatedWebinar) {
          Object.assign(updatedWebinar, result.value);
          successCount++;
          console.log(`[zoom-api][actual-timing-processor] ✅ Enhanced webinar ${webinarId} with timing data: start=${result.value.actual_start_time}, duration=${result.value.actual_duration}min`);
        }
      } else {
        errorCount++;
        const errorReason = result.status === 'rejected' ? result.reason?.message || result.reason : 'Unknown error';
        console.warn(`[zoom-api][actual-timing-processor] ❌ Failed to get timing data for webinar ${webinarId}: ${errorReason}`);
      }
    });
    
    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < webinarsNeedingTimingData.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`[zoom-api][actual-timing-processor] 🏁 ENHANCED PROCESSING COMPLETED:`);
  console.log(`[zoom-api][actual-timing-processor] - Processed: ${processedCount} webinars`);
  console.log(`[zoom-api][actual-timing-processor] - Successful: ${successCount} webinars enhanced with timing data`);
  console.log(`[zoom-api][actual-timing-processor] - Failed: ${errorCount} webinars`);
  console.log(`[zoom-api][actual-timing-processor] - Success rate: ${processedCount > 0 ? Math.round((successCount / processedCount) * 100) : 0}%`);
  
  // Return the updated webinars array
  return Array.from(webinarMap.values());
}

/**
 * Enhanced individual webinar timing data processor with comprehensive UUID handling
 */
async function processWebinarTimingDataEnhanced(webinar: any, token: string, timeout: number): Promise<any | null> {
  const webinarId = webinar.id || webinar.webinar_id;
  
  console.log(`[timing-processor] 🔍 Processing webinar ${webinarId} for timing data`);
  
  // ENHANCED UUID extraction and validation
  const uuidCandidates = [
    { field: 'uuid', value: webinar.uuid },
    { field: 'webinar_uuid', value: webinar.webinar_uuid },
    { field: 'id', value: webinar.id?.toString() },
    { field: 'webinar_id', value: webinar.webinar_id?.toString() }
  ].filter(candidate => {
    if (!candidate.value || typeof candidate.value !== 'string' || candidate.value.length < 10) return false;
    
    // Enhanced validation criteria
    const hasSpecialChars = candidate.value.includes('=') || candidate.value.includes('-') || 
                           candidate.value.includes('/') || candidate.value.includes('+');
    const isLongEnough = candidate.value.length > 15;
    const notJustNumbers = !/^\d+$/.test(candidate.value);
    const looksLikeBase64 = /^[A-Za-z0-9+/=]+$/.test(candidate.value);
    
    return (hasSpecialChars || isLongEnough) && notJustNumbers && looksLikeBase64;
  });
  
  if (uuidCandidates.length === 0) {
    console.log(`[timing-processor] ❌ No valid UUID found for webinar ${webinarId}. Available fields: [${Object.keys(webinar).join(', ')}]`);
    return null;
  }
  
  // Try each valid UUID candidate with multiple encoding strategies
  for (const [candidateIndex, candidate] of uuidCandidates.entries()) {
    console.log(`[timing-processor] 🔄 Trying UUID candidate ${candidateIndex + 1}/${uuidCandidates.length}: ${candidate.field} = ${candidate.value}`);
    
    const uuidVariants = [
      candidate.value, // Original UUID
      encodeURIComponent(candidate.value), // URL encoded
      candidate.value.replace(/\+/g, '%2B').replace(/\//g, '%2F').replace(/=/g, '%3D'), // Manual encoding
      candidate.value.replace(/\//g, '_').replace(/\+/g, '-') // Alternative encoding for some APIs
    ];
    
    for (const [variantIndex, uuidVariant] of uuidVariants.entries()) {
      try {
        console.log(`[timing-processor] 🚀 API attempt ${variantIndex + 1}/${uuidVariants.length} for ${webinarId}: ${uuidVariant.substring(0, 20)}...`);
        
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API call timeout')), timeout);
        });
        
        // Create API call promise
        const apiUrl = `https://api.zoom.us/v2/past_webinars/${uuidVariant}`;
        const apiPromise = fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Race against timeout
        const response = await Promise.race([apiPromise, timeoutPromise]) as Response;
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log(`[timing-processor] ⚠️ 404 for webinar ${webinarId} with UUID variant ${variantIndex + 1} (${candidate.field})`);
            continue; // Try next variant
          } else {
            const errorText = await response.text();
            console.error(`[timing-processor] ❌ API error ${response.status} for ${webinarId}: ${errorText}`);
            throw new Error(`API call failed with status ${response.status}: ${errorText}`);
          }
        }
        
        const pastWebinarData = await response.json();
        console.log(`[timing-processor] ✅ SUCCESS! Retrieved timing data for ${webinarId} using ${candidate.field} variant ${variantIndex + 1}`);
        
        // Extract and validate timing data with enhanced processing
        const actualStartTime = pastWebinarData.start_time;
        const actualEndTime = pastWebinarData.end_time;
        let actualDuration = pastWebinarData.duration;
        
        console.log(`[timing-processor] 📊 Raw timing data for ${webinarId}:`);
        console.log(`[timing-processor] - start_time: ${actualStartTime}`);
        console.log(`[timing-processor] - end_time: ${actualEndTime}`);
        console.log(`[timing-processor] - duration: ${actualDuration}`);
        
        // Calculate duration if missing but we have start/end times
        if (actualStartTime && actualEndTime && !actualDuration) {
          const startMs = new Date(actualStartTime).getTime();
          const endMs = new Date(actualEndTime).getTime();
          actualDuration = Math.round((endMs - startMs) / (1000 * 60)); // Duration in minutes
          console.log(`[timing-processor] ⚡ Calculated duration for ${webinarId}: ${actualDuration} minutes`);
        }
        
        const result = {
          actual_start_time: actualStartTime,
          actual_duration: actualDuration,
          actual_end_time: actualEndTime,
          participants_count: pastWebinarData.participants_count || webinar.participants_count || 0,
          // Store the complete past webinar data for future reference
          raw_data: {
            ...webinar.raw_data,
            past_webinar_data: pastWebinarData
          }
        };
        
        console.log(`[timing-processor] 🎯 Final enhanced result for ${webinarId}:`, {
          actual_start_time: result.actual_start_time,
          actual_duration: result.actual_duration,
          participants_count: result.participants_count
        });
        
        return result; // Success!
        
      } catch (error) {
        console.error(`[timing-processor] ❌ Error with UUID variant ${variantIndex + 1} for ${webinarId}:`, error.message);
        if (variantIndex < uuidVariants.length - 1) {
          continue; // Try next variant
        }
      }
    }
  }
  
  console.log(`[timing-processor] ❌ All UUID candidates and variants exhausted for webinar ${webinarId}`);
  return null;
}
