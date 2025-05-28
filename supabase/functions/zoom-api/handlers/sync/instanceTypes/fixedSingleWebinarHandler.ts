
import { fetchCorrectWebinarData } from '../../../utils/correctZoomApiClient.ts';

/**
 * FIXED handler for single-occurrence webinars using correct Zoom API endpoints
 */
export async function handleFixedSingleOccurrenceWebinar(webinar: any, token: string, supabase: any, userId: string, isCompleted: boolean): Promise<number> {
  
  console.log(`[fixed-single-handler] 🎯 Processing single webinar ${webinar.id} (${webinar.topic})`);
  console.log(`[fixed-single-handler] 📊 Using CORRECT Zoom API endpoints per documentation`);
  
  // Use the correct API client to fetch webinar data
  const apiResult = await fetchCorrectWebinarData(token, webinar.id);
  
  console.log(`[fixed-single-handler] 📡 API Result Summary:`);
  console.log(`[fixed-single-handler]   - success: ${apiResult.success}`);
  console.log(`[fixed-single-handler]   - status: ${apiResult.status}`);
  console.log(`[fixed-single-handler]   - dataSource: ${apiResult.dataSource}`);
  console.log(`[fixed-single-handler]   - calculatedEndTime: ${apiResult.calculatedEndTime}`);
  console.log(`[fixed-single-handler]   - apiCallsMade: ${apiResult.apiCallsMade.length}`);
  console.log(`[fixed-single-handler]   - errorDetails: ${apiResult.errorDetails.length}`);
  
  // Log API errors if any
  if (apiResult.errorDetails.length > 0) {
    console.warn(`[fixed-single-handler] ⚠️ API Errors encountered:`);
    apiResult.errorDetails.forEach((error, index) => {
      console.warn(`[fixed-single-handler]   ${index + 1}. ${error}`);
    });
  }
  
  // Use data from API result with proper fallbacks
  const webinarData = apiResult.webinarData || webinar;
  const finalTopic = webinarData.topic && webinarData.topic.trim() !== '' ? webinarData.topic : 'Untitled Webinar';
  const finalStartTime = webinarData.start_time || webinar.start_time;
  const finalDuration = webinarData.duration || webinar.duration;
  const finalStatus = apiResult.status !== 'unknown' ? apiResult.status : webinar.status;
  
  // CRITICAL: Set end_time with proper priority:
  // 1. Calculated end_time (start_time + duration)
  // 2. Leave null if no calculation possible
  const finalEndTime = apiResult.calculatedEndTime;
  
  console.log(`[fixed-single-handler] 📊 FINAL CALCULATED VALUES:`);
  console.log(`[fixed-single-handler]   ✅ topic: ${finalTopic}`);
  console.log(`[fixed-single-handler]   ✅ start_time: ${finalStartTime}`);
  console.log(`[fixed-single-handler]   ✅ duration: ${finalDuration}`);
  console.log(`[fixed-single-handler]   ⭐ end_time: ${finalEndTime} (source: ${apiResult.dataSource}) ⭐`);
  console.log(`[fixed-single-handler]   ✅ status: ${finalStatus}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: webinar.uuid || webinar.id,
    start_time: finalStartTime,
    end_time: finalEndTime, // ⭐ CRITICAL: This should now be properly populated
    duration: finalDuration,
    actual_start_time: null, // Will be populated from past_webinars API if available
    actual_duration: null, // Will be populated from past_webinars API if available
    topic: finalTopic,
    status: finalStatus,
    registrants_count: 0,
    participants_count: 0,
    raw_data: {
      webinar_data: webinar,
      api_result: {
        success: apiResult.success,
        webinarData: apiResult.webinarData,
        calculatedEndTime: apiResult.calculatedEndTime,
        dataSource: apiResult.dataSource,
        apiCallsMade: apiResult.apiCallsMade,
        errorDetails: apiResult.errorDetails
      },
      timing_calculation: {
        final_end_time: finalEndTime,
        calculation_source: apiResult.dataSource,
        data_sources: {
          start_time: webinarData.start_time ? 'zoom_api' : 'webinar_data',
          duration: webinarData.duration ? 'zoom_api' : 'webinar_data',
          end_time: apiResult.dataSource
        }
      },
      _is_single_occurrence: true,
      _api_success: apiResult.success,
      _correct_api_used: true
    }
  };
  
  // Final validation logging
  if (!instanceToInsert.end_time) {
    console.error(`[fixed-single-handler] ❌ CRITICAL: No end_time calculated for webinar ${webinar.id}!`);
    console.error(`[fixed-single-handler] ❌ Debug info: start_time=${finalStartTime}, duration=${finalDuration}`);
  } else {
    console.log(`[fixed-single-handler] ✅ SUCCESS: end_time calculated: ${instanceToInsert.end_time}`);
    console.log(`[fixed-single-handler] ✅ Data source: ${apiResult.dataSource}`);
  }
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, webinar.uuid || webinar.id);
}
