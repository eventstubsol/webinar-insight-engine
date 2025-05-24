
import { getZoomJwtToken } from '../auth.ts';

export interface ZoomCredentials {
  user_id: string;
  account_id: string;
  client_id: string;
  client_secret: string;
  is_verified: boolean;
  last_verified_at?: string;
}

// Get Zoom credentials for a user
export async function getZoomCredentials(supabase: any, userId: string): Promise<ZoomCredentials | null> {
  console.log(`Getting Zoom credentials for user ${userId}`);
  
  try {
    const { data: credentials, error } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching Zoom credentials:', error);
      return null;
    }
    
    if (!credentials) {
      console.log('No Zoom credentials found for this user');
      return null;
    }
    
    return credentials;
  } catch (err) {
    console.error('Exception when fetching Zoom credentials:', err);
    return null;
  }
}

// Verify that Zoom credentials are valid
export async function verifyZoomCredentials(credentials: ZoomCredentials): Promise<string> {
  if (!credentials) {
    throw new Error('Credentials are required');
  }
  
  try {
    console.log('Verifying Zoom credentials...');
    // Try to get a token to verify the credentials work
    const token = await getZoomJwtToken(
      credentials.account_id,
      credentials.client_id,
      credentials.client_secret
    );
    
    // If we got here, the credentials are valid
    return token;
  } catch (error) {
    console.error('Zoom credential verification failed:', error);
    throw new Error(`Invalid Zoom credentials: ${error.message}`);
  }
}

// Test API scopes with the given credentials
export async function testApiScopes(credentials: ZoomCredentials): Promise<any> {
  const token = await getZoomJwtToken(
    credentials.account_id,
    credentials.client_id,
    credentials.client_secret
  );
  
  console.log('Testing API scopes with a simple request...');
  const scopeTestResponse = await fetch('https://api.zoom.us/v2/users/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const scopeTestData = await scopeTestResponse.json();
  
  if (!scopeTestResponse.ok) {
    console.error('Scope test failed:', scopeTestData);
    
    if (scopeTestData.code === 4711 || scopeTestData.message?.includes('scopes')) {
      throw new Error('Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin');
    }
    
    throw new Error(`API scope test failed: ${scopeTestData.message || 'Unknown error'}`);
  }
  
  return scopeTestData;
}

// Update credentials verification status in database
export async function updateCredentialsVerificationStatus(
  supabase: any, 
  userId: string, 
  isVerified: boolean
): Promise<void> {
  const updateData = isVerified 
    ? { 
        is_verified: true,
        last_verified_at: new Date().toISOString()
      }
    : { is_verified: false };

  await supabase
    .from('zoom_credentials')
    .update(updateData)
    .eq('user_id', userId);
}
