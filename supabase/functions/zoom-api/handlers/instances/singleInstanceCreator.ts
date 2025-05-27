
/**
 * Creates instance data for single-occurrence webinars with proper actual timing data collection
 */
export async function createSingleWebinarInstance(webinarId: string, token: string, webinarData: any, isCompleted: boolean): Promise<any[]> {
  try {
    console.log(`[zoom-api][single-creator] 🔄 Creating instance for single webinar ${webinarId} (${webinarData.topic}), completed: ${isCompleted}`);
    
    let actualData = null;
    let actualStartTime = null;
    let actualDuration = null;
    let actualEndTime = null;
    
    if (isCompleted) {
      // For completed single-occurrence webinars, fetch actual data using past_webinars API
      try {
        console.log(`[zoom-api][single-creator] 📡 Fetching actual data for completed single webinar ${webinarId}`);
        
        // Use webinar UUID if available, fallback to webinar ID
        const apiIdentifier = webinarData.uuid || webinarId;
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
          
          console.log(`[zoom-api][single-creator] ✅ Got actual timing data:`);
          console.log(`[zoom-api][single-creator]   - start: ${actualStartTime}`);
          console.log(`[zoom-api][single-creator]   - duration: ${actualDuration}`);
          console.log(`[zoom-api][single-creator]   - end: ${actualEndTime}`);
        } else {
          const errorData = await pastResponse.json().catch(() => ({ message: 'Unknown error' }));
          console.warn(`[zoom-api][single-creator] ⚠️ Could not fetch past webinar data for ${webinarId}: ${errorData.message}`);
        }
      } catch (error) {
        console.warn(`[zoom-api][single-creator] ⚠️ Error fetching past webinar data for ${webinarId}:`, error);
      }
    }
    
    // Calculate end time for completed webinars
    const finalDuration = actualDuration || webinarData.duration;
    const finalStartTime = webinarData.start_time; // This is already the actual start time
    let endTime = actualEndTime;
    
    if (!endTime && isCompleted && finalStartTime && finalDuration) {
      try {
        const startDate = new Date(finalStartTime);
        const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
        endTime = endDate.toISOString();
        console.log(`[zoom-api][single-creator] 📊 Calculated end time: ${endTime}`);
      } catch (error) {
        console.warn(`[zoom-api][single-creator] ⚠️ Error calculating end time for ${webinarId}:`, error);
      }
    }
    
    // Determine proper status
    let finalStatus = webinarData.status;
    if (!finalStatus) {
      if (isCompleted) {
        finalStatus = 'ended';
      } else if (webinarData.start_time) {
        const now = new Date();
        const startTime = new Date(webinarData.start_time);
        finalStatus = now > startTime ? 'started' : 'waiting';
      } else {
        finalStatus = 'waiting';
      }
    }
    
    // Create synthetic instance with proper data inheritance
    const instance = {
      id: webinarData.uuid || webinarId,
      uuid: webinarData.uuid || webinarId,
      start_time: finalStartTime,
      end_time: endTime,
      duration: finalDuration,
      actual_start_time: actualStartTime,
      actual_duration: actualDuration,
      status: finalStatus,
      topic: webinarData.topic || 'Untitled Webinar',
      participants_count: actualData?.participants_count || 0,
      registrants_count: 0,
      _is_single_occurrence: true,
      _is_completed: isCompleted,
      _timing_source: {
        start_time: 'webinar_api',
        actual_start_time: actualStartTime ? 'past_webinar_api' : 'none',
        actual_duration: actualDuration ? 'past_webinar_api' : 'none',
        scheduled_duration: webinarData.duration ? 'webinar_data' : 'none',
        end_time: actualEndTime ? 'past_webinar_api' : (endTime ? 'calculated' : 'none'),
        topic: 'webinar_data',
        status: webinarData.status ? 'webinar_data' : 'calculated'
      },
      _actual_data: actualData,
      _webinar_data: webinarData
    };
    
    console.log(`[zoom-api][single-creator] ✅ Created single instance for ${webinarId}:`);
    console.log(`[zoom-api][single-creator]   - topic: ${instance.topic}`);
    console.log(`[zoom-api][single-creator]   - start_time: ${instance.start_time}`);
    console.log(`[zoom-api][single-creator]   - duration: ${instance.duration}`);
    console.log(`[zoom-api][single-creator]   - end_time: ${instance.end_time}`);
    console.log(`[zoom-api][single-creator]   - status: ${instance.status}`);
    console.log(`[zoom-api][single-creator]   - actual_start_time: ${instance.actual_start_time}`);
    console.log(`[zoom-api][single-creator]   - actual_duration: ${instance.actual_duration}`);
    
    return [instance];
    
  } catch (error) {
    console.error(`[zoom-api][single-creator] ❌ Error creating single webinar instance for ${webinarId}:`, error);
    throw new Error(`Failed to create single webinar instance: ${error.message}`);
  }
}
