
/**
 * Handles fetching instances for recurring webinars
 */
export async function fetchRecurringWebinarInstances(webinarId: string, token: string, webinarData: any): Promise<any[]> {
  try {
    console.log(`[zoom-api][get-webinar-instances] Fetching instances for recurring webinar ${webinarId}`);
    
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.warn(`[zoom-api][get-webinar-instances] Failed to fetch instances: ${errorData.message}`);
      return [];
    }
    
    const data = await response.json();
    const instances = data.instances || [];
    
    // Process each instance to get actual completion data if needed
    const processedInstances = [];
    for (const instance of instances) {
      const processedInstance = await processRecurringInstance(instance, token, webinarData);
      processedInstances.push(processedInstance);
    }
    
    return processedInstances;
    
  } catch (error) {
    console.error(`[zoom-api][get-webinar-instances] Error fetching recurring instances:`, error);
    return [];
  }
}

/**
 * Processes an individual recurring webinar instance
 */
async function processRecurringInstance(instance: any, token: string, webinarData: any): Promise<any> {
  const isCompleted = instance.status === 'ended' || instance.status === 'aborted';
  
  if (isCompleted && instance.uuid) {
    // For completed instances, fetch actual data
    try {
      console.log(`[zoom-api][get-webinar-instances] Fetching actual data for completed instance ${instance.uuid}`);
      const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${instance.uuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastResponse.ok) {
        const actualData = await pastResponse.json();
        console.log(`[zoom-api][get-webinar-instances] ✅ Got actual data for instance ${instance.uuid}: duration=${actualData.duration}`);
        
        return {
          ...instance,
          duration: actualData.duration || instance.duration || webinarData.duration,
          end_time: actualData.end_time || instance.end_time,
          participants_count: actualData.participants_count || 0,
          _duration_source: 'past_webinar_api',
          _actual_data: actualData
        };
      }
    } catch (error) {
      console.warn(`[zoom-api][get-webinar-instances] Error fetching actual data for instance ${instance.uuid}:`, error);
    }
  }
  
  // Return instance with scheduled data
  return {
    ...instance,
    duration: instance.duration || webinarData.duration,
    participants_count: 0,
    _duration_source: instance.duration ? 'instance_api' : 'scheduled'
  };
}
