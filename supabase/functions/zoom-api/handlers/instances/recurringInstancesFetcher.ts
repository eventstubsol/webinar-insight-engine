
import { detectWebinarCompletion } from '../../utils/webinarCompletionDetector.ts';
import { fetchPastWebinarData } from '../../utils/pastWebinarApiClient.ts';

/**
 * Handles fetching instances for recurring webinars
 */
export async function fetchRecurringWebinarInstances(webinarId: string, token: string, webinarData: any): Promise<any[]> {
  try {
    console.log(`[zoom-api][recurring-fetcher] 🔄 Fetching instances for recurring webinar ${webinarId}`);
    
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown API error' }));
      console.warn(`[zoom-api][recurring-fetcher] ⚠️ Failed to fetch instances for ${webinarId}: ${errorData.message}`);
      return [];
    }
    
    const data = await response.json();
    const instances = data.instances || [];
    
    console.log(`[zoom-api][recurring-fetcher] 📊 Found ${instances.length} instances for recurring webinar ${webinarId}`);
    
    // Process each instance to get actual completion data if needed
    const processedInstances = [];
    for (const instance of instances) {
      try {
        const processedInstance = await processRecurringInstance(instance, token, webinarData);
        processedInstances.push(processedInstance);
      } catch (error) {
        console.error(`[zoom-api][recurring-fetcher] ❌ Error processing instance ${instance.uuid || instance.id}:`, error);
        // Continue with other instances even if one fails
      }
    }
    
    console.log(`[zoom-api][recurring-fetcher] ✅ Successfully processed ${processedInstances.length}/${instances.length} instances`);
    return processedInstances;
    
  } catch (error) {
    console.error(`[zoom-api][recurring-fetcher] ❌ Error fetching recurring instances for ${webinarId}:`, error);
    return []; // Return empty array instead of throwing to allow graceful degradation
  }
}

/**
 * Processes an individual recurring webinar instance
 */
async function processRecurringInstance(instance: any, token: string, webinarData: any): Promise<any> {
  const instanceId = instance.uuid || instance.id || 'unknown';
  
  console.log(`[zoom-api][recurring-fetcher] 🔍 Processing instance ${instanceId}, status: ${instance.status}`);
  
  // Use proper completion detection for the instance
  const completionResult = detectWebinarCompletion(webinarData, instance);
  console.log(`[zoom-api][recurring-fetcher] 📊 Instance completion analysis: ${completionResult.reason} (confidence: ${completionResult.confidenceLevel})`);
  
  // Fetch actual timing data using the new centralized API client
  const pastDataResult = await fetchPastWebinarData(token, webinarData, instance, completionResult);
  
  // Return instance with both scheduled and actual timing data
  const processedInstance = {
    ...instance,
    duration: instance.duration || webinarData.duration,
    actual_start_time: pastDataResult.actualStartTime,
    actual_duration: pastDataResult.actualDuration,
    participants_count: pastDataResult.participantsCount,
    _completion_analysis: completionResult,
    _past_data_result: pastDataResult,
    _timing_source: {
      actual_start_time: pastDataResult.actualStartTime ? 'past_webinar_api' : 'none',
      actual_duration: pastDataResult.actualDuration ? 'past_webinar_api' : 'none',
      scheduled_start_time: instance.start_time ? 'instances_api' : 'none',
      scheduled_duration: instance.duration ? 'instances_api' : (webinarData.duration ? 'webinar_data' : 'none')
    },
    _actual_data: pastDataResult.actualData,
    _identifiers_tried: pastDataResult.identifiersUsed,
    _api_calls_made: pastDataResult.apiCallsMade
  };
  
  console.log(`[zoom-api][recurring-fetcher] 📊 Processed instance ${instanceId}:`);
  console.log(`[zoom-api][recurring-fetcher]   - scheduled: start=${instance.start_time}, duration=${processedInstance.duration}`);
  console.log(`[zoom-api][recurring-fetcher]   - actual: start=${pastDataResult.actualStartTime}, duration=${pastDataResult.actualDuration}`);
  console.log(`[zoom-api][recurring-fetcher]   - past_data_success: ${pastDataResult.success}`);
  
  return processedInstance;
}
