
import { detectWebinarCompletion } from '../../../utils/webinarCompletionDetector.ts';
import { fetchEnhancedPastWebinarData } from '../../../utils/enhancedPastWebinarApiClient.ts';

/**
 * Enhanced handler for single-occurrence webinars with improved end_time calculation
 */
export async function handleEnhancedSingleOccurrenceWebinar(webinar: any, token: string, supabase: any, userId: string, isCompleted: boolean): Promise<number> {
  
  console.log(`[enhanced-single-handler] 📊 Processing single webinar ${webinar.id} (${webinar.topic})`);
  console.log(`[enhanced-single-handler] 📊 Input data: start_time=${webinar.start_time}, duration=${webinar.duration}, status=${webinar.status}`);
  
  // Use proper completion detection
  const completionResult = detectWebinarCompletion(webinar);
  console.log(`[enhanced-single-handler] 📊 Completion analysis: ${completionResult.reason} (confidence: ${completionResult.confidenceLevel})`);
  
  // Fetch enhanced timing data
  const pastDataResult = await fetchEnhancedPastWebinarData(token, webinar, null, completionResult);
  
  // Determine final values with enhanced logic
  const finalTopic = webinar.topic && webinar.topic.trim() !== '' ? webinar.topic : 'Untitled Webinar';
  const finalStartTime = pastDataResult.actualStartTime || webinar.start_time;
  const scheduledDuration = webinar.duration || null;
  const finalDuration = pastDataResult.actualDuration || scheduledDuration;
  
  // CRITICAL: Enhanced end_time calculation with multiple fallback strategies
  let finalEndTime = pastDataResult.actualEndTime;
  
  if (!finalEndTime && finalStartTime && finalDuration) {
    try {
      const startDate = new Date(finalStartTime);
      const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
      finalEndTime = endDate.toISOString();
      console.log(`[enhanced-single-handler] 🧮 Calculated end_time from start + duration: ${finalEndTime}`);
    } catch (error) {
      console.warn(`[enhanced-single-handler] ⚠️ Error calculating end_time:`, error);
    }
  }
  
  // Additional fallback: if we still don't have end_time but webinar is completed, estimate based on typical duration
  if (!finalEndTime && completionResult.isCompleted && finalStartTime) {
    try {
      const estimatedDuration = finalDuration || 60; // Default to 60 minutes if no duration
      const startDate = new Date(finalStartTime);
      const endDate = new Date(startDate.getTime() + (estimatedDuration * 60000));
      finalEndTime = endDate.toISOString();
      console.log(`[enhanced-single-handler] 🔄 Estimated end_time for completed webinar: ${finalEndTime}`);
    } catch (error) {
      console.warn(`[enhanced-single-handler] ⚠️ Error estimating end_time:`, error);
    }
  }
  
  // Determine proper status
  let finalStatus = webinar.status;
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
  
  console.log(`[enhanced-single-handler] 📊 Final calculated data:`);
  console.log(`[enhanced-single-handler]   - topic: ${finalTopic}`);
  console.log(`[enhanced-single-handler]   - start_time: ${finalStartTime}`);
  console.log(`[enhanced-single-handler]   - duration: ${finalDuration} (actual: ${pastDataResult.actualDuration}, scheduled: ${scheduledDuration})`);
  console.log(`[enhanced-single-handler]   - end_time: ${finalEndTime} ⭐ CRITICAL FIELD`);
  console.log(`[enhanced-single-handler]   - status: ${finalStatus}`);
  console.log(`[enhanced-single-handler]   - actual_start_time: ${pastDataResult.actualStartTime}`);
  console.log(`[enhanced-single-handler]   - actual_duration: ${pastDataResult.actualDuration}`);
  console.log(`[enhanced-single-handler]   - API success: ${pastDataResult.success}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: webinar.uuid || webinar.id,
    start_time: finalStartTime,
    end_time: finalEndTime, // ⭐ CRITICAL: Ensure this is always populated
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
      enhanced_calculation: {
        final_end_time: finalEndTime,
        calculation_method: finalEndTime ? (pastDataResult.actualEndTime ? 'api_actual' : 'calculated') : 'none',
        timing_source: {
          start_time: pastDataResult.actualStartTime ? 'api' : 'webinar_data',
          duration: pastDataResult.actualDuration ? 'api' : 'webinar_data',
          end_time: pastDataResult.actualEndTime ? 'api_actual' : (finalEndTime ? 'calculated' : 'none')
        }
      },
      _is_single_occurrence: true,
      _is_completed: completionResult.isCompleted,
      _identifiers_tried: pastDataResult.identifiersUsed,
      _api_calls_made: pastDataResult.apiCallsMade,
      _api_errors: pastDataResult.errorDetails
    }
  };
  
  // Validate that we have end_time before inserting
  if (!instanceToInsert.end_time) {
    console.warn(`[enhanced-single-handler] ⚠️ WARNING: No end_time calculated for webinar ${webinar.id}!`);
    console.warn(`[enhanced-single-handler] ⚠️ Input data: start_time=${finalStartTime}, duration=${finalDuration}`);
  } else {
    console.log(`[enhanced-single-handler] ✅ Successfully calculated end_time: ${instanceToInsert.end_time}`);
  }
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, webinar.uuid || webinar.id);
}
