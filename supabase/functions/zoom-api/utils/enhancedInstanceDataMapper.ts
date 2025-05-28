
/**
 * Enhanced Instance Data Mapper for comprehensive field population
 */

/**
 * Maps webinar and instance data to enhanced instance structure with comprehensive fields
 */
export function mapWebinarToInstanceData(
  webinarData: any,
  instanceData: any = null,
  pastData: any = null,
  userId: string
): any {
  console.log(`[enhanced-mapper] 🔄 Mapping comprehensive instance data for webinar ${webinarData.id}`);
  
  // Determine the best values with priority: pastData > instanceData > webinarData
  const data = instanceData || webinarData;
  
  // Core identification
  const webinar_id = webinarData.id || webinarData.webinar_id;
  const webinar_uuid = webinarData.uuid || webinarData.webinar_uuid || '';
  const instance_id = instanceData?.uuid || instanceData?.id || webinar_uuid || webinar_id;
  
  // Topic with fallback
  const topic = (instanceData?.topic && instanceData.topic.trim() !== '') ? instanceData.topic :
               (webinarData.topic && webinarData.topic.trim() !== '') ? webinarData.topic :
               'Untitled Webinar';
  
  // Timing data with comprehensive priority
  const start_time = pastData?.start_time || data.start_time || webinarData.start_time;
  const duration = pastData?.duration || data.duration || webinarData.duration;
  const actual_start_time = pastData?.start_time || null;
  const actual_duration = pastData?.duration || null;
  
  // Calculate end_time
  let end_time = pastData?.end_time || data.end_time;
  if (!end_time && start_time && duration) {
    try {
      const startDate = new Date(start_time);
      const endDate = new Date(startDate.getTime() + (duration * 60000));
      end_time = endDate.toISOString();
      console.log(`[enhanced-mapper] 🧮 Calculated end_time: ${end_time}`);
    } catch (error) {
      console.warn(`[enhanced-mapper] ⚠️ Error calculating end_time:`, error);
    }
  }
  
  // Status determination
  let status = pastData?.status || data.status || webinarData.status;
  if (!status || status.trim() === '') {
    // Determine status based on timing
    if (pastData?.status) {
      status = pastData.status;
    } else if (start_time) {
      try {
        const now = new Date();
        const startDate = new Date(start_time);
        if (now > startDate) {
          if (end_time && now > new Date(end_time)) {
            status = 'ended';
          } else {
            status = 'started';
          }
        } else {
          status = 'waiting';
        }
      } catch (error) {
        status = 'unknown';
      }
    } else {
      status = 'unknown';
    }
  }
  
  // Participant counts
  const participants_count = pastData?.participants_count || data.participants_count || 0;
  const registrants_count = pastData?.registrants_count || data.registrants_count || webinarData.registrants_count || 0;
  
  // Historical classification
  const is_historical = pastData ? true : (status === 'ended' || status === 'aborted');
  
  // Data source tracking
  const data_source = pastData ? 'past_webinar_api' : 
                     instanceData ? 'instances_api' : 
                     'webinar_api';
  
  // Raw data compilation
  const raw_data = {
    webinar_data: webinarData,
    instance_data: instanceData,
    past_data: pastData,
    mapping_metadata: {
      mapped_at: new Date().toISOString(),
      data_sources_used: [
        pastData ? 'past_webinar_api' : null,
        instanceData ? 'instances_api' : null,
        'webinar_api'
      ].filter(Boolean),
      field_sources: {
        topic: instanceData?.topic ? 'instance' : (webinarData.topic ? 'webinar' : 'default'),
        start_time: pastData?.start_time ? 'past_api' : (data.start_time ? (instanceData ? 'instance' : 'webinar') : 'none'),
        duration: pastData?.duration ? 'past_api' : (data.duration ? (instanceData ? 'instance' : 'webinar') : 'none'),
        end_time: pastData?.end_time ? 'past_api' : (end_time ? 'calculated' : 'none'),
        status: pastData?.status ? 'past_api' : (data.status ? (instanceData ? 'instance' : 'webinar') : 'calculated'),
        participants_count: pastData?.participants_count ? 'past_api' : (data.participants_count ? (instanceData ? 'instance' : 'webinar') : 'default'),
        registrants_count: pastData?.registrants_count ? 'past_api' : (data.registrants_count ? (instanceData ? 'instance' : 'webinar') : 'default')
      }
    }
  };
  
  const mappedInstance = {
    user_id: userId,
    webinar_id,
    webinar_uuid,
    instance_id,
    start_time,
    end_time,
    duration,
    actual_start_time,
    actual_duration,
    topic,
    status,
    participants_count,
    registrants_count,
    is_historical,
    data_source,
    raw_data
  };
  
  console.log(`[enhanced-mapper] ✅ Enhanced mapping complete:`);
  console.log(`[enhanced-mapper]   - webinar_id: ${webinar_id}`);
  console.log(`[enhanced-mapper]   - instance_id: ${instance_id}`);
  console.log(`[enhanced-mapper]   - topic: ${topic}`);
  console.log(`[enhanced-mapper]   - start_time: ${start_time}`);
  console.log(`[enhanced-mapper]   - end_time: ${end_time}`);
  console.log(`[enhanced-mapper]   - duration: ${duration}`);
  console.log(`[enhanced-mapper]   - actual_start_time: ${actual_start_time}`);
  console.log(`[enhanced-mapper]   - actual_duration: ${actual_duration}`);
  console.log(`[enhanced-mapper]   - status: ${status}`);
  console.log(`[enhanced-mapper]   - participants_count: ${participants_count}`);
  console.log(`[enhanced-mapper]   - registrants_count: ${registrants_count}`);
  console.log(`[enhanced-mapper]   - is_historical: ${is_historical}`);
  console.log(`[enhanced-mapper]   - data_source: ${data_source}`);
  
  return mappedInstance;
}
