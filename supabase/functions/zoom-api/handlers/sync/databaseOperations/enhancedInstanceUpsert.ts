
/**
 * Enhanced database operations for upserting webinar instances with comprehensive data
 */

export async function upsertEnhancedInstanceRecord(
  supabase: any, 
  instanceData: any
): Promise<number> {
  
  console.log(`[enhanced-instance-upsert] 💾 Upserting enhanced instance ${instanceData.instance_id} for webinar ${instanceData.webinar_id}`);
  
  try {
    // Validate critical fields before upserting
    validateInstanceData(instanceData);
    
    // Prepare data for upsert with comprehensive field mapping
    const upsertData = {
      user_id: instanceData.user_id,
      webinar_id: instanceData.webinar_id,
      webinar_uuid: instanceData.webinar_uuid || '',
      instance_id: instanceData.instance_id,
      start_time: instanceData.start_time,
      end_time: instanceData.end_time,
      duration: instanceData.duration,
      actual_start_time: instanceData.actual_start_time,
      actual_duration: instanceData.actual_duration,
      topic: instanceData.topic || 'Untitled Webinar',
      status: instanceData.status || 'unknown',
      registrants_count: instanceData.registrants_count || 0,
      participants_count: instanceData.participants_count || 0,
      is_historical: instanceData.is_historical || false,
      data_source: instanceData.data_source || 'unknown',
      raw_data: instanceData.raw_data || {},
      updated_at: new Date().toISOString()
    };
    
    console.log(`[enhanced-instance-upsert] 📊 Upsert data validation:`);
    console.log(`[enhanced-instance-upsert]   - instance_id: ${upsertData.instance_id}`);
    console.log(`[enhanced-instance-upsert]   - topic: ${upsertData.topic}`);
    console.log(`[enhanced-instance-upsert]   - start_time: ${upsertData.start_time}`);
    console.log(`[enhanced-instance-upsert]   - end_time: ${upsertData.end_time}`);
    console.log(`[enhanced-instance-upsert]   - duration: ${upsertData.duration}`);
    console.log(`[enhanced-instance-upsert]   - actual_start_time: ${upsertData.actual_start_time}`);
    console.log(`[enhanced-instance-upsert]   - actual_duration: ${upsertData.actual_duration}`);
    console.log(`[enhanced-instance-upsert]   - status: ${upsertData.status}`);
    console.log(`[enhanced-instance-upsert]   - participants_count: ${upsertData.participants_count}`);
    console.log(`[enhanced-instance-upsert]   - registrants_count: ${upsertData.registrants_count}`);
    console.log(`[enhanced-instance-upsert]   - is_historical: ${upsertData.is_historical}`);
    console.log(`[enhanced-instance-upsert]   - data_source: ${upsertData.data_source}`);
    
    // Perform upsert operation
    const { error: upsertError } = await supabase
      .from('zoom_webinar_instances')
      .upsert(upsertData, {
        onConflict: 'user_id,webinar_id,instance_id',
        ignoreDuplicates: false
      });
    
    if (upsertError) {
      console.error(`[enhanced-instance-upsert] ❌ Error upserting enhanced instance ${instanceData.instance_id}:`, upsertError);
      
      // Log detailed error information
      console.error(`[enhanced-instance-upsert] ❌ Error details:`);
      console.error(`[enhanced-instance-upsert]   - code: ${upsertError.code}`);
      console.error(`[enhanced-instance-upsert]   - message: ${upsertError.message}`);
      console.error(`[enhanced-instance-upsert]   - details: ${upsertError.details}`);
      
      return 0;
    }
    
    console.log(`[enhanced-instance-upsert] ✅ Successfully upserted enhanced instance ${instanceData.instance_id}`);
    console.log(`[enhanced-instance-upsert] ✅ All fields populated with comprehensive data`);
    return 1;
    
  } catch (error) {
    console.error(`[enhanced-instance-upsert] ❌ Error in upsertEnhancedInstanceRecord:`, error);
    return 0;
  }
}

/**
 * Validate instance data before upserting
 */
function validateInstanceData(instanceData: any): void {
  console.log(`[enhanced-instance-upsert] 🔍 Validating instance data`);
  
  // Check required fields
  const requiredFields = ['user_id', 'webinar_id', 'instance_id'];
  for (const field of requiredFields) {
    if (!instanceData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate data types
  if (instanceData.duration && typeof instanceData.duration !== 'number') {
    console.warn(`[enhanced-instance-upsert] ⚠️ Duration is not a number: ${instanceData.duration}`);
  }
  
  if (instanceData.actual_duration && typeof instanceData.actual_duration !== 'number') {
    console.warn(`[enhanced-instance-upsert] ⚠️ Actual duration is not a number: ${instanceData.actual_duration}`);
  }
  
  if (instanceData.participants_count && typeof instanceData.participants_count !== 'number') {
    console.warn(`[enhanced-instance-upsert] ⚠️ Participants count is not a number: ${instanceData.participants_count}`);
  }
  
  if (instanceData.registrants_count && typeof instanceData.registrants_count !== 'number') {
    console.warn(`[enhanced-instance-upsert] ⚠️ Registrants count is not a number: ${instanceData.registrants_count}`);
  }
  
  // Validate date fields
  const dateFields = ['start_time', 'end_time', 'actual_start_time'];
  for (const field of dateFields) {
    if (instanceData[field]) {
      try {
        new Date(instanceData[field]);
      } catch (error) {
        console.warn(`[enhanced-instance-upsert] ⚠️ Invalid date format for ${field}: ${instanceData[field]}`);
      }
    }
  }
  
  console.log(`[enhanced-instance-upsert] ✅ Instance data validation passed`);
}
