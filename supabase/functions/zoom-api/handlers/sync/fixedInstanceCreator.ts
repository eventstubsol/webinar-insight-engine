
/**
 * Fixed instance creator with comprehensive error handling and debugging
 */

import { logInstanceSyncDebug, validateInstanceData } from './debugInstanceSync.ts';

export async function createFixedWebinarInstance(
  webinarData: any,
  userId: string,
  supabase: any,
  isCompleted: boolean = false
): Promise<{ success: boolean; instanceId: string | null; error?: string }> {
  
  logInstanceSyncDebug(`Creating instance for webinar ${webinarData.id}`, {
    webinarId: webinarData.id,
    topic: webinarData.topic,
    status: webinarData.status,
    isCompleted
  });
  
  try {
    // Generate instance data with all required fields
    const instanceId = webinarData.uuid || webinarData.id || `instance-${Date.now()}`;
    
    // Calculate end_time if possible
    let calculatedEndTime = null;
    if (webinarData.start_time && webinarData.duration) {
      try {
        const startDate = new Date(webinarData.start_time);
        calculatedEndTime = new Date(startDate.getTime() + (webinarData.duration * 60000)).toISOString();
      } catch (error) {
        logInstanceSyncDebug('Error calculating end_time', { error: error.message });
      }
    }
    
    // Determine status
    let status = webinarData.status || 'unknown';
    if (isCompleted) {
      status = 'ended';
    } else if (status === 'unknown' && webinarData.start_time) {
      const now = new Date();
      const startTime = new Date(webinarData.start_time);
      status = now > startTime ? 'ended' : 'waiting';
    }
    
    const instanceData = {
      user_id: userId,
      webinar_id: webinarData.id,
      webinar_uuid: webinarData.uuid || '',
      instance_id: instanceId,
      topic: webinarData.topic || 'Untitled Webinar',
      start_time: webinarData.start_time,
      end_time: calculatedEndTime,
      duration: webinarData.duration || null,
      actual_start_time: isCompleted ? webinarData.start_time : null,
      actual_duration: isCompleted ? webinarData.duration : null,
      status: status,
      participants_count: webinarData.participants_count || 0,
      registrants_count: webinarData.registrants_count || 0,
      is_historical: isCompleted,
      data_source: 'fixed_sync',
      raw_data: {
        webinar_data: webinarData,
        sync_metadata: {
          created_at: new Date().toISOString(),
          sync_type: 'fixed_instance_creator',
          is_completed: isCompleted
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Validate the instance data
    const validation = validateInstanceData(instanceData);
    if (!validation.isValid) {
      const errorMsg = `Instance validation failed: ${validation.errors.join(', ')}`;
      logInstanceSyncDebug(errorMsg, instanceData);
      return { success: false, instanceId: null, error: errorMsg };
    }
    
    logInstanceSyncDebug('Attempting to upsert instance', {
      instanceId,
      hasRawData: !!instanceData.raw_data,
      dataKeys: Object.keys(instanceData)
    });
    
    // Upsert the instance
    const { error: upsertError } = await supabase
      .from('zoom_webinar_instances')
      .upsert(instanceData, {
        onConflict: 'user_id,webinar_id,instance_id',
        ignoreDuplicates: false
      });
    
    if (upsertError) {
      logInstanceSyncDebug('Database upsert error', {
        error: upsertError,
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details
      });
      return { 
        success: false, 
        instanceId: null, 
        error: `Database error: ${upsertError.message}` 
      };
    }
    
    logInstanceSyncDebug(`Successfully created instance ${instanceId}`);
    return { success: true, instanceId };
    
  } catch (error) {
    const errorMsg = `Exception in createFixedWebinarInstance: ${error.message}`;
    logInstanceSyncDebug(errorMsg, { error: error.stack });
    return { success: false, instanceId: null, error: errorMsg };
  }
}

export async function createInstancesFromWebinarBatch(
  webinars: any[],
  userId: string,
  supabase: any
): Promise<{ totalCreated: number; errors: string[] }> {
  
  logInstanceSyncDebug(`Creating instances for ${webinars.length} webinars`);
  
  let totalCreated = 0;
  const errors: string[] = [];
  
  for (const webinar of webinars) {
    try {
      // Determine if webinar is completed
      const isCompleted = webinar.status === 'ended' || webinar.status === 'aborted' || 
                         (webinar.start_time && new Date(webinar.start_time) < new Date());
      
      const result = await createFixedWebinarInstance(webinar, userId, supabase, isCompleted);
      
      if (result.success) {
        totalCreated++;
      } else {
        errors.push(`Webinar ${webinar.id}: ${result.error}`);
      }
    } catch (error) {
      errors.push(`Webinar ${webinar.id}: ${error.message}`);
    }
  }
  
  logInstanceSyncDebug(`Batch creation complete`, {
    totalWebinars: webinars.length,
    totalCreated,
    errorCount: errors.length
  });
  
  return { totalCreated, errors };
}
