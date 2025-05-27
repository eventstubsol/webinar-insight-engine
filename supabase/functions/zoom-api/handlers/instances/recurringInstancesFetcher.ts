
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
  const isCompleted = instance.status === 'ended' || instance.status === 'aborted';
  
  console.log(`[zoom-api][recurring-fetcher] 🔍 Processing instance ${instanceId}, status: ${instance.status}, completed: ${isCompleted}`);
  
  let actualStartTime = null;
  let actualDuration = null;
  let actualData = null;
  
  if (isCompleted && instance.uuid) {
    // For completed instances, fetch actual data
    try {
      console.log(`[zoom-api][recurring-fetcher] 📡 Fetching actual timing data for completed instance ${instance.uuid}`);
      
      const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${instance.uuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastResponse.ok) {
        actualData = await pastResponse.json();
        actualStartTime = actualData.start_time || null;
        actualDuration = actualData.duration || null;
        console.log(`[zoom-api][recurring-fetcher] ✅ Got actual timing data for instance ${instance.uuid}:`);
        console.log(`[zoom-api][recurring-fetcher]   - actual_start_time: ${actualStartTime}`);
        console.log(`[zoom-api][recurring-fetcher]   - actual_duration: ${actualDuration}`);
      } else {
        const errorData = await pastResponse.json().catch(() => ({ message: 'Unknown error' }));
        console.warn(`[zoom-api][recurring-fetcher] ⚠️ Could not fetch past data for instance ${instance.uuid}: ${errorData.message}`);
      }
    } catch (error) {
      console.warn(`[zoom-api][recurring-fetcher] ⚠️ Error fetching actual data for instance ${instance.uuid}:`, error);
    }
  }
  
  // Return instance with both scheduled and actual timing data
  const processedInstance = {
    ...instance,
    duration: instance.duration || webinarData.duration,
    actual_start_time: actualStartTime,
    actual_duration: actualDuration,
    participants_count: actualData?.participants_count || 0,
    _timing_source: {
      actual_start_time: actualStartTime ? 'past_webinar_api' : 'none',
      actual_duration: actualDuration ? 'past_webinar_api' : 'none',
      scheduled_start_time: instance.start_time ? 'instances_api' : 'none',
      scheduled_duration: instance.duration ? 'instances_api' : (webinarData.duration ? 'webinar_data' : 'none')
    },
    _actual_data: actualData
  };
  
  console.log(`[zoom-api][recurring-fetcher] 📊 Processed instance ${instanceId}:`);
  console.log(`[zoom-api][recurring-fetcher]   - scheduled: start=${instance.start_time}, duration=${processedInstance.duration}`);
  console.log(`[zoom-api][recurring-fetcher]   - actual: start=${actualStartTime}, duration=${actualDuration}`);
  
  return processedInstance;
}
