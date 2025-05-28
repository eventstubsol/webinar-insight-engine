
import { supabase } from '@/integrations/supabase/client';
import { ZoomWebinar } from '../types';

/**
 * Fetch webinars from API using enhanced strategy (now default)
 */
export async function fetchWebinarsFromAPI(forceSync: boolean = false): Promise<ZoomWebinar[]> {
  console.log(`[fetchWebinarsFromAPI] Using enhanced strategy with force_sync=${forceSync}`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'list-webinars-fixed',
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
  
  console.log(`[fetchWebinarsFromAPI] Enhanced strategy returned ${data.webinars?.length || 0} webinars`);
  if (data.summary) {
    console.log('[fetchWebinarsFromAPI] Sync summary:', data.summary);
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
      action: 'list-webinars',
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
 * Refresh webinars from API with enhanced strategy and fallback
 */
export async function refreshWebinarsFromAPI(userId: string, force: boolean = false): Promise<any> {
  console.log(`[refreshWebinarsFromAPI] Starting enhanced refresh with force=${force}`);
  
  try {
    // Try enhanced strategy first
    const { data: refreshData, error: refreshError } = await supabase.functions.invoke('zoom-api', {
      body: { 
        action: 'list-webinars-fixed',
        force_sync: force 
      }
    });
    
    if (refreshError) {
      console.error('[refreshWebinarsFromAPI] Enhanced strategy error:', refreshError);
      // Fall back to legacy strategy
      console.log('[refreshWebinarsFromAPI] Falling back to legacy strategy');
      return await refreshWebinarsFromAPILegacy(userId, force);
    }
    
    if (refreshData.error) {
      console.error('[refreshWebinarsFromAPI] Enhanced API returned error:', refreshData.error);
      // Fall back to legacy strategy
      console.log('[refreshWebinarsFromAPI] Falling back to legacy strategy');
      return await refreshWebinarsFromAPILegacy(userId, force);
    }
    
    console.log('[refreshWebinarsFromAPI] Enhanced sync completed successfully:', refreshData);
    
    // Log summary if available
    if (refreshData.summary) {
      console.log('[refreshWebinarsFromAPI] Enhanced sync summary:', {
        totalCollected: refreshData.summary.totalCollected,
        uniqueWebinars: refreshData.summary.uniqueWebinars,
        successfulUpserts: refreshData.summary.successfulUpserts,
        historicalWebinars: refreshData.summary.historicalWebinars,
        upcomingWebinars: refreshData.summary.upcomingWebinars,
        webinarsBySource: refreshData.summary.webinarsBySource
      });
    }
    
    return refreshData;
  } catch (error) {
    console.error('[refreshWebinarsFromAPI] Enhanced strategy failed:', error);
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
      action: 'list-webinars',
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
