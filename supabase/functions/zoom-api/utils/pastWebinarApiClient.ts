
/**
 * Past Webinar API Client with improved error handling and fallback strategies
 */

interface PastDataResult {
  success: boolean;
  actualStartTime: string | null;
  actualDuration: number | null;
  actualEndTime: string | null;
  participantsCount: number;
  actualData: any;
  identifiersUsed: string[];
  apiCallsMade: string[];
  errorDetails: string[];
}

/**
 * Enhanced function to fetch past webinar data with better error handling and logging
 */
export async function fetchPastWebinarData(
  token: string, 
  webinar: any, 
  instance: any = null, 
  completionResult: any
): Promise<PastDataResult> {
  console.log(`[past-api] 🔄 Fetching past data for webinar ${webinar.id}`);
  
  const result: PastDataResult = {
    success: false,
    actualStartTime: null,
    actualDuration: null,
    actualEndTime: null,
    participantsCount: 0,
    actualData: null,
    identifiersUsed: [],
    apiCallsMade: [],
    errorDetails: []
  };
  
  // Skip if not completed
  if (!completionResult.shouldFetchActualData) {
    console.log(`[past-api] ⏭️ Skipping past data fetch: ${completionResult.reason}`);
    result.errorDetails.push(`Skipped: ${completionResult.reason}`);
    return result;
  }
  
  // Strategy 1: Try past webinars API with webinar ID
  try {
    const webinarId = webinar.id;
    result.identifiersUsed.push(`webinar_id:${webinarId}`);
    result.apiCallsMade.push(`GET /past_webinars/${webinarId}`);
    
    console.log(`[past-api] 📡 Attempting past webinars API with ID: ${webinarId}`);
    
    const response = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[past-api] 📊 Past webinars API response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const pastData = await response.json();
      console.log(`[past-api] ✅ Successfully fetched past data from API`);
      console.log(`[past-api] 📊 Past data fields: start_time=${pastData.start_time}, duration=${pastData.duration}, end_time=${pastData.end_time}`);
      
      result.success = true;
      result.actualData = pastData;
      result.actualStartTime = pastData.start_time || null;
      result.actualDuration = pastData.duration || null;
      result.actualEndTime = pastData.end_time || null;
      result.participantsCount = pastData.participants_count || 0;
      
      // If we got actual timing data, return immediately
      if (result.actualStartTime && result.actualDuration) {
        console.log(`[past-api] 🎯 Got complete timing data from API`);
        return result;
      }
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      result.errorDetails.push(`Past webinars API failed: ${response.status} - ${errorText}`);
      console.warn(`[past-api] ⚠️ Past webinars API failed: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    result.errorDetails.push(`Past webinars API error: ${error.message}`);
    console.error(`[past-api] ❌ Past webinars API error:`, error);
  }
  
  // Strategy 2: Try with UUID if available
  if (webinar.uuid && webinar.uuid !== webinar.id) {
    try {
      const uuid = webinar.uuid;
      result.identifiersUsed.push(`webinar_uuid:${uuid}`);
      result.apiCallsMade.push(`GET /past_webinars/${uuid}`);
      
      console.log(`[past-api] 📡 Attempting past webinars API with UUID: ${uuid}`);
      
      const response = await fetch(`https://api.zoom.us/v2/past_webinars/${uuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`[past-api] 📊 Past webinars UUID API response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const pastData = await response.json();
        console.log(`[past-api] ✅ Successfully fetched past data using UUID`);
        
        result.success = true;
        result.actualData = pastData;
        result.actualStartTime = pastData.start_time || result.actualStartTime;
        result.actualDuration = pastData.duration || result.actualDuration;
        result.actualEndTime = pastData.end_time || result.actualEndTime;
        result.participantsCount = Math.max(pastData.participants_count || 0, result.participantsCount);
        
        if (result.actualStartTime && result.actualDuration) {
          console.log(`[past-api] 🎯 Got complete timing data from UUID API`);
          return result;
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        result.errorDetails.push(`Past webinars UUID API failed: ${response.status} - ${errorText}`);
        console.warn(`[past-api] ⚠️ Past webinars UUID API failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      result.errorDetails.push(`Past webinars UUID API error: ${error.message}`);
      console.error(`[past-api] ❌ Past webinars UUID API error:`, error);
    }
  }
  
  // Strategy 3: Fallback calculation using available data
  console.log(`[past-api] 🔄 Applying fallback calculation strategy`);
  
  // Use the best available start time
  if (!result.actualStartTime) {
    result.actualStartTime = instance?.start_time || webinar.start_time || null;
    console.log(`[past-api] 📊 Using fallback start_time: ${result.actualStartTime}`);
  }
  
  // Use the best available duration
  if (!result.actualDuration) {
    result.actualDuration = instance?.duration || webinar.duration || null;
    console.log(`[past-api] 📊 Using fallback duration: ${result.actualDuration}`);
  }
  
  // Calculate end_time if we have start_time and duration
  if (!result.actualEndTime && result.actualStartTime && result.actualDuration) {
    try {
      const startDate = new Date(result.actualStartTime);
      const endDate = new Date(startDate.getTime() + (result.actualDuration * 60000));
      result.actualEndTime = endDate.toISOString();
      console.log(`[past-api] 🧮 Calculated end_time: ${result.actualEndTime}`);
      result.success = true;
    } catch (error) {
      result.errorDetails.push(`End time calculation error: ${error.message}`);
      console.error(`[past-api] ❌ Error calculating end_time:`, error);
    }
  }
  
  // Final status logging
  console.log(`[past-api] 📊 Final result summary:`);
  console.log(`[past-api]   - success: ${result.success}`);
  console.log(`[past-api]   - actualStartTime: ${result.actualStartTime}`);
  console.log(`[past-api]   - actualDuration: ${result.actualDuration}`);
  console.log(`[past-api]   - actualEndTime: ${result.actualEndTime}`);
  console.log(`[past-api]   - participantsCount: ${result.participantsCount}`);
  console.log(`[past-api]   - API calls made: ${result.apiCallsMade.join(', ')}`);
  console.log(`[past-api]   - Errors: ${result.errorDetails.length}`);
  
  if (result.errorDetails.length > 0) {
    console.warn(`[past-api] ⚠️ Errors encountered:`, result.errorDetails);
  }
  
  return result;
}
