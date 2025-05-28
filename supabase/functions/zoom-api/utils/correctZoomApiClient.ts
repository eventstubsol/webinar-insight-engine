
/**
 * CORRECT Zoom API client that follows official documentation
 * https://developers.zoom.us/docs/api/meetings/#tag/webinars/
 */

export interface CorrectWebinarDataResult {
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
 * FIXED: Fetch webinar data using correct Zoom API endpoints
 */
export async function fetchCorrectWebinarData(
  token: string, 
  webinarId: string, 
  instanceUuid?: string
): Promise<CorrectWebinarDataResult> {
  
  const result: CorrectWebinarDataResult = {
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
    console.log(`[correct-api-client] 📡 Fetching webinar data for ${webinarId} using CORRECT endpoints`);
    
    // STEP 1: Get webinar details using correct endpoint
    const webinarUrl = `https://api.zoom.us/v2/webinars/${webinarId}`;
    console.log(`[correct-api-client] 📡 Calling: GET ${webinarUrl}`);
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
      result.success = true;
      result.status = webinarData.status || 'unknown';
      
      console.log(`[correct-api-client] ✅ Got webinar data: ${webinarData.topic} (${webinarData.status})`);
      
      // STEP 2: Calculate end_time from start_time + duration
      if (webinarData.start_time && webinarData.duration) {
        try {
          const startDate = new Date(webinarData.start_time);
          const endDate = new Date(startDate.getTime() + (webinarData.duration * 60000));
          result.calculatedEndTime = endDate.toISOString();
          result.dataSource = 'calculated_from_schedule';
          
          console.log(`[correct-api-client] 🧮 Calculated end_time: ${result.calculatedEndTime}`);
        } catch (error) {
          console.warn(`[correct-api-client] ⚠️ Failed to calculate end_time:`, error);
          result.errorDetails.push(`Failed to calculate end_time: ${error.message}`);
        }
      }
      
      // STEP 3: For recurring webinars, try to get instances
      if (webinarData.type === 6 || webinarData.type === 9) {
        console.log(`[correct-api-client] 🔄 Recurring webinar detected, fetching instances`);
        
        const instancesUrl = `https://api.zoom.us/v2/webinars/${webinarId}/instances`;
        console.log(`[correct-api-client] 📡 Calling: GET ${instancesUrl}`);
        result.apiCallsMade.push(`GET ${instancesUrl}`);
        
        try {
          const instancesResponse = await fetch(instancesUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (instancesResponse.ok) {
            const instancesData = await instancesResponse.json();
            console.log(`[correct-api-client] ✅ Got ${instancesData.instances?.length || 0} instances`);
            
            // If we have a specific instance UUID, find it
            if (instanceUuid && instancesData.instances) {
              const specificInstance = instancesData.instances.find(
                (inst: any) => inst.uuid === instanceUuid
              );
              
              if (specificInstance && specificInstance.start_time && specificInstance.duration) {
                const instStartDate = new Date(specificInstance.start_time);
                const instEndDate = new Date(instStartDate.getTime() + (specificInstance.duration * 60000));
                result.calculatedEndTime = instEndDate.toISOString();
                result.dataSource = 'calculated_from_instance';
                
                console.log(`[correct-api-client] 🎯 Used specific instance for calculation: ${result.calculatedEndTime}`);
              }
            }
          } else {
            const errorText = await instancesResponse.text();
            console.warn(`[correct-api-client] ⚠️ Instances API failed: ${instancesResponse.status} - ${errorText}`);
            result.errorDetails.push(`Instances API failed: ${instancesResponse.status}`);
          }
        } catch (error) {
          console.warn(`[correct-api-client] ⚠️ Error fetching instances:`, error);
          result.errorDetails.push(`Error fetching instances: ${error.message}`);
        }
      }
      
    } else {
      const errorText = await webinarResponse.text();
      const errorMsg = `Webinar API failed: ${webinarResponse.status} - ${errorText}`;
      console.error(`[correct-api-client] ❌ ${errorMsg}`);
      result.errorDetails.push(errorMsg);
    }
    
  } catch (error) {
    const errorMsg = `Error in fetchCorrectWebinarData: ${error.message}`;
    console.error(`[correct-api-client] ❌ ${errorMsg}`);
    result.errorDetails.push(errorMsg);
  }
  
  console.log(`[correct-api-client] 📊 Final result:`, {
    success: result.success,
    dataSource: result.dataSource,
    hasCalculatedEndTime: !!result.calculatedEndTime,
    apiCallsCount: result.apiCallsMade.length,
    errorsCount: result.errorDetails.length
  });
  
  return result;
}
