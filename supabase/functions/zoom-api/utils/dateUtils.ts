
// Helper function to generate monthly date ranges for historical fetching
export function generateMonthlyDateRanges(monthsBack = 12): Array<{ from: string; to: string }> {
  const ranges = [];
  const today = new Date();
  
  console.log(`[zoom-api][monthly-ranges] Generating date ranges for ${monthsBack} months back from ${today.toISOString()}`);
  
  for (let i = 0; i < monthsBack; i++) {
    // Calculate the start of the month for i months ago
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    // Format dates as YYYY-MM-DD
    const fromDate = startOfMonth.toISOString().split('T')[0];
    const toDate = endOfMonth.toISOString().split('T')[0];
    
    ranges.push({ from: fromDate, to: toDate });
    console.log(`[zoom-api][monthly-ranges] Month ${i}: ${fromDate} to ${toDate}`);
  }
  
  return ranges;
}

// Enhanced function to fetch webinars for a specific month with detailed logging
export async function fetchWebinarsForMonth(token: string, userId: string, from: string, to: string): Promise<any[]> {
  console.log(`[zoom-api][monthly-fetch] Starting fetch for month: ${from} to ${to}`);
  
  let allWebinars = [];
  let nextPageToken = '';
  let pageNum = 1;
  let totalFetched = 0;
  
  do {
    const url = new URL(`https://api.zoom.us/v2/users/${userId}/webinars`);
    url.searchParams.append('page_size', '300');
    url.searchParams.append('from', from);
    url.searchParams.append('to', to);
    
    if (nextPageToken) {
      url.searchParams.append('next_page_token', nextPageToken);
    }
    
    console.log(`[zoom-api][monthly-fetch] API Call - URL: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[zoom-api][monthly-fetch] Error fetching month ${from}-${to}:`, errorData);
      
      // For some error codes, we should continue with other months
      if (errorData.code === 1001 || errorData.code === 3001) {
        console.log(`[zoom-api][monthly-fetch] No data available for month ${from}-${to}, continuing...`);
        return [];
      }
      
      throw new Error(`Failed to fetch webinars for ${from} to ${to}: ${errorData.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    const webinars = data.webinars || [];
    
    console.log(`[zoom-api][monthly-fetch] Month ${from}-${to}, Page ${pageNum}: fetched ${webinars.length} webinars, total_records: ${data.total_records || 'unknown'}`);
    
    if (webinars.length > 0) {
      console.log(`[zoom-api][monthly-fetch] Sample webinar IDs from this page:`, webinars.slice(0, 3).map(w => `${w.id} (${w.start_time})`));
    }
    
    allWebinars = allWebinars.concat(webinars);
    totalFetched += webinars.length;
    nextPageToken = data.next_page_token || '';
    pageNum++;
    
  } while (nextPageToken);
  
  console.log(`[zoom-api][monthly-fetch] Completed month ${from}-${to}: ${totalFetched} total webinars`);
  return allWebinars;
}
