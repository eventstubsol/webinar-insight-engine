
/**
 * Handles single-occurrence webinars
 */
export async function handleSingleOccurrenceWebinar(webinar: any, token: string, supabase: any, userId: string, isCompleted: boolean): Promise<number> {
  let actualData = null;
  let actualStartTime = null;
  let actualDuration = null;
  
  if (isCompleted) {
    // For completed single-occurrence webinars, use past webinars API with webinar ID
    try {
      console.log(`[zoom-api][single-handler] 📡 Fetching actual timing data for completed single webinar ${webinar.id}`);
      const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastResponse.ok) {
        actualData = await pastResponse.json();
        actualStartTime = actualData.start_time || null;
        actualDuration = actualData.duration || null;
        console.log(`[zoom-api][single-handler] ✅ Got actual timing data for webinar ${webinar.id}:`);
        console.log(`[zoom-api][single-handler]   - actual_start_time: ${actualStartTime}`);
        console.log(`[zoom-api][single-handler]   - actual_duration: ${actualDuration}`);
      } else {
        const errorData = await pastResponse.json();
        console.warn(`[zoom-api][single-handler] ⚠️ Could not fetch past webinar data for ${webinar.id}: ${errorData.message}`);
      }
    } catch (error) {
      console.warn(`[zoom-api][single-handler] ⚠️ Error fetching past webinar data for ${webinar.id}:`, error);
    }
  }
  
  // Determine final values with priority: actual > scheduled
  const finalDuration = actualDuration || webinar.duration || null;
  const finalStartTime = actualStartTime || webinar.actual_start_time || webinar.start_time;
  const finalStatus = isCompleted ? (webinar.status || 'ended') : (webinar.status || 'waiting');
  
  // Calculate end time for completed webinars
  let endTime = null;
  if (isCompleted) {
    if (actualData?.end_time) {
      endTime = actualData.end_time;
    } else if (finalStartTime && finalDuration) {
      const startDate = new Date(finalStartTime);
      const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
      endTime = endDate.toISOString();
    }
  }
  
  console.log(`[zoom-api][single-handler] 📊 Final timing data for single webinar ${webinar.id}:`);
  console.log(`[zoom-api][single-handler]   - scheduled: start=${webinar.start_time}, duration=${webinar.duration}`);
  console.log(`[zoom-api][single-handler]   - actual: start=${actualStartTime}, duration=${actualDuration}`);
  console.log(`[zoom-api][single-handler]   - final: start=${finalStartTime}, duration=${finalDuration}, status=${finalStatus}, end=${endTime}`);
  
  const instanceToInsert = {
    user_id: userId,
    webinar_id: webinar.id,
    webinar_uuid: webinar.uuid || '',
    instance_id: webinar.uuid || webinar.id,
    start_time: webinar.start_time || null,
    end_time: endTime,
    duration: webinar.duration,
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
        actual_start_time: actualStartTime ? 'past_webinar_api' : 'none',
        actual_duration: actualDuration ? 'past_webinar_api' : 'none',
        scheduled_start_time: webinar.start_time ? 'webinar_data' : 'none',
        scheduled_duration: webinar.duration ? 'webinar_data' : 'none'
      },
      _is_single_occurrence: true,
      _is_completed: isCompleted
    }
  };
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, webinar.uuid || webinar.id);
}
