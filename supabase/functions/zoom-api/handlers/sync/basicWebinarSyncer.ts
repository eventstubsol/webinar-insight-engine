
/**
 * FIXED: Simplified basic webinar syncer with proper data source separation
 * Only handles data from /users/{userId}/webinars endpoint
 */

/**
 * Process basic webinar data with strict field validation
 */
export async function syncBasicWebinarData(webinars: any[], token: string, userId: string) {
  console.log(`[basic-webinar-syncer] 🔄 FIXED: Processing ${webinars.length} basic webinars with strict validation`);
  
  const processedWebinars = webinars.map(webinar => {
    // FIXED: Only map fields that are guaranteed to exist in basic webinar response
    // No assumptions about nested structures or alternative field names
    const basicWebinar = {
      // Core identifiers (required)
      id: webinar.id,
      uuid: webinar.uuid ?? null,
      
      // Basic information with safe defaults
      topic: webinar.topic ?? 'Untitled Webinar',
      start_time: webinar.start_time ?? null,
      duration: webinar.duration ?? null,
      timezone: webinar.timezone ?? null,
      type: webinar.type ?? null,
      status: webinar.status ?? null,
      
      // Host information (basic only)
      host_id: webinar.host_id ?? null,
      host_email: webinar.host_email ?? null,
      
      // URLs (if available)
      join_url: webinar.join_url ?? null,
      start_url: webinar.start_url ?? null,
      registration_url: webinar.registration_url ?? null,
      
      // Content
      agenda: webinar.agenda ?? null,
      password: webinar.password ?? null,
      
      // Timestamps
      created_at: webinar.created_at ?? null,
      
      // FIXED: No assumptions about settings structure
      // Only access top-level fields that are documented
      approval_type: webinar.approval_type ?? null,
      registration_type: webinar.registration_type ?? null,
      auto_recording: webinar.auto_recording ?? null,
      audio: webinar.audio ?? 'both',
      language: webinar.language ?? 'en-US',
      
      // Safe boolean handling
      is_simulive: webinar.is_simulive === true,
      enforce_login: webinar.enforce_login === true,
      on_demand: webinar.on_demand === true,
      practice_session: webinar.practice_session === true,
      hd_video: webinar.hd_video === true,
      host_video: webinar.host_video !== false, // Default true
      panelists_video: webinar.panelists_video !== false, // Default true
      
      // Store the raw response for debugging and future enhancement
      raw_data: webinar,
      
      // Mark data source for clarity
      _data_source: 'basic_webinar_api',
      _synced_at: new Date().toISOString()
    };
    
    console.log(`[basic-webinar-syncer] 📊 Processed basic webinar: ${basicWebinar.topic} (${basicWebinar.id})`);
    console.log(`[basic-webinar-syncer]   - start_time: ${basicWebinar.start_time}`);
    console.log(`[basic-webinar-syncer]   - status: ${basicWebinar.status}`);
    console.log(`[basic-webinar-syncer]   - type: ${basicWebinar.type}`);
    
    return basicWebinar;
  });
  
  console.log(`[basic-webinar-syncer] ✅ Processed ${processedWebinars.length} basic webinars with strict validation`);
  return processedWebinars;
}

/**
 * FIXED: Simplified enhancement that only handles past webinar data
 */
export async function enhanceWithPastWebinarData(basicWebinars: any[], token: string) {
  console.log(`[past-webinar-enhancer] 🔄 FIXED: Enhancing ${basicWebinars.length} webinars with actual timing data`);
  
  // Import the focused enhancement processor
  const { enhanceWithPastWebinarData } = await import('./enhancementProcessor.ts');
  
  // Process past webinar enhancement
  const result = await enhanceWithPastWebinarData(basicWebinars, token);
  
  console.log(`[past-webinar-enhancer] ✅ FIXED enhancement completed:`);
  console.log(`[past-webinar-enhancer]   - Enhanced: ${result.successCount}/${basicWebinars.length}`);
  console.log(`[past-webinar-enhancer]   - Errors: ${result.errorCount}`);
  console.log(`[past-webinar-enhancer]   - Processing time: ${result.processingTime}ms`);
  
  return result.enhanced;
}
