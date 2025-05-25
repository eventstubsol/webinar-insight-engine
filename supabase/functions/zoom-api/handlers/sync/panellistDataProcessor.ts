
// Enhanced helper function to get panelist information
export async function enhanceWebinarsWithPanelistData(webinars: any[], token: string) {
  console.log(`[zoom-api][panelist-processor] Enhancing ${webinars.length} webinars with panelist information`);
  
  const enhancedWebinars = [];
  
  for (const webinar of webinars) {
    let panelistData = webinar.panelists || [];
    
    // If webinar has a specific endpoint for panelists, fetch detailed info
    if (webinar.id) {
      console.log(`[zoom-api][panelist-processor] Fetching panelist info for webinar ${webinar.id}`);
      
      try {
        const panelistResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/panelists`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (panelistResponse.ok) {
          const panelistResponseData = await panelistResponse.json();
          panelistData = panelistResponseData.panelists || [];
          console.log(`[zoom-api][panelist-processor] Successfully fetched ${panelistData.length} panelists for webinar ${webinar.id}`);
        } else {
          console.log(`[zoom-api][panelist-processor] No panelists endpoint or error for webinar ${webinar.id}: ${panelistResponse.status}`);
        }
      } catch (error) {
        console.log(`[zoom-api][panelist-processor] Error fetching panelists for webinar ${webinar.id}:`, error);
      }
    }
    
    // Add the enhanced panelist information to the webinar object
    enhancedWebinars.push({
      ...webinar,
      panelists: panelistData,
      panelists_count: panelistData.length
    });
  }
  
  return enhancedWebinars;
}
