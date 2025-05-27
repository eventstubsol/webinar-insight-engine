
import { getHostInfo } from './hostResolver.ts';
import { getPanelistInfo } from './panelistResolver.ts';
import { storeRecordingData } from './recordingDataProcessor.ts';

/**
 * Enhanced webinar data orchestrator that processes all webinar data including instances
 */
export async function enhanceWebinarsWithAllData(
  webinars: any[],
  token: string,
  supabase: any,
  userId: string
): Promise<any[]> {
  console.log(`[webinar-enhancement] Starting enhancement for ${webinars.length} webinars`);
  
  const enhancedWebinars = [];
  
  for (const webinar of webinars) {
    try {
      console.log(`[webinar-enhancement] Processing webinar: ${webinar.id}`);
      
      // Get host information
      const { hostEmail, hostId, hostName, hostFirstName, hostLastName } = await getHostInfo(token, webinar);
      
      // Get panelist information
      const panelistData = await getPanelistInfo(token, webinar.id);
      
      // Get recording information using internal fetch function
      const recordingData = await fetchWebinarRecordings(token, webinar.id);
      
      // Fetch webinar instances and calculate actual duration
      let actualDuration = webinar.duration; // fallback to scheduled duration
      try {
        const instancesResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.uuid}/instances`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (instancesResponse.ok) {
          const instancesData = await instancesResponse.json();
          const instances = instancesData.instances || [];
          
          console.log(`[webinar-enhancement] Found ${instances.length} instances for webinar ${webinar.id}`);
          
          // Process each instance
          for (const instance of instances) {
            const instanceToUpsert = {
              user_id: userId,
              webinar_id: webinar.id,
              webinar_uuid: webinar.uuid,
              instance_id: instance.uuid || '',
              start_time: instance.start_time || null,
              end_time: instance.end_time || null,
              duration: instance.duration || null,
              topic: webinar.topic || 'Untitled Webinar',
              status: instance.status || null,
              registrants_count: 0,
              participants_count: 0,
              raw_data: instance
            };
            
            // Upsert instance data
            const { error: instanceError } = await supabase
              .from('zoom_webinar_instances')
              .upsert(instanceToUpsert, {
                onConflict: 'user_id,webinar_id,instance_id'
              });
              
            if (instanceError) {
              console.error(`[webinar-enhancement] Error upserting instance ${instance.uuid}:`, instanceError);
            }
          }
          
          // Calculate total actual duration from instances
          const { data: durationSum, error: durationError } = await supabase
            .from('zoom_webinar_instances')
            .select('duration')
            .eq('user_id', userId)
            .eq('webinar_id', webinar.id);
            
          if (!durationError && durationSum && durationSum.length > 0) {
            const totalDuration = durationSum.reduce((sum: number, item: any) => {
              return sum + (item.duration || 0);
            }, 0);
            
            if (totalDuration > 0) {
              actualDuration = totalDuration;
              console.log(`[webinar-enhancement] Calculated actual duration for webinar ${webinar.id}: ${actualDuration} minutes`);
            }
          }
        } else {
          console.log(`[webinar-enhancement] No instances found for webinar ${webinar.id}`);
        }
      } catch (instanceError) {
        console.warn(`[webinar-enhancement] Error fetching instances for webinar ${webinar.id}:`, instanceError);
      }
      
      // Create enhanced webinar object
      const enhancedWebinar = {
        ...webinar,
        actual_duration: actualDuration,
        host_email: hostEmail,
        host_id: hostId,
        host_name: hostName,
        host_first_name: hostFirstName,
        host_last_name: hostLastName,
        panelists: panelistData,
        panelists_count: panelistData.length,
        has_recordings: recordingData.length > 0,
        recordings_count: recordingData.length,
        host_info: {
          email: hostEmail,
          display_name: hostName,
          first_name: hostFirstName,
          last_name: hostLastName,
          id: hostId
        }
      };
      
      enhancedWebinars.push(enhancedWebinar);
      
    } catch (error) {
      console.error(`[webinar-enhancement] Error enhancing webinar ${webinar.id}:`, error);
      // Add webinar without enhancement on error
      enhancedWebinars.push(webinar);
    }
  }
  
  console.log(`[webinar-enhancement] Enhanced ${enhancedWebinars.length} webinars with complete data`);
  return enhancedWebinars;
}

/**
 * Fetches recording data for a specific webinar from Zoom API
 */
async function fetchWebinarRecordings(token: string, webinarId: string): Promise<any[]> {
  try {
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/recordings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // No recordings found - this is normal for webinars without recordings
        console.log(`[webinar-enhancement] No recordings found for webinar ${webinarId} (404)`);
        return [];
      }
      
      const errorData = await response.json().catch(() => ({}));
      console.error(`[webinar-enhancement] Failed to fetch recordings for webinar ${webinarId}:`, errorData);
      throw new Error(`Failed to fetch recordings: ${errorData.message || response.status}`);
    }
    
    const data = await response.json();
    return data.recordings || [];
  } catch (error) {
    console.error(`[webinar-enhancement] Error fetching recordings for webinar ${webinarId}:`, error);
    return [];
  }
}
