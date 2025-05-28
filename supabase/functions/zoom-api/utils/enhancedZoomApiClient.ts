
/**
 * Enhanced Zoom API client with improved error handling and multiple endpoint strategies
 */

import { EnhancedCompletionDetectionResult } from './enhancedWebinarCompletionDetector.ts';

export interface EnhancedApiResult {
  success: boolean;
  actualStartTime: string | null;
  actualDuration: number | null;
  actualEndTime: string | null;
  participantsCount: number;
  actualData: any;
  identifiersUsed: string[];
  apiCallsMade: string[];
  errorDetails: string[];
  strategyUsed: string;
}

/**
 * Enhanced function to fetch actual webinar data using multiple strategies
 */
export async function fetchEnhancedActualWebinarData(
  token: string, 
  webinar: any, 
  instance: any = null, 
  completionResult: EnhancedCompletionDetectionResult
): Promise<EnhancedApiResult> {
  console.log(`[enhanced-api-client] 🚀 Starting enhanced data fetch for webinar ${webinar.id}`);
  console.log(`[enhanced-api-client] 📊 Completion analysis: ${completionResult.reason}`);
  console.log(`[enhanced-api-client] 🎯 Should fetch: ${completionResult.shouldFetchActualData}`);
  console.log(`[enhanced-api-client] 📡 Strategy: ${completionResult.apiStrategy}`);
  console.log(`[enhanced-api-client] 🔑 Best identifier: ${completionResult.bestIdentifier}`);
  
  const result: EnhancedApiResult = {
    success: false,
    actualStartTime: null,
    actualDuration: null,
    actualEndTime: null,
    participantsCount: 0,
    actualData: null,
    identifiersUsed: [],
    apiCallsMade: [],
    errorDetails: [],
    strategyUsed: 'none'
  };
  
  // Don't make API calls if webinar isn't completed
  if (!completionResult.shouldFetchActualData) {
    console.log(`[enhanced-api-client] ⏭️ Skipping API call: ${completionResult.reason}`);
    result.strategyUsed = 'skipped_not_completed';
    return result;
  }
  
  // Define API strategies based on completion analysis
  const strategies = buildApiStrategies(webinar, instance, completionResult);
  
  console.log(`[enhanced-api-client] 🎯 Will try ${strategies.length} strategies for completed webinar`);
  
  // Try each strategy until one succeeds
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    
    try {
      console.log(`[enhanced-api-client] 🔍 Strategy ${i + 1}/${strategies.length}: ${strategy.description}`);
      console.log(`[enhanced-api-client] 📡 URL: ${strategy.url}`);
      console.log(`[enhanced-api-client] 🔑 Identifier: ${strategy.identifier}`);
      
      result.apiCallsMade.push(strategy.url);
      result.identifiersUsed.push(strategy.identifier);
      result.strategyUsed = strategy.name;
      
      const apiResult = await callZoomApiWithRetry(strategy.url, token, strategy.name);
      
      if (apiResult.success && apiResult.data) {
        // Parse and validate the response
        const parsedData = parseApiResponse(apiResult.data, strategy.name);
        
        if (parsedData.hasActualData) {
          result.success = true;
          result.actualData = apiResult.data;
          result.actualStartTime = parsedData.actualStartTime;
          result.actualDuration = parsedData.actualDuration;
          result.actualEndTime = parsedData.actualEndTime;
          result.participantsCount = parsedData.participantsCount;
          
          console.log(`[enhanced-api-client] ✅ SUCCESS with strategy: ${strategy.name}`);
          console.log(`[enhanced-api-client] 📊 Actual timing data:`, {
            start_time: result.actualStartTime,
            duration: result.actualDuration,
            end_time: result.actualEndTime,
            participants_count: result.participantsCount
          });
          
          return result;
        } else {
          console.log(`[enhanced-api-client] ⚠️ Got response but no useful timing data from ${strategy.name}`);
          result.errorDetails.push(`${strategy.name}: Response received but no timing data found`);
        }
      } else {
        const errorMsg = apiResult.error || 'Unknown API error';
        console.warn(`[enhanced-api-client] ⚠️ API error with ${strategy.name}: ${errorMsg}`);
        result.errorDetails.push(`${strategy.name}: ${errorMsg}`);
      }
      
    } catch (error) {
      console.error(`[enhanced-api-client] ❌ Network error with ${strategy.name}:`, error);
      result.errorDetails.push(`${strategy.name}: Network error - ${error.message}`);
    }
    
    // Small delay between attempts
    if (i < strategies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // All strategies failed
  console.error(`[enhanced-api-client] ❌ ALL STRATEGIES FAILED for completed webinar ${webinar.id}`);
  console.error(`[enhanced-api-client] 🔍 Attempted strategies: ${strategies.map(s => s.name).join(', ')}`);
  console.error(`[enhanced-api-client] 📝 Error details:`, result.errorDetails);
  
  result.strategyUsed = 'all_failed';
  return result;
}

/**
 * Build API strategies based on webinar type and completion analysis
 */
function buildApiStrategies(webinar: any, instance: any, completionResult: EnhancedCompletionDetectionResult): any[] {
  const strategies = [];
  const webinarId = webinar.id;
  const isRecurring = webinar.type === 6 || webinar.type === 9;
  
  // Strategy 1: Use the best identifier from completion analysis
  if (completionResult.bestIdentifier && completionResult.apiStrategy !== 'none') {
    const identifier = completionResult.bestIdentifier;
    strategies.push({
      name: `${completionResult.apiStrategy}_primary`,
      url: `https://api.zoom.us/v2/past_webinars/${identifier}`,
      identifier: identifier,
      description: `Past webinar API with ${completionResult.apiStrategy} (primary strategy)`
    });
  }
  
  // Strategy 2: For recurring webinars, try instance UUID if available
  if (isRecurring && instance?.uuid && instance.uuid !== completionResult.bestIdentifier) {
    strategies.push({
      name: 'past_webinar_instance_uuid',
      url: `https://api.zoom.us/v2/past_webinars/${instance.uuid}`,
      identifier: instance.uuid,
      description: 'Past webinar API with instance UUID (recurring webinar)'
    });
  }
  
  // Strategy 3: Try webinar UUID if different from best identifier
  if (webinar.uuid && webinar.uuid !== completionResult.bestIdentifier) {
    strategies.push({
      name: 'past_webinar_webinar_uuid',
      url: `https://api.zoom.us/v2/past_webinars/${webinar.uuid}`,
      identifier: webinar.uuid,
      description: 'Past webinar API with webinar UUID'
    });
  }
  
  // Strategy 4: Fallback to webinar ID if not already used
  if (webinarId !== completionResult.bestIdentifier) {
    strategies.push({
      name: 'past_webinar_id_fallback',
      url: `https://api.zoom.us/v2/past_webinars/${webinarId}`,
      identifier: webinarId,
      description: 'Past webinar API fallback with webinar ID'
    });
  }
  
  // Strategy 5: For recurring webinars, try the instances endpoint as fallback
  if (isRecurring && instance?.uuid) {
    strategies.push({
      name: 'webinar_instance_details',
      url: `https://api.zoom.us/v2/webinars/${webinarId}/instances/${instance.uuid}`,
      identifier: `${webinarId}/${instance.uuid}`,
      description: 'Webinar instance details API (recurring webinar fallback)'
    });
  }
  
  return strategies;
}

/**
 * Call Zoom API with enhanced retry logic
 */
async function callZoomApiWithRetry(url: string, token: string, strategyName: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const maxRetries = 2;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`[api-retry] ${strategyName}: Waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`[api-retry] ${strategyName}: Response status ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        const error = `HTTP ${response.status}: ${errorText}`;
        
        // Don't retry on client errors (except rate limiting)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return { success: false, error };
        }
        
        if (attempt === maxRetries) {
          return { success: false, error };
        }
        
        console.log(`[api-retry] ${strategyName}: Retrying after ${response.status} error`);
      }
      
    } catch (networkError) {
      const error = `Network error: ${networkError.message}`;
      
      if (attempt === maxRetries) {
        return { success: false, error };
      }
      
      console.log(`[api-retry] ${strategyName}: Retrying after network error: ${networkError.message}`);
    }
  }
  
  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Parse API response and extract timing data
 */
function parseApiResponse(data: any, strategyName: string): {
  hasActualData: boolean;
  actualStartTime: string | null;
  actualDuration: number | null;
  actualEndTime: string | null;
  participantsCount: number;
} {
  const result = {
    hasActualData: false,
    actualStartTime: null,
    actualDuration: null,
    actualEndTime: null,
    participantsCount: 0
  };
  
  if (!data || typeof data !== 'object') {
    console.log(`[response-parser] ${strategyName}: Invalid response data`);
    return result;
  }
  
  // Log available fields for debugging
  console.log(`[response-parser] ${strategyName}: Available fields: ${Object.keys(data).join(', ')}`);
  
  // Extract timing data based on Zoom API documentation
  if (data.start_time) {
    result.actualStartTime = data.start_time;
    result.hasActualData = true;
    console.log(`[response-parser] ${strategyName}: Found actual start_time: ${data.start_time}`);
  }
  
  if (data.duration) {
    result.actualDuration = data.duration;
    result.hasActualData = true;
    console.log(`[response-parser] ${strategyName}: Found actual duration: ${data.duration}`);
  }
  
  if (data.end_time) {
    result.actualEndTime = data.end_time;
    result.hasActualData = true;
    console.log(`[response-parser] ${strategyName}: Found actual end_time: ${data.end_time}`);
  }
  
  if (data.participants_count) {
    result.participantsCount = data.participants_count;
    console.log(`[response-parser] ${strategyName}: Found participants_count: ${data.participants_count}`);
  }
  
  // Calculate end_time if we have start_time and duration but no end_time
  if (result.actualStartTime && result.actualDuration && !result.actualEndTime) {
    try {
      const startDate = new Date(result.actualStartTime);
      const endDate = new Date(startDate.getTime() + (result.actualDuration * 60000));
      result.actualEndTime = endDate.toISOString();
      console.log(`[response-parser] ${strategyName}: Calculated end_time: ${result.actualEndTime}`);
    } catch (error) {
      console.warn(`[response-parser] ${strategyName}: Error calculating end_time: ${error.message}`);
    }
  }
  
  console.log(`[response-parser] ${strategyName}: Has actual data: ${result.hasActualData}`);
  return result;
}
