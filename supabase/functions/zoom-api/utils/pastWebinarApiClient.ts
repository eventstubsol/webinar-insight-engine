
/**
 * Centralized client for fetching actual timing data from Zoom's past webinars API
 * Handles proper endpoint selection, error handling, and retries
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
 * Fetches actual timing data from Zoom's past webinars API
 * Uses the correct endpoints and identifiers based on webinar type
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
  
  console.log(`[past-webinar-api] 🚀 Starting past webinar data fetch`);
  console.log(`[past-webinar-api] Completion analysis: ${completionResult.reason}`);
  console.log(`[past-webinar-api] Should fetch: ${completionResult.shouldFetchActualData}`);
  
  // Don't make API calls if webinar isn't completed
  if (!completionResult.shouldFetchActualData) {
    console.log(`[past-webinar-api] ⏭️ Skipping API call: ${completionResult.reason}`);
    return result;
  }
  
  const isRecurring = webinarData.type === 6 || webinarData.type === 9;
  const webinarId = webinarData.id || webinarData.webinar_id;
  
  console.log(`[past-webinar-api] 📡 Fetching actual data for ${isRecurring ? 'recurring' : 'single'} webinar ${webinarId}`);
  console.log(`[past-webinar-api] Webinar type: ${webinarData.type}`);
  console.log(`[past-webinar-api] Has instance data: ${instanceData ? 'yes' : 'no'}`);
  
  // Define the API call strategies in order of preference
  const strategies = [];
  
  if (isRecurring && instanceData?.uuid) {
    // Strategy 1: Past webinar with instance UUID (most direct for recurring instances)
    strategies.push({
      name: 'past_webinar_instance_uuid',
      url: `https://api.zoom.us/v2/past_webinars/${instanceData.uuid}`,
      identifier: instanceData.uuid,
      description: `Past webinar API with instance UUID`
    });
    
    // Strategy 2: Recurring webinar instance endpoint (alternative for recurring)
    strategies.push({
      name: 'recurring_instance',
      url: `https://api.zoom.us/v2/past_webinars/${webinarId}/instances/${instanceData.uuid}`,
      identifier: instanceData.uuid,
      description: `Recurring instance API with instance UUID`
    });
  } 
  
  // Strategy for single webinars or fallback
  if (webinarData.uuid) {
    strategies.push({
      name: 'past_webinar_uuid',
      url: `https://api.zoom.us/v2/past_webinars/${webinarData.uuid}`,
      identifier: webinarData.uuid,
      description: `Past webinar API with webinar UUID`
    });
  }
  
  // Last resort with webinar ID
  strategies.push({
    name: 'past_webinar_id',
    url: `https://api.zoom.us/v2/past_webinars/${webinarId}`,
    identifier: webinarId,
    description: `Past webinar API with webinar ID`
  });
  
  console.log(`[past-webinar-api] 🎯 Will try ${strategies.length} strategies`);
  
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
        
        console.log(`[past-webinar-api] Raw response keys: ${Object.keys(actualData).join(', ')}`);
        
        // Validate that we got meaningful data
        if (actualData && (actualData.start_time || actualData.duration || actualData.participants)) {
          result.success = true;
          result.actualData = actualData;
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
          console.log(`[past-webinar-api] ⚠️ Got response but no meaningful timing data`);
          console.log(`[past-webinar-api] Available data: ${actualData ? Object.keys(actualData).join(', ') : 'none'}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        const errorMsg = `${response.status}: ${errorData.message || 'Unknown error'}`;
        
        if (response.status === 404) {
          console.log(`[past-webinar-api] 📭 No past data found with ${strategy.name} (404)`);
        } else if (response.status === 400) {
          console.log(`[past-webinar-api] ❌ Bad request with ${strategy.name} (400): ${errorData.message}`);
        } else if (response.status === 403) {
          console.log(`[past-webinar-api] 🚫 Forbidden with ${strategy.name} (403): ${errorData.message}`);
        } else {
          console.warn(`[past-webinar-api] ⚠️ API error with ${strategy.name}: ${errorMsg}`);
        }
        
        result.error = errorMsg;
      }
    } catch (error) {
      console.error(`[past-webinar-api] ❌ Network error with ${strategy.name}:`, error);
      result.error = error.message || 'Network error';
    }
    
    // Add a small delay between attempts to be respectful to the API
    if (i < strategies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // All strategies failed
  const attemptedStrategies = strategies.map(s => s.name).join(', ');
  console.error(`[past-webinar-api] ❌ ALL STRATEGIES FAILED for webinar ${webinarId}`);
  console.error(`[past-webinar-api] Attempted: ${attemptedStrategies}`);
  console.error(`[past-webinar-api] API calls made: ${result.apiCallsMade.length}`);
  console.error(`[past-webinar-api] Identifiers tried: ${result.identifiersUsed.join(', ')}`);
  
  if (!result.error) {
    result.error = `No actual timing data available. Tried ${strategies.length} API endpoints.`;
  }
  
  return result;
}

/**
 * Enhanced retry logic for API calls with exponential backoff
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
      
      // Success or server error that might benefit from retry
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
