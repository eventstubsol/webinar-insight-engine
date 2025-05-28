
import { WebinarFieldMapping } from '../../utils/enhancedFieldMapper.ts';

export async function syncWebinarsToDatabase(
  supabase: any, 
  userId: string, 
  webinars: WebinarFieldMapping[]
): Promise<{ successCount: number; errorCount: number; syncedWebinars: WebinarFieldMapping[] }> {
  console.log(`💾 Starting database sync for ${webinars.length} webinars`);
  
  let successCount = 0;
  let errorCount = 0;
  const syncedWebinars: WebinarFieldMapping[] = [];
  
  for (const webinar of webinars) {
    try {
      const webinarData = {
        user_id: userId,
        webinar_id: webinar.id,
        webinar_uuid: webinar.uuid,
        topic: webinar.topic,
        start_time: webinar.start_time,
        end_time: webinar.end_time,
        duration: webinar.duration,
        actual_duration: webinar.actual_duration,
        status: webinar.status,
        host_email: webinar.host_email,
        host_id: webinar.host_id,
        timezone: webinar.timezone,
        agenda: webinar.agenda,
        join_url: webinar.join_url,
        registration_url: webinar.registration_url,
        data_source: webinar.data_source,
        is_historical: webinar.is_historical,
        raw_data: null,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
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
        // Add to synced webinars list for instance syncing
        syncedWebinars.push(webinar);
      }
    } catch (error) {
      console.error(`❌ Error processing webinar ${webinar.id}:`, error);
      errorCount++;
    }
  }
  
  console.log(`💾 Database sync completed: ${successCount} success, ${errorCount} errors`);
  return { successCount, errorCount, syncedWebinars };
}
