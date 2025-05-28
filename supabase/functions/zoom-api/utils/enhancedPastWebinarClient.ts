
/**
 * Enhanced Past Webinar API Client that comprehensively fetches actual webinar data
 * Following Zoom API documentation: https://developers.zoom.us/docs/api/meetings/#tag/webinars/
 */

export interface PastWebinarResult {
  success: boolean;
  pastData: any | null;
  participantsCount: number;
  registrantsCount: number;
  actualStartTime: string | null;
  actualDuration: number | null;
  actualEndTime: string | null;
  status: string | null;
  apiCallsMade: string[];
  errorDetails: string[];
  identifiersUsed: string[];
}

/**
 * Fetch comprehensive past webinar data using multiple API endpoints
 */
export async function fetchComprehensivePastWebinarData(
  token: string,
  webinar: any,
  instance: any = null
): Promise<PastWebinarResult> {
  
  console.log(`[enhanced-past-client] 🔄 Fetching comprehensive past data for webinar ${webinar.id}`);
  
  const result: PastWebinarResult = {
    success: false,
    pastData: null,
    participantsCount: 0,
    registrantsCount: 0,
    actualStartTime: null,
    actualDuration: null,
    actualEndTime: null,
    status: null,
    apiCallsMade: [],
    errorDetails: [],
    identifiersUsed: []
  };
  
  // Strategy 1: Try with webinar UUID (most reliable for past webinars)
  if (webinar.uuid) {
    await tryPastWebinarAPI(token, webinar.uuid, 'webinar_uuid', result);
    if (result.success && result.pastData) {
      return result;
    }
  }
  
  // Strategy 2: Try with instance UUID if available
  if (instance?.uuid) {
    await tryPastWebinarAPI(token, instance.uuid, 'instance_uuid', result);
    if (result.success && result.pastData) {
      return result;
    }
  }
  
  // Strategy 3: Try with webinar ID
  if (webinar.id) {
    await tryPastWebinarAPI(token, webinar.id.toString(), 'webinar_id', result);
    if (result.success && result.pastData) {
      return result;
    }
  }
  
  // Strategy 4: Try webinar reports API (for completed webinars)
  if (webinar.status === 'ended' || webinar.status === 'aborted') {
    await tryWebinarReportsAPI(token, webinar.id.toString(), result);
  }
  
  console.log(`[enhanced-past-client] 📊 Final result summary:`);
  console.log(`[enhanced-past-client]   - success: ${result.success}`);
  console.log(`[enhanced-past-client]   - actualStartTime: ${result.actualStartTime}`);
  console.log(`[enhanced-past-client]   - actualDuration: ${result.actualDuration}`);
  console.log(`[enhanced-past-client]   - actualEndTime: ${result.actualEndTime}`);
  console.log(`[enhanced-past-client]   - participantsCount: ${result.participantsCount}`);
  console.log(`[enhanced-past-client]   - apiCallsMade: ${result.apiCallsMade.length}`);
  console.log(`[enhanced-past-client]   - errorDetails: ${result.errorDetails.length}`);
  
  return result;
}

/**
 * Try the past webinars API with a specific identifier
 */
async function tryPastWebinarAPI(
  token: string,
  identifier: string,
  identifierType: string,
  result: PastWebinarResult
): Promise<void> {
  
  console.log(`[enhanced-past-client] 📡 Trying past webinars API with ${identifierType}: ${identifier}`);
  
  result.identifiersUsed.push(`${identifierType}:${identifier}`);
  result.apiCallsMade.push(`GET /past_webinars/${identifier}`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/past_webinars/${identifier}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[enhanced-past-client] 📊 Past webinars API response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const pastData = await response.json();
      console.log(`[enhanced-past-client] ✅ Successfully fetched past data using ${identifierType}`);
      
      // Extract comprehensive data from past webinar response
      result.success = true;
      result.pastData = pastData;
      result.actualStartTime = pastData.start_time || null;
      result.actualDuration = pastData.duration || null;
      result.actualEndTime = pastData.end_time || null;
      result.status = pastData.status || null;
      result.participantsCount = pastData.participants_count || pastData.participant_count || 0;
      result.registrantsCount = pastData.registrants_count || pastData.registrant_count || 0;
      
      console.log(`[enhanced-past-client] 📊 Extracted from past data:`);
      console.log(`[enhanced-past-client]   - start_time: ${result.actualStartTime}`);
      console.log(`[enhanced-past-client]   - duration: ${result.actualDuration}`);
      console.log(`[enhanced-past-client]   - end_time: ${result.actualEndTime}`);
      console.log(`[enhanced-past-client]   - status: ${result.status}`);
      console.log(`[enhanced-past-client]   - participants_count: ${result.participantsCount}`);
      console.log(`[enhanced-past-client]   - registrants_count: ${result.registrantsCount}`);
      
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      const errorMessage = `Past webinars API (${identifierType}) failed: ${response.status} - ${errorText}`;
      result.errorDetails.push(errorMessage);
      console.warn(`[enhanced-past-client] ⚠️ ${errorMessage}`);
    }
  } catch (error) {
    const errorMessage = `Past webinars API (${identifierType}) error: ${error.message}`;
    result.errorDetails.push(errorMessage);
    console.error(`[enhanced-past-client] ❌ ${errorMessage}`);
  }
}

/**
 * Try the webinar reports API for additional data
 */
async function tryWebinarReportsAPI(
  token: string,
  webinarId: string,
  result: PastWebinarResult
): Promise<void> {
  
  console.log(`[enhanced-past-client] 📡 Trying webinar reports API for webinar ${webinarId}`);
  
  result.apiCallsMade.push(`GET /report/webinars/${webinarId}`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/report/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[enhanced-past-client] 📊 Webinar reports API response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const reportData = await response.json();
      console.log(`[enhanced-past-client] ✅ Successfully fetched report data`);
      
      // Merge report data with existing data (reports API may have additional insights)
      if (!result.success || !result.pastData) {
        result.success = true;
        result.pastData = reportData;
      }
      
      // Update with any additional data from reports
      result.actualStartTime = result.actualStartTime || reportData.start_time || null;
      result.actualDuration = result.actualDuration || reportData.duration || null;
      result.actualEndTime = result.actualEndTime || reportData.end_time || null;
      result.status = result.status || reportData.status || null;
      result.participantsCount = Math.max(result.participantsCount, reportData.participants_count || reportData.participant_count || 0);
      result.registrantsCount = Math.max(result.registrantsCount, reportData.registrants_count || reportData.registrant_count || 0);
      
      console.log(`[enhanced-past-client] 📊 Enhanced data with reports API`);
      
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      const errorMessage = `Webinar reports API failed: ${response.status} - ${errorText}`;
      result.errorDetails.push(errorMessage);
      console.warn(`[enhanced-past-client] ⚠️ ${errorMessage}`);
    }
  } catch (error) {
    const errorMessage = `Webinar reports API error: ${error.message}`;
    result.errorDetails.push(errorMessage);
    console.error(`[enhanced-past-client] ❌ ${errorMessage}`);
  }
}
