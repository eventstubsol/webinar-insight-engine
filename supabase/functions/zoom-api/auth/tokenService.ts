
// Get JWT token for Zoom API
export async function getZoomJwtToken(accountId: string, clientId: string, clientSecret: string): Promise<{ access_token: string, expires_in: number }> {
  try {
    const tokenEndpoint = 'https://zoom.us/oauth/token';
    
    const base64Credentials = btoa(`${clientId}:${clientSecret}`);
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Credentials}`
      },
      body: new URLSearchParams({
        'grant_type': 'account_credentials',
        'account_id': accountId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token request failed with status ${response.status}: ${errorText}`);
      throw new Error(`Failed to get token: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Token response did not contain an access_token');
    }
    
    console.log('Successfully retrieved new access token');
    
    // Return both token and expiry information
    return {
      access_token: data.access_token, 
      expires_in: data.expires_in || 3600 // Default to 1 hour if not specified
    };
  } catch (error) {
    console.error('Error getting Zoom JWT token:', error);
    throw error;
  }
}
