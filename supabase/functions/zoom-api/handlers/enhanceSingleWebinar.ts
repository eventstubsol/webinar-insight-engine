import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { enhanceWebinarsWithEssentialData } from './sync/webinarEnhancementOrchestrator.ts';
import { recordSyncHistory } from './sync/syncStatsCalculator.ts';

// Handle enhancing a single webinar with full data on-demand
export async function handleEnhanceSingleWebinar(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  console.log(`[zoom-api][enhance-single-webinar] Starting enhancement for webinar: ${webinarId}`);
  
  try {
    // Get existing webinar from database
    const { data: existingWebinar, error: fetchError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id)
      .eq('webinar_id', webinarId)
      .single();
    
    if (fetchError || !existingWebinar) {
      console.error('[zoom-api][enhance-single-webinar] Webinar not found:', fetchError);
      throw new Error(`Webinar ${webinarId} not found in database`);
    }
    
    // Check if already enhanced recently (within last hour)
    const lastSynced = existingWebinar.last_synced_at ? new Date(existingWebinar.last_synced_at) : null;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (lastSynced && lastSynced > oneHourAgo && existingWebinar.host_email) {
      console.log('[zoom-api][enhance-single-webinar] Webinar recently enhanced, returning cached data');
      return new Response(JSON.stringify({
        webinar: existingWebinar,
        enhancement_status: 'cached',
        message: 'Webinar data is current, returning cached version'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get token for API calls
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Get fresh webinar data from Zoom API
    console.log('[zoom-api][enhance-single-webinar] Fetching fresh webinar data from Zoom');
    const webinarResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!webinarResponse.ok) {
      const errorData = await webinarResponse.json();
      console.error('[zoom-api][enhance-single-webinar] Failed to fetch webinar:', errorData);
      throw new Error(`Failed to fetch webinar details: ${errorData.message || 'Unknown error'}`);
    }
    
    const webinarData = await webinarResponse.json();
    
    // Enhance with essential data (but not timing data to keep it fast)
    console.log('[zoom-api][enhance-single-webinar] Enhancing with essential data');
    const enhancedWebinars = await enhanceWebinarsWithEssentialData([webinarData], token, supabase, user.id);
    
    if (enhancedWebinars.length === 0) {
      throw new Error('Enhancement failed to return webinar data');
    }
    
    const enhancedWebinar = enhancedWebinars[0];
    
    // Update the database with enhanced data
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        host_email: enhancedWebinar.host_email || null,
        host_name: enhancedWebinar.host_name || null,
        host_first_name: enhancedWebinar.host_first_name || null,
        host_last_name: enhancedWebinar.host_last_name || null,
        raw_data: enhancedWebinar,
        last_synced_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('webinar_id', webinarId);
    
    if (updateError) {
      console.error('[zoom-api][enhance-single-webinar] Error updating webinar:', updateError);
      throw new Error(`Failed to update webinar: ${updateError.message}`);
    }
    
    // Record enhancement in history
    await recordSyncHistory(
      supabase,
      user.id,
      'single-webinar-enhancement',
      'success',
      1,
      `Enhanced webinar ${webinarId} with host info, panelists, participants, recordings`
    );
    
    // Get updated webinar from database
    const { data: updatedWebinar, error: refetchError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id)
      .eq('webinar_id', webinarId)
      .single();
    
    if (refetchError) {
      console.error('[zoom-api][enhance-single-webinar] Error refetching webinar:', refetchError);
      throw new Error(`Failed to refetch enhanced webinar: ${refetchError.message}`);
    }
    
    console.log('[zoom-api][enhance-single-webinar] ✅ Single webinar enhancement completed');
    
    return new Response(JSON.stringify({
      webinar: updatedWebinar,
      enhancement_status: 'enhanced',
      message: 'Webinar enhanced with host info, panelists, participants, and recordings'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][enhance-single-webinar] Error:', error);
    
    // Record failed enhancement in history
    await recordSyncHistory(
      supabase,
      user.id,
      'single-webinar-enhancement',
      'error',
      0,
      `Failed to enhance webinar ${webinarId}: ${error.message || 'Unknown error'}`
    );
    
    throw error;
  }
}
