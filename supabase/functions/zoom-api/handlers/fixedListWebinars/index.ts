
import { corsHeaders } from '../../cors.ts';
import { getZoomJwtToken } from '../../auth.ts';
import { collectWebinarsFromAllSources } from './webinarDataCollector.ts';
import { deduplicateWebinars } from './webinarDeduplicator.ts';
import { syncWebinarsToDatabase } from './webinarDatabaseSync.ts';
import { generateSyncSummary } from './syncSummaryGenerator.ts';

export async function handleListWebinarsFixed(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`🚀 FIXED webinar sync starting for user: ${user.id}, force_sync: ${force_sync}`);
  
  try {
    // Get token and user info
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meResponse.json();
    console.log(`👤 User info: ${meData.email}, ID: ${meData.id}`);
    
    // Collect webinars from all sources
    const allWebinars = await collectWebinarsFromAllSources(token, meData.id);
    
    // Remove duplicates
    const uniqueWebinars = deduplicateWebinars(allWebinars);
    
    // Sync to database
    const { successCount, errorCount } = await syncWebinarsToDatabase(supabase, user.id, uniqueWebinars);
    
    // Generate summary
    const summary = generateSyncSummary(allWebinars, uniqueWebinars, successCount, errorCount);
    
    // Record sync history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'webinars',
        status: 'success',
        items_synced: successCount,
        message: `Enhanced sync: ${successCount} successful, ${errorCount} errors. Sources: ${JSON.stringify(summary.webinarsBySource)}`
      });
    
    return new Response(JSON.stringify({
      webinars: uniqueWebinars,
      summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Enhanced sync error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check server logs for detailed error information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
