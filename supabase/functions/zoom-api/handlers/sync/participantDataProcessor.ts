
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
      // For all webinars (both upcoming and completed), try to get registrant count
      let registrantsCount = 0;
      let participantsCount = 0;
      
      try {
        // Always try to get registrants count for both upcoming and completed webinars
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
        }
      } catch (err) {
        console.warn(`[zoom-api][enhanceWebinarsWithParticipantData] Could not fetch registrants for webinar ${webinar.id}:`, err);
      }
      
      // Only fetch participant/attendee data for completed webinars
      const webinarStartTime = new Date(webinar.start_time);
      const now = new Date();
      const isCompleted = webinar.status === 'ended' || 
                         (webinarStartTime < now && 
                          now.getTime() - webinarStartTime.getTime() > (webinar.duration || 60) * 60 * 1000);
      
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
          }
        } catch (err) {
          console.warn(`[zoom-api][enhanceWebinarsWithParticipantData] Could not fetch participants for completed webinar ${webinar.id}:`, err);
        }
      }
      
      // Enhance webinar object with participant counts in raw_data
      return {
        ...webinar,
        registrants_count: registrantsCount,
        participants_count: participantsCount,
        // Ensure raw_data contains the participant counts for stats calculations
        ...(webinar.raw_data && typeof webinar.raw_data === 'object' ? {
          raw_data: {
            ...webinar.raw_data,
            registrants_count: registrantsCount,
            participants_count: participantsCount
          }
        } : {
          raw_data: {
            ...webinar,
            registrants_count: registrantsCount,
            participants_count: participantsCount
          }
        })
      };
    })
  );
  
  console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Enhanced ${webinarsWithParticipantData.length} webinars with participant data`);
  return webinarsWithParticipantData;
}
