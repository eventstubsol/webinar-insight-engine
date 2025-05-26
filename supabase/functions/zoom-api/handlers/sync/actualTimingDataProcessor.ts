
/**
 * Fetches actual timing data for ended webinars from the past_webinars endpoint
 */
export async function enhanceWebinarsWithActualTimingData(webinars: any[], token: string): Promise<any[]> {
  console.log(`[zoom-api][actual-timing-processor] Starting actual timing data enhancement for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    return webinars;
  }
  
  // Filter for ended webinars that need actual timing data
  const endedWebinars = webinars.filter(webinar => 
    webinar.status === 'ended' || webinar.status === 'aborted'
  );
  
  if (endedWebinars.length === 0) {
    console.log(`[zoom-api][actual-timing-processor] No ended webinars found, skipping actual timing data fetch`);
    return webinars;
  }
  
  console.log(`[zoom-api][actual-timing-processor] Found ${endedWebinars.length} ended webinars to process`);
  
  // Process each ended webinar to get actual timing data
  const enhancedWebinars = await Promise.all(
    webinars.map(async (webinar) => {
      // Skip if not an ended webinar
      if (webinar.status !== 'ended' && webinar.status !== 'aborted') {
        return webinar;
      }
      
      try {
        // Try to fetch past webinar data using the webinar UUID
        if (!webinar.uuid) {
          console.log(`[zoom-api][actual-timing-processor] No UUID available for webinar ${webinar.id}, skipping`);
          return webinar;
        }
        
        console.log(`[zoom-api][actual-timing-processor] Fetching past webinar data for ${webinar.id} (UUID: ${webinar.uuid})`);
        
        const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.uuid}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!pastWebinarResponse.ok) {
          if (pastWebinarResponse.status === 404) {
            console.log(`[zoom-api][actual-timing-processor] Past webinar data not found for ${webinar.id}, may not have been started`);
          } else {
            console.warn(`[zoom-api][actual-timing-processor] Failed to fetch past webinar data for ${webinar.id}: ${pastWebinarResponse.status}`);
          }
          return webinar;
        }
        
        const pastWebinarData = await pastWebinarResponse.json();
        console.log(`[zoom-api][actual-timing-processor] Successfully fetched past webinar data for ${webinar.id}`);
        
        // Extract actual timing data
        const actualStartTime = pastWebinarData.start_time || null;
        const actualEndTime = pastWebinarData.end_time || null;
        let actualDuration = pastWebinarData.duration || null;
        
        // Calculate duration if we have start and end times but no duration
        if (actualStartTime && actualEndTime && !actualDuration) {
          const startMs = new Date(actualStartTime).getTime();
          const endMs = new Date(actualEndTime).getTime();
          actualDuration = Math.round((endMs - startMs) / (1000 * 60)); // Duration in minutes
        }
        
        // Enhance the webinar object with actual timing data
        const enhancedWebinar = {
          ...webinar,
          actual_start_time: actualStartTime,
          actual_duration: actualDuration,
          actual_end_time: actualEndTime,
          // Also store additional metrics if available
          participants_count: pastWebinarData.participants_count || webinar.participants_count || 0,
          // Merge past webinar data into raw_data for complete information
          raw_data: {
            ...webinar.raw_data,
            past_webinar_data: pastWebinarData
          }
        };
        
        console.log(`[zoom-api][actual-timing-processor] Enhanced webinar ${webinar.id} with actual timing: start=${actualStartTime}, duration=${actualDuration}`);
        return enhancedWebinar;
        
      } catch (error) {
        console.error(`[zoom-api][actual-timing-processor] Error fetching past webinar data for ${webinar.id}:`, error);
        return webinar; // Return original webinar if enhancement fails
      }
    })
  );
  
  const enhancedCount = enhancedWebinars.filter(w => w.actual_start_time || w.actual_duration).length;
  console.log(`[zoom-api][actual-timing-processor] Successfully enhanced ${enhancedCount} webinars with actual timing data`);
  
  return enhancedWebinars;
}
