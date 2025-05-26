
// Helper for fetching user information from Zoom API
export async function fetchUserInfo(token: string) {
  const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!meResponse.ok) {
    const meData = await meResponse.json();
    console.error('[zoom-api][user-info] Failed to get user info:', meData);
    
    // Handle missing OAuth scopes error specifically
    if (meData.code === 4711 || meData.message?.includes('scopes')) {
      throw new Error('Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin');
    }
    
    // Handle other API error codes
    if (meData.code === 124) {
      throw new Error('Invalid Zoom access token. Please check your credentials.');
    } else if (meData.code === 1001) {
      throw new Error('User not found or does not exist in this account.');
    } else {
      throw new Error(`Failed to get user info: ${meData.message || 'Unknown error'}`);
    }
  }
  
  return await meResponse.json();
}
