
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { syncRegistrantsForWebinar } from './sync/registrantDataProcessor.ts';

/**
 * NEW: Dedicated registrant sync handler for background processing
 */
export async function handleSyncRegistrants(req: Request, supabase: any, user: any, credentials: any) {
  try {
    const { webinar_id, webinar_ids } = await req.json();
    
    if (!webinar_id && (!webinar_ids || !Array.isArray(webinar_ids))) {
      throw new Error('Either webinar_id or webinar_ids array is required');
    }
    
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    const webinarIdsToProcess = webinar_id ? [webinar_id] : webinar_ids;
    
    console.log(`[zoom-api][handleSyncRegistrants] Starting registrant sync for ${webinarIdsToProcess.length} webinars`);
    
    const results = [];
    let totalRegistrants = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (const wid of webinarIdsToProcess) {
      console.log(`[zoom-api][handleSyncRegistrants] Processing webinar: ${wid}`);
      
      const result = await syncRegistrantsForWebinar(wid, token, supabase, user.id);
      
      if (result.success) {
        successCount++;
        totalRegistrants += result.registrantsCount;
        console.log(`[zoom-api][handleSyncRegistrants] ✅ Synced ${result.registrantsCount} registrants for webinar ${wid}`);
      } else {
        errorCount++;
        console.error(`[zoom-api][handleSyncRegistrants] ❌ Failed to sync webinar ${wid}: ${result.error}`);
      }
      
      results.push({
        webinar_id: wid,
        success: result.success,
        registrants_count: result.registrantsCount,
        error: result.error
      });
      
      // Add a small delay between webinars to prevent rate limiting
      if (webinarIdsToProcess.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Record sync history
    try {
      await supabase
        .from('zoom_sync_history')
        .insert({
          user_id: user.id,
          sync_type: 'registrant_sync',
          status: errorCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed'),
          items_synced: successCount,
          total_expected: webinarIdsToProcess.length,
          message: `Synced registrants for ${successCount}/${webinarIdsToProcess.length} webinars. Total registrants: ${totalRegistrants}`,
          sync_details: {
            total_registrants: totalRegistrants,
            successful_webinars: successCount,
            failed_webinars: errorCount,
            results: results
          }
        });
    } catch (historyError) {
      console.error(`[zoom-api][handleSyncRegistrants] Error recording sync history:`, historyError);
    }
    
    return new Response(JSON.stringify({
      success: errorCount === 0,
      results,
      summary: {
        total_webinars: webinarIdsToProcess.length,
        successful_webinars: successCount,
        failed_webinars: errorCount,
        total_registrants: totalRegistrants
      },
      message: `Registrant sync completed: ${successCount}/${webinarIdsToProcess.length} webinars processed, ${totalRegistrants} total registrants synced`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error(`[zoom-api][handleSyncRegistrants] Error:`, error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Failed to sync registrants',
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
