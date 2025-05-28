
/**
 * Correct Zoom API client that follows the official documentation
 * https://developers.zoom.us/docs/api/meetings/#tag/webinars/
 */

export interface ZoomApiResult {
  success: boolean;
  webinarData: any | null;
  actualEndTime: string | null;
  calculatedEndTime: string | null;
  dataSource: string;
  status: string;
  apiCallsMade: string[];
  errorDetails: string[];
}

/**
 * Fetches webinar data using the correct Zoom API endpoints
 */
export async function fetchCorrectWebinarData(
  token: string, 
  webinarId: string, 
  instanceUuid?: string
): Promise<ZoomApiResult> {
  
  console.log(`[correct-zoom-api] 📡 Fetching data for webinar ${webinarId}${instanceUuid ? `, instance ${instanceUuid}` : ''}`);
  
  const result: ZoomApiResult = {
    success: false,
    webinarData: null,
    actualEndTime: null,
    calculatedEndTime: null,
    dataSource: 'none',
    status: 'unknown',
    apiCallsMade: [],
    errorDetails: []
  };
  
  try {
    // Step 1: Get webinar details using the correct endpoint
    const webinarUrl = `https://api.zoom.us/v2/webinars/${webinarId}`;
    console.log(`[correct-zoom-api] 📡 Calling webinar API: ${webinarUrl}`);
    result.apiCallsMade.push(`GET ${webinarUrl}`);
    
    const webinarResponse = await fetch(webinarUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (webinarResponse.ok) {
      const webinarData = await webinarResponse.json();
      result.webinarData = webinarData;
      result.status = webinarData.status || 'unknown';
      result.success = true;
      
      console.log(`[correct-zoom-api] ✅ Webinar API success: status=${result.status}`);
      
      // Calculate end time if we have start time and duration
      if (webinarData.start_time && webinarData.duration) {
        try {
          const startDate = new Date(webinarData.start_time);
          const endDate = new Date(startDate.getTime() + (webinarData.duration * 60000));
          result.calculatedEndTime = endDate.toISOString();
          result.dataSource = 'calculated_from_api';
          
          console.log(`[correct-zoom-api] 🧮 Calculated end_time: ${result.calculatedEndTime}`);
        } catch (error) {
          console.warn(`[correct-zoom-api] ⚠️ Error calculating end_time:`, error);
          result.errorDetails.push(`Failed to calculate end_time: ${error.message}`);
        }
      } else {
        console.warn(`[correct-zoom-api] ⚠️ Missing start_time or duration for calculation`);
        result.errorDetails.push('Missing start_time or duration for end_time calculation');
      }
      
    } else {
      const errorText = await webinarResponse.text();
      const errorMessage = `Webinar API failed: ${webinarResponse.status} - ${errorText}`;
      console.error(`[correct-zoom-api] ❌ ${errorMessage}`);
      result.errorDetails.push(errorMessage);
    }
    
    // Step 2: If we have an instance UUID, try to get instance-specific data
    if (instanceUuid && result.success) {
      console.log(`[correct-zoom-api] 📡 Attempting to fetch instance-specific data for ${instanceUuid}`);
      
      // Try to get past webinar data for actual timing
      const pastWebinarUrl = `https://api.zoom.us/v2/past_webinars/${instanceUuid}`;
      console.log(`[correct-zoom-api] 📡 Calling past webinar API: ${pastWebinarUrl}`);
      result.apiCallsMade.push(`GET ${pastWebinarUrl}`);
      
      try {
        const pastResponse = await fetch(pastWebinarUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (pastResponse.ok) {
          const pastData = await pastResponse.json();
          
          if (pastData.end_time) {
            result.actualEndTime = pastData.end_time;
            result.dataSource = 'past_webinar_api';
            console.log(`[correct-zoom-api] ✅ Got actual end_time from past webinar API: ${result.actualEndTime}`);
          }
          
          if (pastData.start_time && pastData.duration) {
            // Update calculated end time with actual data
            try {
              const startDate = new Date(pastData.start_time);
              const endDate = new Date(startDate.getTime() + (pastData.duration * 60000));
              result.calculatedEndTime = endDate.toISOString();
              result.dataSource = 'calculated_from_past_api';
              console.log(`[correct-zoom-api] 🧮 Updated calculated end_time from past data: ${result.calculatedEndTime}`);
            } catch (error) {
              console.warn(`[correct-zoom-api] ⚠️ Error calculating end_time from past data:`, error);
            }
          }
          
        } else {
          const errorText = await pastResponse.text();
          console.warn(`[correct-zoom-api] ⚠️ Past webinar API failed: ${pastResponse.status} - ${errorText}`);
          result.errorDetails.push(`Past webinar API failed: ${pastResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.warn(`[correct-zoom-api] ⚠️ Error calling past webinar API:`, error);
        result.errorDetails.push(`Past webinar API error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error(`[correct-zoom-api] ❌ Error in fetchCorrectWebinarData:`, error);
    result.errorDetails.push(`General error: ${error.message}`);
  }
  
  console.log(`[correct-zoom-api] 📊 Final result summary:`);
  console.log(`[correct-zoom-api]   - success: ${result.success}`);
  console.log(`[correct-zoom-api]   - dataSource: ${result.dataSource}`);
  console.log(`[correct-zoom-api]   - actualEndTime: ${result.actualEndTime}`);
  console.log(`[correct-zoom-api]   - calculatedEndTime: ${result.calculatedEndTime}`);
  console.log(`[correct-zoom-api]   - apiCallsMade: ${result.apiCallsMade.length}`);
  console.log(`[correct-zoom-api]   - errorDetails: ${result.errorDetails.length}`);
  
  return result;
}
