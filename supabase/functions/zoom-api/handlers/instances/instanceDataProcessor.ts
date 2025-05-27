
/**
 * Processes and transforms instance data for database storage
 */
export async function processInstanceForDatabase(
  instance: any, 
  webinarData: any, 
  webinarId: string, 
  userId: string
) {
  return {
    user_id: userId,
    webinar_id: webinarId,
    webinar_uuid: webinarData.uuid || '',
    instance_id: instance.uuid || instance.id || '',
    start_time: instance.start_time || null,
    end_time: instance.end_time || null,
    duration: instance.duration || null,
    topic: webinarData.topic || instance.topic || 'Untitled Webinar',
    status: instance.status || null,
    registrants_count: instance.registrants_count || 0,
    participants_count: instance.participants_count || 0,
    raw_data: {
      ...instance,
      _webinar_data: webinarData
    }
  };
}

/**
 * Upserts instance data in the database
 */
export async function upsertInstanceData(supabase: any, instanceData: any, webinarId: string, instanceId: string) {
  // Check if this instance already exists
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
      console.error(`[zoom-api][get-webinar-instances] Error updating instance:`, updateError);
    } else {
      console.log(`[zoom-api][get-webinar-instances] ✅ Updated instance ${instanceId} with duration: ${instanceData.duration}`);
    }
  } else {
    // Insert new instance
    const { error: insertError } = await supabase
      .from('zoom_webinar_instances')
      .insert(instanceData);
      
    if (insertError) {
      console.error(`[zoom-api][get-webinar-instances] Error inserting instance:`, insertError);
    } else {
      console.log(`[zoom-api][get-webinar-instances] ✅ Inserted instance ${instanceId} with duration: ${instanceData.duration}`);
    }
  }
}
