
import { detectWebinarCompletion } from '../../../utils/webinarCompletionDetector.ts';
import { fetchPastWebinarData } from '../../../utils/pastWebinarApiClient.ts';

/**
 * Handles recurring webinar instances by fetching their instances with proper actual timing data
 */
export async function handleRecurringWebinarInstances(webinar: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[zoom-api][recurring-handler] 📡 Fetching instances for recurring webinar ${webinar.id} (${webinar.topic})`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.warn(`[zoom-api][recurring-handler] ⚠️ Failed to fetch instances for recurring webinar ${webinar.id}: ${errorData.message}`);
      return 0;
    }
    
    const data = await response.json();
    const instances = data.instances || [];
    
    console.log(`[zoom-api][recurring-handler] 📊 Found ${instances.length} instances for recurring webinar ${webinar.id}`);
    
    let instancesProcessed = 0;
    
    for (const instance of instances) {
      try {
        const processedCount = await processRecurringInstance(webinar, instance, token, supabase, userId);
        instancesProcessed += processedCount;
      } catch (error) {
        console.error(`[zoom-api][recurring-handler] ❌ Error processing instance ${instance.uuid}:`, error);
      }
    }
    
    return instancesProcessed;
    
  } catch (error) {
    console.error(`[zoom-api][recurring-handler] ❌ Error fetching instances for recurring webinar ${webinar.id}:`, error);
    return 0;
  }
}

/**
 * Process a single instance of a recurring webinar with proper actual timing data
 */
async function processRecurringInstance(webinar: any, instance: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[zoom-api][recurring-handler] 🔍 Processing recurring instance ${instance.uuid} - Status: ${instance.status}`);
  
  // Use proper completion detection for the instance
  const completionResult = detectWebinarCompletion(webinar, instance);
  console.log(`[zoom-api][recurring-handler] 📊 Instance completion analysis: ${completionResult.reason} (confidence: ${completionResult.confidenceLevel})`);
  
  // Fetch actual timing data using the new centralized API client
  const pastDataResult = await fetchPastWebinarData(token, webinar, instance, completionResult);
  
  // Determine final values with proper inheritance: instance → webinar → defaults
  const finalTopic = (instance.topic && instance.topic.trim() !== '') ? instance.topic : 
                    (webinar.topic && webinar.topic.trim() !== '') ? webinar.topic : 'Untitled Webinar';
  
  const finalStartTime = instance.start_time || webinar.start_time;
  const scheduledDuration = instance.duration || webinar.duration || null;
  const finalDuration = pastDataResult.actualDuration || scheduledDuration;
  
  // Calculate end time with priority: actual > calculated
  let finalEndTime = pastDataResult.actualEndTime;
  if (!finalEndTime && finalStartTime && finalDuration) {
    try {
      const startDate = new Date(finalStartTime);
      const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
      finalEndTime = endDate.toISOString();
    } catch (error) {
      console.warn(`[zoom-api][recurring-handler] ⚠️ Error calculating end time:`, error);
    }
  }
  
  // Determine proper status with enhanced logic
  let finalStatus = instance.status;
  if (!finalStatus || finalStatus.trim() === '') {
    if (completionResult.isCompleted) {
      finalStatus = 'ended';
    } else if (finalStartTime) {
      const now = new Date();
      const startTime = new Date(finalStartTime);
      if (now > startTime) {
        if (finalEndTime && now > new Date(finalEndTime)) {
          finalStatus = 'ended';
        } else {
          finalStatus = 'started';
        }
      } else {
        finalStatus = 'waiting';
      }
    } else {
      finalStatus = 'waiting';
    }
  }
  
  console.log(`[zoom-api][recurring-handler] 📊 Final data for instance ${instance.uuid}:`);
  console.log(`[zoom-api][recurring-handler]   - topic: ${finalTopic}`);
  console.log(`[zoom-api][recurring-handler]   - start_time: ${finalStartTime}`);
  console.log(`[zoom-api][recurring-handler]   - duration: ${finalDuration} (actual: ${pastDataResult.actualDuration}, scheduled: ${scheduledDuration})`);
  console.log(`[zoom-api][recurring-handler]   - end_time: ${finalEndTime}`);
  console.log(`[zoom-api][recurring-handler]   - status: ${finalStatus}`);
  console.log(`[zoom-api][recurring-handler]   - actual_start_time: ${pastDataResult.actualStartTime}`);
  console.log(`[zoom-api][recurring-handler]   - actual_duration: ${pastDataResult.actualDuration}`);
  console.log(`[zoom-api][recurring-handler]   - past_data_success: ${pastDataResult.success}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: instance.uuid || '',
    start_time: finalStartTime,
    end_time: finalEndTime,
    duration: finalDuration,
    actual_start_time: pastDataResult.actualStartTime,
    actual_duration: pastDataResult.actualDuration,
    topic: finalTopic,
    status: finalStatus,
    registrants_count: 0,
    participants_count: pastDataResult.participantsCount,
    raw_data: {
      webinar_data: webinar,
      instance_data: instance,
      actual_data: pastDataResult.actualData,
      completion_analysis: completionResult,
      past_data_result: pastDataResult,
      _timing_source: {
        start_time: instance.start_time ? 'instances_api' : 'webinar_data',
        actual_start_time: pastDataResult.actualStartTime ? 'past_webinar_api' : 'none',
        actual_duration: pastDataResult.actualDuration ? 'past_webinar_api' : 'none',
        scheduled_duration: scheduledDuration ? (instance.duration ? 'instances_api' : 'webinar_data') : 'none',
        end_time: pastDataResult.actualEndTime ? 'past_webinar_api' : (finalEndTime ? 'calculated' : 'none'),
        topic: instance.topic ? 'instances_api' : (webinar.topic ? 'webinar_data' : 'default'),
        status: instance.status ? 'instances_api' : 'calculated'
      },
      _is_recurring_instance: true,
      _is_completed: completionResult.isCompleted,
      _identifiers_tried: pastDataResult.identifiersUsed,
      _api_calls_made: pastDataResult.apiCallsMade
    }
  };
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, instance.uuid || '');
}
