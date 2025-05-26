
import { getZoomJwtToken } from '../auth.ts';

/**
 * Enhanced timing data fetcher that implements comprehensive Zoom API calls
 * to retrieve actual webinar execution data
 */
export async function fetchActualTimingData(webinars: any[], token: string): Promise<any[]> {
  console.log(`[enhancedTimingDataFetcher] 🎯 Starting COMPREHENSIVE timing data fetch for ${webinars.length} webinars`);
  
  const enhancedWebinars = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const webinar of webinars) {
    try {
      console.log(`[enhancedTimingDataFetcher] 🔍 Processing webinar ${webinar.id}: ${webinar.topic}`);
      
      let enhancedWebinar = { ...webinar };
      let timingDataFound = false;
      
      // Step 1: Try to get data from past webinar endpoint (most reliable for actual data)
      if (webinar.uuid) {
        try {
          console.log(`[enhancedTimingDataFetcher] 📊 Fetching past webinar data for UUID: ${webinar.uuid}`);
          
          const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.uuid}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (pastWebinarResponse.ok) {
            const pastWebinarData = await pastWebinarResponse.json();
            console.log(`[enhancedTimingDataFetcher] ✅ Got past webinar data for ${webinar.id}:`, {
              start_time: pastWebinarData.start_time,
              end_time: pastWebinarData.end_time,
              duration: pastWebinarData.duration,
              participants_count: pastWebinarData.participants_count
            });
            
            if (pastWebinarData.start_time) {
              enhancedWebinar.actual_start_time = pastWebinarData.start_time;
              enhancedWebinar.actual_duration = pastWebinarData.duration || null;
              enhancedWebinar.actual_end_time = pastWebinarData.end_time || null;
              enhancedWebinar.participants_count = pastWebinarData.participants_count || 0;
              timingDataFound = true;
              
              // Store the past webinar data for reference
              enhancedWebinar.raw_data = {
                ...enhancedWebinar.raw_data,
                past_webinar_data: pastWebinarData
              };
            }
          } else {
            const errorText = await pastWebinarResponse.text();
            console.log(`[enhancedTimingDataFetcher] ⚠️ Past webinar API failed for ${webinar.id}:`, errorText);
          }
        } catch (error) {
          console.warn(`[enhancedTimingDataFetcher] ⚠️ Error fetching past webinar data for ${webinar.id}:`, error.message);
        }
      }
      
      // Step 2: Try to get webinar instances data (for recurring webinars or additional data)
      if (!timingDataFound || !enhancedWebinar.actual_start_time) {
        try {
          console.log(`[enhancedTimingDataFetcher] 🔄 Fetching instances for webinar: ${webinar.id}`);
          
          const instancesResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}/instances`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (instancesResponse.ok) {
            const instancesData = await instancesResponse.json();
            console.log(`[enhancedTimingDataFetcher] 📋 Got ${instancesData.webinars?.length || 0} instances for webinar ${webinar.id}`);
            
            if (instancesData.webinars && instancesData.webinars.length > 0) {
              // Use the most recent instance for actual timing data
              const latestInstance = instancesData.webinars[0];
              
              if (latestInstance.start_time && !enhancedWebinar.actual_start_time) {
                enhancedWebinar.actual_start_time = latestInstance.start_time;
                enhancedWebinar.actual_duration = latestInstance.duration || null;
                timingDataFound = true;
                
                console.log(`[enhancedTimingDataFetcher] ✅ Found timing data from instance for ${webinar.id}:`, {
                  start_time: latestInstance.start_time,
                  duration: latestInstance.duration
                });
              }
              
              // Store instances data
              enhancedWebinar.raw_data = {
                ...enhancedWebinar.raw_data,
                instances_data: instancesData
              };
            }
          } else {
            const errorText = await instancesResponse.text();
            console.log(`[enhancedTimingDataFetcher] ⚠️ Instances API failed for ${webinar.id}:`, errorText);
          }
        } catch (error) {
          console.warn(`[enhancedTimingDataFetcher] ⚠️ Error fetching instances for ${webinar.id}:`, error.message);
        }
      }
      
      // Step 3: Get participant data for completed webinars
      if (timingDataFound || enhancedWebinar.status === 'ended') {
        try {
          console.log(`[enhancedTimingDataFetcher] 👥 Fetching participant count for webinar: ${webinar.id}`);
          
          const participantsResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}/participants?page_size=1`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (participantsResponse.ok) {
            const participantsData = await participantsResponse.json();
            console.log(`[enhancedTimingDataFetcher] 👥 Participant count for ${webinar.id}: ${participantsData.total_records || 0}`);
            
            if (participantsData.total_records !== undefined) {
              enhancedWebinar.participants_count = participantsData.total_records;
            }
          }
        } catch (error) {
          console.warn(`[enhancedTimingDataFetcher] ⚠️ Error fetching participants for ${webinar.id}:`, error.message);
        }
      }
      
      // Log final result for this webinar
      if (timingDataFound) {
        successCount++;
        console.log(`[enhancedTimingDataFetcher] 🎯 ✅ SUCCESS: Enhanced webinar ${webinar.id} with timing data:`, {
          actual_start_time: enhancedWebinar.actual_start_time,
          actual_duration: enhancedWebinar.actual_duration,
          participants_count: enhancedWebinar.participants_count
        });
      } else {
        console.log(`[enhancedTimingDataFetcher] ⚠️ No timing data found for webinar ${webinar.id} (status: ${webinar.status})`);
      }
      
      enhancedWebinars.push(enhancedWebinar);
      
    } catch (error) {
      errorCount++;
      console.error(`[enhancedTimingDataFetcher] ❌ Critical error processing webinar ${webinar.id}:`, error);
      // Add the original webinar even if enhancement fails
      enhancedWebinars.push(webinar);
    }
  }
  
  console.log(`[enhancedTimingDataFetcher] 🎉 COMPREHENSIVE TIMING FETCH COMPLETED:`);
  console.log(`[enhancedTimingDataFetcher] - Total webinars processed: ${webinars.length}`);
  console.log(`[enhancedTimingDataFetcher] - 🎯 SUCCESS: ${successCount} webinars enhanced with timing data`);
  console.log(`[enhancedTimingDataFetcher] - ⚠️ ERRORS: ${errorCount} webinars had processing errors`);
  console.log(`[enhancedTimingDataFetcher] - Success rate: ${Math.round((successCount/webinars.length)*100)}%`);
  
  return enhancedWebinars;
}

/**
 * Fetch timing data for a single webinar with comprehensive error handling
 */
export async function fetchSingleWebinarTimingData(webinarId: string, webinarUuid: string, token: string): Promise<any> {
  console.log(`[enhancedTimingDataFetcher] 🎯 Fetching timing data for single webinar: ${webinarId}`);
  
  let timingData = {
    actual_start_time: null,
    actual_duration: null,
    actual_end_time: null,
    participants_count: 0
  };
  
  // Try past webinar endpoint first
  if (webinarUuid) {
    try {
      const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarUuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pastWebinarResponse.ok) {
        const pastWebinarData = await pastWebinarResponse.json();
        console.log(`[enhancedTimingDataFetcher] ✅ Got past webinar timing data:`, pastWebinarData);
        
        timingData.actual_start_time = pastWebinarData.start_time || null;
        timingData.actual_duration = pastWebinarData.duration || null;
        timingData.actual_end_time = pastWebinarData.end_time || null;
        timingData.participants_count = pastWebinarData.participants_count || 0;
        
        return timingData;
      }
    } catch (error) {
      console.warn(`[enhancedTimingDataFetcher] Past webinar API failed:`, error.message);
    }
  }
  
  // Try instances endpoint as fallback
  try {
    const instancesResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (instancesResponse.ok) {
      const instancesData = await instancesResponse.json();
      if (instancesData.webinars && instancesData.webinars.length > 0) {
        const latestInstance = instancesData.webinars[0];
        timingData.actual_start_time = latestInstance.start_time || null;
        timingData.actual_duration = latestInstance.duration || null;
        
        console.log(`[enhancedTimingDataFetcher] ✅ Got timing data from instances:`, timingData);
      }
    }
  } catch (error) {
    console.warn(`[enhancedTimingDataFetcher] Instances API failed:`, error.message);
  }
  
  return timingData;
}
