
export interface WebinarFieldMapping {
  id: string;
  uuid?: string;
  topic: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  actual_duration?: number;
  status?: string;
  host_email?: string;
  host_id?: string;
  timezone?: string;
  agenda?: string;
  join_url?: string;
  registration_url?: string;
  data_source?: string;
  is_historical?: boolean;
  raw_data?: any;
  type?: number;
  registrants_count?: number;
  participants_count?: number;
}

export async function processWebinarData(
  webinars: any[], 
  source: 'regular' | 'reporting' | 'account'
): Promise<WebinarFieldMapping[]> {
  console.log(`🔄 Processing ${webinars.length} webinars from ${source} source with FIXED field mapping`);
  
  return webinars.map(webinar => {
    console.log(`📊 Processing webinar from ${source}:`, {
      id: webinar.id,
      topic: webinar.topic,
      start_time: webinar.start_time,
      duration: webinar.duration,
      status: webinar.status
    });
    
    // FIXED: Proper field mapping based on actual Zoom API response
    const mapped: WebinarFieldMapping = {
      id: webinar.id?.toString() || webinar.webinar_id?.toString(),
      uuid: webinar.uuid || webinar.webinar_uuid || '',
      topic: webinar.topic || webinar.title || webinar.subject || 'Untitled Webinar',
      start_time: webinar.start_time,
      duration: webinar.duration,
      status: webinar.status || (source === 'reporting' ? 'ended' : 'waiting'),
      host_email: webinar.host_email,
      host_id: webinar.host_id,
      timezone: webinar.timezone,
      agenda: webinar.agenda,
      join_url: webinar.join_url,
      registration_url: webinar.registration_url,
      data_source: source,
      is_historical: source === 'reporting',
      type: webinar.type || 5, // Default to single occurrence
      registrants_count: webinar.registrants_count || 0,
      participants_count: webinar.participants_count || 0,
      raw_data: {
        original: webinar,
        processed_at: new Date().toISOString(),
        source: source,
        field_mapping_version: '2.0'
      }
    };
    
    // FIXED: Calculate end_time properly
    if (!mapped.end_time && mapped.start_time && mapped.duration) {
      try {
        const startDate = new Date(mapped.start_time);
        const endDate = new Date(startDate.getTime() + (mapped.duration * 60000));
        mapped.end_time = endDate.toISOString();
        console.log(`🧮 Calculated end_time for ${mapped.id}: ${mapped.end_time}`);
      } catch (error) {
        console.warn(`⚠️ Failed to calculate end_time for ${mapped.id}:`, error);
      }
    }
    
    // For historical/completed webinars from reporting API
    if (source === 'reporting') {
      mapped.actual_duration = webinar.duration || webinar.actual_duration;
      mapped.end_time = webinar.end_time;
    }
    
    console.log(`✅ Mapped webinar ${mapped.id}: ${mapped.topic} (${source})`);
    return mapped;
  });
}
