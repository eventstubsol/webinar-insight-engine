
// Helper functions for resolving panelist information
export async function getPanelistInfo(token: string, webinarId: string) {
  console.log(`[zoom-api][panelist-resolver] Fetching panelist info for webinar: ${webinarId}`);
  
  try {
    const panelistResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/panelists`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (panelistResponse.ok) {
      const panelistData = await panelistResponse.json();
      console.log(`[zoom-api][panelist-resolver] Successfully fetched ${panelistData.panelists?.length || 0} panelists for webinar ${webinarId}`);
      return panelistData.panelists || [];
    } else {
      console.log(`[zoom-api][panelist-resolver] No panelists found or error for webinar ${webinarId}: ${panelistResponse.status}`);
      return [];
    }
  } catch (error) {
    console.error(`[zoom-api][panelist-resolver] Error fetching panelist info for webinar ${webinarId}:`, error);
    return [];
  }
}
