
/**
 * Handles recurring webinar instances by fetching their instances
 */
export async function handleRecurringWebinarInstances(webinar: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[zoom-api][recurring-handler] 📡 Fetching instances for recurring webinar ${webinar.id}`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.warn(`[zoom-api][recurring-handler] ⚠️ Failed to fetch instances for recurring webinar ${webinar.id}: ${errorData.message}`);
      return 0;
    }
    
    const data = await response.json();
    const instances = data.instances || [];
    
    console.log(`[zoom-api][recurring-handler] 📊 Found ${instances.length} instances for recurring webinar ${webinar.id}`);
    
    let instancesProcessed = 0;
    
    for (const instance of instances) {
      try {
        const processedCount = await processRecurringInstance(webinar, instance, token, supabase, userId);
        instancesProcessed += processedCount;
      } catch (error) {
        console.error(`[zoom-api][recurring-handler] ❌ Error processing instance ${instance.uuid}:`, error);
      }
    }
    
    return instancesProcessed;
    
  } catch (error) {
    console.error(`[zoom-api][recurring-handler] ❌ Error fetching instances for recurring webinar ${webinar.id}:`, error);
    return 0;
  }
}

/**
 * Process a single instance of a recurring webinar
 */
async function processRecurringInstance(webinar: any, instance: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[zoom-api][recurring-handler] 🔍 Processing recurring instance ${instance.uuid} - Status: ${instance.status}`);
  
  let instanceDetails = { ...instance };
  let actualStartTime = null;
  let actualDuration = null;
  let actualData = null;
  
  // For completed instances, fetch actual data using past webinars API with instance UUID
  if (instance.uuid && (instance.status === 'ended' || instance.status === 'aborted')) {
    try {
      console.log(`[zoom-api][recurring-handler] 📡 Fetching actual timing data for completed instance ${instance.uuid}`);
      const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${instance.uuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastResponse.ok) {
        actualData = await pastResponse.json();
        instanceDetails = { ...instanceDetails, ...actualData };
        actualStartTime = actualData.start_time || null;
        actualDuration = actualData.duration || null;
        console.log(`[zoom-api][recurring-handler] ✅ Got actual timing data for instance ${instance.uuid}:`);
        console.log(`[zoom-api][recurring-handler]   - actual_start_time: ${actualStartTime}`);
        console.log(`[zoom-api][recurring-handler]   - actual_duration: ${actualDuration}`);
      } else {
        console.warn(`[zoom-api][recurring-handler] ⚠️ Could not fetch past data for instance ${instance.uuid}`);
      }
    } catch (error) {
      console.warn(`[zoom-api][recurring-handler] ⚠️ Error fetching past data for instance ${instance.uuid}:`, error);
    }
  }
  
  // Determine final duration: actual > instance scheduled > webinar scheduled
  const finalDuration = actualDuration || instanceDetails.duration || webinar.duration || null;
  const finalStartTime = actualStartTime || instance.start_time;
  
  // Calculate end time for completed instances
  let endTime = null;
  if (instance.status === 'ended' || instance.status === 'aborted') {
    if (instanceDetails.end_time) {
      endTime = instanceDetails.end_time;
    } else if (finalStartTime && finalDuration) {
      // Calculate end time from start time + duration
      const startDate = new Date(finalStartTime);
      const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
      endTime = endDate.toISOString();
    }
  }
  
  console.log(`[zoom-api][recurring-handler] 📊 Final timing data for instance ${instance.uuid}:`);
  console.log(`[zoom-api][recurring-handler]   - scheduled: start=${instance.start_time}, duration=${instanceDetails.duration || webinar.duration}`);
  console.log(`[zoom-api][recurring-handler]   - actual: start=${actualStartTime}, duration=${actualDuration}`);
  console.log(`[zoom-api][recurring-handler]   - final: duration=${finalDuration}, status=${instance.status}, end=${endTime}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: instance.uuid || '',
    start_time: instance.start_time || null,
    end_time: endTime,
    duration: instanceDetails.duration || webinar.duration || null,
    actual_start_time: actualStartTime,
    actual_duration: actualDuration,
    topic: webinar.topic || instanceDetails.topic || 'Untitled Webinar',
    status: instance.status || null,
    registrants_count: 0,
    participants_count: instanceDetails.participants_count || 0,
    raw_data: {
      ...instanceDetails,
      _timing_source: {
        actual_start_time: actualStartTime ? 'past_webinar_api' : 'none',
        actual_duration: actualDuration ? 'past_webinar_api' : 'none',
        scheduled_start_time: instance.start_time ? 'instances_api' : 'none',
        scheduled_duration: instanceDetails.duration ? 'instances_api' : (webinar.duration ? 'webinar_data' : 'none')
      },
      _is_recurring_instance: true,
      _actual_data: actualData
    }
  };
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, instance.uuid || '');
}
