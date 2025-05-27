
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
  let actualDuration = null;
  
  // For completed instances, fetch actual data using past webinars API with instance UUID
  if (instance.uuid && (instance.status === 'ended' || instance.status === 'aborted')) {
    try {
      console.log(`[zoom-api][recurring-handler] 📡 Fetching actual data for completed instance ${instance.uuid}`);
      const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${instance.uuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastResponse.ok) {
        const pastData = await pastResponse.json();
        instanceDetails = { ...instanceDetails, ...pastData };
        actualDuration = pastData.duration || null;
        console.log(`[zoom-api][recurring-handler] ✅ Got actual duration for instance ${instance.uuid}: ${actualDuration} minutes`);
      } else {
        console.warn(`[zoom-api][recurring-handler] ⚠️ Could not fetch past data for instance ${instance.uuid}`);
      }
    } catch (error) {
      console.warn(`[zoom-api][recurring-handler] ⚠️ Error fetching past data for instance ${instance.uuid}:`, error);
    }
  }
  
  // Determine final duration: actual > instance scheduled > webinar scheduled
  const finalDuration = actualDuration || instanceDetails.duration || webinar.duration || null;
  
  // Calculate end time for completed instances
  let endTime = null;
  if (instance.status === 'ended' || instance.status === 'aborted') {
    if (instanceDetails.end_time) {
      endTime = instanceDetails.end_time;
    } else if (instance.start_time && finalDuration) {
      // Calculate end time from start time + duration
      const startDate = new Date(instance.start_time);
      const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
      endTime = endDate.toISOString();
    }
  }
  
  console.log(`[zoom-api][recurring-handler] 📊 Final data for instance ${instance.uuid}: duration=${finalDuration}, status=${instance.status}, endTime=${endTime}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: instance.uuid || '',
    start_time: instance.start_time || null,
    end_time: endTime,
    duration: finalDuration,
    topic: webinar.topic || instanceDetails.topic || 'Untitled Webinar',
    status: instance.status || null,
    registrants_count: 0,
    participants_count: instanceDetails.participants_count || 0,
    raw_data: {
      ...instanceDetails,
      _duration_source: actualDuration ? 'past_webinar_api' : (instanceDetails.duration ? 'instance_api' : 'scheduled'),
      _actual_duration: actualDuration,
      _instance_duration: instanceDetails.duration,
      _scheduled_duration: webinar.duration,
      _is_recurring_instance: true
    }
  };
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, instance.uuid || '');
}
