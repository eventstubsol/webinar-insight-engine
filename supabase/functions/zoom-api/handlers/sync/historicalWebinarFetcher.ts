
/**
 * CRITICAL FIX: Historical webinar data fetcher using proper Zoom API endpoints
 * Addresses the root cause: wrong API endpoints for past/completed webinars
 */

export interface HistoricalWebinarResult {
  webinars: any[];
  totalRetrieved: number;
  sourceEndpoints: string[];
  apiCallsMade: number;
  fieldMappingDebug: any[];
}

/**
 * FIXED: Fetch historical webinars using Zoom's reporting API
 * This is the correct endpoint for past/completed webinars
 */
export async function fetchHistoricalWebinars(
  token: string, 
  userId: string,
  fromDate: string = '2023-01-01',
  toDate: string = new Date().toISOString().split('T')[0]
): Promise<HistoricalWebinarResult> {
  
  console.log(`[historical-fetcher] 🔍 CRITICAL FIX: Fetching historical webinars from reporting API`);
  console.log(`[historical-fetcher] Date range: ${fromDate} to ${toDate}`);
  
  const result: HistoricalWebinarResult = {
    webinars: [],
    totalRetrieved: 0,
    sourceEndpoints: [],
    apiCallsMade: 0,
    fieldMappingDebug: []
  };
  
  // STRATEGY 1: Use Zoom's Reporting API for historical data (CORRECT ENDPOINT)
  const reportingUrl = `https://api.zoom.us/v2/report/users/${userId}/webinars?from=${fromDate}&to=${toDate}&page_size=300`;
  
  try {
    console.log(`[historical-fetcher] 📡 Calling reporting API: ${reportingUrl}`);
    result.sourceEndpoints.push(reportingUrl);
    result.apiCallsMade++;
    
    const response = await fetch(reportingUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[historical-fetcher] Reporting API status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      
      // DEBUG: Log actual API response structure
      console.log(`[historical-fetcher] 🔍 REPORTING API RESPONSE DEBUG:`);
      console.log(`[historical-fetcher] Response keys: ${Object.keys(data).join(', ')}`);
      console.log(`[historical-fetcher] Webinars count: ${data.webinars?.length || 0}`);
      
      if (data.webinars && data.webinars.length > 0) {
        // DEBUG: Log first webinar structure for field mapping
        const firstWebinar = data.webinars[0];
        console.log(`[historical-fetcher] 🔍 FIRST HISTORICAL WEBINAR STRUCTURE:`);
        console.log(`[historical-fetcher] Available fields: ${Object.keys(firstWebinar).join(', ')}`);
        console.log(`[historical-fetcher] Sample data:`, JSON.stringify(firstWebinar, null, 2));
        
        result.fieldMappingDebug.push({
          source: 'reporting_api',
          availableFields: Object.keys(firstWebinar),
          sampleData: firstWebinar
        });
        
        // FIXED: Proper field mapping based on reporting API structure
        const processedHistoricalWebinars = data.webinars.map(webinar => {
          // Fix topic field mapping issue (addressing "Untitled Webinar" problem)
          const topic = webinar.topic || webinar.title || webinar.subject || webinar.webinar_name || 'Historical Webinar';
          
          console.log(`[historical-fetcher] 📊 Processing historical webinar:`);
          console.log(`[historical-fetcher]   - ID: ${webinar.id || webinar.webinar_id}`);
          console.log(`[historical-fetcher]   - Original topic field: ${webinar.topic}`);
          console.log(`[historical-fetcher]   - Mapped topic: ${topic}`);
          console.log(`[historical-fetcher]   - Start time: ${webinar.start_time}`);
          console.log(`[historical-fetcher]   - End time: ${webinar.end_time}`);
          console.log(`[historical-fetcher]   - Duration: ${webinar.duration}`);
          console.log(`[historical-fetcher]   - Participants: ${webinar.participants_count}`);
          
          return {
            ...webinar,
            topic: topic,
            // Mark as historical data
            _data_source: 'reporting_api',
            _is_historical: true,
            // Ensure we have actual timing data for completed webinars
            actual_start_time: webinar.start_time,
            actual_end_time: webinar.end_time,
            actual_duration: webinar.duration,
            participants_count: webinar.participants_count,
            status: 'ended' // Historical webinars are completed by definition
          };
        });
        
        result.webinars.push(...processedHistoricalWebinars);
        result.totalRetrieved += processedHistoricalWebinars.length;
        
        console.log(`[historical-fetcher] ✅ Successfully fetched ${processedHistoricalWebinars.length} historical webinars`);
      } else {
        console.log(`[historical-fetcher] ⚠️ No historical webinars found in reporting API`);
      }
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error(`[historical-fetcher] ❌ Reporting API error: ${response.status} - ${errorData.message}`);
      
      // Check if it's a scope issue
      if (response.status === 403) {
        console.error(`[historical-fetcher] 🚨 SCOPE ERROR: Missing 'report:read:admin' scope for historical data`);
        throw new Error('Missing required OAuth scope: report:read:admin. Please update your Zoom app permissions.');
      }
    }
  } catch (error) {
    console.error(`[historical-fetcher] ❌ Error fetching historical webinars:`, error);
    throw error;
  }
  
  return result;
}

/**
 * FIXED: Fetch upcoming/scheduled webinars using standard API
 * This endpoint is correct for future webinars
 */
export async function fetchUpcomingWebinars(token: string, userId: string): Promise<HistoricalWebinarResult> {
  console.log(`[historical-fetcher] 📅 Fetching upcoming webinars from standard API`);
  
  const result: HistoricalWebinarResult = {
    webinars: [],
    totalRetrieved: 0,
    sourceEndpoints: [],
    apiCallsMade: 0,
    fieldMappingDebug: []
  };
  
  const upcomingUrl = `https://api.zoom.us/v2/users/${userId}/webinars?page_size=300`;
  
  try {
    console.log(`[historical-fetcher] 📡 Calling standard API: ${upcomingUrl}`);
    result.sourceEndpoints.push(upcomingUrl);
    result.apiCallsMade++;
    
    const response = await fetch(upcomingUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[historical-fetcher] Standard API status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      
      // DEBUG: Log actual API response structure
      console.log(`[historical-fetcher] 🔍 STANDARD API RESPONSE DEBUG:`);
      console.log(`[historical-fetcher] Response keys: ${Object.keys(data).join(', ')}`);
      console.log(`[historical-fetcher] Webinars count: ${data.webinars?.length || 0}`);
      
      if (data.webinars && data.webinars.length > 0) {
        // DEBUG: Log first webinar structure for field mapping
        const firstWebinar = data.webinars[0];
        console.log(`[historical-fetcher] 🔍 FIRST UPCOMING WEBINAR STRUCTURE:`);
        console.log(`[historical-fetcher] Available fields: ${Object.keys(firstWebinar).join(', ')}`);
        console.log(`[historical-fetcher] Sample data:`, JSON.stringify(firstWebinar, null, 2));
        
        result.fieldMappingDebug.push({
          source: 'standard_api',
          availableFields: Object.keys(firstWebinar),
          sampleData: firstWebinar
        });
        
        // FIXED: Proper field mapping based on standard API structure
        const processedUpcomingWebinars = data.webinars.map(webinar => {
          // Fix topic field mapping issue
          const topic = webinar.topic || webinar.title || webinar.subject || webinar.webinar_name || 'Upcoming Webinar';
          
          console.log(`[historical-fetcher] 📊 Processing upcoming webinar:`);
          console.log(`[historical-fetcher]   - ID: ${webinar.id}`);
          console.log(`[historical-fetcher]   - Original topic field: ${webinar.topic}`);
          console.log(`[historical-fetcher]   - Mapped topic: ${topic}`);
          console.log(`[historical-fetcher]   - Start time: ${webinar.start_time}`);
          console.log(`[historical-fetcher]   - Status: ${webinar.status}`);
          
          return {
            ...webinar,
            topic: topic,
            // Mark as upcoming data
            _data_source: 'standard_api',
            _is_historical: false
          };
        });
        
        result.webinars.push(...processedUpcomingWebinars);
        result.totalRetrieved += processedUpcomingWebinars.length;
        
        console.log(`[historical-fetcher] ✅ Successfully fetched ${processedUpcomingWebinars.length} upcoming webinars`);
      } else {
        console.log(`[historical-fetcher] ⚠️ No upcoming webinars found in standard API`);
      }
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error(`[historical-fetcher] ❌ Standard API error: ${response.status} - ${errorData.message}`);
    }
  } catch (error) {
    console.error(`[historical-fetcher] ❌ Error fetching upcoming webinars:`, error);
    throw error;
  }
  
  return result;
}

/**
 * COMPREHENSIVE FIX: Combine historical and upcoming webinars
 */
export async function fetchAllWebinarsWithProperEndpoints(
  token: string, 
  userId: string
): Promise<HistoricalWebinarResult> {
  console.log(`[historical-fetcher] 🚀 COMPREHENSIVE FIX: Starting dual-endpoint webinar fetch`);
  
  const combinedResult: HistoricalWebinarResult = {
    webinars: [],
    totalRetrieved: 0,
    sourceEndpoints: [],
    apiCallsMade: 0,
    fieldMappingDebug: []
  };
  
  try {
    // PHASE 1: Fetch historical webinars (past 2 years)
    const historicalEndDate = new Date().toISOString().split('T')[0];
    const historicalStartDate = new Date(Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    console.log(`[historical-fetcher] 📊 PHASE 1: Fetching historical webinars (${historicalStartDate} to ${historicalEndDate})`);
    const historicalResult = await fetchHistoricalWebinars(token, userId, historicalStartDate, historicalEndDate);
    
    // PHASE 2: Fetch upcoming webinars
    console.log(`[historical-fetcher] 📅 PHASE 2: Fetching upcoming webinars`);
    const upcomingResult = await fetchUpcomingWebinars(token, userId);
    
    // Combine results
    combinedResult.webinars = [...historicalResult.webinars, ...upcomingResult.webinars];
    combinedResult.totalRetrieved = historicalResult.totalRetrieved + upcomingResult.totalRetrieved;
    combinedResult.sourceEndpoints = [...historicalResult.sourceEndpoints, ...upcomingResult.sourceEndpoints];
    combinedResult.apiCallsMade = historicalResult.apiCallsMade + upcomingResult.apiCallsMade;
    combinedResult.fieldMappingDebug = [...historicalResult.fieldMappingDebug, ...upcomingResult.fieldMappingDebug];
    
    console.log(`[historical-fetcher] 🎉 COMPREHENSIVE FETCH COMPLETE:`);
    console.log(`[historical-fetcher]   - Historical webinars: ${historicalResult.totalRetrieved}`);
    console.log(`[historical-fetcher]   - Upcoming webinars: ${upcomingResult.totalRetrieved}`);
    console.log(`[historical-fetcher]   - Total webinars: ${combinedResult.totalRetrieved}`);
    console.log(`[historical-fetcher]   - API calls made: ${combinedResult.apiCallsMade}`);
    console.log(`[historical-fetcher]   - Endpoints used: ${combinedResult.sourceEndpoints.join(', ')}`);
    
    return combinedResult;
    
  } catch (error) {
    console.error(`[historical-fetcher] ❌ Error in comprehensive fetch:`, error);
    throw error;
  }
}
