
/**
 * Handles single-occurrence webinars with proper actual timing data collection
 */
export async function handleSingleOccurrenceWebinar(webinar: any, token: string, supabase: any, userId: string, isCompleted: boolean): Promise<number> {
  let actualData = null;
  let actualStartTime = null;
  let actualDuration = null;
  let actualEndTime = null;
  
  console.log(`[zoom-api][single-handler] 📊 Processing single webinar ${webinar.id} (${webinar.topic})`);
  console.log(`[zoom-api][single-handler] 📊 Webinar data: start_time=${webinar.start_time}, duration=${webinar.duration}, status=${webinar.status}, isCompleted=${isCompleted}`);
  
  // For completed single-occurrence webinars, fetch actual data using past webinars API
  if (isCompleted) {
    try {
      console.log(`[zoom-api][single-handler] 📡 Fetching actual timing data for completed single webinar ${webinar.id}`);
      
      // Try webinar UUID first, then fallback to webinar ID
      const identifiers = [webinar.uuid, webinar.id].filter(Boolean);
      
      for (const identifier of identifiers) {
        try {
          console.log(`[zoom-api][single-handler] 🔍 Trying past_webinars API with identifier: ${identifier}`);
          
          const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${identifier}`, {
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
            
            console.log(`[zoom-api][single-handler] ✅ Got actual timing data using ${identifier}:`);
            console.log(`[zoom-api][single-handler]   - actual_start_time: ${actualStartTime}`);
            console.log(`[zoom-api][single-handler]   - actual_duration: ${actualDuration}`);
            console.log(`[zoom-api][single-handler]   - actual_end_time: ${actualEndTime}`);
            break; // Success, exit the loop
          } else {
            const errorData = await pastResponse.json().catch(() => ({ message: 'Unknown error' }));
            console.warn(`[zoom-api][single-handler] ⚠️ Failed with identifier ${identifier}: ${errorData.message}`);
          }
        } catch (error) {
          console.warn(`[zoom-api][single-handler] ⚠️ Error with identifier ${identifier}:`, error);
        }
      }
      
      if (!actualData) {
        console.warn(`[zoom-api][single-handler] ⚠️ Could not fetch past webinar data for ${webinar.id} using any identifier`);
      }
    } catch (error) {
      console.warn(`[zoom-api][single-handler] ⚠️ Error fetching past webinar data for ${webinar.id}:`, error);
    }
  }
  
  // Determine final values with proper inheritance and validation
  const finalTopic = webinar.topic && webinar.topic.trim() !== '' ? webinar.topic : 'Untitled Webinar';
  const finalStartTime = webinar.start_time; // This is already the actual start time from webinar data
  const scheduledDuration = webinar.duration || null;
  const finalDuration = actualDuration || scheduledDuration;
  
  // Calculate end time with priority: actual > calculated from actual duration > calculated from scheduled
  let finalEndTime = actualEndTime;
  if (!finalEndTime && finalStartTime && finalDuration) {
    try {
      const startDate = new Date(finalStartTime);
      const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
      finalEndTime = endDate.toISOString();
      console.log(`[zoom-api][single-handler] 📊 Calculated end time: ${finalEndTime}`);
    } catch (error) {
      console.warn(`[zoom-api][single-handler] ⚠️ Error calculating end time:`, error);
    }
  }
  
  // Determine proper status with robust logic
  let finalStatus = webinar.status;
  if (!finalStatus || finalStatus.trim() === '') {
    if (isCompleted || (actualData && actualEndTime)) {
      finalStatus = 'ended';
    } else if (finalStartTime) {
      const now = new Date();
      const startTime = new Date(finalStartTime);
      if (now > startTime) {
        // Check if it should have ended based on duration
        if (finalEndTime && now > new Date(finalEndTime)) {
          finalStatus = 'ended';
        } else {
          finalStatus = 'started';
        }
      } else {
        finalStatus = 'waiting';
      }
    } else {
      finalStatus = 'waiting';
    }
  }
  
  console.log(`[zoom-api][single-handler] 📊 Final data for single webinar ${webinar.id}:`);
  console.log(`[zoom-api][single-handler]   - topic: ${finalTopic}`);
  console.log(`[zoom-api][single-handler]   - start_time: ${finalStartTime}`);
  console.log(`[zoom-api][single-handler]   - duration: ${finalDuration} (actual: ${actualDuration}, scheduled: ${scheduledDuration})`);
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
    topic: finalTopic,
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
        scheduled_duration: scheduledDuration ? 'webinar_data' : 'none',
        end_time: actualEndTime ? 'past_webinar_api' : (finalEndTime ? 'calculated' : 'none'),
        topic: webinar.topic ? 'webinar_data' : 'default',
        status: webinar.status ? 'webinar_data' : 'calculated'
      },
      _is_single_occurrence: true,
      _is_completed: isCompleted,
      _identifiers_tried: [webinar.uuid, webinar.id].filter(Boolean)
    }
  };
  
  const { upsertInstanceRecord } = await import('../databaseOperations/instanceUpsert.ts');
  return await upsertInstanceRecord(supabase, instanceToInsert, webinar.id, webinar.uuid || webinar.id);
}
