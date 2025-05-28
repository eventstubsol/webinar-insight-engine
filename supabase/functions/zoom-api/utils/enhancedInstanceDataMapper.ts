
/**
 * Enhanced instance data mapper that properly extracts and maps all fields
 * from Zoom API responses to zoom_webinar_instances table columns
 */

export interface EnhancedInstanceData {
  user_id: string;
  webinar_id: string;
  webinar_uuid: string;
  instance_id: string;
  start_time: string | null;
  end_time: string | null;
  duration: number | null;
  actual_start_time: string | null;
  actual_duration: number | null;
  topic: string;
  status: string;
  registrants_count: number;
  participants_count: number;
  is_historical: boolean;
  data_source: string;
  raw_data: any;
}

/**
 * Maps webinar data from Zoom API to enhanced instance data structure
 */
export function mapWebinarToInstanceData(
  webinar: any,
  instance: any | null,
  pastData: any | null,
  userId: string
): EnhancedInstanceData {
  
  console.log(`[enhanced-mapper] 🔄 Mapping data for webinar ${webinar.id}`);
  console.log(`[enhanced-mapper] 📊 Input data: webinar=${!!webinar}, instance=${!!instance}, pastData=${!!pastData}`);
  
  // Extract basic identifiers
  const webinarId = webinar.id?.toString() || '';
  const webinarUuid = webinar.uuid || '';
  const instanceId = instance?.uuid || instance?.instance_id || webinar.uuid || webinar.id?.toString() || '';
  
  // Extract topic with proper fallback
  const topic = extractTopic(webinar, instance);
  
  // Extract timing data with proper priority
  const timingData = extractTimingData(webinar, instance, pastData);
  
  // Extract status with proper mapping
  const status = extractStatus(webinar, instance, pastData, timingData);
  
  // Extract participant/registrant counts
  const counts = extractCounts(webinar, instance, pastData);
  
  // Determine data source and historical status
  const dataSource = determineDataSource(webinar, instance, pastData);
  const isHistorical = determineHistoricalStatus(webinar, instance, pastData, status);
  
  console.log(`[enhanced-mapper] 📊 Mapped fields:`);
  console.log(`[enhanced-mapper]   - topic: ${topic}`);
  console.log(`[enhanced-mapper]   - start_time: ${timingData.start_time}`);
  console.log(`[enhanced-mapper]   - duration: ${timingData.duration}`);
  console.log(`[enhanced-mapper]   - end_time: ${timingData.end_time}`);
  console.log(`[enhanced-mapper]   - actual_start_time: ${timingData.actual_start_time}`);
  console.log(`[enhanced-mapper]   - actual_duration: ${timingData.actual_duration}`);
  console.log(`[enhanced-mapper]   - status: ${status}`);
  console.log(`[enhanced-mapper]   - registrants_count: ${counts.registrants_count}`);
  console.log(`[enhanced-mapper]   - participants_count: ${counts.participants_count}`);
  console.log(`[enhanced-mapper]   - is_historical: ${isHistorical}`);
  console.log(`[enhanced-mapper]   - data_source: ${dataSource}`);
  
  return {
    user_id: userId,
    webinar_id: webinarId,
    webinar_uuid: webinarUuid,
    instance_id: instanceId,
    start_time: timingData.start_time,
    end_time: timingData.end_time,
    duration: timingData.duration,
    actual_start_time: timingData.actual_start_time,
    actual_duration: timingData.actual_duration,
    topic,
    status,
    registrants_count: counts.registrants_count,
    participants_count: counts.participants_count,
    is_historical: isHistorical,
    data_source: dataSource,
    raw_data: {
      webinar_data: webinar,
      instance_data: instance,
      past_data: pastData,
      mapping_metadata: {
        topic_source: getTopicSource(webinar, instance),
        timing_sources: getTimingSources(webinar, instance, pastData),
        status_source: getStatusSource(webinar, instance, pastData),
        counts_sources: getCountsSources(webinar, instance, pastData),
        mapped_at: new Date().toISOString()
      }
    }
  };
}

/**
 * Extract topic with proper priority: instance > webinar > default
 */
function extractTopic(webinar: any, instance: any): string {
  if (instance?.topic && instance.topic.trim() !== '') {
    return instance.topic.trim();
  }
  if (webinar?.topic && webinar.topic.trim() !== '') {
    return webinar.topic.trim();
  }
  return 'Untitled Webinar';
}

/**
 * Extract all timing-related data with proper calculations
 */
function extractTimingData(webinar: any, instance: any, pastData: any) {
  console.log(`[enhanced-mapper] 🕒 Extracting timing data`);
  
  // Scheduled timing (from webinar/instance API)
  const scheduledStartTime = instance?.start_time || webinar?.start_time || null;
  const scheduledDuration = instance?.duration || webinar?.duration || null;
  
  // Actual timing (from past webinar API)
  const actualStartTime = pastData?.start_time || null;
  const actualDuration = pastData?.duration || null;
  const actualEndTime = pastData?.end_time || null;
  
  // Calculate end_time with proper priority:
  // 1. Actual end_time from past webinar API
  // 2. Calculated from actual start + actual duration
  // 3. Calculated from scheduled start + scheduled duration
  let calculatedEndTime = null;
  
  if (actualEndTime) {
    calculatedEndTime = actualEndTime;
    console.log(`[enhanced-mapper] 🕒 Using actual end_time: ${calculatedEndTime}`);
  } else if (actualStartTime && actualDuration) {
    try {
      const startDate = new Date(actualStartTime);
      const endDate = new Date(startDate.getTime() + (actualDuration * 60000));
      calculatedEndTime = endDate.toISOString();
      console.log(`[enhanced-mapper] 🕒 Calculated end_time from actual data: ${calculatedEndTime}`);
    } catch (error) {
      console.warn(`[enhanced-mapper] ⚠️ Error calculating end_time from actual data:`, error);
    }
  } else if (scheduledStartTime && scheduledDuration) {
    try {
      const startDate = new Date(scheduledStartTime);
      const endDate = new Date(startDate.getTime() + (scheduledDuration * 60000));
      calculatedEndTime = endDate.toISOString();
      console.log(`[enhanced-mapper] 🕒 Calculated end_time from scheduled data: ${calculatedEndTime}`);
    } catch (error) {
      console.warn(`[enhanced-mapper] ⚠️ Error calculating end_time from scheduled data:`, error);
    }
  }
  
  return {
    start_time: scheduledStartTime,
    end_time: calculatedEndTime,
    duration: scheduledDuration,
    actual_start_time: actualStartTime,
    actual_duration: actualDuration
  };
}

/**
 * Extract and map status with comprehensive logic
 */
function extractStatus(webinar: any, instance: any, pastData: any, timingData: any): string {
  console.log(`[enhanced-mapper] 📊 Extracting status`);
  
  // Priority: pastData > instance > webinar > calculated
  let status = pastData?.status || instance?.status || webinar?.status;
  
  if (status && status.trim() !== '') {
    // Normalize known Zoom status values
    const normalizedStatus = normalizeZoomStatus(status);
    console.log(`[enhanced-mapper] 📊 Using API status: ${status} -> ${normalizedStatus}`);
    return normalizedStatus;
  }
  
  // Calculate status based on timing if no explicit status
  const calculatedStatus = calculateStatusFromTiming(timingData);
  console.log(`[enhanced-mapper] 📊 Calculated status: ${calculatedStatus}`);
  return calculatedStatus;
}

/**
 * Normalize Zoom API status values to consistent format
 */
function normalizeZoomStatus(status: string): string {
  const normalizedStatus = status.toLowerCase().trim();
  
  switch (normalizedStatus) {
    case 'waiting':
    case 'scheduled':
      return 'waiting';
    case 'started':
    case 'live':
    case 'in_progress':
      return 'started';
    case 'ended':
    case 'finished':
    case 'completed':
      return 'ended';
    case 'aborted':
    case 'cancelled':
      return 'aborted';
    default:
      return normalizedStatus;
  }
}

/**
 * Calculate status based on timing data
 */
function calculateStatusFromTiming(timingData: any): string {
  const now = new Date();
  
  // If we have actual timing data, use that
  if (timingData.actual_start_time) {
    const actualStart = new Date(timingData.actual_start_time);
    if (timingData.actual_duration) {
      const actualEnd = new Date(actualStart.getTime() + (timingData.actual_duration * 60000));
      if (now > actualEnd) {
        return 'ended';
      } else if (now >= actualStart) {
        return 'started';
      }
    }
    // If we have actual start but no duration, and it's in the past, assume ended
    if (now > actualStart) {
      return 'ended';
    }
  }
  
  // Fall back to scheduled timing
  if (timingData.start_time) {
    const scheduledStart = new Date(timingData.start_time);
    if (timingData.end_time) {
      const scheduledEnd = new Date(timingData.end_time);
      if (now > scheduledEnd) {
        return 'ended';
      } else if (now >= scheduledStart) {
        return 'started';
      } else {
        return 'waiting';
      }
    } else if (now > scheduledStart) {
      // Started but no end time available
      return 'started';
    } else {
      return 'waiting';
    }
  }
  
  return 'unknown';
}

/**
 * Extract participant and registrant counts
 */
function extractCounts(webinar: any, instance: any, pastData: any) {
  console.log(`[enhanced-mapper] 🔢 Extracting counts`);
  
  // Priority: pastData > instance > webinar > 0
  const participantsCount = pastData?.participants_count || 
                           pastData?.participant_count ||
                           instance?.participants_count || 
                           instance?.participant_count ||
                           webinar?.participants_count || 
                           webinar?.participant_count || 0;
                           
  const registrantsCount = pastData?.registrants_count || 
                          pastData?.registrant_count ||
                          instance?.registrants_count || 
                          instance?.registrant_count ||
                          webinar?.registrants_count || 
                          webinar?.registrant_count || 0;
  
  console.log(`[enhanced-mapper] 🔢 Counts: participants=${participantsCount}, registrants=${registrantsCount}`);
  
  return {
    participants_count: Number(participantsCount) || 0,
    registrants_count: Number(registrantsCount) || 0
  };
}

/**
 * Determine the primary data source
 */
function determineDataSource(webinar: any, instance: any, pastData: any): string {
  if (pastData) {
    return 'past_webinar_api';
  } else if (instance) {
    return 'instances_api';
  } else {
    return 'webinar_api';
  }
}

/**
 * Determine if this is a historical webinar
 */
function determineHistoricalStatus(webinar: any, instance: any, pastData: any, status: string): boolean {
  // If we have past webinar data, it's definitely historical
  if (pastData) {
    return true;
  }
  
  // If status indicates completion
  if (status === 'ended' || status === 'aborted') {
    return true;
  }
  
  // Check if webinar is marked as historical in the source data
  if (webinar?.is_historical === true || instance?.is_historical === true) {
    return true;
  }
  
  return false;
}

// Helper functions for metadata
function getTopicSource(webinar: any, instance: any): string {
  if (instance?.topic && instance.topic.trim() !== '') return 'instance';
  if (webinar?.topic && webinar.topic.trim() !== '') return 'webinar';
  return 'default';
}

function getTimingSources(webinar: any, instance: any, pastData: any) {
  return {
    start_time: instance?.start_time ? 'instance' : (webinar?.start_time ? 'webinar' : 'none'),
    duration: instance?.duration ? 'instance' : (webinar?.duration ? 'webinar' : 'none'),
    actual_start_time: pastData?.start_time ? 'past_data' : 'none',
    actual_duration: pastData?.duration ? 'past_data' : 'none',
    end_time: pastData?.end_time ? 'past_data' : 'calculated'
  };
}

function getStatusSource(webinar: any, instance: any, pastData: any): string {
  if (pastData?.status) return 'past_data';
  if (instance?.status) return 'instance';
  if (webinar?.status) return 'webinar';
  return 'calculated';
}

function getCountsSources(webinar: any, instance: any, pastData: any) {
  return {
    participants_count: pastData?.participants_count ? 'past_data' : 
                       (instance?.participants_count ? 'instance' : 
                       (webinar?.participants_count ? 'webinar' : 'default')),
    registrants_count: pastData?.registrants_count ? 'past_data' : 
                      (instance?.registrants_count ? 'instance' : 
                      (webinar?.registrants_count ? 'webinar' : 'default'))
  };
}
