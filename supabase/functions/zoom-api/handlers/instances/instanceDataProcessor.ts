
import { detectWebinarCompletion } from '../../utils/webinarCompletionDetector.ts';

/**
 * Processes and transforms instance data for database storage with proper data inheritance
 */
export async function processInstanceForDatabase(
  instance: any, 
  webinarData: any, 
  webinarId: string, 
  userId: string
) {
  try {
    // Properly inherit data with correct precedence and validation
    const finalTopic = (instance.topic && instance.topic.trim() !== '') ? instance.topic :
                      (webinarData.topic && webinarData.topic.trim() !== '') ? webinarData.topic : 'Untitled Webinar';
    
    const finalStartTime = instance.start_time || webinarData.start_time;
    const scheduledDuration = instance.duration || webinarData.duration || null;
    
    // Extract actual timing data from instance if available
    const actualStartTime = instance.actual_start_time || null;
    const actualDuration = instance.actual_duration || null;
    
    // Use actual duration if available, otherwise scheduled
    const finalDuration = actualDuration || scheduledDuration;
    
    // Calculate end time: actual > calculated from start+duration
    let finalEndTime = instance.end_time || null;
    if (!finalEndTime && finalStartTime && finalDuration) {
      try {
        const startDate = new Date(finalStartTime);
        const endDate = new Date(startDate.getTime() + (finalDuration * 60000));
        finalEndTime = endDate.toISOString();
      } catch (error) {
        console.warn(`[zoom-api][instance-processor] ⚠️ Error calculating end time:`, error);
      }
    }
    
    // Use completion detection for proper status determination
    const completionResult = detectWebinarCompletion(webinarData, instance);
    let finalStatus = instance.status;
    if (!finalStatus || finalStatus.trim() === '') {
      if (completionResult.isCompleted) {
        finalStatus = 'ended';
      } else if (finalStartTime) {
        const now = new Date();
        const startTime = new Date(finalStartTime);
        if (now > startTime) {
          if (finalEndTime && now > new Date(finalEndTime)) {
            finalStatus = 'ended';
          } else {
            finalStatus = 'started';
          }
        } else {
          finalStatus = 'waiting';
        }
      } else {
        finalStatus = 'waiting';
      }
    }
    
    console.log(`[zoom-api][instance-processor] 📊 Processing data for instance ${instance.uuid || instance.id}:`);
    console.log(`[zoom-api][instance-processor]   - topic: ${finalTopic}`);
    console.log(`[zoom-api][instance-processor]   - start_time: ${finalStartTime}`);
    console.log(`[zoom-api][instance-processor]   - duration: ${finalDuration} (actual: ${actualDuration}, scheduled: ${scheduledDuration})`);
    console.log(`[zoom-api][instance-processor]   - end_time: ${finalEndTime}`);
    console.log(`[zoom-api][instance-processor]   - status: ${finalStatus}`);
    console.log(`[zoom-api][instance-processor]   - actual_start_time: ${actualStartTime}`);
    console.log(`[zoom-api][instance-processor]   - actual_duration: ${actualDuration}`);
    console.log(`[zoom-api][instance-processor]   - completion_detected: ${completionResult.isCompleted} (${completionResult.reason})`);
    
    return {
      user_id: userId,
      webinar_id: webinarId,
      webinar_uuid: webinarData.uuid || '',
      instance_id: instance.uuid || instance.id || '',
      start_time: finalStartTime,
      end_time: finalEndTime,
      duration: finalDuration,
      actual_start_time: actualStartTime,
      actual_duration: actualDuration,
      topic: finalTopic,
      status: finalStatus,
      registrants_count: instance.registrants_count || 0,
      participants_count: instance.participants_count || 0,
      raw_data: {
        ...instance,
        _webinar_data: webinarData,
        _completion_analysis: completionResult,
        _timing_source: {
          topic: instance.topic ? 'instance' : (webinarData.topic ? 'webinar' : 'default'),
          start_time: instance.start_time ? 'instance' : 'webinar',
          duration: actualDuration ? 'actual_data' : (scheduledDuration ? (instance.duration ? 'instance' : 'webinar') : 'none'),
          actual_start_time: actualStartTime ? 'actual_data' : 'none',
          actual_duration: actualDuration ? 'actual_data' : 'none',
          end_time: instance.end_time ? 'instance' : (finalEndTime ? 'calculated' : 'none'),
          status: instance.status ? 'instance' : 'calculated'
        },
        _data_inheritance: {
          topic_source: instance.topic ? 'instance' : (webinarData.topic ? 'webinar' : 'default'),
          duration_source: actualDuration ? 'actual' : (instance.duration ? 'instance_scheduled' : 'webinar_scheduled'),
          timing_data_available: !!actualStartTime
        }
      }
    };
  } catch (error) {
    console.error(`[zoom-api][instance-processor] ❌ Error processing instance data for ${webinarId}:`, error);
    throw new Error(`Failed to process instance data: ${error.message}`);
  }
}

/**
 * Upserts instance data in the database
 */
export async function upsertInstanceData(supabase: any, instanceData: any, webinarId: string, instanceId: string): Promise<void> {
  try {
    console.log(`[zoom-api][instance-processor] 🔄 Upserting instance ${instanceId} for webinar ${webinarId}`);
    
    // Check if this instance already exists
    const { data: existingInstance, error: selectError } = await supabase
      .from('zoom_webinar_instances')
      .select('id')
      .eq('webinar_id', webinarId)
      .eq('instance_id', instanceId)
      .maybeSingle();
    
    if (selectError) {
      console.error(`[zoom-api][instance-processor] ❌ Error checking existing instance ${instanceId}:`, selectError);
      throw new Error(`Database select error: ${selectError.message}`);
    }
    
    if (existingInstance) {
      // Update existing instance
      const { error: updateError } = await supabase
        .from('zoom_webinar_instances')
        .update(instanceData)
        .eq('id', existingInstance.id);
        
      if (updateError) {
        console.error(`[zoom-api][instance-processor] ❌ Error updating instance ${instanceId}:`, updateError);
        throw new Error(`Failed to update instance: ${updateError.message}`);
      } else {
        console.log(`[zoom-api][instance-processor] ✅ Updated instance ${instanceId} with duration: ${instanceData.duration}, status: ${instanceData.status}`);
      }
    } else {
      // Insert new instance
      const { error: insertError } = await supabase
        .from('zoom_webinar_instances')
        .insert(instanceData);
        
      if (insertError) {
        console.error(`[zoom-api][instance-processor] ❌ Error inserting instance ${instanceId}:`, insertError);
        throw new Error(`Failed to insert instance: ${insertError.message}`);
      } else {
        console.log(`[zoom-api][instance-processor] ✅ Inserted instance ${instanceId} with duration: ${instanceData.duration}, status: ${instanceData.status}`);
      }
    }
  } catch (error) {
    console.error(`[zoom-api][instance-processor] ❌ Error upserting instance ${instanceId}:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}
