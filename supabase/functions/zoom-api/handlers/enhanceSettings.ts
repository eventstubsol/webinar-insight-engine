
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

export async function handleEnhanceSettings(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  console.log(`[zoom-api][enhance-settings] Starting settings enhancement for webinar: ${webinarId}`);
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  try {
    // Fetch detailed webinar settings
    const webinarResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!webinarResponse.ok) {
      throw new Error(`Failed to fetch webinar details: ${webinarResponse.status}`);
    }
    
    const webinarData = await webinarResponse.json();
    
    // Extract detailed settings
    const detailedSettings = {
      settings: webinarData.settings || {},
      tracking_fields: webinarData.tracking_fields || [],
      recurrence: webinarData.recurrence || null,
      occurrences: webinarData.occurrences || [],
      is_simulive: webinarData.is_simulive || false,
      template_id: webinarData.template_id,
      auto_recording: webinarData.settings?.auto_recording,
      registration_type: webinarData.settings?.registration_type,
      approval_type: webinarData.settings?.approval_type,
      enforce_login: webinarData.settings?.enforce_login,
      enforce_login_domains: webinarData.settings?.enforce_login_domains,
      alternative_hosts: webinarData.settings?.alternative_hosts
    };
    
    console.log(`[zoom-api][enhance-settings] Successfully fetched detailed settings`);
    
    // Update webinar with detailed settings
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        raw_data: supabase.raw(`
          raw_data || jsonb_build_object(
            'detailed_settings', '${JSON.stringify(detailedSettings)}',
            'settings_enhanced_at', '${new Date().toISOString()}'
          )
        `),
        registration_type: webinarData.settings?.registration_type,
        approval_type: webinarData.settings?.approval_type,
        enforce_login: webinarData.settings?.enforce_login || false,
        is_simulive: webinarData.is_simulive || false,
        auto_recording_type: webinarData.settings?.auto_recording,
        last_synced_at: new Date().toISOString()
      })
      .eq('webinar_id', webinarId)
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('[zoom-api][enhance-settings] Database update error:', updateError);
      throw new Error('Failed to update settings data');
    }
    
    console.log(`[zoom-api][enhance-settings] Successfully enhanced settings for webinar ${webinarId}`);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        detailed_settings: detailedSettings
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][enhance-settings] Error:', error);
    throw new Error(`Failed to enhance settings: ${error.message}`);
  }
}
