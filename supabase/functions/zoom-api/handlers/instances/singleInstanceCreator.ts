
/**
 * Creates instance data for single-occurrence webinars
 */
export async function createSingleWebinarInstance(webinarId: string, token: string, webinarData: any, isCompleted: boolean): Promise<any[]> {
  try {
    console.log(`[zoom-api][single-creator] 🔄 Creating instance for single webinar ${webinarId}, completed: ${isCompleted}`);
    
    let actualData = null;
    
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
          console.log(`[zoom-api][single-creator] ✅ Got actual data: duration=${actualData.duration}, participants=${actualData.participants_count}`);
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
      const duration = actualData?.duration || webinarData.duration;
      if (actualData?.end_time) {
        endTime = actualData.end_time;
      } else if ((actualData?.start_time || webinarData.start_time) && duration) {
        try {
          const startDate = new Date(actualData?.start_time || webinarData.start_time);
          const endDate = new Date(startDate.getTime() + (duration * 60000));
          endTime = endDate.toISOString();
          console.log(`[zoom-api][single-creator] 📊 Calculated end time: ${endTime} (start: ${startDate.toISOString()}, duration: ${duration}min)`);
        } catch (error) {
          console.warn(`[zoom-api][single-creator] ⚠️ Error calculating end time for ${webinarId}:`, error);
        }
      }
    }
    
    // Create synthetic instance
    const instance = {
      id: webinarData.uuid || webinarId,
      uuid: webinarData.uuid || webinarId,
      start_time: actualData?.start_time || webinarData.start_time,
      end_time: endTime,
      duration: actualData?.duration || webinarData.duration,
      status: isCompleted ? (webinarData.status || 'ended') : (webinarData.status || 'waiting'),
      topic: webinarData.topic,
      participants_count: actualData?.participants_count || 0,
      registrants_count: 0, // Will be updated separately if needed
      _is_single_occurrence: true,
      _is_completed: isCompleted,
      _duration_source: actualData?.duration ? 'past_webinar_api' : 'scheduled',
      _actual_data: actualData,
      _webinar_data: webinarData
    };
    
    console.log(`[zoom-api][single-creator] ✅ Created single instance for ${webinarId}: duration=${instance.duration}, status=${instance.status}, source=${instance._duration_source}`);
    return [instance];
    
  } catch (error) {
    console.error(`[zoom-api][single-creator] ❌ Error creating single webinar instance for ${webinarId}:`, error);
    throw new Error(`Failed to create single webinar instance: ${error.message}`);
  }
}
