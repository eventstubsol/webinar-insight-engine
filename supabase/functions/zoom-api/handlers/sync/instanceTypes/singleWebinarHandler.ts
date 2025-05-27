
import { detectWebinarCompletion } from '../../../utils/webinarCompletionDetector.ts';
import { fetchPastWebinarData } from '../../../utils/pastWebinarApiClient.ts';

/**
 * Handles single-occurrence webinars with proper actual timing data collection
 */
export async function handleSingleOccurrenceWebinar(webinar: any, token: string, supabase: any, userId: string, isCompleted: boolean): Promise<number> {
  
  console.log(`[zoom-api][single-handler] 📊 Processing single webinar ${webinar.id} (${webinar.topic})`);
  console.log(`[zoom-api][single-handler] 📊 Webinar data: start_time=${webinar.start_time}, duration=${webinar.duration}, status=${webinar.status}`);
  
  // Use proper completion detection instead of relying on isCompleted parameter
  const completionResult = detectWebinarCompletion(webinar);
  console.log(`[zoom-api][single-handler] 📊 Completion analysis: ${completionResult.reason} (confidence: ${completionResult.confidenceLevel})`);
  
  // Fetch actual timing data using the new centralized API client
  const pastDataResult = await fetchPastWebinarData(token, webinar, null, completionResult);
  
  // Determine final values with proper inheritance and validation
  const finalTopic = webinar.topic && webinar.topic.trim() !== '' ? webinar.topic : 'Untitled Webinar';
  const finalStartTime = webinar.start_time; // This is the scheduled start time
  const scheduledDuration = webinar.duration || null;
  const finalDuration = pastDataResult.actualDuration || scheduledDuration;
  
  // Calculate end time with priority: actual > calculated from actual duration > calculated from scheduled
  let finalEndTime = pastDataResult.actualEndTime;
  if (!finalEndTime && finalStartTime && finalDuration) {
    try {
      const startDate = new Date(finalStartTime);
      const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
      finalEndTime = endDate.toISOString();
      console.log(`[zoom-api][single-handler] 📊 Calculated end time: ${finalEndTime}`);
    } catch (error) {
      console.warn(`[zoom-api][single-handler] ⚠️ Error calculating end time:`, error);
    }
  }
  
  // Determine proper status with robust logic
  let finalStatus = webinar.status;
  if (!finalStatus || finalStatus.trim() === '') {
    if (completionResult.isCompleted) {
      finalStatus = 'ended';
    } else if (finalStartTime) {
      const now = new Date();
      const startTime = new Date(finalStartTime);
      if (now > startTime) {
        // Check if it should have ended based on duration
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
  
  console.log(`[zoom-api][single-handler] 📊 Final data for single webinar ${webinar.id}:`);
  console.log(`[zoom-api][single-handler]   - topic: ${finalTopic}`);
  console.log(`[zoom-api][single-handler]   - start_time: ${finalStartTime}`);
  console.log(`[zoom-api][single-handler]   - duration: ${finalDuration} (actual: ${pastDataResult.actualDuration}, scheduled: ${scheduledDuration})`);
  console.log(`[zoom-api][single-handler]   - end_time: ${finalEndTime}`);
  console.log(`[zoom-api][single-handler]   - status: ${finalStatus}`);
  console.log(`[zoom-api][single-handler]   - actual_start_time: ${pastDataResult.actualStartTime}`);
  console.log(`[zoom-api][single-handler]   - actual_duration: ${pastDataResult.actualDuration}`);
  console.log(`[zoom-api][single-handler]   - past_data_success: ${pastDataResult.success}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: webinar.uuid || webinar.id,
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
      actual_data: pastDataResult.actualData,
      completion_analysis: completionResult,
      past_data_result: pastDataResult,
      _timing_source: {
        start_time: 'webinar_api',
        actual_start_time: pastDataResult.actualStartTime ? 'past_webinar_api' : 'none',
        actual_duration: pastDataResult.actualDuration ? 'past_webinar_api' : 'none',
        scheduled_duration: scheduledDuration ? 'webinar_data' : 'none',
        end_time: pastDataResult.actualEndTime ? 'past_webinar_api' : (finalEndTime ? 'calculated' : 'none'),
        topic: webinar.topic ? 'webinar_data' : 'default',
        status: webinar.status ? 'webinar_data' : 'calculated'
      },
      _is_single_occurrence: true,
      _is_completed: completionResult.isCompleted,
      _identifiers_tried: pastDataResult.identifiersUsed,
      _api_calls_made: pastDataResult.apiCallsMade
    }
  };
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, webinar.uuid || webinar.id);
}
