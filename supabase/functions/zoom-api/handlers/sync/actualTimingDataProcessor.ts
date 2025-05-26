
/**
 * Processor for fetching actual timing data from Zoom's past webinars API
 */
export async function enhanceWebinarsWithActualTimingData(webinars: any[], token: string): Promise<any[]> {
  console.log(`[zoom-api][actual-timing-processor] Starting actual timing data enhancement for ${webinars.length} webinars`);
  
  const enhancedWebinars = [];
  
  for (const webinar of webinars) {
    const enhancedWebinar = { ...webinar };
    
    // Only fetch actual timing data for completed webinars that don't already have it
    const isCompleted = webinar.status === 'ended' || webinar.status === 'aborted';
    const hasActualData = webinar.actual_start_time || webinar.actual_duration;
    
    if (isCompleted && !hasActualData) {
      console.log(`[zoom-api][actual-timing-processor] Fetching actual timing data for completed webinar: ${webinar.id}`);
      
      try {
        // Fetch from past webinars API to get actual timing data
        const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (pastWebinarResponse.ok) {
          const pastWebinarData = await pastWebinarResponse.json();
          
          // Extract actual timing data from past webinar response
          if (pastWebinarData.actual_start_time) {
            enhancedWebinar.actual_start_time = pastWebinarData.actual_start_time;
            console.log(`[zoom-api][actual-timing-processor] Found actual start time for ${webinar.id}: ${pastWebinarData.actual_start_time}`);
          }
          
          if (pastWebinarData.actual_duration) {
            enhancedWebinar.actual_duration = pastWebinarData.actual_duration;
            console.log(`[zoom-api][actual-timing-processor] Found actual duration for ${webinar.id}: ${pastWebinarData.actual_duration} minutes`);
          }
          
          // Also check for duration in minutes format
          if (pastWebinarData.duration && !enhancedWebinar.actual_duration) {
            enhancedWebinar.actual_duration = pastWebinarData.duration;
            console.log(`[zoom-api][actual-timing-processor] Using duration as actual duration for ${webinar.id}: ${pastWebinarData.duration} minutes`);
          }
          
          // Store the past webinar data in raw_data for reference
          enhancedWebinar.past_webinar_data = pastWebinarData;
          
        } else {
          const errorText = await pastWebinarResponse.text();
          console.log(`[zoom-api][actual-timing-processor] Could not fetch past webinar data for ${webinar.id}: ${errorText}`);
        }
        
      } catch (error) {
        console.error(`[zoom-api][actual-timing-processor] Error fetching actual timing data for webinar ${webinar.id}:`, error);
      }
    } else if (hasActualData) {
      console.log(`[zoom-api][actual-timing-processor] Webinar ${webinar.id} already has actual timing data`);
    } else {
      console.log(`[zoom-api][actual-timing-processor] Webinar ${webinar.id} is not completed, skipping actual timing data fetch`);
    }
    
    enhancedWebinars.push(enhancedWebinar);
  }
  
  console.log(`[zoom-api][actual-timing-processor] Completed actual timing data enhancement`);
  return enhancedWebinars;
}
