
/**
 * Direct Past API Integration Service
 * Fetches actual webinar data directly from Zoom's past webinars API
 */

interface PastWebinarData {
  success: boolean;
  data: any;
  actualStartTime: string | null;
  actualDuration: number | null;
  actualEndTime: string | null;
  participantsCount: number;
  registrantsCount: number;
  status: string;
  apiSource: string;
  errorDetails: string[];
}

export async function fetchDirectPastWebinarData(
  token: string,
  webinarId: string,
  webinarUuid: string | null = null
): Promise<PastWebinarData> {
  console.log(`[direct-past-api] 🔄 Fetching past data for webinar ${webinarId}`);
  
  const result: PastWebinarData = {
    success: false,
    data: null,
    actualStartTime: null,
    actualDuration: null,
    actualEndTime: null,
    participantsCount: 0,
    registrantsCount: 0,
    status: 'unknown',
    apiSource: 'none',
    errorDetails: []
  };
  
  // Strategy 1: Try with webinar ID
  try {
    console.log(`[direct-past-api] 📡 Trying past webinars API with ID: ${webinarId}`);
    
    const response = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const pastData = await response.json();
      console.log(`[direct-past-api] ✅ Successfully fetched past data with ID`);
      
      return extractPastWebinarData(pastData, 'past_webinars_id_api');
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      result.errorDetails.push(`ID API failed: ${response.status} - ${errorText}`);
      console.warn(`[direct-past-api] ⚠️ ID API failed: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    result.errorDetails.push(`ID API error: ${error.message}`);
    console.error(`[direct-past-api] ❌ ID API error:`, error);
  }
  
  // Strategy 2: Try with UUID if available
  if (webinarUuid && webinarUuid !== webinarId) {
    try {
      console.log(`[direct-past-api] 📡 Trying past webinars API with UUID: ${webinarUuid}`);
      
      const response = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarUuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const pastData = await response.json();
        console.log(`[direct-past-api] ✅ Successfully fetched past data with UUID`);
        
        return extractPastWebinarData(pastData, 'past_webinars_uuid_api');
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        result.errorDetails.push(`UUID API failed: ${response.status} - ${errorText}`);
        console.warn(`[direct-past-api] ⚠️ UUID API failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      result.errorDetails.push(`UUID API error: ${error.message}`);
      console.error(`[direct-past-api] ❌ UUID API error:`, error);
    }
  }
  
  // Strategy 3: Try webinars/{id}/instances API for recurring webinars
  try {
    console.log(`[direct-past-api] 📡 Trying instances API for ${webinarId}`);
    
    const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const instancesData = await response.json();
      console.log(`[direct-past-api] ✅ Successfully fetched instances data`);
      
      // Find completed instances
      const completedInstances = instancesData.webinars?.filter((w: any) => 
        w.status === 'ended' || w.status === 'aborted'
      ) || [];
      
      if (completedInstances.length > 0) {
        // Use the most recent completed instance
        const recentInstance = completedInstances.sort((a: any, b: any) => 
          new Date(b.start_time || 0).getTime() - new Date(a.start_time || 0).getTime()
        )[0];
        
        return extractPastWebinarData(recentInstance, 'instances_api');
      }
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      result.errorDetails.push(`Instances API failed: ${response.status} - ${errorText}`);
      console.warn(`[direct-past-api] ⚠️ Instances API failed: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    result.errorDetails.push(`Instances API error: ${error.message}`);
    console.error(`[direct-past-api] ❌ Instances API error:`, error);
  }
  
  console.log(`[direct-past-api] ❌ All API strategies failed for webinar ${webinarId}`);
  console.log(`[direct-past-api] 📊 Errors: ${result.errorDetails.length}`);
  result.errorDetails.forEach((error, index) => {
    console.log(`[direct-past-api]   ${index + 1}. ${error}`);
  });
  
  return result;
}

function extractPastWebinarData(data: any, apiSource: string): PastWebinarData {
  console.log(`[direct-past-api] 🔍 Extracting data from ${apiSource}`);
  
  const result: PastWebinarData = {
    success: true,
    data,
    actualStartTime: data.start_time || null,
    actualDuration: data.duration || null,
    actualEndTime: data.end_time || null,
    participantsCount: data.participants_count || 0,
    registrantsCount: data.registrants_count || 0,
    status: data.status || 'ended',
    apiSource,
    errorDetails: []
  };
  
  // Calculate end time if not provided
  if (!result.actualEndTime && result.actualStartTime && result.actualDuration) {
    try {
      const startDate = new Date(result.actualStartTime);
      const endDate = new Date(startDate.getTime() + (result.actualDuration * 60000));
      result.actualEndTime = endDate.toISOString();
      console.log(`[direct-past-api] 🧮 Calculated end time: ${result.actualEndTime}`);
    } catch (error) {
      console.warn(`[direct-past-api] ⚠️ Error calculating end time:`, error);
    }
  }
  
  console.log(`[direct-past-api] ✅ Extracted data summary:`);
  console.log(`[direct-past-api]   - actualStartTime: ${result.actualStartTime}`);
  console.log(`[direct-past-api]   - actualDuration: ${result.actualDuration}`);
  console.log(`[direct-past-api]   - actualEndTime: ${result.actualEndTime}`);
  console.log(`[direct-past-api]   - participantsCount: ${result.participantsCount}`);
  console.log(`[direct-past-api]   - registrantsCount: ${result.registrantsCount}`);
  console.log(`[direct-past-api]   - status: ${result.status}`);
  console.log(`[direct-past-api]   - apiSource: ${result.apiSource}`);
  
  return result;
}

export async function enhanceInstanceWithDirectPastApi(
  token: string,
  instance: any,
  webinar: any,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  console.log(`[direct-past-api] 🔄 Enhancing instance ${instance.id} with direct past API`);
  
  try {
    const pastData = await fetchDirectPastWebinarData(
      token,
      instance.webinar_id,
      instance.webinar_uuid
    );
    
    if (!pastData.success) {
      return {
        success: false,
        error: `Failed to fetch past data: ${pastData.errorDetails.join(', ')}`
      };
    }
    
    // Update instance with past data
    const updateData = {
      actual_start_time: pastData.actualStartTime,
      actual_duration: pastData.actualDuration,
      end_time: pastData.actualEndTime,
      participants_count: pastData.participantsCount,
      registrants_count: pastData.registrantsCount,
      status: pastData.status,
      is_historical: pastData.status === 'ended' || pastData.status === 'aborted',
      data_source: 'direct_past_api',
      updated_at: new Date().toISOString(),
      raw_data: {
        ...((instance.raw_data as any) || {}),
        past_webinar_data: pastData.data,
        api_enhancement: {
          enhanced_at: new Date().toISOString(),
          api_source: pastData.apiSource,
          success: true,
          data_quality: {
            has_actual_start_time: !!pastData.actualStartTime,
            has_actual_duration: !!pastData.actualDuration,
            has_actual_end_time: !!pastData.actualEndTime,
            has_participant_counts: pastData.participantsCount > 0,
            has_registrant_counts: pastData.registrantsCount > 0
          }
        }
      }
    };
    
    const { error: updateError } = await supabase
      .from('zoom_webinar_instances')
      .update(updateData)
      .eq('id', instance.id);
    
    if (updateError) {
      return {
        success: false,
        error: `Database update failed: ${updateError.message}`
      };
    }
    
    console.log(`[direct-past-api] ✅ Successfully enhanced instance ${instance.id}`);
    return { success: true };
    
  } catch (error) {
    console.error(`[direct-past-api] ❌ Error enhancing instance ${instance.id}:`, error);
    return {
      success: false,
      error: `Enhancement error: ${error.message}`
    };
  }
}
