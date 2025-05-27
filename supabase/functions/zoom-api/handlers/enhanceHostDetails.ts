
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

export async function handleEnhanceHostDetails(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  console.log(`[zoom-api][enhance-host-details] Starting host enhancement for webinar: ${webinarId}`);
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  try {
    // First get the webinar to find host_id
    const { data: webinarData, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('host_id, host_email')
      .eq('webinar_id', webinarId)
      .eq('user_id', user.id)
      .single();
    
    if (webinarError || !webinarData) {
      throw new Error('Webinar not found');
    }
    
    let hostInfo = {};
    
    if (webinarData.host_id) {
      // Fetch detailed host information
      const hostResponse = await fetch(`https://api.zoom.us/v2/users/${webinarData.host_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (hostResponse.ok) {
        const hostData = await hostResponse.json();
        hostInfo = {
          email: hostData.email,
          display_name: hostData.display_name,
          first_name: hostData.first_name,
          last_name: hostData.last_name,
          id: hostData.id,
          dept: hostData.dept,
          company: hostData.company,
          job_title: hostData.job_title,
          location: hostData.location,
          phone_number: hostData.phone_number,
          timezone: hostData.timezone
        };
        
        console.log(`[zoom-api][enhance-host-details] Successfully fetched host details:`, hostInfo);
      }
    }
    
    // Update webinar with host details
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        host_name: hostInfo.display_name || webinarData.host_email,
        host_first_name: hostInfo.first_name,
        host_last_name: hostInfo.last_name,
        raw_data: supabase.raw(`
          raw_data || jsonb_build_object(
            'host_info', '${JSON.stringify(hostInfo)}',
            'host_enhanced_at', '${new Date().toISOString()}'
          )
        `),
        last_synced_at: new Date().toISOString()
      })
      .eq('webinar_id', webinarId)
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('[zoom-api][enhance-host-details] Database update error:', updateError);
      throw new Error('Failed to update host data');
    }
    
    console.log(`[zoom-api][enhance-host-details] Successfully enhanced host details for webinar ${webinarId}`);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        host_info: hostInfo
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][enhance-host-details] Error:', error);
    throw new Error(`Failed to enhance host details: ${error.message}`);
  }
}
