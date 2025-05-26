
import { syncWebinarInstances } from './webinarDataSyncer.ts';

/**
 * Enhance webinars with instance data to get actual timing information
 */
export async function enhanceWebinarsWithInstanceData(
  webinars: any[], 
  token: string, 
  supabase: any, 
  userId: string
): Promise<any[]> {
  console.log(`[zoom-api][instance-processor] Starting instance data enhancement for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][instance-processor] No webinars to enhance with instance data`);
    return [];
  }
  
  const enhancedWebinars = [];
  let processedCount = 0;
  let instancesFound = 0;
  
  for (const webinar of webinars) {
    processedCount++;
    console.log(`[zoom-api][instance-processor] Processing webinar ${processedCount}/${webinars.length}: ${webinar.id} (${webinar.status})`);
    
    let enhancedWebinar = { ...webinar };
    
    // Only try to get past webinar details for ended webinars
    if (webinar.status === 'ended') {
      try {
        console.log(`[zoom-api][instance-processor] Fetching past webinar details for ended webinar: ${webinar.id}`);
        
        // Get past webinar details directly from Zoom API
        const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.uuid || webinar.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (pastWebinarResponse.ok) {
          const pastWebinarData = await pastWebinarResponse.json();
          instancesFound++;
          
          console.log(`[zoom-api][instance-processor] Found past webinar data for: ${webinar.id}`);
          console.log(`[zoom-api][instance-processor] Past webinar actual timing - Start: ${pastWebinarData.start_time}, Duration: ${pastWebinarData.duration}, End: ${pastWebinarData.end_time}`);
          
          // Extract actual timing data from past webinar response
          if (pastWebinarData.start_time) {
            enhancedWebinar.actual_start_time = pastWebinarData.start_time;
            console.log(`[zoom-api][instance-processor] Set actual_start_time for webinar ${webinar.id}: ${pastWebinarData.start_time}`);
          }
          
          if (pastWebinarData.duration) {
            enhancedWebinar.actual_duration = pastWebinarData.duration;
            console.log(`[zoom-api][instance-processor] Set actual_duration for webinar ${webinar.id}: ${pastWebinarData.duration} minutes`);
          }
          
          if (pastWebinarData.end_time) {
            enhancedWebinar.actual_end_time = pastWebinarData.end_time;
            console.log(`[zoom-api][instance-processor] Set actual_end_time for webinar ${webinar.id}: ${pastWebinarData.end_time}`);
          }
          
          // Store the complete past webinar data for reference
          enhancedWebinar.past_webinar_data = pastWebinarData;
          
          // Also sync to database for persistence
          const instanceResult = await syncWebinarInstances(
            supabase, 
            { id: userId }, 
            token, 
            webinar.id
          );
          
          if (instanceResult.count > 0) {
            console.log(`[zoom-api][instance-processor] Stored instance data in database for webinar ${webinar.id}`);
          }
        } else {
          const errorText = await pastWebinarResponse.text();
          console.log(`[zoom-api][instance-processor] No past webinar data found for webinar ${webinar.id}: ${errorText}`);
        }
      } catch (error) {
        console.error(`[zoom-api][instance-processor] Error processing past webinar data for webinar ${webinar.id}:`, error);
        // Continue with other webinars even if one fails
      }
    } else {
      console.log(`[zoom-api][instance-processor] Skipping past webinar fetch for webinar ${webinar.id} with status: ${webinar.status}`);
    }
    
    enhancedWebinars.push(enhancedWebinar);
  }
  
  console.log(`[zoom-api][instance-processor] Instance enhancement completed:`);
  console.log(`[zoom-api][instance-processor] - Processed: ${processedCount} webinars`);
  console.log(`[zoom-api][instance-processor] - Past webinar data found: ${instancesFound} webinars`);
  
  return enhancedWebinars;
}
