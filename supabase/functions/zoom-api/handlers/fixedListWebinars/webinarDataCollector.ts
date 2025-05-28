
import { processWebinarData, WebinarFieldMapping } from '../../utils/enhancedFieldMapper.ts';

export async function collectWebinarsFromAllSources(token: string, userId: string): Promise<WebinarFieldMapping[]> {
  console.log('🚀 Starting webinar data collection from all sources');
  
  const allWebinars: WebinarFieldMapping[] = [];
  
  // Strategy 1: Get recent/upcoming webinars
  console.log('📋 Fetching upcoming webinars...');
  try {
    const upcomingUrl = `https://api.zoom.us/v2/users/${userId}/webinars?page_size=300`;
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
      }
    } else {
      console.error('❌ Upcoming webinars API error:', upcomingResponse.status, await upcomingResponse.text());
    }
  } catch (error) {
    console.error('❌ Error fetching upcoming webinars:', error);
  }
  
  // Strategy 2: Get historical webinars using reporting API
  console.log('📊 Fetching historical webinars...');
  try {
    const fromDate = '2023-01-01';
    const toDate = new Date().toISOString().split('T')[0];
    const historicalUrl = `https://api.zoom.us/v2/report/users/${userId}/webinars?from=${fromDate}&to=${toDate}&page_size=300`;
    
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
      }
    } else {
      console.error('❌ Historical webinars API error:', historicalResponse.status, await historicalResponse.text());
    }
  } catch (error) {
    console.error('❌ Error fetching historical webinars:', error);
  }
  
  // Strategy 3: Try account-level webinars
  console.log('🏢 Fetching account webinars...');
  try {
    const accountUrl = `https://api.zoom.us/v2/accounts/me/webinars?page_size=300`;
    const accountResponse = await fetch(accountUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (accountResponse.ok) {
      const accountData = await accountResponse.json();
      console.log(`📊 Account API returned ${accountData.webinars?.length || 0} webinars`);
      
      if (accountData.webinars?.length > 0) {
        const processedAccount = await processWebinarData(accountData.webinars, 'account');
        allWebinars.push(...processedAccount);
      }
    } else {
      console.error('❌ Account webinars API error:', accountResponse.status, await accountResponse.text());
    }
  } catch (error) {
    console.error('❌ Error fetching account webinars:', error);
  }
  
  console.log(`📊 Total webinars collected: ${allWebinars.length}`);
  return allWebinars;
}
