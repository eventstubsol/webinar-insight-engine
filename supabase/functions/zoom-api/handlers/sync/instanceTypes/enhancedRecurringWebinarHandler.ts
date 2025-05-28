
import { detectWebinarCompletion } from '../../../utils/webinarCompletionDetector.ts';
import { fetchEnhancedPastWebinarData } from '../../../utils/enhancedPastWebinarApiClient.ts';

/**
 * Enhanced handler for recurring webinar instances with improved end_time calculation
 */
export async function handleEnhancedRecurringWebinarInstances(webinar: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[enhanced-recurring-handler] 📡 Fetching instances for recurring webinar ${webinar.id} (${webinar.topic})`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.warn(`[enhanced-recurring-handler] ⚠️ Failed to fetch instances for recurring webinar ${webinar.id}: ${errorData.message}`);
      return 0;
    }
    
    const data = await response.json();
    const instances = data.instances || [];
    
    console.log(`[enhanced-recurring-handler] 📊 Found ${instances.length} instances for recurring webinar ${webinar.id}`);
    
    let instancesProcessed = 0;
    
    for (const instance of instances) {
      try {
        const processedCount = await processEnhancedRecurringInstance(webinar, instance, token, supabase, userId);
        instancesProcessed += processedCount;
      } catch (error) {
        console.error(`[enhanced-recurring-handler] ❌ Error processing instance ${instance.uuid}:`, error);
      }
    }
    
    return instancesProcessed;
    
  } catch (error) {
    console.error(`[enhanced-recurring-handler] ❌ Error fetching instances for recurring webinar ${webinar.id}:`, error);
    return 0;
  }
}

/**
 * Process a single instance of a recurring webinar with enhanced end_time calculation
 */
async function processEnhancedRecurringInstance(webinar: any, instance: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[enhanced-recurring-handler] 🔍 Processing recurring instance ${instance.uuid} - Status: ${instance.status}`);
  
  // Use proper completion detection for the instance
  const completionResult = detectWebinarCompletion(webinar, instance);
  console.log(`[enhanced-recurring-handler] 📊 Instance completion analysis: ${completionResult.reason} (confidence: ${completionResult.confidenceLevel})`);
  
  // Fetch enhanced timing data
  const pastDataResult = await fetchEnhancedPastWebinarData(token, webinar, instance, completionResult);
  
  // Determine final values with proper inheritance: instance → webinar → defaults
  const finalTopic = (instance.topic && instance.topic.trim() !== '') ? instance.topic : 
                    (webinar.topic && webinar.topic.trim() !== '') ? webinar.topic : 'Untitled Webinar';
  
  const finalStartTime = pastDataResult.actualStartTime || instance.start_time || webinar.start_time;
  const scheduledDuration = instance.duration || webinar.duration || null;
  const finalDuration = pastDataResult.actualDuration || scheduledDuration;
  
  // CRITICAL: Enhanced end_time calculation with multiple fallback strategies
  let finalEndTime = pastDataResult.actualEndTime;
  
  if (!finalEndTime && finalStartTime && finalDuration) {
    try {
      const startDate = new Date(finalStartTime);
      const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
      finalEndTime = endDate.toISOString();
      console.log(`[enhanced-recurring-handler] 🧮 Calculated end_time from start + duration: ${finalEndTime}`);
    } catch (error) {
      console.warn(`[enhanced-recurring-handler] ⚠️ Error calculating end_time:`, error);
    }
  }
  
  // Additional fallback for completed instances without end_time
  if (!finalEndTime && completionResult.isCompleted && finalStartTime) {
    try {
      const estimatedDuration = finalDuration || 60; // Default to 60 minutes
      const startDate = new Date(finalStartTime);
      const endDate = new Date(startDate.getTime() + (estimatedDuration * 60000));
      finalEndTime = endDate.toISOString();
      console.log(`[enhanced-recurring-handler] 🔄 Estimated end_time for completed instance: ${finalEndTime}`);
    } catch (error) {
      console.warn(`[enhanced-recurring-handler] ⚠️ Error estimating end_time:`, error);
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
  
  console.log(`[enhanced-recurring-handler] 📊 Final calculated data for instance ${instance.uuid}:`);
  console.log(`[enhanced-recurring-handler]   - topic: ${finalTopic}`);
  console.log(`[enhanced-recurring-handler]   - start_time: ${finalStartTime}`);
  console.log(`[enhanced-recurring-handler]   - duration: ${finalDuration} (actual: ${pastDataResult.actualDuration}, scheduled: ${scheduledDuration})`);
  console.log(`[enhanced-recurring-handler]   - end_time: ${finalEndTime} ⭐ CRITICAL FIELD`);
  console.log(`[enhanced-recurring-handler]   - status: ${finalStatus}`);
  console.log(`[enhanced-recurring-handler]   - actual_start_time: ${pastDataResult.actualStartTime}`);
  console.log(`[enhanced-recurring-handler]   - actual_duration: ${pastDataResult.actualDuration}`);
  console.log(`[enhanced-recurring-handler]   - API success: ${pastDataResult.success}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: instance.uuid || '',
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
      instance_data: instance,
      actual_data: pastDataResult.actualData,
      completion_analysis: completionResult,
      past_data_result: pastDataResult,
      enhanced_calculation: {
        final_end_time: finalEndTime,
        calculation_method: finalEndTime ? (pastDataResult.actualEndTime ? 'api_actual' : 'calculated') : 'none',
        timing_source: {
          start_time: pastDataResult.actualStartTime ? 'api' : (instance.start_time ? 'instance' : 'webinar_data'),
          duration: pastDataResult.actualDuration ? 'api' : (instance.duration ? 'instance' : 'webinar_data'),
          end_time: pastDataResult.actualEndTime ? 'api_actual' : (finalEndTime ? 'calculated' : 'none')
        }
      },
      _is_recurring_instance: true,
      _is_completed: completionResult.isCompleted,
      _identifiers_tried: pastDataResult.identifiersUsed,
      _api_calls_made: pastDataResult.apiCallsMade,
      _api_errors: pastDataResult.errorDetails
    }
  };
  
  // Validate that we have end_time before inserting
  if (!instanceToInsert.end_time) {
    console.warn(`[enhanced-recurring-handler] ⚠️ WARNING: No end_time calculated for instance ${instance.uuid}!`);
    console.warn(`[enhanced-recurring-handler] ⚠️ Input data: start_time=${finalStartTime}, duration=${finalDuration}`);
  } else {
    console.log(`[enhanced-recurring-handler] ✅ Successfully calculated end_time: ${instanceToInsert.end_time}`);
  }
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, instance.uuid || '');
}
