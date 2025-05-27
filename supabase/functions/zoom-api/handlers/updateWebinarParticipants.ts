
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { enhanceWebinarsWithTimingDataOnly } from './sync/webinarEnhancementOrchestrator.ts';

// Enhanced function to update participant counts AND timing data (Phase 2)
export async function handleUpdateWebinarParticipants(req: Request, supabase: any, user: any, credentials: any) {
  console.log(`[zoom-api][update-participants] Starting PHASE 2 enhancement for user: ${user.id}`);
  console.log(`[zoom-api][update-participants] This includes participant counts AND timing data enhancement`);
  
  try {
    // Get the request body with timeout guard
    let body;
    try {
      body = await req.json();
    } catch (e) {
      // If no body, just continue with all webinars
      body = {};
    }
    
    const specificWebinarId = body.webinar_id;
    const userId = body.user_id || user.id;
    const skipTimingEnhancement = body.skip_timing_enhancement || false;
    
    // Get token for API calls
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Get webinars from database - UPDATED QUERY to include more past webinars
    const { data: webinars, error: webinarsError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });
      
    if (webinarsError || !webinars || webinars.length === 0) {
      console.log('[zoom-api][update-participants] No webinars found in database');
      return new Response(JSON.stringify({ 
        message: 'No webinars found to update', 
        updated: 0,
        skipped: 0,
        errors: 0,
        timing_enhanced: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Filter to get completed webinars using time-based logic
    const now = new Date();
    const completedWebinars = webinars.filter(webinar => {
      // Check explicitly for "ended" status or use time-based logic
      if (webinar.status === 'ended') {
        return true;
      }
      
      // Time-based logic: Check if webinar has already passed (start_time + duration)
      const startTime = new Date(webinar.start_time);
      const durationMs = (webinar.duration || 0) * 60 * 1000; // convert minutes to ms
      const endTime = new Date(startTime.getTime() + durationMs);
      
      return endTime < now; // Webinar has ended if end time is in the past
    });
    
    console.log(`[zoom-api][update-participants] Found ${completedWebinars.length} completed webinars out of ${webinars.length} total`);
      
    // Filter by specific webinar ID if provided
    const webinarsToProcess = specificWebinarId 
      ? completedWebinars.filter(w => w.webinar_id === specificWebinarId) 
      : completedWebinars;
      
    console.log(`[zoom-api][update-participants] Processing ${webinarsToProcess.length} webinars`);
    
    // PHASE 2A: Update participant counts (original functionality)
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const webinar of webinarsToProcess) {
      try {
        // Make parallel requests for registrants and attendees
        const [registrantsRes, attendeesRes] = await Promise.all([
          fetch(`https://api.zoom.us/v2/webinars/${webinar.webinar_id}/registrants?page_size=1`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`https://api.zoom.us/v2/past_webinars/${webinar.webinar_id}/participants?page_size=1`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);
        
        const [registrantsData, attendeesData] = await Promise.all([
          registrantsRes.ok ? registrantsRes.json() : { total_records: 0 },
          attendeesRes.ok ? attendeesRes.json() : { total_records: 0 }
        ]);
        
        // Update raw_data with participant counts and ensure status is set to "ended" for past webinars
        const updatedRawData = {
          ...webinar.raw_data,
          registrants_count: registrantsData.total_records || 0,
          participants_count: attendeesData.total_records || 0
        };
        
        // Update both the raw_data and set status to "ended" for past webinars
        const { error: updateError } = await supabase
          .from('zoom_webinars')
          .update({
            raw_data: updatedRawData,
            status: 'ended' // Explicitly set status to ended for past webinars
          })
          .eq('id', webinar.id);
        
        if (updateError) {
          console.error(`[zoom-api][update-participants] Error updating webinar ${webinar.webinar_id}:`, updateError);
          errors++;
        } else {
          console.log(`[zoom-api][update-participants] Updated webinar ${webinar.webinar_id} with registrants: ${updatedRawData.registrants_count}, participants: ${updatedRawData.participants_count}`);
          updated++;
        }
      } catch (err) {
        console.error(`[zoom-api][update-participants] Error processing webinar ${webinar.webinar_id}:`, err);
        errors++;
      }
    }
    
    // PHASE 2B: Timing data enhancement (NEW)
    let timing_enhanced = 0;
    if (!skipTimingEnhancement && webinarsToProcess.length > 0) {
      try {
        console.log('[zoom-api][update-participants] 🕒 Starting PHASE 2B: Timing data enhancement');
        
        // Get fresh webinar data from database after participant updates
        const { data: freshWebinars, error: freshError } = await supabase
          .from('zoom_webinars')
          .select('*')
          .eq('user_id', userId)
          .in('webinar_id', webinarsToProcess.map(w => w.webinar_id));
        
        if (!freshError && freshWebinars && freshWebinars.length > 0) {
          // Enhance with timing data only
          const timingEnhancedWebinars = await enhanceWebinarsWithTimingDataOnly(
            freshWebinars, 
            token, 
            supabase, 
            userId
          );
          
          // Update database with timing enhancements
          for (const enhancedWebinar of timingEnhancedWebinars) {
            if (enhancedWebinar.actual_start_time || enhancedWebinar.actual_duration) {
              try {
                const updateData: any = {};
                
                if (enhancedWebinar.actual_start_time) {
                  updateData.actual_start_time = enhancedWebinar.actual_start_time;
                }
                
                if (enhancedWebinar.actual_duration) {
                  updateData.actual_duration = enhancedWebinar.actual_duration;
                }
                
                // Update raw_data with timing enhancement metadata
                updateData.raw_data = {
                  ...enhancedWebinar.raw_data,
                  _enhanced_with_timing: enhancedWebinar._enhanced_with_timing,
                  _timing_enhancement_method: enhancedWebinar._timing_enhancement_method,
                  _timing_enhancement_timestamp: enhancedWebinar._timing_enhancement_timestamp
                };
                
                const { error: timingUpdateError } = await supabase
                  .from('zoom_webinars')
                  .update(updateData)
                  .eq('webinar_id', enhancedWebinar.webinar_id)
                  .eq('user_id', userId);
                
                if (timingUpdateError) {
                  console.error(`[zoom-api][update-participants] Error updating timing for webinar ${enhancedWebinar.webinar_id}:`, timingUpdateError);
                } else {
                  timing_enhanced++;
                  console.log(`[zoom-api][update-participants] ✅ Enhanced timing data for webinar ${enhancedWebinar.webinar_id}`);
                }
              } catch (timingErr) {
                console.error(`[zoom-api][update-participants] Error processing timing enhancement for webinar ${enhancedWebinar.webinar_id}:`, timingErr);
              }
            }
          }
          
          console.log(`[zoom-api][update-participants] 🎉 PHASE 2B completed: ${timing_enhanced} webinars enhanced with timing data`);
        }
      } catch (timingError) {
        console.error('[zoom-api][update-participants] Error during timing enhancement:', timingError);
        // Don't fail the whole operation if timing enhancement fails
      }
    } else {
      console.log('[zoom-api][update-participants] Skipping timing enhancement as requested or no webinars to process');
    }
    
    // Record action in sync history with enhanced details
    const syncType = timing_enhanced > 0 ? 'participants_and_timing' : 'participants_count';
    const successMessage = timing_enhanced > 0 
      ? `Updated participant counts for ${updated} webinars and enhanced timing data for ${timing_enhanced} webinars, skipped ${skipped}, with ${errors} errors`
      : `Updated participant counts for ${updated} webinars, skipped ${skipped}, with ${errors} errors`;
    
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: userId,
        sync_type: syncType,
        status: errors === 0 ? 'success' : 'partial',
        items_synced: updated + timing_enhanced,
        message: successMessage
      });
    
    return new Response(JSON.stringify({ 
      message: successMessage,
      updated,
      skipped,
      errors,
      timing_enhanced,
      phase: timing_enhanced > 0 ? 'Phase 2A+2B (Participants + Timing)' : 'Phase 2A (Participants only)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[zoom-api][update-participants] Error:', error);
    
    // Record failed sync in history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'participants_and_timing',
        status: 'error',
        items_synced: 0,
        message: error.message || 'Unknown error'
      });
    
    throw error;
  }
}
