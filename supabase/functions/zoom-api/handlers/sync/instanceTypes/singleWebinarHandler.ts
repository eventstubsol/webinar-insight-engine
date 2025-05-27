
/**
 * Handles single-occurrence webinars with proper actual timing data collection
 */
export async function handleSingleOccurrenceWebinar(webinar: any, token: string, supabase: any, userId: string, isCompleted: boolean): Promise<number> {
  let actualData = null;
  let actualStartTime = null;
  let actualDuration = null;
  let actualEndTime = null;
  
  console.log(`[zoom-api][single-handler] 📊 Processing single webinar ${webinar.id} (${webinar.topic})`);
  console.log(`[zoom-api][single-handler] 📊 Webinar data: start_time=${webinar.start_time}, duration=${webinar.duration}, status=${webinar.status}`);
  
  if (isCompleted) {
    // For completed single-occurrence webinars, use past webinars API with webinar UUID
    try {
      console.log(`[zoom-api][single-handler] 📡 Fetching actual timing data for completed single webinar ${webinar.id} with UUID: ${webinar.uuid}`);
      
      // Use webinar UUID for past webinars API call
      const apiIdentifier = webinar.uuid || webinar.id;
      const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${apiIdentifier}`, {
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
        
        console.log(`[zoom-api][single-handler] ✅ Got actual timing data for webinar ${webinar.id}:`);
        console.log(`[zoom-api][single-handler]   - actual_start_time: ${actualStartTime}`);
        console.log(`[zoom-api][single-handler]   - actual_duration: ${actualDuration}`);
        console.log(`[zoom-api][single-handler]   - actual_end_time: ${actualEndTime}`);
      } else {
        const errorData = await pastResponse.json().catch(() => ({ message: 'Unknown error' }));
        console.warn(`[zoom-api][single-handler] ⚠️ Could not fetch past webinar data for ${webinar.id}: ${errorData.message}`);
      }
    } catch (error) {
      console.warn(`[zoom-api][single-handler] ⚠️ Error fetching past webinar data for ${webinar.id}:`, error);
    }
  }
  
  // Determine final values with priority: actual > webinar scheduled
  const finalStartTime = webinar.start_time; // This is already the actual start time from webinar data
  const finalDuration = actualDuration || webinar.duration || null;
  const finalEndTime = actualEndTime || (finalStartTime && finalDuration ? 
    new Date(new Date(finalStartTime).getTime() + (finalDuration * 60000)).toISOString() : null);
  
  // Determine proper status based on completion and timing
  let finalStatus = webinar.status;
  if (!finalStatus) {
    if (isCompleted) {
      finalStatus = 'ended';
    } else if (webinar.start_time) {
      const now = new Date();
      const startTime = new Date(webinar.start_time);
      finalStatus = now > startTime ? 'started' : 'waiting';
    } else {
      finalStatus = 'waiting';
    }
  }
  
  console.log(`[zoom-api][single-handler] 📊 Final data for single webinar ${webinar.id}:`);
  console.log(`[zoom-api][single-handler]   - topic: ${webinar.topic}`);
  console.log(`[zoom-api][single-handler]   - start_time: ${finalStartTime}`);
  console.log(`[zoom-api][single-handler]   - duration: ${finalDuration}`);
  console.log(`[zoom-api][single-handler]   - end_time: ${finalEndTime}`);
  console.log(`[zoom-api][single-handler]   - status: ${finalStatus}`);
  console.log(`[zoom-api][single-handler]   - actual_start_time: ${actualStartTime}`);
  console.log(`[zoom-api][single-handler]   - actual_duration: ${actualDuration}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: webinar.uuid || webinar.id,
    start_time: finalStartTime,
    end_time: finalEndTime,
    duration: finalDuration,
    actual_start_time: actualStartTime,
    actual_duration: actualDuration,
    topic: webinar.topic || 'Untitled Webinar',
    status: finalStatus,
    registrants_count: 0,
    participants_count: actualData?.participants_count || 0,
    raw_data: {
      webinar_data: webinar,
      actual_data: actualData,
      _timing_source: {
        start_time: 'webinar_api',
        actual_start_time: actualStartTime ? 'past_webinar_api' : 'none',
        actual_duration: actualDuration ? 'past_webinar_api' : 'none',
        scheduled_duration: webinar.duration ? 'webinar_data' : 'none',
        end_time: actualEndTime ? 'past_webinar_api' : (finalEndTime ? 'calculated' : 'none')
      },
      _is_single_occurrence: true,
      _is_completed: isCompleted
    }
  };
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, webinar.uuid || webinar.id);
}
