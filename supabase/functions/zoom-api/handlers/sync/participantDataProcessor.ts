
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
      // Only fetch participant data for completed webinars
      const webinarStartTime = new Date(webinar.start_time);
      const isCompleted = webinar.status === 'ended' || 
                         (webinarStartTime < new Date() && 
                          new Date().getTime() - webinarStartTime.getTime() > webinar.duration * 60 * 1000);
      
      if (isCompleted) {
        try {
          console.log(`[zoom-api][enhanceWebinarsWithParticipantData] Fetching participants for completed webinar: ${webinar.id}`);
          
          // Make parallel requests for registrants and attendees
          const [registrantsRes, attendeesRes] = await Promise.all([
            fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/registrants?page_size=1`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }),
            fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}/participants?page_size=1`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
          ]);
          
          const [registrantsData, attendeesData] = await Promise.all([
            registrantsRes.ok ? registrantsRes.json() : { total_records: 0 },
            attendeesRes.ok ? attendeesRes.json() : { total_records: 0 }
          ]);
          
          // Enhance webinar object with participant counts
          return {
            ...webinar,
            registrants_count: registrantsData.total_records || 0,
            participants_count: attendeesData.total_records || 0
          };
        } catch (err) {
          console.error(`[zoom-api][enhanceWebinarsWithParticipantData] Error fetching participants for webinar ${webinar.id}:`, err);
          // Continue with the original webinar data if there's an error
          return webinar;
        }
      } else {
        // Return original webinar data for upcoming webinars
        return webinar;
      }
    })
  );
  
  return webinarsWithParticipantData;
}
