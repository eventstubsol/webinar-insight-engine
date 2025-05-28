
import { SyncResults, StatsResult } from '../sync/responseFormatter.ts';

export async function buildFinalResponse(
  supabase: any,
  userId: string,
  allWebinars: any[],
  syncResults: SyncResults,
  statsResult: StatsResult,
  scopeValidation: any,
  instanceSyncResults: any
) {
  console.log(`[response-builder] 🔧 Building final response with comprehensive data`);
  console.log(`[response-builder] 📊 Summary data:`, {
    totalWebinars: allWebinars.length,
    syncResults,
    instanceSyncResults
  });
  
  // Get final webinars from database
  const { data: finalWebinars, error: fetchError } = await supabase
    .from('zoom_webinars')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (fetchError) {
    console.error('[response-builder] ❌ Error fetching final webinars:', fetchError);
  }
  
  const summary = {
    totalCollected: allWebinars.length,
    uniqueWebinars: allWebinars.length,
    successfulUpserts: syncResults.newWebinars + syncResults.updatedWebinars,
    errors: 0,
    historicalWebinars: allWebinars.filter(w => w._is_historical).length,
    upcomingWebinars: allWebinars.filter(w => !w._is_historical).length,
    newWebinars: syncResults.newWebinars,
    updatedWebinars: syncResults.updatedWebinars,
    preservedWebinars: syncResults.preservedWebinars,
    totalWebinarsInDB: finalWebinars?.length || 0,
    instanceSync: instanceSyncResults,
    scopeValidation,
    api_compliance: 'CORRECT',
    endpoints_used: [
      'GET /users/{userId}/webinars',
      'GET /report/users/{userId}/webinars',
      'GET /webinars/{webinarId}',
      'GET /webinars/{webinarId}/instances'
    ]
  };
  
  console.log(`[response-builder] ✅ Final summary:`, summary);
  
  return {
    webinars: finalWebinars || [],
    summary
  };
}
