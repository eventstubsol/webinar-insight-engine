
/**
 * Processes and transforms instance data for database storage
 */
export async function processInstanceForDatabase(
  instance: any, 
  webinarData: any, 
  webinarId: string, 
  userId: string
) {
  try {
    // Extract actual timing data with priority: actual > instance > scheduled
    const actualStartTime = instance.actual_start_time || instance.start_time || null;
    const actualDuration = instance.actual_duration || instance.duration || webinarData.duration || null;
    
    console.log(`[zoom-api][instance-processor] 📊 Processing timing data for instance ${instance.uuid || instance.id}:`);
    console.log(`[zoom-api][instance-processor]   - actual_start_time: ${actualStartTime}`);
    console.log(`[zoom-api][instance-processor]   - actual_duration: ${actualDuration}`);
    console.log(`[zoom-api][instance-processor]   - scheduled_start_time: ${instance.start_time}`);
    console.log(`[zoom-api][instance-processor]   - scheduled_duration: ${instance.duration || webinarData.duration}`);
    
    return {
      user_id: userId,
      webinar_id: webinarId,
      webinar_uuid: webinarData.uuid || '',
      instance_id: instance.uuid || instance.id || '',
      start_time: instance.start_time || null,
      end_time: instance.end_time || null,
      duration: instance.duration || webinarData.duration || null,
      actual_start_time: actualStartTime,
      actual_duration: actualDuration,
      topic: webinarData.topic || instance.topic || 'Untitled Webinar',
      status: instance.status || null,
      registrants_count: instance.registrants_count || 0,
      participants_count: instance.participants_count || 0,
      raw_data: {
        ...instance,
        _webinar_data: webinarData,
        _timing_source: {
          actual_start_time: instance.actual_start_time ? 'api_actual' : (instance.start_time ? 'api_scheduled' : 'none'),
          actual_duration: instance.actual_duration ? 'api_actual' : (instance.duration ? 'api_scheduled' : (webinarData.duration ? 'webinar_scheduled' : 'none'))
        }
      }
    };
  } catch (error) {
    console.error(`[zoom-api][instance-processor] ❌ Error processing instance data for ${webinarId}:`, error);
    throw new Error(`Failed to process instance data: ${error.message}`);
  }
}

/**
 * Upserts instance data in the database
 */
export async function upsertInstanceData(supabase: any, instanceData: any, webinarId: string, instanceId: string): Promise<void> {
  try {
    console.log(`[zoom-api][instance-processor] 🔄 Upserting instance ${instanceId} for webinar ${webinarId}`);
    
    // Check if this instance already exists
    const { data: existingInstance, error: selectError } = await supabase
      .from('zoom_webinar_instances')
      .select('id')
      .eq('webinar_id', webinarId)
      .eq('instance_id', instanceId)
      .maybeSingle();
    
    if (selectError) {
      console.error(`[zoom-api][instance-processor] ❌ Error checking existing instance ${instanceId}:`, selectError);
      throw new Error(`Database select error: ${selectError.message}`);
    }
    
    if (existingInstance) {
      // Update existing instance
      const { error: updateError } = await supabase
        .from('zoom_webinar_instances')
        .update(instanceData)
        .eq('id', existingInstance.id);
        
      if (updateError) {
        console.error(`[zoom-api][instance-processor] ❌ Error updating instance ${instanceId}:`, updateError);
        throw new Error(`Failed to update instance: ${updateError.message}`);
      } else {
        console.log(`[zoom-api][instance-processor] ✅ Updated instance ${instanceId} with duration: ${instanceData.duration}, status: ${instanceData.status}`);
      }
    } else {
      // Insert new instance
      const { error: insertError } = await supabase
        .from('zoom_webinar_instances')
        .insert(instanceData);
        
      if (insertError) {
        console.error(`[zoom-api][instance-processor] ❌ Error inserting instance ${instanceId}:`, insertError);
        throw new Error(`Failed to insert instance: ${insertError.message}`);
      } else {
        console.log(`[zoom-api][instance-processor] ✅ Inserted instance ${instanceId} with duration: ${instanceData.duration}, status: ${instanceData.status}`);
      }
    }
  } catch (error) {
    console.error(`[zoom-api][instance-processor] ❌ Error upserting instance ${instanceId}:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}
