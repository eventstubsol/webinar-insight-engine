
import { fetchCorrectWebinarData } from '../../../utils/correctZoomApiClient.ts';

/**
 * Fixed handler for recurring webinar instances using correct Zoom API endpoints
 * This handler fetches ALL instances for a recurring webinar, not just one
 */
export async function handleFixedRecurringWebinarInstances(webinar: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[fixed-recurring-handler] 📡 Fetching instances for recurring webinar ${webinar.id} (${webinar.topic})`);
  console.log(`[fixed-recurring-handler] 📊 Using CORRECT Zoom API endpoints per documentation`);
  
  try {
    // Use correct instances endpoint to get ALL instances
    const instancesUrl = `https://api.zoom.us/v2/webinars/${webinar.id}/instances`;
    console.log(`[fixed-recurring-handler] 📡 Calling: ${instancesUrl}`);
    
    const response = await fetch(instancesUrl, {
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
    
    if (instances.length === 0) {
      console.log(`[fixed-recurring-handler] ℹ️ No instances found for webinar ${webinar.id}`);
      return 0;
    }
    
    let instancesProcessed = 0;
    
    // Process EACH instance separately - this is the key fix
    for (const instance of instances) {
      try {
        console.log(`[fixed-recurring-handler] 🔄 Processing instance ${instance.uuid || instance.instance_id} of ${instances.length}`);
        const processedCount = await processFixedRecurringInstance(webinar, instance, token, supabase, userId);
        instancesProcessed += processedCount;
      } catch (error) {
        console.error(`[fixed-recurring-handler] ❌ Error processing instance ${instance.uuid}:`, error);
        // Continue with other instances even if one fails
      }
    }
    
    console.log(`[fixed-recurring-handler] ✅ Successfully processed ${instancesProcessed}/${instances.length} instances for webinar ${webinar.id}`);
    return instancesProcessed;
    
  } catch (error) {
    console.error(`[fixed-recurring-handler] ❌ Error fetching instances for recurring webinar ${webinar.id}:`, error);
    return 0;
  }
}

/**
 * Process a single instance of a recurring webinar using correct API data
 */
async function processFixedRecurringInstance(webinar: any, instance: any, token: string, supabase: any, userId: string): Promise<number> {
  const instanceId = instance.uuid || instance.instance_id || 'unknown';
  console.log(`[fixed-recurring-handler] 🔍 Processing instance ${instanceId}, status: ${instance.status}`);
  
  // Use the correct API client to get comprehensive webinar data
  const apiResult = await fetchCorrectWebinarData(token, webinar.id, instance.uuid);
  
  console.log(`[fixed-recurring-handler] 📡 API Result Summary for instance ${instanceId}:`);
  console.log(`[fixed-recurring-handler]   - success: ${apiResult.success}`);
  console.log(`[fixed-recurring-handler]   - status: ${apiResult.status}`);
  console.log(`[fixed-recurring-handler]   - dataSource: ${apiResult.dataSource}`);
  console.log(`[fixed-recurring-handler]   - actualEndTime: ${apiResult.actualEndTime}`);
  console.log(`[fixed-recurring-handler]   - calculatedEndTime: ${apiResult.calculatedEndTime}`);
  
  // Log API errors if any
  if (apiResult.errorDetails.length > 0) {
    console.warn(`[fixed-recurring-handler] ⚠️ API Errors for instance ${instanceId}:`);
    apiResult.errorDetails.forEach((error, index) => {
      console.warn(`[fixed-recurring-handler]   ${index + 1}. ${error}`);
    });
  }
  
  // Determine final values with proper inheritance: API > instance > webinar > defaults
  const webinarData = apiResult.webinarData || webinar;
  const finalTopic = (instance.topic && instance.topic.trim() !== '') ? instance.topic : 
                    (webinarData.topic && webinarData.topic.trim() !== '') ? webinarData.topic : 'Untitled Webinar';
  
  // For start time: instance scheduled > webinar scheduled
  const finalStartTime = instance.start_time || webinarData.start_time;
  
  // For duration: instance duration > webinar duration
  const finalDuration = instance.duration || webinarData.duration;
  
  // CRITICAL: For end_time, use this priority:
  // 1. Actual end_time from Zoom API (for completed instances)
  // 2. Calculated end_time (start_time + duration)
  // 3. Leave null if no calculation possible
  let finalEndTime = apiResult.actualEndTime || apiResult.calculatedEndTime;
  
  // If we don't have an end time from API, calculate from instance data
  if (!finalEndTime && finalStartTime && finalDuration) {
    try {
      const startDate = new Date(finalStartTime);
      const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
      finalEndTime = endDate.toISOString();
      console.log(`[fixed-recurring-handler] 🧮 Calculated end_time from instance data: ${finalEndTime}`);
    } catch (error) {
      console.warn(`[fixed-recurring-handler] ⚠️ Error calculating end_time:`, error);
    }
  }
  
  // Determine status: use instance status or API status
  const finalStatus = instance.status || apiResult.status || 'unknown';
  
  console.log(`[fixed-recurring-handler] 📊 FINAL VALUES for instance ${instanceId}:`);
  console.log(`[fixed-recurring-handler]   ✅ topic: ${finalTopic}`);
  console.log(`[fixed-recurring-handler]   ✅ start_time: ${finalStartTime}`);
  console.log(`[fixed-recurring-handler]   ✅ duration: ${finalDuration}`);
  console.log(`[fixed-recurring-handler]   ⭐ end_time: ${finalEndTime} (source: ${apiResult.dataSource || 'calculated'}) ⭐`);
  console.log(`[fixed-recurring-handler]   ✅ status: ${finalStatus}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: instanceId, // Use the actual instance ID, not webinar ID
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
      instance_data: instance,
      api_result: {
        success: apiResult.success,
        webinarData: apiResult.webinarData,
        actualEndTime: apiResult.actualEndTime,
        calculatedEndTime: apiResult.calculatedEndTime,
        dataSource: apiResult.dataSource,
        apiCallsMade: apiResult.apiCallsMade,
        errorDetails: apiResult.errorDetails
      },
      timing_calculation: {
        final_end_time: finalEndTime,
        calculation_source: apiResult.dataSource || 'calculated',
        data_sources: {
          start_time: instance.start_time ? 'instance' : 'webinar',
          duration: instance.duration ? 'instance' : 'webinar',
          end_time: apiResult.dataSource || 'calculated'
        }
      },
      _is_recurring_instance: true,
      _api_success: apiResult.success,
      _correct_api_used: true
    }
  };
  
  // Final validation logging
  if (!instanceToInsert.end_time) {
    console.error(`[fixed-recurring-handler] ❌ CRITICAL: No end_time calculated for instance ${instanceId}!`);
    console.error(`[fixed-recurring-handler] ❌ Debug info: start_time=${finalStartTime}, duration=${finalDuration}`);
    console.error(`[fixed-recurring-handler] ❌ API result: ${JSON.stringify(apiResult, null, 2)}`);
  } else {
    console.log(`[fixed-recurring-handler] ✅ SUCCESS: end_time calculated: ${instanceToInsert.end_time}`);
    console.log(`[fixed-recurring-handler] ✅ Data source: ${apiResult.dataSource || 'calculated from instance data'}`);
  }
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, instanceId);
}
