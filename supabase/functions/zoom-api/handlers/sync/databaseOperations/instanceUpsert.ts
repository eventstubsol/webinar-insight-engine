
/**
 * Upsert instance record in database
 */
export async function upsertInstanceRecord(supabase: any, instanceData: any, webinarId: string, instanceId: string): Promise<number> {
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
        console.error(`[zoom-api][instance-upsert] ❌ Error updating instance:`, updateError);
        return 0;
      } else {
        console.log(`[zoom-api][instance-upsert] ✅ Updated instance ${instanceId} with duration: ${instanceData.duration}, status: ${instanceData.status}`);
        return 1;
      }
    } else {
      // Insert new instance
      const { error: insertError } = await supabase
        .from('zoom_webinar_instances')
        .insert(instanceData);
        
      if (insertError) {
        console.error(`[zoom-api][instance-upsert] ❌ Error inserting instance:`, insertError);
        return 0;
      } else {
        console.log(`[zoom-api][instance-upsert] ✅ Inserted instance ${instanceId} with duration: ${instanceData.duration}, status: ${instanceData.status}`);
        return 1;
      }
    }
  } catch (error) {
    console.error(`[zoom-api][instance-upsert] ❌ Error upserting instance ${instanceId}:`, error);
    return 0;
  }
}
