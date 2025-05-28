
/**
 * FIXED: Centralized client for fetching actual timing data from Zoom's past webinars API
 * Now properly uses the correct endpoints and validates responses
 */

import { CompletionDetectionResult } from './webinarCompletionDetector.ts';

export interface PastWebinarApiResult {
  success: boolean;
  actualData: any | null;
  actualStartTime: string | null;
  actualDuration: number | null;
  actualEndTime: string | null;
  participantsCount: number;
  error?: string;
  apiCallsMade: string[];
  identifiersUsed: string[];
}

/**
 * FIXED: Fetches actual timing data from Zoom's past webinars API
 * Only calls the API for webinars that are actually completed
 */
export async function fetchPastWebinarData(
  token: string,
  webinarData: any,
  instanceData: any | null,
  completionResult: CompletionDetectionResult
): Promise<PastWebinarApiResult> {
  
  const result: PastWebinarApiResult = {
    success: false,
    actualData: null,
    actualStartTime: null,
    actualDuration: null,
    actualEndTime: null,
    participantsCount: 0,
    apiCallsMade: [],
    identifiersUsed: []
  };
  
  console.log(`[past-webinar-api] 🚀 Starting past webinar data fetch for ${webinarData.id}`);
  console.log(`[past-webinar-api] Completion analysis: ${completionResult.reason}`);
  console.log(`[past-webinar-api] Should fetch: ${completionResult.shouldFetchActualData}`);
  
  // CRITICAL FIX: Don't make API calls if webinar isn't completed
  if (!completionResult.shouldFetchActualData) {
    console.log(`[past-webinar-api] ⏭️ Skipping API call: ${completionResult.reason}`);
    return result;
  }
  
  const webinarId = webinarData.id || webinarData.webinar_id;
  const isRecurring = webinarData.type === 6 || webinarData.type === 9;
  
  console.log(`[past-webinar-api] 📡 Fetching actual data for ${isRecurring ? 'recurring' : 'single'} webinar ${webinarId}`);
  
  // FIXED: Define proper API strategies based on webinar type
  const strategies = [];
  
  // For single webinars, use past_webinars endpoint with webinar UUID
  if (!isRecurring && webinarData.uuid) {
    strategies.push({
      name: 'past_webinar_single_uuid',
      url: `https://api.zoom.us/v2/past_webinars/${webinarData.uuid}`,
      identifier: webinarData.uuid,
      description: `Past webinar API for single webinar with UUID`
    });
  }
  
  // For recurring webinars with instance data, use instance UUID
  if (isRecurring && instanceData?.uuid) {
    strategies.push({
      name: 'past_webinar_instance_uuid',
      url: `https://api.zoom.us/v2/past_webinars/${instanceData.uuid}`,
      identifier: instanceData.uuid,
      description: `Past webinar API for recurring instance with UUID`
    });
  }
  
  // Fallback: Try with webinar ID (less reliable)
  strategies.push({
    name: 'past_webinar_id_fallback',
    url: `https://api.zoom.us/v2/past_webinars/${webinarId}`,
    identifier: webinarId,
    description: `Past webinar API fallback with webinar ID`
  });
  
  console.log(`[past-webinar-api] 🎯 Will try ${strategies.length} strategies for completed webinar`);
  
  // Try each strategy until one succeeds
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    
    try {
      console.log(`[past-webinar-api] 🔍 Strategy ${i + 1}/${strategies.length}: ${strategy.description}`);
      console.log(`[past-webinar-api] URL: ${strategy.url}`);
      
      result.apiCallsMade.push(strategy.url);
      result.identifiersUsed.push(strategy.identifier);
      
      const response = await fetchWithRetry(strategy.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }, 2, 1000);
      
      console.log(`[past-webinar-api] Response status: ${response.status}`);
      
      if (response.ok) {
        const actualData = await response.json();
        
        // FIXED: Validate response structure based on Zoom API documentation
        if (actualData && (actualData.start_time || actualData.duration)) {
          result.success = true;
          result.actualData = actualData;
          
          // Map fields that actually exist in past_webinars response
          result.actualStartTime = actualData.start_time || null;
          result.actualDuration = actualData.duration || null;
          result.actualEndTime = actualData.end_time || null;
          result.participantsCount = actualData.participants_count || 0;
          
          console.log(`[past-webinar-api] ✅ SUCCESS with strategy: ${strategy.name}`);
          console.log(`[past-webinar-api] Actual timing data:`, {
            start_time: result.actualStartTime,
            duration: result.actualDuration,
            end_time: result.actualEndTime,
            participants_count: result.participantsCount
          });
          
          return result;
        } else {
          console.log(`[past-webinar-api] ⚠️ Got response but no timing data`);
          console.log(`[past-webinar-api] Response keys: ${Object.keys(actualData || {}).join(', ')}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const errorMsg = `${response.status}: ${errorData.message || 'Unknown error'}`;
        
        if (response.status === 404) {
          console.log(`[past-webinar-api] 📭 No past data found with ${strategy.name} (404)`);
        } else {
          console.warn(`[past-webinar-api] ⚠️ API error with ${strategy.name}: ${errorMsg}`);
        }
        
        result.error = errorMsg;
      }
    } catch (error) {
      console.error(`[past-webinar-api] ❌ Network error with ${strategy.name}:`, error);
      result.error = error.message || 'Network error';
    }
    
    // Small delay between attempts
    if (i < strategies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // All strategies failed
  console.error(`[past-webinar-api] ❌ ALL STRATEGIES FAILED for completed webinar ${webinarId}`);
  console.error(`[past-webinar-api] Attempted strategies: ${strategies.map(s => s.name).join(', ')}`);
  
  result.error = `No actual timing data available after trying ${strategies.length} API endpoints`;
  return result;
}

/**
 * Enhanced retry logic for API calls
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<Response> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[retry] Waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const response = await fetch(url, options);
      
      // Don't retry on client errors (400-499) except for 429 (rate limit)
      if (!response.ok && response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      
      if (response.ok || attempt === maxRetries) {
        return response;
      }
      
      console.log(`[retry] Attempt ${attempt + 1} failed with status ${response.status}, retrying...`);
      
    } catch (error) {
      lastError = error as Error;
      console.log(`[retry] Attempt ${attempt + 1} failed with error:`, error.message);
      
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }
  
  throw lastError!;
}
