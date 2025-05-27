
/**
 * Creates instance data for single-occurrence webinars
 */
export async function createSingleWebinarInstance(webinarId: string, token: string, webinarData: any, isCompleted: boolean): Promise<any[]> {
  let actualData = null;
  
  if (isCompleted) {
    // For completed single-occurrence webinars, fetch actual data
    try {
      console.log(`[zoom-api][get-webinar-instances] Fetching actual data for completed single webinar ${webinarId}`);
      const pastResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastResponse.ok) {
        actualData = await pastResponse.json();
        console.log(`[zoom-api][get-webinar-instances] ✅ Got actual data: duration=${actualData.duration}, participants=${actualData.participants_count}`);
      } else {
        console.warn(`[zoom-api][get-webinar-instances] Could not fetch past webinar data for ${webinarId}`);
      }
    } catch (error) {
      console.warn(`[zoom-api][get-webinar-instances] Error fetching past webinar data:`, error);
    }
  }
  
  // Calculate end time for completed webinars
  let endTime = null;
  if (isCompleted) {
    const duration = actualData?.duration || webinarData.duration;
    if (actualData?.end_time) {
      endTime = actualData.end_time;
    } else if ((actualData?.start_time || webinarData.start_time) && duration) {
      const startDate = new Date(actualData?.start_time || webinarData.start_time);
      const endDate = new Date(startDate.getTime() + (duration * 60000));
      endTime = endDate.toISOString();
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
  
  return [instance];
}
