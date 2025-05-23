import { RateLimiter } from "./rateLimiter.ts";
import { createSuccessResponse } from "./cors.ts";

// Get JWT token for Zoom API
export async function getZoomJwtToken(accountId: string, clientId: string, clientSecret: string): Promise<string> {
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
      throw new Error(`Failed to get token: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Zoom JWT token:', error);
    throw error;
  }
}

// Handle verifying credentials
export async function handleVerifyCredentials(req: Request, supabase: any, user: any, credentials: any) {
  try {
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Now test if we have the proper scopes by making a simple request
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
      
      if (scopeTestData.code === 4711 || 
          scopeTestData.message?.includes('scopes')) {
        
        // Update credentials in database to mark as not verified
        await supabase
          .from('zoom_credentials')
          .update({ is_verified: false })
          .eq('user_id', user.id);
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required OAuth scopes in your Zoom App. Please add these scopes to your Zoom Server-to-Server OAuth app: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin',
          code: 'missing_scopes',
          details: scopeTestData
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`API scope test failed: ${scopeTestData.message || 'Unknown error'}`);
    }
    
    // Update credentials in database to mark as verified
    await supabase
      .from('zoom_credentials')
      .update({ 
        is_verified: true,
        last_verified_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Zoom API credentials and scopes validated successfully',
      user: {
        email: scopeTestData.email,
        account_id: scopeTestData.account_id
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Update credentials in database to mark as not verified
    await supabase
      .from('zoom_credentials')
      .update({ is_verified: false })
      .eq('user_id', user.id);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ZoomApiClient for making rate-limited API calls
export class ZoomApiClient {
  private token: string;
  private baseUrl = 'https://api.zoom.us/v2';
  private rateLimiter: RateLimiter;
  
  constructor(token: string) {
    this.token = token;
    // Maximum 90 requests per second as per Zoom API rate limits
    this.rateLimiter = new RateLimiter(90, 1000);
  }
  
  async get(endpoint: string, params: Record<string, any> = {}) {
    await this.rateLimiter.waitForToken();
    
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Zoom API error: ${response.status} ${response.statusText} - ${errorData.message || JSON.stringify(errorData)}`);
    }
    
    return response.json();
  }
  
  async post(endpoint: string, data: any) {
    await this.rateLimiter.waitForToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Zoom API error: ${response.status} ${response.statusText} - ${errorData.message || JSON.stringify(errorData)}`);
    }
    
    return response.json();
  }
  
  async put(endpoint: string, data: any) {
    await this.rateLimiter.waitForToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Zoom API error: ${response.status} ${response.statusText} - ${errorData.message || JSON.stringify(errorData)}`);
    }
    
    return response.json();
  }
  
  async delete(endpoint: string) {
    await this.rateLimiter.waitForToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Zoom API error: ${response.status} ${response.statusText} - ${errorData.message || JSON.stringify(errorData)}`);
    }
    
    return response.status === 204 ? null : response.json();
  }
  
  // Helper method to paginate through all results
  async getPaginated(endpoint: string, params: Record<string, any> = {}) {
    let allResults: any[] = [];
    let page = 1;
    let pageSize = params.page_size || 300;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const queryParams = {
        ...params,
        page_number: page,
        page_size: pageSize
      };
      
      const response = await this.get(endpoint, queryParams);
      
      // Extract the items based on the endpoint
      let items: any[] = [];
      if (endpoint.includes('/webinars')) {
        items = response.webinars || [];
      } else if (endpoint.includes('/participants')) {
        items = response.participants || [];
      } else if (endpoint.includes('/registrants')) {
        items = response.registrants || [];
      } else if (endpoint.includes('/panelists')) {
        items = response.panelists || [];
      } else if (endpoint.includes('/instances')) {
        items = response.webinar_instances || [];
      } else {
        // Default case
        items = response.items || response.meetings || response.webinars || [];
      }
      
      allResults = [...allResults, ...items];
      
      // Check if there are more pages
      const totalRecords = response.total_records || 0;
      const currentCount = page * pageSize;
      
      hasMorePages = currentCount < totalRecords;
      page++;
      
      // Safety check to prevent infinite loops
      if (page > 100) {
        console.warn('Reached maximum pagination limit (100 pages)');
        break;
      }
    }
    
    return allResults;
  }
}
