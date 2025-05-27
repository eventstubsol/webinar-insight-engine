
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
  
  if (isCompleted && instance.uuid) {
    // For completed instances, fetch actual data
    try {
      console.log(`[zoom-api][recurring-fetcher] 📡 Fetching actual data for completed instance ${instance.uuid}`);
      
      const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${instance.uuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastResponse.ok) {
        const actualData = await pastResponse.json();
        console.log(`[zoom-api][recurring-fetcher] ✅ Got actual data for instance ${instance.uuid}: duration=${actualData.duration}, participants=${actualData.participants_count}`);
        
        return {
          ...instance,
          duration: actualData.duration || instance.duration || webinarData.duration,
          end_time: actualData.end_time || instance.end_time,
          participants_count: actualData.participants_count || 0,
          _duration_source: 'past_webinar_api',
          _actual_data: actualData
        };
      } else {
        const errorData = await pastResponse.json().catch(() => ({ message: 'Unknown error' }));
        console.warn(`[zoom-api][recurring-fetcher] ⚠️ Could not fetch past data for instance ${instance.uuid}: ${errorData.message}`);
      }
    } catch (error) {
      console.warn(`[zoom-api][recurring-fetcher] ⚠️ Error fetching actual data for instance ${instance.uuid}:`, error);
    }
  }
  
  // Return instance with scheduled data
  const processedInstance = {
    ...instance,
    duration: instance.duration || webinarData.duration,
    participants_count: 0,
    _duration_source: instance.duration ? 'instance_api' : 'scheduled'
  };
  
  console.log(`[zoom-api][recurring-fetcher] 📊 Processed instance ${instanceId} with duration: ${processedInstance.duration} (source: ${processedInstance._duration_source})`);
  return processedInstance;
}
