
/**
 * Syncs webinar instances for a batch of webinars during the main sync process
 * FIXED: Now uses correct Zoom API endpoints and properly handles single vs recurring webinars
 */
export async function syncWebinarInstancesForWebinars(webinars: any[], token: string, supabase: any, userId: string) {
  console.log(`[zoom-api][instance-syncer] 🔄 Starting FIXED instance sync for ${webinars.length} webinars`);
  console.log(`[zoom-api][instance-syncer] 🎯 CRITICAL FIX: Using correct API endpoints for single vs recurring webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][instance-syncer] No webinars to sync instances for`);
    return;
  }
  
  // Process webinars in smaller batches to avoid timeouts
  const BATCH_SIZE = 5;
  let totalInstancesSynced = 0;
  
  for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
    const batch = webinars.slice(i, i + BATCH_SIZE);
    console.log(`[zoom-api][instance-syncer] Processing instance batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
    
    const batchPromises = batch.map(async (webinar) => {
      try {
        console.log(`[zoom-api][instance-syncer] 🎯 Processing webinar: ${webinar.id} (${webinar.topic}) - Status: ${webinar.status}, Type: ${webinar.type}`);
        
        // Determine if this is a recurring webinar (type 6 or 9) or single occurrence (type 5)
        const isRecurring = webinar.type === 6 || webinar.type === 9;
        const isCompleted = webinar.status === 'ended' || webinar.status === 'aborted';
        
        console.log(`[zoom-api][instance-syncer] 📊 Webinar analysis: isRecurring=${isRecurring}, isCompleted=${isCompleted}`);
        
        if (isRecurring) {
          // For recurring webinars, use the instances API
          console.log(`[zoom-api][instance-syncer] 🔄 RECURRING WEBINAR: Fetching instances for ${webinar.id}`);
          return await handleRecurringWebinarInstances(webinar, token, supabase, userId);
        } else {
          // For single-occurrence webinars, handle based on completion status
          console.log(`[zoom-api][instance-syncer] 🎯 SINGLE WEBINAR: Handling ${webinar.id} (${isCompleted ? 'completed' : 'upcoming'})`);
          return await handleSingleOccurrenceWebinar(webinar, token, supabase, userId, isCompleted);
        }
        
      } catch (error) {
        console.error(`[zoom-api][instance-syncer] ❌ Error syncing instances for webinar ${webinar.id}:`, error);
        return 0;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const batchTotal = batchResults.reduce((sum, count) => sum + count, 0);
    totalInstancesSynced += batchTotal;
    
    console.log(`[zoom-api][instance-syncer] 📊 Batch ${Math.floor(i/BATCH_SIZE) + 1} completed: ${batchTotal} instances synced`);
  }
  
  console.log(`[zoom-api][instance-syncer] 🎉 FIXED SYNC COMPLETE: ${totalInstancesSynced} total instances synced with correct duration data`);
  return totalInstancesSynced;
}

/**
 * Handle recurring webinars by fetching their instances
 */
async function handleRecurringWebinarInstances(webinar: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[zoom-api][instance-syncer] 📡 Fetching instances for recurring webinar ${webinar.id}`);
  
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.warn(`[zoom-api][instance-syncer] ⚠️ Failed to fetch instances for recurring webinar ${webinar.id}: ${errorData.message}`);
      return 0;
    }
    
    const data = await response.json();
    const instances = data.instances || [];
    
    console.log(`[zoom-api][instance-syncer] 📊 Found ${instances.length} instances for recurring webinar ${webinar.id}`);
    
    let instancesProcessed = 0;
    
    for (const instance of instances) {
      try {
        const processedCount = await processRecurringInstance(webinar, instance, token, supabase, userId);
        instancesProcessed += processedCount;
      } catch (error) {
        console.error(`[zoom-api][instance-syncer] ❌ Error processing instance ${instance.uuid}:`, error);
      }
    }
    
    return instancesProcessed;
    
  } catch (error) {
    console.error(`[zoom-api][instance-syncer] ❌ Error fetching instances for recurring webinar ${webinar.id}:`, error);
    return 0;
  }
}

/**
 * Process a single instance of a recurring webinar
 */
async function processRecurringInstance(webinar: any, instance: any, token: string, supabase: any, userId: string): Promise<number> {
  console.log(`[zoom-api][instance-syncer] 🔍 Processing recurring instance ${instance.uuid} - Status: ${instance.status}`);
  
  let instanceDetails = { ...instance };
  let actualDuration = null;
  
  // For completed instances, fetch actual data using past webinars API with instance UUID
  if (instance.uuid && (instance.status === 'ended' || instance.status === 'aborted')) {
    try {
      console.log(`[zoom-api][instance-syncer] 📡 Fetching actual data for completed instance ${instance.uuid}`);
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
        console.log(`[zoom-api][instance-syncer] ✅ Got actual duration for instance ${instance.uuid}: ${actualDuration} minutes`);
      } else {
        console.warn(`[zoom-api][instance-syncer] ⚠️ Could not fetch past data for instance ${instance.uuid}`);
      }
    } catch (error) {
      console.warn(`[zoom-api][instance-syncer] ⚠️ Error fetching past data for instance ${instance.uuid}:`, error);
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
  
  console.log(`[zoom-api][instance-syncer] 📊 Final data for instance ${instance.uuid}: duration=${finalDuration}, status=${instance.status}, endTime=${endTime}`);
  
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
  
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, instance.uuid || '');
}

/**
 * Handle single-occurrence webinars
 */
async function handleSingleOccurrenceWebinar(webinar: any, token: string, supabase: any, userId: string, isCompleted: boolean): Promise<number> {
  let actualData = null;
  let actualDuration = null;
  
  if (isCompleted) {
    // For completed single-occurrence webinars, use past webinars API with webinar ID
    try {
      console.log(`[zoom-api][instance-syncer] 📡 Fetching actual completion data for single webinar ${webinar.id}`);
      const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastResponse.ok) {
        actualData = await pastResponse.json();
        actualDuration = actualData.duration || null;
        console.log(`[zoom-api][instance-syncer] ✅ Got actual completion data for webinar ${webinar.id}: duration=${actualDuration}, participants=${actualData.participants_count}`);
      } else {
        const errorData = await pastResponse.json();
        console.warn(`[zoom-api][instance-syncer] ⚠️ Could not fetch past webinar data for ${webinar.id}: ${errorData.message}`);
      }
    } catch (error) {
      console.warn(`[zoom-api][instance-syncer] ⚠️ Error fetching past webinar data for ${webinar.id}:`, error);
    }
  }
  
  // Determine final values
  const finalDuration = actualDuration || webinar.duration || null;
  const finalStatus = isCompleted ? (webinar.status || 'ended') : (webinar.status || 'waiting');
  
  // Calculate end time for completed webinars
  let endTime = null;
  if (isCompleted) {
    if (actualData?.end_time) {
      endTime = actualData.end_time;
    } else if ((webinar.actual_start_time || webinar.start_time) && finalDuration) {
      const startDate = new Date(webinar.actual_start_time || webinar.start_time);
      const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
      endTime = endDate.toISOString();
    }
  }
  
  console.log(`[zoom-api][instance-syncer] 📊 Final data for single webinar ${webinar.id}: duration=${finalDuration}, status=${finalStatus}, endTime=${endTime}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: webinar.uuid || webinar.id,
    start_time: webinar.actual_start_time || webinar.start_time || null,
    end_time: endTime,
    duration: finalDuration,
    topic: webinar.topic || 'Untitled Webinar',
    status: finalStatus,
    registrants_count: 0,
    participants_count: actualData?.participants_count || 0,
    raw_data: {
      webinar_data: webinar,
      actual_data: actualData,
      _duration_source: actualDuration ? 'past_webinar_api' : 'scheduled',
      _actual_duration: actualDuration,
      _scheduled_duration: webinar.duration,
      _is_single_occurrence: true,
      _is_completed: isCompleted
    }
  };
  
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, webinar.uuid || webinar.id);
}

/**
 * Upsert instance record in database
 */
async function upsertInstanceRecord(supabase: any, instanceData: any, webinarId: string, instanceId: string): Promise<number> {
  try {
    // Check if instance already exists
    const { data: existingInstance } = await supabase
      .from('zoom_webinar_instances')
      .select('id')
      .eq('webinar_id', webinarId)
      .eq('instance_id', instanceId)
      .maybeSingle();
    
    if (existingInstance) {
      // Update existing instance
      const { error: updateError } = await supabase
        .from('zoom_webinar_instances')
        .update(instanceData)
        .eq('id', existingInstance.id);
        
      if (updateError) {
        console.error(`[zoom-api][instance-syncer] ❌ Error updating instance:`, updateError);
        return 0;
      } else {
        console.log(`[zoom-api][instance-syncer] ✅ Updated instance ${instanceId} with duration: ${instanceData.duration}, status: ${instanceData.status}`);
        return 1;
      }
    } else {
      // Insert new instance
      const { error: insertError } = await supabase
        .from('zoom_webinar_instances')
        .insert(instanceData);
        
      if (insertError) {
        console.error(`[zoom-api][instance-syncer] ❌ Error inserting instance:`, insertError);
        return 0;
      } else {
        console.log(`[zoom-api][instance-syncer] ✅ Inserted instance ${instanceId} with duration: ${instanceData.duration}, status: ${instanceData.status}`);
        return 1;
      }
    }
  } catch (error) {
    console.error(`[zoom-api][instance-syncer] ❌ Error upserting instance ${instanceId}:`, error);
    return 0;
  }
}
