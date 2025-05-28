
import { detectEnhancedWebinarCompletion } from '../../../utils/enhancedWebinarCompletionDetector.ts';
import { fetchEnhancedActualWebinarData } from '../../../utils/enhancedZoomApiClient.ts';

/**
 * Fixed handler for single-occurrence webinars with proper actual data fetching
 */
export async function handleFixedSingleOccurrenceWebinar(webinar: any, token: string, supabase: any, userId: string, isCompleted: boolean): Promise<number> {
  
  console.log(`[fixed-single-handler] 🎯 Processing single webinar ${webinar.id} (${webinar.topic})`);
  console.log(`[fixed-single-handler] 📊 Input: start_time=${webinar.start_time}, duration=${webinar.duration}, status=${webinar.status}`);
  
  // Use enhanced completion detection
  const completionResult = detectEnhancedWebinarCompletion(webinar);
  console.log(`[fixed-single-handler] 🔍 Enhanced completion analysis:`);
  console.log(`[fixed-single-handler]   - isCompleted: ${completionResult.isCompleted}`);
  console.log(`[fixed-single-handler]   - reason: ${completionResult.reason}`);
  console.log(`[fixed-single-handler]   - confidence: ${completionResult.confidenceLevel}`);
  console.log(`[fixed-single-handler]   - shouldFetchActualData: ${completionResult.shouldFetchActualData}`);
  console.log(`[fixed-single-handler]   - apiStrategy: ${completionResult.apiStrategy}`);
  console.log(`[fixed-single-handler]   - bestIdentifier: ${completionResult.bestIdentifier}`);
  
  // Fetch actual timing data using enhanced API client
  const apiResult = await fetchEnhancedActualWebinarData(token, webinar, null, completionResult);
  
  console.log(`[fixed-single-handler] 📡 API Result Summary:`);
  console.log(`[fixed-single-handler]   - success: ${apiResult.success}`);
  console.log(`[fixed-single-handler]   - strategyUsed: ${apiResult.strategyUsed}`);
  console.log(`[fixed-single-handler]   - actualStartTime: ${apiResult.actualStartTime}`);
  console.log(`[fixed-single-handler]   - actualDuration: ${apiResult.actualDuration}`);
  console.log(`[fixed-single-handler]   - actualEndTime: ${apiResult.actualEndTime}`);
  console.log(`[fixed-single-handler]   - participantsCount: ${apiResult.participantsCount}`);
  console.log(`[fixed-single-handler]   - apiCallsMade: ${apiResult.apiCallsMade.length}`);
  console.log(`[fixed-single-handler]   - errorDetails: ${apiResult.errorDetails.length}`);
  
  // Log API errors if any
  if (apiResult.errorDetails.length > 0) {
    console.warn(`[fixed-single-handler] ⚠️ API Errors encountered:`);
    apiResult.errorDetails.forEach((error, index) => {
      console.warn(`[fixed-single-handler]   ${index + 1}. ${error}`);
    });
  }
  
  // Determine final values with proper precedence: API data > webinar data > defaults
  const finalTopic = webinar.topic && webinar.topic.trim() !== '' ? webinar.topic : 'Untitled Webinar';
  
  // For start time: prefer API actual data, fallback to webinar scheduled data
  const finalStartTime = apiResult.actualStartTime || webinar.start_time;
  
  // For duration: prefer API actual data, fallback to webinar scheduled data
  const scheduledDuration = webinar.duration || null;
  const finalDuration = apiResult.actualDuration || scheduledDuration;
  
  // CRITICAL: For end_time, use this priority:
  // 1. API actual end_time (highest priority)
  // 2. Calculate from API actual start + actual duration
  // 3. Calculate from any start_time + any duration
  // 4. Leave null if no calculation possible
  let finalEndTime = apiResult.actualEndTime;
  
  if (!finalEndTime && finalStartTime && finalDuration) {
    try {
      const startDate = new Date(finalStartTime);
      const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
      finalEndTime = endDate.toISOString();
      console.log(`[fixed-single-handler] 🧮 Calculated end_time: ${finalEndTime}`);
      console.log(`[fixed-single-handler] 🧮 Calculation: ${finalStartTime} + ${finalDuration} minutes`);
    } catch (error) {
      console.warn(`[fixed-single-handler] ⚠️ Error calculating end_time:`, error);
    }
  }
  
  // Determine status with enhanced logic
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
  
  console.log(`[fixed-single-handler] 📊 FINAL CALCULATED VALUES:`);
  console.log(`[fixed-single-handler]   ✅ topic: ${finalTopic}`);
  console.log(`[fixed-single-handler]   ✅ start_time: ${finalStartTime} (source: ${apiResult.actualStartTime ? 'API' : 'webinar_data'})`);
  console.log(`[fixed-single-handler]   ✅ duration: ${finalDuration} (source: ${apiResult.actualDuration ? 'API' : 'webinar_data'})`);
  console.log(`[fixed-single-handler]   ⭐ end_time: ${finalEndTime} (source: ${apiResult.actualEndTime ? 'API_actual' : 'calculated'}) ⭐`);
  console.log(`[fixed-single-handler]   ✅ status: ${finalStatus}`);
  console.log(`[fixed-single-handler]   ✅ actual_start_time: ${apiResult.actualStartTime}`);
  console.log(`[fixed-single-handler]   ✅ actual_duration: ${apiResult.actualDuration}`);
  console.log(`[fixed-single-handler]   ✅ participants_count: ${apiResult.participantsCount}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: webinar.uuid || webinar.id,
    start_time: finalStartTime,
    end_time: finalEndTime, // ⭐ CRITICAL: This should now be properly populated
    duration: finalDuration,
    actual_start_time: apiResult.actualStartTime,
    actual_duration: apiResult.actualDuration,
    topic: finalTopic,
    status: finalStatus,
    registrants_count: 0,
    participants_count: apiResult.participantsCount,
    raw_data: {
      webinar_data: webinar,
      completion_analysis: completionResult,
      api_result: {
        success: apiResult.success,
        strategyUsed: apiResult.strategyUsed,
        actualData: apiResult.actualData,
        identifiersUsed: apiResult.identifiersUsed,
        apiCallsMade: apiResult.apiCallsMade,
        errorDetails: apiResult.errorDetails
      },
      timing_calculation: {
        final_end_time: finalEndTime,
        calculation_source: apiResult.actualEndTime ? 'api_actual' : (finalEndTime ? 'calculated' : 'none'),
        data_sources: {
          start_time: apiResult.actualStartTime ? 'api' : 'webinar_data',
          duration: apiResult.actualDuration ? 'api' : 'webinar_data',
          end_time: apiResult.actualEndTime ? 'api_actual' : (finalEndTime ? 'calculated' : 'none')
        }
      },
      _is_single_occurrence: true,
      _completion_confidence: completionResult.confidenceLevel,
      _api_success: apiResult.success
    }
  };
  
  // Final validation logging
  if (!instanceToInsert.end_time) {
    console.error(`[fixed-single-handler] ❌ CRITICAL: No end_time calculated for webinar ${webinar.id}!`);
    console.error(`[fixed-single-handler] ❌ Debug info: start_time=${finalStartTime}, duration=${finalDuration}`);
    console.error(`[fixed-single-handler] ❌ API result: ${JSON.stringify(apiResult, null, 2)}`);
  } else {
    console.log(`[fixed-single-handler] ✅ SUCCESS: end_time calculated: ${instanceToInsert.end_time}`);
    console.log(`[fixed-single-handler] ✅ Data source: ${apiResult.actualEndTime ? 'Zoom API actual data' : 'Calculated from available data'}`);
  }
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, webinar.uuid || webinar.id);
}
