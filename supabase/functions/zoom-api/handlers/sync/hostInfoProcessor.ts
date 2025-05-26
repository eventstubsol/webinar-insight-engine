
// Enhanced helper function to get complete host information for batch processing
export async function enhanceWebinarsWithHostInfo(webinars: any[], token: string) {
  console.log(`[zoom-api][host-processor] Enhancing ${webinars.length} webinars with complete host information`);
  
  const enhancedWebinars = [];
  const hostCache = new Map(); // Cache to avoid duplicate API calls
  
  for (const webinar of webinars) {
    let hostEmail = webinar.host_email;
    let hostId = webinar.host_id;
    let hostName = null;
    let hostFirstName = null;
    let hostLastName = null;
    
    // Check cache first to avoid duplicate API calls
    if (hostId && hostCache.has(hostId)) {
      const cachedHostInfo = hostCache.get(hostId);
      hostEmail = cachedHostInfo.email || hostEmail;
      hostName = cachedHostInfo.display_name;
      hostFirstName = cachedHostInfo.first_name;
      hostLastName = cachedHostInfo.last_name;
      
      console.log(`[zoom-api][host-processor] Using cached host info for webinar ${webinar.id}`);
    } else if (hostId) {
      console.log(`[zoom-api][host-processor] Fetching complete host info for webinar ${webinar.id}, host_id: ${hostId}`);
      
      try {
        const hostResponse = await fetch(`https://api.zoom.us/v2/users/${hostId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (hostResponse.ok) {
          const hostData = await hostResponse.json();
          
          // Extract complete host information
          hostEmail = hostData.email || hostEmail;
          hostName = hostData.display_name;
          hostFirstName = hostData.first_name;
          hostLastName = hostData.last_name;
          
          // Cache the host information
          hostCache.set(hostId, {
            email: hostEmail,
            display_name: hostName,
            first_name: hostFirstName,
            last_name: hostLastName
          });
          
          console.log(`[zoom-api][host-processor] Successfully fetched complete host info for webinar ${webinar.id}:`, {
            email: hostEmail,
            display_name: hostName,
            first_name: hostFirstName,
            last_name: hostLastName
          });
        } else {
          console.warn(`[zoom-api][host-processor] Failed to fetch host info for webinar ${webinar.id}: ${hostResponse.status}`);
        }
      } catch (error) {
        console.error(`[zoom-api][host-processor] Error fetching host info for webinar ${webinar.id}:`, error);
      }
    }
    
    // Add the enhanced host information to the webinar object
    const enhancedWebinar = {
      ...webinar,
      host_email: hostEmail,
      host_id: hostId,
      host_name: hostName,
      host_first_name: hostFirstName,
      host_last_name: hostLastName
    };
    
    // Store complete host information in raw_data for preservation
    if (hostName || hostFirstName || hostLastName) {
      enhancedWebinar.host_info = {
        email: hostEmail,
        display_name: hostName,
        first_name: hostFirstName,
        last_name: hostLastName,
        id: hostId
      };
    }
    
    enhancedWebinars.push(enhancedWebinar);
  }
  
  console.log(`[zoom-api][host-processor] Enhanced ${enhancedWebinars.length} webinars with host information`);
  return enhancedWebinars;
}
