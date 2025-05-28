
/**
 * Database operations for upserting webinar instances
 */

export async function upsertInstanceRecord(
  supabase: any, 
  instanceData: any, 
  webinarId: string, 
  instanceId: string
): Promise<number> {
  
  console.log(`[instance-upsert] 💾 Upserting instance ${instanceId} for webinar ${webinarId}`);
  
  try {
    // Ensure raw_data is never null
    const rawData = instanceData.raw_data || {
      fallback_data: true,
      created_at: new Date().toISOString()
    };
    
    const { error: upsertError } = await supabase
      .from('zoom_webinar_instances')
      .upsert({
        ...instanceData,
        raw_data: rawData // Ensure this is never null
      }, {
        onConflict: 'user_id,webinar_id,instance_id',
        ignoreDuplicates: false
      });
    
    if (upsertError) {
      console.error(`[instance-upsert] ❌ Error upserting instance ${instanceId}:`, upsertError);
      return 0;
    }
    
    console.log(`[instance-upsert] ✅ Successfully upserted instance ${instanceId}`);
    return 1;
    
  } catch (error) {
    console.error(`[instance-upsert] ❌ Error in upsertInstanceRecord:`, error);
    return 0;
  }
}
