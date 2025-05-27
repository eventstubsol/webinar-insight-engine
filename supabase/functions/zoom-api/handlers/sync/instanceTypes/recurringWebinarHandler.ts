
/**
 * Handles recurring webinar instances by fetching their instances with proper actual timing data
 */
export async function handleRecurringWebinarInstances(webinar: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[zoom-api][recurring-handler] 📡 Fetching instances for recurring webinar ${webinar.id} (${webinar.topic})`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
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
 * Process a single instance of a recurring webinar with proper actual timing data
 */
async function processRecurringInstance(webinar: any, instance: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[zoom-api][recurring-handler] 🔍 Processing recurring instance ${instance.uuid} - Status: ${instance.status}`);
  
  let actualStartTime = null;
  let actualDuration = null;
  let actualEndTime = null;
  let actualData = null;
  
  // Determine if instance is completed
  const isCompleted = instance.status === 'ended' || instance.status === 'aborted';
  
  // For completed instances, fetch actual data using past webinars API with instance UUID
  if (isCompleted && instance.uuid) {
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
        actualStartTime = actualData.start_time || null;
        actualDuration = actualData.duration || null;
        actualEndTime = actualData.end_time || null;
        
        console.log(`[zoom-api][recurring-handler] ✅ Got actual timing data for instance ${instance.uuid}:`);
        console.log(`[zoom-api][recurring-handler]   - actual_start_time: ${actualStartTime}`);
        console.log(`[zoom-api][recurring-handler]   - actual_duration: ${actualDuration}`);
        console.log(`[zoom-api][recurring-handler]   - actual_end_time: ${actualEndTime}`);
      } else {
        const errorData = await pastResponse.json().catch(() => ({ message: 'Unknown error' }));
        console.warn(`[zoom-api][recurring-handler] ⚠️ Could not fetch past data for instance ${instance.uuid}: ${errorData.message}`);
      }
    } catch (error) {
      console.warn(`[zoom-api][recurring-handler] ⚠️ Error fetching actual data for instance ${instance.uuid}:`, error);
    }
  }
  
  // Determine final values: inherit from webinar, override with instance, then with actual data
  const finalStartTime = instance.start_time || webinar.start_time;
  const finalDuration = actualDuration || instance.duration || webinar.duration || null;
  const finalEndTime = actualEndTime || (finalStartTime && finalDuration ? 
    new Date(new Date(finalStartTime).getTime() + (finalDuration * 60000)).toISOString() : null);
  
  // Determine proper status
  let finalStatus = instance.status;
  if (!finalStatus) {
    if (finalStartTime) {
      const now = new Date();
      const startTime = new Date(finalStartTime);
      if (now > startTime && finalEndTime) {
        const endTime = new Date(finalEndTime);
        finalStatus = now > endTime ? 'ended' : 'started';
      } else {
        finalStatus = now > startTime ? 'started' : 'waiting';
      }
    } else {
      finalStatus = 'waiting';
    }
  }
  
  // Use webinar topic if instance doesn't have one
  const finalTopic = instance.topic || webinar.topic || 'Untitled Webinar';
  
  console.log(`[zoom-api][recurring-handler] 📊 Final data for instance ${instance.uuid}:`);
  console.log(`[zoom-api][recurring-handler]   - topic: ${finalTopic}`);
  console.log(`[zoom-api][recurring-handler]   - start_time: ${finalStartTime}`);
  console.log(`[zoom-api][recurring-handler]   - duration: ${finalDuration}`);
  console.log(`[zoom-api][recurring-handler]   - end_time: ${finalEndTime}`);
  console.log(`[zoom-api][recurring-handler]   - status: ${finalStatus}`);
  console.log(`[zoom-api][recurring-handler]   - actual_start_time: ${actualStartTime}`);
  console.log(`[zoom-api][recurring-handler]   - actual_duration: ${actualDuration}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: instance.uuid || '',
    start_time: finalStartTime,
    end_time: finalEndTime,
    duration: finalDuration,
    actual_start_time: actualStartTime,
    actual_duration: actualDuration,
    topic: finalTopic,
    status: finalStatus,
    registrants_count: 0,
    participants_count: actualData?.participants_count || 0,
    raw_data: {
      webinar_data: webinar,
      instance_data: instance,
      actual_data: actualData,
      _timing_source: {
        start_time: instance.start_time ? 'instances_api' : 'webinar_data',
        actual_start_time: actualStartTime ? 'past_webinar_api' : 'none',
        actual_duration: actualDuration ? 'past_webinar_api' : 'none',
        scheduled_duration: instance.duration ? 'instances_api' : (webinar.duration ? 'webinar_data' : 'none'),
        end_time: actualEndTime ? 'past_webinar_api' : (finalEndTime ? 'calculated' : 'none')
      },
      _is_recurring_instance: true,
      _is_completed: isCompleted
    }
  };
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, instance.uuid || '');
}
