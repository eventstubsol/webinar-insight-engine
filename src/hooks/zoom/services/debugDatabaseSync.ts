
import { supabase } from '@/integrations/supabase/client';

/**
 * Debug utility to verify database sync is working after schema changes
 */
export async function verifyDatabaseSyncHealth(userId: string): Promise<{
  isHealthy: boolean;
  details: any;
}> {
  console.log('[verifyDatabaseSyncHealth] Checking database sync health');
  
  try {
    // Check if the new columns exist by attempting to query them
    const { data: testQuery, error: testError } = await supabase
      .from('zoom_webinars')
      .select('id, participants_count, registrants_count, end_time')
      .eq('user_id', userId)
      .limit(1);
    
    if (testError) {
      console.error('[verifyDatabaseSyncHealth] Database schema error:', testError);
      return {
        isHealthy: false,
        details: {
          error: 'Database schema issue',
          message: testError.message
        }
      };
    }
    
    // Get latest sync history
    const { data: syncHistory, error: syncError } = await supabase
      .from('zoom_sync_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (syncError) {
      console.error('[verifyDatabaseSyncHealth] Sync history error:', syncError);
    }
    
    // Count total webinars
    const { count: totalWebinars, error: countError } = await supabase
      .from('zoom_webinars')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (countError) {
      console.error('[verifyDatabaseSyncHealth] Count error:', countError);
    }
    
    const healthDetails = {
      newColumnsWorking: true,
      totalWebinarsInDb: totalWebinars || 0,
      recentSyncHistory: syncHistory || [],
      lastSync: syncHistory?.[0] || null,
      sampleWebinar: testQuery?.[0] || null
    };
    
    console.log('[verifyDatabaseSyncHealth] Health check results:', healthDetails);
    
    return {
      isHealthy: true,
      details: healthDetails
    };
    
  } catch (error) {
    console.error('[verifyDatabaseSyncHealth] Unexpected error:', error);
    return {
      isHealthy: false,
      details: {
        error: 'Unexpected error during health check',
        message: error.message
      }
    };
  }
}
