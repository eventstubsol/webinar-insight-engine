
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { verifyDatabaseSyncHealth } from './debugDatabaseSync';
import { ZoomWebinar } from '../types';

/**
 * Fetch webinars from API using fixed strategy (now default)
 */
export async function fetchWebinarsFromAPI(forceSync: boolean = false): Promise<ZoomWebinar[]> {
  console.log(`[fetchWebinarsFromAPI] Using fixed strategy with force_sync=${forceSync}`);
  console.log(`[fetchWebinarsFromAPI] 🎯 This will fetch ACTUAL end_time data from Zoom API for completed webinars`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'list-webinars',
      force_sync: forceSync 
    }
  });
  
  if (error) {
    console.error('[fetchWebinarsFromAPI] Function invocation error:', error);
    throw new Error(error.message || 'Failed to invoke Zoom API function');
  }
  
  if (data.error) {
    console.error('[fetchWebinarsFromAPI] API error:', data.error);
    throw new Error(data.error);
  }
  
  console.log(`[fetchWebinarsFromAPI] Fixed strategy returned ${data.webinars?.length || 0} webinars`);
  if (data.summary) {
    console.log('[fetchWebinarsFromAPI] Sync summary:', data.summary);
    if (data.summary.instanceSync) {
      console.log('[fetchWebinarsFromAPI] 📊 Instance sync results:');
      console.log(`[fetchWebinarsFromAPI]   - Instances synced: ${data.summary.instanceSync.totalInstancesSynced}`);
      console.log(`[fetchWebinarsFromAPI]   - Actual data fetched: ${data.summary.instanceSync.actualDataFetched}`);
      console.log(`[fetchWebinarsFromAPI]   - API calls successful: ${data.summary.instanceSync.apiCallsSuccessful}`);
      console.log(`[fetchWebinarsFromAPI]   - API calls failed: ${data.summary.instanceSync.apiCallsFailed}`);
    }
  }
  
  return data.webinars || [];
}

/**
 * Fetch webinars using the legacy API endpoint strategy (fallback)
 */
export async function fetchWebinarsFromAPILegacy(forceSync: boolean = false): Promise<ZoomWebinar[]> {
  console.log(`[fetchWebinarsFromAPILegacy] Using legacy strategy with force_sync=${forceSync}`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'list-webinars-enhanced',
      force_sync: forceSync 
    }
  });
  
  if (error) {
    console.error('[fetchWebinarsFromAPILegacy] Function invocation error:', error);
    throw new Error(error.message || 'Failed to invoke Zoom API function');
  }
  
  if (data.error) {
    console.error('[fetchWebinarsFromAPILegacy] API error:', data.error);
    throw new Error(data.error);
  }
  
  return data.webinars || [];
}

/**
 * Enhanced refresh webinars from API with database health verification
 */
export async function refreshWebinarsFromAPI(force: boolean = false): Promise<any> {
  console.log('[refreshWebinarsFromAPI] Starting FIXED refresh with force=' + force);
  console.log('[refreshWebinarsFromAPI] 🎯 This will collect ACTUAL end_time data from Zoom API');
  
  try {
    // First, verify database health
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const healthCheck = await verifyDatabaseSyncHealth(userId);
      console.log('[refreshWebinarsFromAPI] Database health check:', healthCheck);
      
      if (!healthCheck.isHealthy) {
        throw new Error(`Database health check failed: ${healthCheck.details.message}`);
      }
    }
    
    // Call the enhanced fixed list webinars endpoint with correct action name
    const { data: response, error } = await supabase.functions.invoke('zoom-api', {
      body: { 
        action: 'list-webinars',
        force_sync: force
      }
    });
    
    if (error) {
      console.error('[refreshWebinarsFromAPI] Error calling fixed API:', error);
      throw error;
    }
    
    console.log('[refreshWebinarsFromAPI] Fixed sync completed successfully:', response);
    console.log('[refreshWebinarsFromAPI] Fixed sync summary:', response.summary);
    
    // Log ACTUAL data collection results
    console.log('[refreshWebinarsFromAPI] 📊 ACTUAL DATA COLLECTION RESULTS:');
    console.log('[refreshWebinarsFromAPI]   - Total collected:', response.summary?.totalCollected || 0);
    console.log('[refreshWebinarsFromAPI]   - Successful upserts:', response.summary?.successfulUpserts || 0);
    console.log('[refreshWebinarsFromAPI]   - Errors:', response.summary?.errors || 0);
    console.log('[refreshWebinarsFromAPI]   - Historical webinars:', response.summary?.historicalWebinars || 0);
    console.log('[refreshWebinarsFromAPI]   - Upcoming webinars:', response.summary?.upcomingWebinars || 0);
    console.log('[refreshWebinarsFromAPI]   - Instances synced:', response.summary?.instanceSync?.totalInstancesSynced || 0);
    console.log('[refreshWebinarsFromAPI]   - API compliance:', response.summary?.api_compliance || 'Unknown');
    
    // Verify sync was successful
    if (response.summary?.successfulUpserts === 0) {
      console.warn('[refreshWebinarsFromAPI] ⚠️ WARNING: No webinars were successfully upserted to database');
      
      // Run another health check to see what's wrong
      if (userId) {
        const postSyncHealthCheck = await verifyDatabaseSyncHealth(userId);
        console.log('[refreshWebinarsFromAPI] Post-sync health check:', postSyncHealthCheck);
      }
    } else {
      console.log('[refreshWebinarsFromAPI] ✅ SUCCESS: Database sync completed with', response.summary?.successfulUpserts, 'webinars saved');
    }
    
    return response;
    
  } catch (error) {
    console.error('[refreshWebinarsFromAPI] FIXED refresh error:', error);
    
    toast({
      title: 'Sync failed',
      description: error.message || 'Failed to refresh webinars from Zoom API',
      variant: 'destructive'
    });
    
    throw error;
  }
}

/**
 * Legacy refresh function (fallback)
 */
async function refreshWebinarsFromAPILegacy(userId: string, force: boolean = false): Promise<any> {
  console.log(`[refreshWebinarsFromAPILegacy] Starting legacy refresh with force=${force}`);
  
  const { data: refreshData, error: refreshError } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'list-webinars-enhanced',
      force_sync: force 
    }
  });
  
  if (refreshError) {
    console.error('[refreshWebinarsFromAPILegacy] Error during refresh:', refreshError);
    throw refreshError;
  }
  
  if (refreshData.error) {
    console.error('[refreshWebinarsFromAPILegacy] API returned error:', refreshData.error);
    throw new Error(refreshData.error);
  }
  
  console.log('[refreshWebinarsFromAPILegacy] Legacy sync completed successfully:', refreshData);
  
  return refreshData;
}
