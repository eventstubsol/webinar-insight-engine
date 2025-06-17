
/**
 * Enhanced registrant data processor for webinar enhancement orchestrator
 */
export async function enhanceWebinarsWithRegistrantData(
  webinars: any[], 
  token: string,
  supabase?: any,
  userId?: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Processing registrant data for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] No webinars to process`);
    return [];
  }
  
  const webinarsWithRegistrantData = await Promise.all(
    webinars.map(async (webinar: any) => {
      try {
        console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Fetching registrants for webinar: ${webinar.id}`);
        
        // Fetch registrants from Zoom API
        const registrantsRes = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/registrants?page_size=300`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        let registrantsCount = 0;
        let registrantsData: any[] = [];
        
        if (registrantsRes.ok) {
          const registrantsResponse = await registrantsRes.json();
          registrantsData = registrantsResponse.registrants || [];
          registrantsCount = registrantsResponse.total_records || registrantsData.length;
          
          console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Found ${registrantsCount} registrants for webinar ${webinar.id}`);
          
          // Store registrants in database if supabase client is provided
          if (supabase && userId && registrantsData.length > 0) {
            try {
              // Delete existing registrants for this webinar
              await supabase
                .from('zoom_webinar_participants')
                .delete()
                .eq('user_id', userId)
                .eq('webinar_id', webinar.id)
                .eq('participant_type', 'registrant');
              
              // Insert new registrants
              const registrantsToInsert = registrantsData.map((registrant: any) => ({
                user_id: userId,
                webinar_id: webinar.id,
                participant_type: 'registrant',
                participant_id: registrant.id,
                email: registrant.email,
                name: `${registrant.first_name || ''} ${registrant.last_name || ''}`.trim(),
                join_time: registrant.create_time,
                raw_data: registrant
              }));
              
              const { error: registrantsError } = await supabase
                .from('zoom_webinar_participants')
                .insert(registrantsToInsert);
              
              if (registrantsError) {
                console.error(`[zoom-api][enhanceWebinarsWithRegistrantData] Error storing registrants for webinar ${webinar.id}:`, registrantsError);
              } else {
                console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Stored ${registrantsData.length} registrants for webinar ${webinar.id}`);
              }
            } catch (dbError) {
              console.error(`[zoom-api][enhanceWebinarsWithRegistrantData] Database error for webinar ${webinar.id}:`, dbError);
            }
          }
        } else {
          const errorText = await registrantsRes.text();
          console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] No registrants found for webinar ${webinar.id}: ${errorText}`);
        }
        
        // Enhance webinar object with registrant data and counts
        return {
          ...webinar,
          registrants_count: registrantsCount,
          registrants_data: registrantsData,
          _enhanced_with_registrants: true,
          _registrants_stored_count: supabase && userId ? registrantsData.length : 0
        };
        
      } catch (err) {
        console.error(`[zoom-api][enhanceWebinarsWithRegistrantData] Error processing registrants for webinar ${webinar.id}:`, err);
        // Continue with the original webinar data if there's an error
        return {
          ...webinar,
          registrants_count: 0,
          _enhanced_with_registrants: false,
          _registrants_error: err.message || 'Unknown error'
        };
      }
    })
  );
  
  const totalRegistrants = webinarsWithRegistrantData.reduce((sum, w) => sum + (w.registrants_count || 0), 0);
  const successfulEnhancements = webinarsWithRegistrantData.filter(w => w._enhanced_with_registrants).length;
  
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Enhancement complete: ${successfulEnhancements}/${webinars.length} webinars processed, ${totalRegistrants} total registrants found`);
  
  return webinarsWithRegistrantData;
}
