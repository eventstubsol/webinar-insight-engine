
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

export async function handleEnhancePanelistDetails(req: Request, supabase: any, user: any, credentials: any, webinarId: string) {
  if (!webinarId) {
    throw new Error('Webinar ID is required');
  }
  
  console.log(`[zoom-api][enhance-panelist-details] Starting panelist enhancement for webinar: ${webinarId}`);
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  try {
    // Fetch panelist information
    const panelistResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/panelists`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    let panelistData = { panelists: [] };
    
    if (panelistResponse.ok) {
      panelistData = await panelistResponse.json();
      console.log(`[zoom-api][enhance-panelist-details] Successfully fetched ${panelistData.panelists?.length || 0} panelists`);
    } else {
      console.log(`[zoom-api][enhance-panelist-details] No panelists found or error: ${panelistResponse.status}`);
    }
    
    // Update webinar with panelist data
    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        raw_data: supabase.raw(`
          raw_data || jsonb_build_object(
            'panelists', '${JSON.stringify(panelistData.panelists || [])}',
            'panelists_count', ${(panelistData.panelists || []).length},
            'panelists_enhanced_at', '${new Date().toISOString()}'
          )
        `),
        last_synced_at: new Date().toISOString()
      })
      .eq('webinar_id', webinarId)
      .eq('user_id', user.id);
    
    if (updateError) {
      console.error('[zoom-api][enhance-panelist-details] Database update error:', updateError);
      throw new Error('Failed to update panelist data');
    }
    
    console.log(`[zoom-api][enhance-panelist-details] Successfully enhanced panelist details for webinar ${webinarId}`);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        panelists_count: (panelistData.panelists || []).length,
        panelists: panelistData.panelists || []
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][enhance-panelist-details] Error:', error);
    throw new Error(`Failed to enhance panelist details: ${error.message}`);
  }
}
