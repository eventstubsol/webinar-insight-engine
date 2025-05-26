
// Helper functions for resolving host information
export async function getHostInfo(token: string, webinarData: any) {
  console.log(`[zoom-api][host-resolver] Resolving host info for webinar: ${webinarData.id}`);
  
  let hostEmail = webinarData.host_email;
  let hostId = webinarData.host_id;
  
  // If host_email is missing but we have host_id, fetch it
  if (!hostEmail && hostId) {
    console.log(`[zoom-api][host-resolver] Host email missing, fetching from user API for host_id: ${hostId}`);
    
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
        console.log(`[zoom-api][host-resolver] Successfully fetched host email: ${hostEmail}`);
      } else {
        console.warn(`[zoom-api][host-resolver] Failed to fetch host info: ${hostResponse.status}`);
      }
    } catch (error) {
      console.error(`[zoom-api][host-resolver] Error fetching host info:`, error);
    }
  }
  
  return { hostEmail, hostId };
}
