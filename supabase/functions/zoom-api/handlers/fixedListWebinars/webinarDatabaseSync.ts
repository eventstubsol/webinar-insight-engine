
import { WebinarFieldMapping } from '../../utils/enhancedFieldMapper.ts';

export async function syncWebinarsToDatabase(
  supabase: any, 
  userId: string, 
  webinars: WebinarFieldMapping[]
): Promise<{ successCount: number; errorCount: number; syncedWebinars: WebinarFieldMapping[] }> {
  console.log(`💾 Starting FIXED database sync for ${webinars.length} webinars`);
  
  let successCount = 0;
  let errorCount = 0;
  const syncedWebinars: WebinarFieldMapping[] = [];
  
  for (const webinar of webinars) {
    try {
      // CRITICAL FIX: Ensure raw_data is never null
      const rawData = webinar.raw_data || {
        original_webinar: webinar,
        sync_metadata: {
          synced_at: new Date().toISOString(),
          data_source: webinar.data_source || 'regular',
          field_mapping_version: '1.0'
        }
      };
      
      // FIXED: Calculate end_time properly
      let calculatedEndTime = webinar.end_time;
      if (!calculatedEndTime && webinar.start_time && webinar.duration) {
        try {
          const startDate = new Date(webinar.start_time);
          const endDate = new Date(startDate.getTime() + (webinar.duration * 60000));
          calculatedEndTime = endDate.toISOString();
          console.log(`🧮 Calculated end_time for webinar ${webinar.id}: ${calculatedEndTime}`);
        } catch (error) {
          console.warn(`⚠️ Failed to calculate end_time for webinar ${webinar.id}:`, error);
        }
      }
      
      const webinarData = {
        user_id: userId,
        webinar_id: webinar.id,
        webinar_uuid: webinar.uuid || '',
        topic: webinar.topic || 'Untitled Webinar',
        start_time: webinar.start_time,
        end_time: calculatedEndTime, // FIXED: Now properly calculated
        duration: webinar.duration,
        actual_duration: webinar.actual_duration,
        status: webinar.status || 'unknown',
        host_email: webinar.host_email,
        host_id: webinar.host_id,
        timezone: webinar.timezone,
        agenda: webinar.agenda,
        join_url: webinar.join_url,
        registration_url: webinar.registration_url,
        data_source: webinar.data_source || 'regular',
        is_historical: webinar.is_historical || false,
        raw_data: rawData, // CRITICAL FIX: Never null
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        type: webinar.type || 5, // Default to single occurrence
        registrants_count: webinar.registrants_count || 0,
        participants_count: webinar.participants_count || 0
      };
      
      console.log(`💾 Upserting webinar ${webinar.id}: ${webinar.topic}`);
      
      const { error: upsertError } = await supabase
        .from('zoom_webinars')
        .upsert(webinarData, {
          onConflict: 'user_id,webinar_id',
          ignoreDuplicates: false
        });
      
      if (upsertError) {
        console.error(`❌ Error upserting webinar ${webinar.id}:`, upsertError);
        errorCount++;
      } else {
        console.log(`✅ Successfully upserted webinar: ${webinar.id} - "${webinar.topic}"`);
        successCount++;
        syncedWebinars.push(webinar);
      }
    } catch (error) {
      console.error(`❌ Error processing webinar ${webinar.id}:`, error);
      errorCount++;
    }
  }
  
  console.log(`💾 FIXED database sync completed: ${successCount} success, ${errorCount} errors`);
  return { successCount, errorCount, syncedWebinars };
}
