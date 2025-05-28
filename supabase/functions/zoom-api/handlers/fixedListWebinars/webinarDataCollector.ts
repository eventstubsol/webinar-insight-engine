
import { processWebinarData, WebinarFieldMapping } from '../../utils/enhancedFieldMapper.ts';

export async function collectWebinarsFromAllSources(token: string, userId: string): Promise<WebinarFieldMapping[]> {
  console.log('🚀 Starting CORRECT webinar data collection following Zoom API documentation');
  
  const allWebinars: WebinarFieldMapping[] = [];
  
  // Strategy 1: Get recent/upcoming webinars using CORRECT endpoint
  console.log('📋 Fetching upcoming webinars using correct API endpoint...');
  try {
    const upcomingUrl = `https://api.zoom.us/v2/users/${userId}/webinars?page_size=300`;
    console.log(`📡 Calling correct upcoming API: ${upcomingUrl}`);
    
    const upcomingResponse = await fetch(upcomingUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (upcomingResponse.ok) {
      const upcomingData = await upcomingResponse.json();
      console.log(`📊 Upcoming API returned ${upcomingData.webinars?.length || 0} webinars`);
      
      if (upcomingData.webinars?.length > 0) {
        const processedUpcoming = await processWebinarData(upcomingData.webinars, 'regular');
        allWebinars.push(...processedUpcoming);
        console.log(`✅ Successfully processed ${processedUpcoming.length} upcoming webinars`);
      }
    } else {
      const errorText = await upcomingResponse.text();
      console.error(`❌ Upcoming webinars API error: ${upcomingResponse.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Error fetching upcoming webinars:', error);
  }
  
  // Strategy 2: Get historical webinars using CORRECT reporting API (if user has reporting access)
  console.log('📊 Fetching historical webinars using correct reporting API...');
  try {
    const fromDate = '2023-01-01';
    const toDate = new Date().toISOString().split('T')[0];
    const historicalUrl = `https://api.zoom.us/v2/report/users/${userId}/webinars?from=${fromDate}&to=${toDate}&page_size=300`;
    console.log(`📡 Calling correct reporting API: ${historicalUrl}`);
    
    const historicalResponse = await fetch(historicalUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (historicalResponse.ok) {
      const historicalData = await historicalResponse.json();
      console.log(`📊 Historical API returned ${historicalData.webinars?.length || 0} webinars`);
      
      if (historicalData.webinars?.length > 0) {
        const processedHistorical = await processWebinarData(historicalData.webinars, 'reporting');
        allWebinars.push(...processedHistorical);
        console.log(`✅ Successfully processed ${processedHistorical.length} historical webinars`);
      }
    } else {
      const errorText = await historicalResponse.text();
      console.error(`❌ Historical webinars API error: ${historicalResponse.status} - ${errorText}`);
      
      // Check if it's a scope issue
      if (historicalResponse.status === 403) {
        console.warn('⚠️ Missing reporting scope - this is expected for basic Zoom apps');
      }
    }
  } catch (error) {
    console.error('❌ Error fetching historical webinars:', error);
  }
  
  // REMOVED: The incorrect /v2/accounts/me/webinars endpoint that doesn't exist in Zoom API
  
  console.log(`📊 Total webinars collected: ${allWebinars.length}`);
  return allWebinars;
}
