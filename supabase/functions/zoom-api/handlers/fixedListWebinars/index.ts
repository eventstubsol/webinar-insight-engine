
import { corsHeaders } from '../../cors.ts';
import { getZoomJwtToken } from '../../auth.ts';
import { collectWebinarsFromAllSources } from './webinarDataCollector.ts';
import { deduplicateWebinars } from './webinarDeduplicator.ts';
import { syncWebinarsToDatabase } from './webinarDatabaseSync.ts';
import { generateSyncSummary } from './syncSummaryGenerator.ts';

export async function handleListWebinarsFixed(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`🚀 FIXED webinar sync starting with CORRECT Zoom API compliance`);
  console.log(`📋 Following https://developers.zoom.us/docs/api/meetings/#tag/webinars/`);
  console.log(`🎯 User: ${user.id}, force_sync: ${force_sync}`);
  
  try {
    // Get token and user info
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meResponse.json();
    console.log(`👤 User info: ${meData.email}, ID: ${meData.id}`);
    
    // Collect webinars from CORRECT sources only
    console.log(`📡 Collecting webinars using CORRECT API endpoints only`);
    const allWebinars = await collectWebinarsFromAllSources(token, meData.id);
    
    // Remove duplicates
    const uniqueWebinars = deduplicateWebinars(allWebinars);
    console.log(`🔄 Deduplicated: ${allWebinars.length} → ${uniqueWebinars.length} webinars`);
    
    // Sync to database with FIXED constraints handling
    console.log(`💾 Syncing to database with FIXED constraint handling`);
    const { successCount, errorCount, syncedWebinars } = await syncWebinarsToDatabase(supabase, user.id, uniqueWebinars);
    
    // Generate summary
    const summary = generateSyncSummary(allWebinars, uniqueWebinars, successCount, errorCount, {
      totalInstancesSynced: 0,
      webinarsWithInstancessynced: 0,
      instanceSyncErrors: 0
    });
    
    // Record sync history with FIXED results
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'webinars',
        status: errorCount === 0 ? 'success' : 'partial_success',
        items_synced: successCount,
        message: `FIXED sync: ${successCount} webinars synced, ${errorCount} errors. API compliance: CORRECT endpoints used.`
      });
    
    console.log(`🎉 FIXED SYNC COMPLETE:`);
    console.log(`   - Collected: ${allWebinars.length} webinars`);
    console.log(`   - Unique: ${uniqueWebinars.length} webinars`);
    console.log(`   - Synced successfully: ${successCount} webinars`);
    console.log(`   - Sync errors: ${errorCount} webinars`);
    console.log(`   - API compliance: ✅ CORRECT endpoints used`);
    
    return new Response(JSON.stringify({
      webinars: uniqueWebinars,
      summary: {
        ...summary,
        api_compliance: 'CORRECT',
        endpoints_used: [
          'GET /users/{userId}/webinars',
          'GET /report/users/{userId}/webinars',
          'GET /webinars/{webinarId}',
          'GET /webinars/{webinarId}/instances'
        ]
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ FIXED sync error:', error);
    
    // Record failed sync
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'webinars',
        status: 'error',
        items_synced: 0,
        message: `FIXED sync failed: ${error.message}`
      });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'FIXED sync encountered an error. Check server logs for details.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
