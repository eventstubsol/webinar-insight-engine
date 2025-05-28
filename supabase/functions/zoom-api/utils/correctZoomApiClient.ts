
/**
 * Correct Zoom API client that follows the official Zoom API documentation
 * Uses proper webinar endpoints: GET /webinars/{webinarId} and GET /webinars/{webinarId}/instances
 */

export interface CorrectWebinarApiResult {
  success: boolean;
  webinarData: any | null;
  actualEndTime: string | null;
  calculatedEndTime: string | null;
  status: string;
  errorDetails: string[];
  apiCallsMade: string[];
  dataSource: 'zoom_api' | 'calculated' | 'none';
}

/**
 * Fetch webinar data using the correct Zoom API endpoints
 */
export async function fetchCorrectWebinarData(
  token: string,
  webinarId: string,
  instanceId?: string
): Promise<CorrectWebinarApiResult> {
  
  const result: CorrectWebinarApiResult = {
    success: false,
    webinarData: null,
    actualEndTime: null,
    calculatedEndTime: null,
    status: 'unknown',
    errorDetails: [],
    apiCallsMade: [],
    dataSource: 'none'
  };
  
  console.log(`[correct-api-client] 🚀 Fetching webinar data for ${webinarId}`);
  
  try {
    // Step 1: Get webinar details using the correct endpoint
    const webinarUrl = `https://api.zoom.us/v2/webinars/${webinarId}`;
    console.log(`[correct-api-client] 📡 Calling: ${webinarUrl}`);
    result.apiCallsMade.push(webinarUrl);
    
    const webinarResponse = await fetch(webinarUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!webinarResponse.ok) {
      const errorText = await webinarResponse.text().catch(() => 'Unknown error');
      result.errorDetails.push(`Webinar API error: ${webinarResponse.status} - ${errorText}`);
      console.error(`[correct-api-client] ❌ Webinar API error: ${webinarResponse.status}`);
      return result;
    }
    
    const webinarData = await webinarResponse.json();
    result.webinarData = webinarData;
    result.status = webinarData.status || 'unknown';
    
    console.log(`[correct-api-client] ✅ Got webinar data: status=${result.status}, start_time=${webinarData.start_time}`);
    
    // Step 2: Calculate end_time based on start_time + duration
    if (webinarData.start_time && webinarData.duration) {
      try {
        const startDate = new Date(webinarData.start_time);
        const endDate = new Date(startDate.getTime() + (webinarData.duration * 60000));
        result.calculatedEndTime = endDate.toISOString();
        result.dataSource = 'calculated';
        console.log(`[correct-api-client] 🧮 Calculated end_time: ${result.calculatedEndTime}`);
      } catch (error) {
        console.warn(`[correct-api-client] ⚠️ Error calculating end_time:`, error);
        result.errorDetails.push(`End time calculation error: ${error.message}`);
      }
    }
    
    // Step 3: For recurring webinars, try to get instance data
    if (webinarData.type === 6 || webinarData.type === 9) {
      console.log(`[correct-api-client] 🔄 Recurring webinar detected, fetching instances`);
      const instancesResult = await fetchWebinarInstances(token, webinarId);
      
      if (instancesResult.success && instancesResult.instances.length > 0) {
        // Find specific instance or use the most recent one
        const targetInstance = instanceId 
          ? instancesResult.instances.find(i => i.uuid === instanceId)
          : instancesResult.instances[0];
          
        if (targetInstance && targetInstance.status === 'ended') {
          // For ended instances, try to get actual timing data
          const actualData = await fetchInstanceActualData(token, webinarId, targetInstance.uuid);
          if (actualData.success) {
            result.actualEndTime = actualData.endTime;
            result.dataSource = 'zoom_api';
            console.log(`[correct-api-client] ✅ Got actual end_time from instance: ${result.actualEndTime}`);
          }
        }
      }
    }
    
    // Step 4: For single webinars that have ended, try to get actual data
    if ((webinarData.type === 5) && (webinarData.status === 'ended')) {
      console.log(`[correct-api-client] 🎯 Single ended webinar, attempting to get actual timing`);
      const actualData = await fetchSingleWebinarActualData(token, webinarData);
      if (actualData.success) {
        result.actualEndTime = actualData.endTime;
        result.dataSource = 'zoom_api';
        console.log(`[correct-api-client] ✅ Got actual end_time: ${result.actualEndTime}`);
      }
    }
    
    result.success = true;
    
    console.log(`[correct-api-client] 📊 Final result: dataSource=${result.dataSource}, actualEndTime=${result.actualEndTime}, calculatedEndTime=${result.calculatedEndTime}`);
    
  } catch (error) {
    console.error(`[correct-api-client] ❌ Network error:`, error);
    result.errorDetails.push(`Network error: ${error.message}`);
  }
  
  return result;
}

/**
 * Fetch webinar instances using the correct endpoint
 */
async function fetchWebinarInstances(token: string, webinarId: string): Promise<{ success: boolean; instances: any[] }> {
  try {
    const instancesUrl = `https://api.zoom.us/v2/webinars/${webinarId}/instances`;
    console.log(`[correct-api-client] 📡 Fetching instances: ${instancesUrl}`);
    
    const response = await fetch(instancesUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`[correct-api-client] ⚠️ Instances API error: ${response.status}`);
      return { success: false, instances: [] };
    }
    
    const data = await response.json();
    return { success: true, instances: data.instances || [] };
    
  } catch (error) {
    console.error(`[correct-api-client] ❌ Error fetching instances:`, error);
    return { success: false, instances: [] };
  }
}

/**
 * Try to get actual timing data for completed instances using past_webinars endpoint
 */
async function fetchInstanceActualData(token: string, webinarId: string, instanceUuid: string): Promise<{ success: boolean; endTime: string | null }> {
  try {
    // Only use past_webinars endpoint with confirmed instance UUID
    const pastUrl = `https://api.zoom.us/v2/past_webinars/${instanceUuid}`;
    console.log(`[correct-api-client] 📡 Fetching past data: ${pastUrl}`);
    
    const response = await fetch(pastUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn(`[correct-api-client] ⚠️ Past webinar API error: ${response.status}`);
      return { success: false, endTime: null };
    }
    
    const data = await response.json();
    
    // Calculate end time from actual start + actual duration
    if (data.start_time && data.duration) {
      const startDate = new Date(data.start_time);
      const endDate = new Date(startDate.getTime() + (data.duration * 60000));
      return { success: true, endTime: endDate.toISOString() };
    }
    
    return { success: false, endTime: null };
    
  } catch (error) {
    console.error(`[correct-api-client] ❌ Error fetching past data:`, error);
    return { success: false, endTime: null };
  }
}

/**
 * Try to get actual timing data for single webinars
 */
async function fetchSingleWebinarActualData(token: string, webinarData: any): Promise<{ success: boolean; endTime: string | null }> {
  // For single webinars, we can try using the webinar UUID if available
  if (webinarData.uuid) {
    return await fetchInstanceActualData(token, webinarData.id, webinarData.uuid);
  }
  
  return { success: false, endTime: null };
}
