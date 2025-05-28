
import { detectEnhancedWebinarCompletion } from '../../../utils/enhancedWebinarCompletionDetector.ts';
import { fetchEnhancedActualWebinarData } from '../../../utils/enhancedZoomApiClient.ts';

/**
 * Fixed handler for recurring webinar instances with proper actual data fetching
 */
export async function handleFixedRecurringWebinarInstances(webinar: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[fixed-recurring-handler] 📡 Fetching instances for recurring webinar ${webinar.id} (${webinar.topic})`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.warn(`[fixed-recurring-handler] ⚠️ Failed to fetch instances: ${response.status} - ${errorData.message}`);
      return 0;
    }
    
    const data = await response.json();
    const instances = data.instances || [];
    
    console.log(`[fixed-recurring-handler] 📊 Found ${instances.length} instances for recurring webinar ${webinar.id}`);
    
    let instancesProcessed = 0;
    
    for (const instance of instances) {
      try {
        const processedCount = await processFixedRecurringInstance(webinar, instance, token, supabase, userId);
        instancesProcessed += processedCount;
      } catch (error) {
        console.error(`[fixed-recurring-handler] ❌ Error processing instance ${instance.uuid}:`, error);
      }
    }
    
    console.log(`[fixed-recurring-handler] ✅ Successfully processed ${instancesProcessed}/${instances.length} instances`);
    return instancesProcessed;
    
  } catch (error) {
    console.error(`[fixed-recurring-handler] ❌ Error fetching instances for recurring webinar ${webinar.id}:`, error);
    return 0;
  }
}

/**
 * Process a single instance of a recurring webinar with enhanced data fetching
 */
async function processFixedRecurringInstance(webinar: any, instance: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[fixed-recurring-handler] 🔍 Processing recurring instance ${instance.uuid} - Status: ${instance.status}`);
  
  // Use enhanced completion detection for the instance
  const completionResult = detectEnhancedWebinarCompletion(webinar, instance);
  console.log(`[fixed-recurring-handler] 🔍 Enhanced completion analysis:`);
  console.log(`[fixed-recurring-handler]   - isCompleted: ${completionResult.isCompleted}`);
  console.log(`[fixed-recurring-handler]   - reason: ${completionResult.reason}`);
  console.log(`[fixed-recurring-handler]   - confidence: ${completionResult.confidenceLevel}`);
  console.log(`[fixed-recurring-handler]   - shouldFetchActualData: ${completionResult.shouldFetchActualData}`);
  console.log(`[fixed-recurring-handler]   - apiStrategy: ${completionResult.apiStrategy}`);
  console.log(`[fixed-recurring-handler]   - bestIdentifier: ${completionResult.bestIdentifier}`);
  
  // Fetch actual timing data using enhanced API client
  const apiResult = await fetchEnhancedActualWebinarData(token, webinar, instance, completionResult);
  
  console.log(`[fixed-recurring-handler] 📡 API Result Summary:`);
  console.log(`[fixed-recurring-handler]   - success: ${apiResult.success}`);
  console.log(`[fixed-recurring-handler]   - strategyUsed: ${apiResult.strategyUsed}`);
  console.log(`[fixed-recurring-handler]   - actualStartTime: ${apiResult.actualStartTime}`);
  console.log(`[fixed-recurring-handler]   - actualDuration: ${apiResult.actualDuration}`);
  console.log(`[fixed-recurring-handler]   - actualEndTime: ${apiResult.actualEndTime}`);
  console.log(`[fixed-recurring-handler]   - participantsCount: ${apiResult.participantsCount}`);
  
  // Log API errors if any
  if (apiResult.errorDetails.length > 0) {
    console.warn(`[fixed-recurring-handler] ⚠️ API Errors for instance ${instance.uuid}:`);
    apiResult.errorDetails.forEach((error, index) => {
      console.warn(`[fixed-recurring-handler]   ${index + 1}. ${error}`);
    });
  }
  
  // Determine final values with proper inheritance: API > instance > webinar > defaults
  const finalTopic = (instance.topic && instance.topic.trim() !== '') ? instance.topic : 
                    (webinar.topic && webinar.topic.trim() !== '') ? webinar.topic : 'Untitled Webinar';
  
  // For start time: API actual > instance scheduled > webinar scheduled
  const finalStartTime = apiResult.actualStartTime || instance.start_time || webinar.start_time;
  
  // For duration: API actual > instance duration > webinar duration
  const scheduledDuration = instance.duration || webinar.duration || null;
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
      console.log(`[fixed-recurring-handler] 🧮 Calculated end_time: ${finalEndTime}`);
      console.log(`[fixed-recurring-handler] 🧮 Calculation: ${finalStartTime} + ${finalDuration} minutes`);
    } catch (error) {
      console.warn(`[fixed-recurring-handler] ⚠️ Error calculating end_time:`, error);
    }
  }
  
  // Determine status with enhanced logic
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
  
  console.log(`[fixed-recurring-handler] 📊 FINAL VALUES for instance ${instance.uuid}:`);
  console.log(`[fixed-recurring-handler]   ✅ topic: ${finalTopic}`);
  console.log(`[fixed-recurring-handler]   ✅ start_time: ${finalStartTime} (source: ${apiResult.actualStartTime ? 'API' : (instance.start_time ? 'instance' : 'webinar')})`);
  console.log(`[fixed-recurring-handler]   ✅ duration: ${finalDuration} (source: ${apiResult.actualDuration ? 'API' : (instance.duration ? 'instance' : 'webinar')})`);
  console.log(`[fixed-recurring-handler]   ⭐ end_time: ${finalEndTime} (source: ${apiResult.actualEndTime ? 'API_actual' : 'calculated'}) ⭐`);
  console.log(`[fixed-recurring-handler]   ✅ status: ${finalStatus}`);
  console.log(`[fixed-recurring-handler]   ✅ actual_start_time: ${apiResult.actualStartTime}`);
  console.log(`[fixed-recurring-handler]   ✅ actual_duration: ${apiResult.actualDuration}`);
  console.log(`[fixed-recurring-handler]   ✅ participants_count: ${apiResult.participantsCount}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: instance.uuid || '',
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
      instance_data: instance,
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
          start_time: apiResult.actualStartTime ? 'api' : (instance.start_time ? 'instance' : 'webinar'),
          duration: apiResult.actualDuration ? 'api' : (instance.duration ? 'instance' : 'webinar'),
          end_time: apiResult.actualEndTime ? 'api_actual' : (finalEndTime ? 'calculated' : 'none')
        }
      },
      _is_recurring_instance: true,
      _completion_confidence: completionResult.confidenceLevel,
      _api_success: apiResult.success
    }
  };
  
  // Final validation logging
  if (!instanceToInsert.end_time) {
    console.error(`[fixed-recurring-handler] ❌ CRITICAL: No end_time calculated for instance ${instance.uuid}!`);
    console.error(`[fixed-recurring-handler] ❌ Debug info: start_time=${finalStartTime}, duration=${finalDuration}`);
    console.error(`[fixed-recurring-handler] ❌ API result: ${JSON.stringify(apiResult, null, 2)}`);
  } else {
    console.log(`[fixed-recurring-handler] ✅ SUCCESS: end_time calculated: ${instanceToInsert.end_time}`);
    console.log(`[fixed-recurring-handler] ✅ Data source: ${apiResult.actualEndTime ? 'Zoom API actual data' : 'Calculated from available data'}`);
  }
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, instance.uuid || '');
}
