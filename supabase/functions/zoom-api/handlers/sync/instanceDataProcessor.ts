
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
    
    // Only try to get instances for ended webinars
    if (webinar.status === 'ended') {
      try {
        console.log(`[zoom-api][instance-processor] Fetching instances for ended webinar: ${webinar.id}`);
        
        const instanceResult = await syncWebinarInstances(
          supabase, 
          { id: userId }, 
          token, 
          webinar.id
        );
        
        if (instanceResult.count > 0) {
          instancesFound++;
          console.log(`[zoom-api][instance-processor] Found ${instanceResult.count} instances for webinar ${webinar.id}`);
          
          // Fetch the stored instance data to extract actual timing
          const { data: instances, error: fetchError } = await supabase
            .from('zoom_webinar_instances')
            .select('*')
            .eq('user_id', userId)
            .eq('webinar_id', webinar.id)
            .order('start_time', { ascending: true });
          
          if (!fetchError && instances && instances.length > 0) {
            const firstInstance = instances[0];
            
            // Extract actual timing data from instance
            if (firstInstance.start_time) {
              enhancedWebinar.actual_start_time = firstInstance.start_time;
              console.log(`[zoom-api][instance-processor] Set actual_start_time for webinar ${webinar.id}: ${firstInstance.start_time}`);
            }
            
            if (firstInstance.duration) {
              enhancedWebinar.actual_duration = firstInstance.duration;
              console.log(`[zoom-api][instance-processor] Set actual_duration for webinar ${webinar.id}: ${firstInstance.duration} minutes`);
            }
            
            // Store instance data in webinar for reference
            enhancedWebinar.instance_data = instances;
            enhancedWebinar.instances_count = instances.length;
          } else if (fetchError) {
            console.error(`[zoom-api][instance-processor] Error fetching stored instances for webinar ${webinar.id}:`, fetchError);
          }
        } else {
          console.log(`[zoom-api][instance-processor] No instances found for webinar ${webinar.id}`);
        }
      } catch (error) {
        console.error(`[zoom-api][instance-processor] Error processing instances for webinar ${webinar.id}:`, error);
        // Continue with other webinars even if one fails
      }
    } else {
      console.log(`[zoom-api][instance-processor] Skipping instance sync for webinar ${webinar.id} with status: ${webinar.status}`);
    }
    
    enhancedWebinars.push(enhancedWebinar);
  }
  
  console.log(`[zoom-api][instance-processor] Instance enhancement completed:`);
  console.log(`[zoom-api][instance-processor] - Processed: ${processedCount} webinars`);
  console.log(`[zoom-api][instance-processor] - Instances found: ${instancesFound} webinars`);
  
  return enhancedWebinars;
}
