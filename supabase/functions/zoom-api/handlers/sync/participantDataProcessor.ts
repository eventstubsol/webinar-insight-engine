
/**
 * Enhance webinars with participant data for completed webinars
 */
export async function enhanceWebinarsWithParticipantData(
  webinars: any[], 
  token: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Processing participant data for ${webinars.length} webinars`);
  
  const webinarsWithParticipantData = await Promise.all(
    webinars.map(async (webinar: any) => {
      console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Processing webinar ${webinar.id}, status: ${webinar.status}, start_time: ${webinar.start_time}`);
      
      // For all webinars (both upcoming and completed), try to get registrant count
      let registrantsCount = 0;
      let participantsCount = 0;
      
      try {
        // Always try to get registrants count for both upcoming and completed webinars
        console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Fetching registrants for webinar ${webinar.id}`);
        const registrantsRes = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/registrants?page_size=1`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (registrantsRes.ok) {
          const registrantsData = await registrantsRes.json();
          registrantsCount = registrantsData.total_records || 0;
          console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Webinar ${webinar.id}: ${registrantsCount} registrants`);
        } else {
          console.warn(`[zoom-api][enhanceWebinarsWithParticipantData] Failed to fetch registrants for webinar ${webinar.id}: ${registrantsRes.status} ${registrantsRes.statusText}`);
          const errorText = await registrantsRes.text();
          console.warn(`[zoom-api][enhanceWebinarsWithParticipantData] Registrants error response:`, errorText);
        }
      } catch (err) {
        console.warn(`[zoom-api][enhanceWebinarsWithParticipantData] Could not fetch registrants for webinar ${webinar.id}:`, err);
      }
      
      // Determine if webinar is completed using multiple criteria
      const webinarStartTime = new Date(webinar.start_time);
      const now = new Date();
      const durationMs = (webinar.duration || 60) * 60 * 1000; // Default to 60 minutes if no duration
      const estimatedEndTime = new Date(webinarStartTime.getTime() + durationMs);
      
      // Check if webinar is completed based on status OR time
      const isCompleted = webinar.status === 'ended' || 
                         webinar.status === 'aborted' ||
                         (webinarStartTime < now && estimatedEndTime < now);
      
      console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Webinar ${webinar.id} completion check:`, {
        status: webinar.status,
        startTime: webinarStartTime.toISOString(),
        estimatedEndTime: estimatedEndTime.toISOString(),
        now: now.toISOString(),
        isCompleted
      });
      
      // Only fetch participant/attendee data for completed webinars
      if (isCompleted) {
        try {
          console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Fetching participants for completed webinar: ${webinar.id}`);
          
          const attendeesRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}/participants?page_size=1`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (attendeesRes.ok) {
            const attendeesData = await attendeesRes.json();
            participantsCount = attendeesData.total_records || 0;
            console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Webinar ${webinar.id}: ${participantsCount} participants`);
          } else {
            console.warn(`[zoom-api][enhanceWebinarsWithParticipantData] Failed to fetch participants for completed webinar ${webinar.id}: ${attendeesRes.status} ${attendeesRes.statusText}`);
            const errorText = await attendeesRes.text();
            console.warn(`[zoom-api][enhanceWebinarsWithParticipantData] Participants error response:`, errorText);
            
            // If it's a 404 or similar, the webinar might not have participant data yet
            if (attendeesRes.status === 404) {
              console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Webinar ${webinar.id} has no participant data available (404) - this is normal for webinars that just ended`);
            }
          }
        } catch (err) {
          console.warn(`[zoom-api][enhanceWebinarsWithParticipantData] Could not fetch participants for completed webinar ${webinar.id}:`, err);
        }
      } else {
        console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Skipping participant fetch for upcoming/active webinar ${webinar.id}`);
      }
      
      // Enhance webinar object with participant counts in raw_data
      const enhancedWebinar = {
        ...webinar,
        registrants_count: registrantsCount,
        participants_count: participantsCount,
        // Ensure raw_data contains the participant counts for stats calculations
        ...(webinar.raw_data && typeof webinar.raw_data === 'object' ? {
          raw_data: {
            ...webinar.raw_data,
            registrants_count: registrantsCount,
            participants_count: participantsCount,
            _participant_data_status: isCompleted ? 'checked' : 'pending'
          }
        } : {
          raw_data: {
            ...webinar,
            registrants_count: registrantsCount,
            participants_count: participantsCount,
            _participant_data_status: isCompleted ? 'checked' : 'pending'
          }
        })
      };
      
      console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Enhanced webinar ${webinar.id} with data:`, {
        registrants_count: registrantsCount,
        participants_count: participantsCount,
        status: webinar.status,
        isCompleted
      });
      
      return enhancedWebinar;
    })
  );
  
  console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Enhanced ${webinarsWithParticipantData.length} webinars with participant data`);
  return webinarsWithParticipantData;
}
