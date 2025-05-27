
/**
 * Creates instance data for single-occurrence webinars
 */
export async function createSingleWebinarInstance(webinarId: string, token: string, webinarData: any, isCompleted: boolean): Promise<any[]> {
  try {
    console.log(`[zoom-api][single-creator] 🔄 Creating instance for single webinar ${webinarId}, completed: ${isCompleted}`);
    
    let actualData = null;
    let actualStartTime = null;
    let actualDuration = null;
    
    if (isCompleted) {
      // For completed single-occurrence webinars, fetch actual data
      try {
        console.log(`[zoom-api][single-creator] 📡 Fetching actual data for completed single webinar ${webinarId}`);
        
        const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (pastResponse.ok) {
          actualData = await pastResponse.json();
          actualStartTime = actualData.start_time || null;
          actualDuration = actualData.duration || null;
          console.log(`[zoom-api][single-creator] ✅ Got actual timing data: start=${actualStartTime}, duration=${actualDuration}`);
        } else {
          const errorData = await pastResponse.json().catch(() => ({ message: 'Unknown error' }));
          console.warn(`[zoom-api][single-creator] ⚠️ Could not fetch past webinar data for ${webinarId}: ${errorData.message}`);
        }
      } catch (error) {
        console.warn(`[zoom-api][single-creator] ⚠️ Error fetching past webinar data for ${webinarId}:`, error);
      }
    }
    
    // Calculate end time for completed webinars
    let endTime = null;
    if (isCompleted) {
      const finalDuration = actualDuration || webinarData.duration;
      const finalStartTime = actualStartTime || webinarData.start_time;
      
      if (actualData?.end_time) {
        endTime = actualData.end_time;
      } else if (finalStartTime && finalDuration) {
        try {
          const startDate = new Date(finalStartTime);
          const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
          endTime = endDate.toISOString();
          console.log(`[zoom-api][single-creator] 📊 Calculated end time: ${endTime} (start: ${finalStartTime}, duration: ${finalDuration}min)`);
        } catch (error) {
          console.warn(`[zoom-api][single-creator] ⚠️ Error calculating end time for ${webinarId}:`, error);
        }
      }
    }
    
    // Create synthetic instance with actual timing data
    const instance = {
      id: webinarData.uuid || webinarId,
      uuid: webinarData.uuid || webinarId,
      start_time: webinarData.start_time,
      end_time: endTime,
      duration: webinarData.duration,
      actual_start_time: actualStartTime,
      actual_duration: actualDuration,
      status: isCompleted ? (webinarData.status || 'ended') : (webinarData.status || 'waiting'),
      topic: webinarData.topic,
      participants_count: actualData?.participants_count || 0,
      registrants_count: 0, // Will be updated separately if needed
      _is_single_occurrence: true,
      _is_completed: isCompleted,
      _timing_source: {
        actual_start_time: actualStartTime ? 'past_webinar_api' : 'none',
        actual_duration: actualDuration ? 'past_webinar_api' : 'none',
        scheduled_start_time: 'webinar_data',
        scheduled_duration: webinarData.duration ? 'webinar_data' : 'none'
      },
      _actual_data: actualData,
      _webinar_data: webinarData
    };
    
    console.log(`[zoom-api][single-creator] ✅ Created single instance for ${webinarId}:`);
    console.log(`[zoom-api][single-creator]   - scheduled: start=${instance.start_time}, duration=${instance.duration}`);
    console.log(`[zoom-api][single-creator]   - actual: start=${instance.actual_start_time}, duration=${instance.actual_duration}`);
    console.log(`[zoom-api][single-creator]   - status=${instance.status}`);
    
    return [instance];
    
  } catch (error) {
    console.error(`[zoom-api][single-creator] ❌ Error creating single webinar instance for ${webinarId}:`, error);
    throw new Error(`Failed to create single webinar instance: ${error.message}`);
  }
}
