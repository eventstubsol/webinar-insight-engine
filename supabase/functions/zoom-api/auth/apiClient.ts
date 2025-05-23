
import { RateLimiter } from '../rateLimiter.ts';

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
  
  async request(endpoint: string, options: RequestInit = {}, priority: 'light' | 'medium' | 'heavy' = 'medium'): Promise<Response> {
    // Adjust wait time based on priority to handle rate limits better
    const waitMultiplier = priority === 'light' ? 0.5 : priority === 'heavy' ? 2 : 1;
    await this.rateLimiter.waitForToken(waitMultiplier);
    
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    return fetch(url, {
      ...options,
      headers
    });
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
