
import { detectWebinarCompletion, getBestPastWebinarIdentifier } from '../../utils/webinarCompletionDetector.ts';
import { fetchPastWebinarData } from '../../utils/pastWebinarApiClient.ts';

/**
 * Creates instance data for single-occurrence webinars with proper actual timing data collection
 */
export async function createSingleWebinarInstance(webinarId: string, token: string, webinarData: any, isCompleted: boolean): Promise<any[]> {
  try {
    console.log(`[zoom-api][single-creator] 🔄 Creating instance for single webinar ${webinarId} (${webinarData.topic})`);
    
    // Use proper completion detection instead of relying on isCompleted parameter
    const completionResult = detectWebinarCompletion(webinarData);
    console.log(`[zoom-api][single-creator] 📊 Completion analysis: ${completionResult.reason} (confidence: ${completionResult.confidenceLevel})`);
    
    // Fetch actual timing data using the new centralized API client
    const pastDataResult = await fetchPastWebinarData(token, webinarData, null, completionResult);
    
    // Calculate end time for completed webinars with proper validation
    const finalTopic = webinarData.topic && webinarData.topic.trim() !== '' ? webinarData.topic : 'Untitled Webinar';
    const finalDuration = pastDataResult.actualDuration || webinarData.duration;
    const finalStartTime = webinarData.start_time; // This is the scheduled start time
    let endTime = pastDataResult.actualEndTime;
    
    if (!endTime && finalStartTime && finalDuration) {
      try {
        const startDate = new Date(finalStartTime);
        const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
        endTime = endDate.toISOString();
        console.log(`[zoom-api][single-creator] 📊 Calculated end time: ${endTime}`);
      } catch (error) {
        console.warn(`[zoom-api][single-creator] ⚠️ Error calculating end time for ${webinarId}:`, error);
      }
    }
    
    // Determine proper status with enhanced logic
    let finalStatus = webinarData.status;
    if (!finalStatus || finalStatus.trim() === '') {
      if (completionResult.isCompleted) {
        finalStatus = 'ended';
      } else if (finalStartTime) {
        const now = new Date();
        const startTime = new Date(finalStartTime);
        if (now > startTime) {
          if (endTime && now > new Date(endTime)) {
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
    
    // Create synthetic instance with proper data inheritance
    const instance = {
      id: webinarData.uuid || webinarId,
      uuid: webinarData.uuid || webinarId,
      start_time: finalStartTime,
      end_time: endTime,
      duration: finalDuration,
      actual_start_time: pastDataResult.actualStartTime,
      actual_duration: pastDataResult.actualDuration,
      status: finalStatus,
      topic: finalTopic,
      participants_count: pastDataResult.participantsCount,
      registrants_count: 0,
      _is_single_occurrence: true,
      _is_completed: completionResult.isCompleted,
      _completion_analysis: completionResult,
      _past_data_result: pastDataResult,
      _timing_source: {
        start_time: 'webinar_api',
        actual_start_time: pastDataResult.actualStartTime ? 'past_webinar_api' : 'none',
        actual_duration: pastDataResult.actualDuration ? 'past_webinar_api' : 'none',
        scheduled_duration: webinarData.duration ? 'webinar_data' : 'none',
        end_time: pastDataResult.actualEndTime ? 'past_webinar_api' : (endTime ? 'calculated' : 'none'),
        topic: webinarData.topic ? 'webinar_data' : 'default',
        status: webinarData.status ? 'webinar_data' : 'calculated'
      },
      _actual_data: pastDataResult.actualData,
      _webinar_data: webinarData,
      _identifiers_tried: pastDataResult.identifiersUsed,
      _api_calls_made: pastDataResult.apiCallsMade
    };
    
    console.log(`[zoom-api][single-creator] ✅ Created single instance for ${webinarId}:`);
    console.log(`[zoom-api][single-creator]   - topic: ${instance.topic}`);
    console.log(`[zoom-api][single-creator]   - start_time: ${instance.start_time}`);
    console.log(`[zoom-api][single-creator]   - duration: ${instance.duration}`);
    console.log(`[zoom-api][single-creator]   - end_time: ${instance.end_time}`);
    console.log(`[zoom-api][single-creator]   - status: ${instance.status}`);
    console.log(`[zoom-api][single-creator]   - actual_start_time: ${instance.actual_start_time}`);
    console.log(`[zoom-api][single-creator]   - actual_duration: ${instance.actual_duration}`);
    console.log(`[zoom-api][single-creator]   - past_data_success: ${pastDataResult.success}`);
    
    return [instance];
    
  } catch (error) {
    console.error(`[zoom-api][single-creator] ❌ Error creating single webinar instance for ${webinarId}:`, error);
    throw new Error(`Failed to create single webinar instance: ${error.message}`);
  }
}
