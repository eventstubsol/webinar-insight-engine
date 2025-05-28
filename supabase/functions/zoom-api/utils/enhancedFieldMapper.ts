
export interface WebinarFieldMapping {
  id: string;
  uuid: string;
  topic: string;
  start_time: string;
  end_time?: string;
  duration: number;
  actual_duration?: number;
  status: string;
  host_email: string;
  host_id?: string;
  timezone: string;
  agenda?: string;
  join_url?: string;
  registration_url?: string;
  data_source: string;
  is_historical: boolean;
}

export function mapWebinarFields(rawWebinar: any, dataSource: 'regular' | 'reporting' | 'account' = 'regular'): WebinarFieldMapping {
  console.log(`🔍 Mapping webinar fields from ${dataSource}:`, {
    id: rawWebinar.id,
    availableFields: Object.keys(rawWebinar),
    rawData: JSON.stringify(rawWebinar, null, 2)
  });
  
  // Extract topic with multiple fallbacks and detailed logging
  const possibleTopicFields = ['topic', 'title', 'subject', 'webinar_name', 'name'];
  let topic = 'Untitled Webinar';
  
  for (const field of possibleTopicFields) {
    if (rawWebinar[field] && typeof rawWebinar[field] === 'string' && rawWebinar[field].trim()) {
      topic = rawWebinar[field].trim();
      console.log(`✅ Found topic in field '${field}': "${topic}"`);
      break;
    }
  }
  
  if (topic === 'Untitled Webinar') {
    console.warn(`⚠️ No topic found for webinar ${rawWebinar.id}. Available fields:`, Object.keys(rawWebinar));
    console.warn(`⚠️ Topic field values:`, possibleTopicFields.map(f => ({ [f]: rawWebinar[f] })));
  }
  
  // Extract timing data with detailed logging
  const startTime = rawWebinar.start_time || rawWebinar.created_at || rawWebinar.scheduled_time;
  const endTime = rawWebinar.end_time || rawWebinar.ended_at || rawWebinar.actual_end_time;
  
  // Duration extraction with multiple sources
  let duration = 0;
  const possibleDurationFields = ['duration', 'planned_duration', 'scheduled_duration'];
  for (const field of possibleDurationFields) {
    if (rawWebinar[field] && typeof rawWebinar[field] === 'number') {
      duration = rawWebinar[field];
      console.log(`✅ Found duration in field '${field}': ${duration}`);
      break;
    }
  }
  
  // Actual duration (for completed webinars)
  const actualDuration = rawWebinar.actual_duration || 
                         rawWebinar.total_minutes || 
                         rawWebinar.duration_minutes ||
                         (endTime && startTime ? 
                           Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000) : 
                           null);
  
  // Status mapping
  const status = rawWebinar.status || 
                 (endTime ? 'ended' : 'scheduled') ||
                 'unknown';
  
  // Host information
  const hostEmail = rawWebinar.host_email || 
                    rawWebinar.host?.email || 
                    rawWebinar.user_email ||
                    '';
  
  const hostId = rawWebinar.host_id || 
                 rawWebinar.host?.id || 
                 rawWebinar.user_id ||
                 '';
  
  // URLs
  const joinUrl = rawWebinar.join_url || rawWebinar.registration_url || '';
  const registrationUrl = rawWebinar.registration_url || '';
  
  const mapped: WebinarFieldMapping = {
    id: rawWebinar.id?.toString() || '',
    uuid: rawWebinar.uuid || rawWebinar.webinar_uuid || '',
    topic,
    start_time: startTime || '',
    end_time: endTime || null,
    duration,
    actual_duration: actualDuration,
    status,
    host_email: hostEmail,
    host_id: hostId,
    timezone: rawWebinar.timezone || 'UTC',
    agenda: rawWebinar.agenda || rawWebinar.description || '',
    join_url: joinUrl,
    registration_url: registrationUrl,
    data_source: dataSource,
    is_historical: status === 'ended' || !!endTime
  };
  
  console.log(`📋 Mapped webinar ${rawWebinar.id}:`, {
    topic: mapped.topic,
    status: mapped.status,
    duration: mapped.duration,
    actualDuration: mapped.actual_duration,
    isHistorical: mapped.is_historical,
    dataSource: mapped.data_source
  });
  
  return mapped;
}

export function validateWebinarData(webinar: WebinarFieldMapping): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!webinar.id) issues.push('Missing webinar ID');
  if (!webinar.topic || webinar.topic === 'Untitled Webinar') issues.push('Missing or default topic');
  if (!webinar.start_time) issues.push('Missing start time');
  if (!webinar.host_email) issues.push('Missing host email');
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

// Enhanced webinar processor that handles different data sources
export async function processWebinarData(rawWebinars: any[], dataSource: 'regular' | 'reporting' | 'account'): Promise<WebinarFieldMapping[]> {
  console.log(`🔄 Processing ${rawWebinars.length} webinars from ${dataSource} source`);
  
  const processedWebinars: WebinarFieldMapping[] = [];
  
  for (const rawWebinar of rawWebinars) {
    try {
      const mapped = mapWebinarFields(rawWebinar, dataSource);
      const validation = validateWebinarData(mapped);
      
      if (!validation.isValid) {
        console.warn(`⚠️ Validation issues for webinar ${mapped.id}:`, validation.issues);
      }
      
      processedWebinars.push(mapped);
    } catch (error) {
      console.error(`❌ Error processing webinar ${rawWebinar.id}:`, error);
      console.error('Raw webinar data:', rawWebinar);
    }
  }
  
  console.log(`✅ Successfully processed ${processedWebinars.length}/${rawWebinars.length} webinars`);
  return processedWebinars;
}
