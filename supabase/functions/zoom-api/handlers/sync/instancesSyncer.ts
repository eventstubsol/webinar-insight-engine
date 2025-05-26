
// Functions for syncing webinar instances

export async function syncWebinarInstances(supabase: any, user: any, token: string, webinarId: string) {
  console.log(`[zoom-api][instances-syncer] Fetching instances for: ${webinarId}`);
  
  const instancesRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/instances`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!instancesRes.ok) {
    const errorText = await instancesRes.text();
    console.log(`[zoom-api][instances-syncer] No instances found or error:`, errorText);
    return { count: 0, errors: [] };
  }

  const instancesData = await instancesRes.json();
  
  if (!instancesData.webinars || instancesData.webinars.length === 0) {
    return { count: 0, errors: [] };
  }

  let syncedCount = 0;
  const errors: string[] = [];

  // Process each instance with proper upsert using the new unique constraint
  for (const instance of instancesData.webinars) {
    const { error: instanceError } = await supabase
      .from('zoom_webinar_instances')
      .upsert({
        user_id: user.id,
        webinar_id: webinarId,
        webinar_uuid: instance.uuid,
        instance_id: instance.uuid,
        topic: instance.topic,
        start_time: instance.start_time,
        duration: instance.duration,
        raw_data: instance
      }, {
        onConflict: 'user_id,webinar_id,instance_id',
        ignoreDuplicates: false
      });
    
    if (instanceError) {
      console.error(`[zoom-api][instances-syncer] Error inserting instance:`, instanceError);
      errors.push(`Instance ${instance.uuid}: ${instanceError.message}`);
    } else {
      syncedCount += 1;
    }
  }
  
  console.log(`[zoom-api][instances-syncer] Synced ${syncedCount} instances for: ${webinarId}`);
  return { count: syncedCount, errors };
}
