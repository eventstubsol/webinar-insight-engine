
import { corsHeaders } from '../../cors.ts';
import { getZoomJwtToken } from '../../auth.ts';
import { collectWebinarsFromAllSources } from './webinarDataCollector.ts';
import { deduplicateWebinars } from './webinarDeduplicator.ts';
import { syncWebinarsToDatabase } from './webinarDatabaseSync.ts';
import { generateSyncSummary } from './syncSummaryGenerator.ts';
import { syncWebinarInstancesForWebinars } from '../sync/webinarInstanceSyncer.ts';

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
    
    // Sync to database and get synced webinars data
    const { successCount, errorCount, syncedWebinars } = await syncWebinarsToDatabase(supabase, user.id, uniqueWebinars);
    
    // Initialize instance sync results
    let instanceSyncResults = {
      totalInstancesSynced: 0,
      webinarsWithInstancessynced: 0,
      instanceSyncErrors: 0
    };
    
    // Sync instances for successfully synced webinars (prioritize completed ones)
    if (syncedWebinars && syncedWebinars.length > 0) {
      console.log(`🔄 Starting instance sync for ${syncedWebinars.length} successfully synced webinars`);
      
      try {
        // Prioritize completed webinars for instance syncing
        const completedWebinars = syncedWebinars.filter(w => 
          w.status === 'ended' || w.status === 'aborted'
        );
        const upcomingWebinars = syncedWebinars.filter(w => 
          w.status !== 'ended' && w.status !== 'aborted'
        );
        
        console.log(`📊 Instance sync targets: ${completedWebinars.length} completed, ${upcomingWebinars.length} upcoming`);
        
        // Sync completed webinars first (these are most important for accurate data)
        if (completedWebinars.length > 0) {
          console.log(`🎯 Syncing instances for ${completedWebinars.length} completed webinars`);
          const completedInstanceCount = await syncWebinarInstancesForWebinars(
            completedWebinars, 
            token, 
            supabase, 
            user.id
          );
          instanceSyncResults.totalInstancesSynced += completedInstanceCount || 0;
          instanceSyncResults.webinarsWithInstancessynced += completedWebinars.length;
        }
        
        // Sync upcoming webinars if time allows (limit to prevent timeouts)
        const upcomingLimit = Math.min(upcomingWebinars.length, 10);
        if (upcomingLimit > 0) {
          console.log(`📅 Syncing instances for ${upcomingLimit} upcoming webinars`);
          const upcomingInstanceCount = await syncWebinarInstancesForWebinars(
            upcomingWebinars.slice(0, upcomingLimit), 
            token, 
            supabase, 
            user.id
          );
          instanceSyncResults.totalInstancesSynced += upcomingInstanceCount || 0;
          instanceSyncResults.webinarsWithInstancessynced += upcomingLimit;
        }
        
        console.log(`✅ Instance sync completed: ${instanceSyncResults.totalInstancesSynced} instances synced for ${instanceSyncResults.webinarsWithInstancessynced} webinars`);
        
      } catch (instanceError) {
        console.error('❌ Instance sync error:', instanceError);
        instanceSyncResults.instanceSyncErrors = 1;
        // Don't throw - webinar sync was successful, instance sync failure shouldn't break the response
      }
    } else {
      console.log(`ℹ️ No webinars to sync instances for`);
    }
    
    // Generate summary with instance sync results
    const summary = generateSyncSummary(allWebinars, uniqueWebinars, successCount, errorCount, instanceSyncResults);
    
    // Record sync history with instance sync details
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'webinars',
        status: 'success',
        items_synced: successCount,
        message: `Enhanced sync with instances: ${successCount} webinars, ${instanceSyncResults.totalInstancesSynced} instances. Sources: ${JSON.stringify(summary.webinarsBySource)}`
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
