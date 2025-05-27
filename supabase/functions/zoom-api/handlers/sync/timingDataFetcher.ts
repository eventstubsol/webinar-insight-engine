
/**
 * Timing Data Fetcher - Handles all Zoom API calls for timing data
 */

// Configuration constants
const API_CALL_TIMEOUT = 5000; // 5 seconds per API call

/**
 * Wrapper for API calls with timeout protection
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error(`API call timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]).catch(error => {
    console.warn(`[zoom-api][withTimeout] API call failed: ${error.message}`);
    return null;
  });
}

/**
 * Fetch past webinar details using UUID to get actual execution data
 */
export async function fetchPastWebinarByUUID(
  webinarUUID: string,
  token: string
): Promise<any> {
  console.log(`[zoom-api][fetchPastWebinarByUUID] Fetching past webinar details by UUID: ${webinarUUID}`);
  
  try {
    // Encode the UUID properly for the URL
    const encodedUUID = encodeURIComponent(encodeURIComponent(webinarUUID));
    const fetchPromise = fetch(`https://api.zoom.us/v2/past_webinars/${encodedUUID}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const response = await withTimeout(fetchPromise, API_CALL_TIMEOUT);
    
    if (!response) {
      console.warn(`[zoom-api][fetchPastWebinarByUUID] ⚠️ API call timed out for UUID: ${webinarUUID}`);
      return null;
    }
    
    if (response.ok) {
      const pastWebinarData = await response.json();
      console.log(`[zoom-api][fetchPastWebinarByUUID] ✅ Successfully fetched past webinar details for UUID: ${webinarUUID}`);
      return pastWebinarData;
    } else {
      const errorText = await response.text();
      console.warn(`[zoom-api][fetchPastWebinarByUUID] ⚠️ Failed to fetch past webinar details for UUID ${webinarUUID}: ${response.status} - ${errorText}`);
      
      // If 404, try without double encoding
      if (response.status === 404) {
        const simplePromise = fetch(`https://api.zoom.us/v2/past_webinars/${webinarUUID}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const simpleResponse = await withTimeout(simplePromise, API_CALL_TIMEOUT);
        
        if (simpleResponse && simpleResponse.ok) {
          const pastWebinarData = await simpleResponse.json();
          console.log(`[zoom-api][fetchPastWebinarByUUID] ✅ Successfully fetched with simple UUID encoding`);
          return pastWebinarData;
        }
      }
      
      return null;
    }
  } catch (error) {
    console.error(`[zoom-api][fetchPastWebinarByUUID] ❌ Error fetching past webinar details for UUID ${webinarUUID}:`, error);
    return null;
  }
}

/**
 * Fetch webinar details to check if it has been held
 */
export async function fetchWebinarDetails(
  webinarId: string,
  token: string
): Promise<any> {
  console.log(`[zoom-api][fetchWebinarDetails] Fetching webinar details for: ${webinarId}`);
  
  try {
    const fetchPromise = fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const response = await withTimeout(fetchPromise, API_CALL_TIMEOUT);
    
    if (!response) {
      console.warn(`[zoom-api][fetchWebinarDetails] ⚠️ API call timed out for webinar: ${webinarId}`);
      return null;
    }
    
    if (response.ok) {
      const webinarData = await response.json();
      console.log(`[zoom-api][fetchWebinarDetails] ✅ Successfully fetched webinar details for: ${webinarId}`);
      return webinarData;
    } else {
      const errorText = await response.text();
      console.warn(`[zoom-api][fetchWebinarDetails] ⚠️ Failed to fetch webinar details for ${webinarId}: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error(`[zoom-api][fetchWebinarDetails] ❌ Error fetching webinar details for ${webinarId}:`, error);
    return null;
  }
}

/**
 * Fetch past webinar details to get actual execution data
 */
export async function fetchPastWebinarDetails(
  webinarId: string,
  token: string
): Promise<any> {
  console.log(`[zoom-api][fetchPastWebinarDetails] Fetching past webinar details for: ${webinarId}`);
  
  try {
    const fetchPromise = fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const response = await withTimeout(fetchPromise, API_CALL_TIMEOUT);
    
    if (!response) {
      console.warn(`[zoom-api][fetchPastWebinarDetails] ⚠️ API call timed out for webinar: ${webinarId}`);
      return null;
    }
    
    if (response.ok) {
      const pastWebinarData = await response.json();
      console.log(`[zoom-api][fetchPastWebinarDetails] ✅ Successfully fetched past webinar details for: ${webinarId}`);
      return pastWebinarData;
    } else {
      const errorText = await response.text();
      console.warn(`[zoom-api][fetchPastWebinarDetails] ⚠️ Failed to fetch past webinar details for ${webinarId}: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error(`[zoom-api][fetchPastWebinarDetails] ❌ Error fetching past webinar details for ${webinarId}:`, error);
    return null;
  }
}
