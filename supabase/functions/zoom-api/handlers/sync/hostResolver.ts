
// Enhanced helper functions for resolving complete host information
export async function getHostInfo(token: string, webinarData: any) {
  console.log(`[zoom-api][host-resolver] Resolving host info for webinar: ${webinarData.id}`);
  
  let hostEmail = webinarData.host_email;
  let hostId = webinarData.host_id;
  let hostName = null;
  let hostFirstName = null;
  let hostLastName = null;
  
  // Always try to fetch complete host information if we have host_id
  if (hostId) {
    console.log(`[zoom-api][host-resolver] Fetching complete host info from user API for host_id: ${hostId}`);
    
    try {
      const hostResponse = await fetch(`https://api.zoom.us/v2/users/${hostId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (hostResponse.ok) {
        const hostData = await hostResponse.json();
        
        // Extract all name information
        hostEmail = hostData.email || hostEmail;
        hostName = hostData.display_name;
        hostFirstName = hostData.first_name;
        hostLastName = hostData.last_name;
        
        console.log(`[zoom-api][host-resolver] Successfully fetched complete host info:`, {
          email: hostEmail,
          display_name: hostName,
          first_name: hostFirstName,
          last_name: hostLastName
        });
        
        // Store complete host information in webinar raw_data for preservation
        webinarData.host_info = {
          email: hostEmail,
          display_name: hostName,
          first_name: hostFirstName,
          last_name: hostLastName,
          id: hostId
        };
      } else {
        console.warn(`[zoom-api][host-resolver] Failed to fetch host info: ${hostResponse.status}`);
      }
    } catch (error) {
      console.error(`[zoom-api][host-resolver] Error fetching host info:`, error);
    }
  }
  
  return { 
    hostEmail, 
    hostId, 
    hostName, 
    hostFirstName, 
    hostLastName 
  };
}
