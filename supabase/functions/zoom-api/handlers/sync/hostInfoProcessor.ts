
// Enhanced helper function to get host information for batch processing
export async function enhanceWebinarsWithHostInfo(webinars: any[], token: string) {
  console.log(`[zoom-api][host-processor] Enhancing ${webinars.length} webinars with host information`);
  
  const enhancedWebinars = [];
  
  for (const webinar of webinars) {
    let hostEmail = webinar.host_email;
    let hostId = webinar.host_id;
    
    // If host_email is missing but we have host_id, fetch it
    if (!hostEmail && hostId) {
      console.log(`[zoom-api][host-processor] Fetching host info for webinar ${webinar.id}, host_id: ${hostId}`);
      
      try {
        const hostResponse = await fetch(`https://api.zoom.us/v2/users/${hostId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (hostResponse.ok) {
          const hostData = await hostResponse.json();
          hostEmail = hostData.email;
          console.log(`[zoom-api][host-processor] Successfully fetched host email for webinar ${webinar.id}: ${hostEmail}`);
        } else {
          console.warn(`[zoom-api][host-processor] Failed to fetch host info for webinar ${webinar.id}: ${hostResponse.status}`);
        }
      } catch (error) {
        console.error(`[zoom-api][host-processor] Error fetching host info for webinar ${webinar.id}:`, error);
      }
    }
    
    // Add the enhanced host information to the webinar object
    enhancedWebinars.push({
      ...webinar,
      host_email: hostEmail,
      host_id: hostId
    });
  }
  
  return enhancedWebinars;
}
