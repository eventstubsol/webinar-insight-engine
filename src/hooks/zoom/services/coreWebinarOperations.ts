
import { supabase } from '@/integrations/supabase/client';
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
 * Refresh webinars from API with fixed strategy and fallback
 */
export async function refreshWebinarsFromAPI(userId: string, force: boolean = false): Promise<any> {
  console.log(`[refreshWebinarsFromAPI] Starting fixed refresh with force=${force}`);
  console.log(`[refreshWebinarsFromAPI] 🎯 This will collect ACTUAL end_time data from Zoom API`);
  
  try {
    // Try fixed strategy first
    const { data: refreshData, error: refreshError } = await supabase.functions.invoke('zoom-api', {
      body: { 
        action: 'list-webinars',
        force_sync: force 
      }
    });
    
    if (refreshError) {
      console.error('[refreshWebinarsFromAPI] Fixed strategy error:', refreshError);
      // Fall back to legacy strategy
      console.log('[refreshWebinarsFromAPI] Falling back to legacy strategy');
      return await refreshWebinarsFromAPILegacy(userId, force);
    }
    
    if (refreshData.error) {
      console.error('[refreshWebinarsFromAPI] Fixed API returned error:', refreshData.error);
      // Fall back to legacy strategy
      console.log('[refreshWebinarsFromAPI] Falling back to legacy strategy');
      return await refreshWebinarsFromAPILegacy(userId, force);
    }
    
    console.log('[refreshWebinarsFromAPI] Fixed sync completed successfully:', refreshData);
    
    // Log summary with actual data collection info
    if (refreshData.summary) {
      console.log('[refreshWebinarsFromAPI] Fixed sync summary:', {
        totalCollected: refreshData.summary.totalCollected,
        uniqueWebinars: refreshData.summary.uniqueWebinars,
        successfulUpserts: refreshData.summary.successfulUpserts,
        historicalWebinars: refreshData.summary.historicalWebinars,
        upcomingWebinars: refreshData.summary.upcomingWebinars,
        webinarsBySource: refreshData.summary.webinarsBySource,
        instanceSync: refreshData.summary.instanceSync
      });
      
      if (refreshData.summary.instanceSync) {
        console.log('[refreshWebinarsFromAPI] 📊 ACTUAL DATA COLLECTION RESULTS:');
        console.log(`[refreshWebinarsFromAPI]   - Instances synced: ${refreshData.summary.instanceSync.totalInstancesSynced}`);
        console.log(`[refreshWebinarsFromAPI]   - Actual data fetched: ${refreshData.summary.instanceSync.actualDataFetched}`);
        console.log(`[refreshWebinarsFromAPI]   - Successful API calls: ${refreshData.summary.instanceSync.apiCallsSuccessful}`);
        console.log(`[refreshWebinarsFromAPI]   - Failed API calls: ${refreshData.summary.instanceSync.apiCallsFailed}`);
      }
    }
    
    return refreshData;
  } catch (error) {
    console.error('[refreshWebinarsFromAPI] Fixed strategy failed:', error);
    // Fall back to legacy strategy
    console.log('[refreshWebinarsFromAPI] Falling back to legacy strategy');
    return await refreshWebinarsFromAPILegacy(userId, force);
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
