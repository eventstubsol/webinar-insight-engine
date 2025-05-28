
import { recordSyncHistory } from '../sync/syncStatsCalculator.ts';

export async function recordComprehensiveSync(
  supabase: any,
  userId: string,
  syncResults: any,
  historicalCount: number,
  upcomingCount: number,
  completedCount: number,
  enhancedCount: number,
  totalWebinarsInDB: number,
  scopeValidation: any
) {
  const syncMessage = `COMPREHENSIVE FIXED sync: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated, ${syncResults.preservedWebinars} preserved. ${historicalCount} historical, ${upcomingCount} upcoming. ${completedCount} completed identified, ${enhancedCount} enhanced with actual timing. Total: ${totalWebinarsInDB} webinars. Scope status: ${scopeValidation.hasRequiredScopes ? 'OK' : 'Missing: ' + scopeValidation.missingScopes.join(', ')}`;
  
  await recordSyncHistory(
    supabase,
    userId,
    'webinars',
    'success',
    syncResults.newWebinars + syncResults.updatedWebinars,
    syncMessage
  );
  
  console.log(`[sync-history] 🎉 COMPREHENSIVE SYNC SUMMARY:`);
  console.log(`[sync-history]   - Historical webinars (reporting API): ${historicalCount}`);
  console.log(`[sync-history]   - Upcoming webinars (standard API): ${upcomingCount}`);
  console.log(`[sync-history]   - Completed webinars found: ${completedCount}`);
  console.log(`[sync-history]   - Successfully enhanced: ${enhancedCount}`);
  console.log(`[sync-history]   - Enhancement success rate: ${completedCount > 0 ? Math.round((enhancedCount / completedCount) * 100) : 0}%`);
  console.log(`[sync-history]   - OAuth scope status: ${scopeValidation.hasRequiredScopes ? '✅ OK' : '⚠️ Missing: ' + scopeValidation.missingScopes.join(', ')}`);
}

export async function recordFailedSync(
  supabase: any,
  userId: string,
  error: any
) {
  await recordSyncHistory(
    supabase,
    userId,
    'webinars',
    'error',
    0,
    `COMPREHENSIVE FIXED sync error: ${error.message || 'Unknown error'}`
  );
}
