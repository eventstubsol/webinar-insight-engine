
/**
 * Enhanced Past Webinar API Client with comprehensive data extraction
 */

interface ComprehensivePastDataResult {
  success: boolean;
  pastData: any;
  actualStartTime: string | null;
  actualDuration: number | null;
  actualEndTime: string | null;
  participantsCount: number;
  registrantsCount: number;
  status: string | null;
  apiCallsAttempted: string[];
  dataSource: string;
  errorDetails: string[];
}

/**
 * Fetch comprehensive past webinar data with all possible timing and participant information
 */
export async function fetchComprehensivePastWebinarData(
  token: string, 
  webinar: any, 
  instance: any = null
): Promise<{ success: boolean; pastData: any }> {
  console.log(`[comprehensive-past-api] 🔄 Fetching comprehensive past data for webinar ${webinar.id}`);
  
  const result: ComprehensivePastDataResult = {
    success: false,
    pastData: null,
    actualStartTime: null,
    actualDuration: null,
    actualEndTime: null,
    participantsCount: 0,
    registrantsCount: 0,
    status: null,
    apiCallsAttempted: [],
    dataSource: 'none',
    errorDetails: []
  };
  
  // Strategy 1: Past webinar API with webinar ID
  try {
    const webinarId = webinar.id;
    result.apiCallsAttempted.push(`GET /past_webinars/${webinarId}`);
    
    console.log(`[comprehensive-past-api] 📡 Fetching past webinar data for ID: ${webinarId}`);
    
    const response = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const pastData = await response.json();
      console.log(`[comprehensive-past-api] ✅ Successfully fetched comprehensive past data`);
      
      result.success = true;
      result.pastData = pastData;
      result.actualStartTime = pastData.start_time || null;
      result.actualDuration = pastData.duration || null;
      result.actualEndTime = pastData.end_time || null;
      result.participantsCount = pastData.participants_count || 0;
      result.registrantsCount = pastData.registrants_count || 0;
      result.status = pastData.status || null;
      result.dataSource = 'past_webinar_api';
      
      console.log(`[comprehensive-past-api] 📊 Comprehensive data extracted:`);
      console.log(`[comprehensive-past-api]   - actualStartTime: ${result.actualStartTime}`);
      console.log(`[comprehensive-past-api]   - actualDuration: ${result.actualDuration}`);
      console.log(`[comprehensive-past-api]   - actualEndTime: ${result.actualEndTime}`);
      console.log(`[comprehensive-past-api]   - participantsCount: ${result.participantsCount}`);
      console.log(`[comprehensive-past-api]   - registrantsCount: ${result.registrantsCount}`);
      console.log(`[comprehensive-past-api]   - status: ${result.status}`);
      
      return { success: true, pastData };
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      result.errorDetails.push(`Past webinars API failed: ${response.status} - ${errorText}`);
      console.warn(`[comprehensive-past-api] ⚠️ Past webinars API failed: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    result.errorDetails.push(`Past webinars API error: ${error.message}`);
    console.error(`[comprehensive-past-api] ❌ Past webinars API error:`, error);
  }
  
  // Strategy 2: Try with UUID if available
  if (webinar.uuid && webinar.uuid !== webinar.id) {
    try {
      const uuid = webinar.uuid;
      result.apiCallsAttempted.push(`GET /past_webinars/${uuid}`);
      
      console.log(`[comprehensive-past-api] 📡 Trying past webinar API with UUID: ${uuid}`);
      
      const response = await fetch(`https://api.zoom.us/v2/past_webinars/${uuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const pastData = await response.json();
        console.log(`[comprehensive-past-api] ✅ Successfully fetched past data using UUID`);
        
        result.success = true;
        result.pastData = pastData;
        result.dataSource = 'past_webinar_api_uuid';
        
        return { success: true, pastData };
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        result.errorDetails.push(`Past webinars UUID API failed: ${response.status} - ${errorText}`);
        console.warn(`[comprehensive-past-api] ⚠️ Past webinars UUID API failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      result.errorDetails.push(`Past webinars UUID API error: ${error.message}`);
      console.error(`[comprehensive-past-api] ❌ Past webinars UUID API error:`, error);
    }
  }
  
  console.log(`[comprehensive-past-api] ❌ Failed to fetch comprehensive past data`);
  console.log(`[comprehensive-past-api] 📊 Errors encountered: ${result.errorDetails.length}`);
  result.errorDetails.forEach((error, index) => {
    console.log(`[comprehensive-past-api]   ${index + 1}. ${error}`);
  });
  
  return { success: false, pastData: null };
}
