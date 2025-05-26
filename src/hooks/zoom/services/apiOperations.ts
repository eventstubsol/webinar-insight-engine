import { supabase } from '@/integrations/supabase/client';
import { ZoomWebinar } from '../types';

/**
 * Fetch webinars from API
 */
export async function fetchWebinarsFromAPI(forceSync: boolean = false): Promise<ZoomWebinar[]> {
  console.log(`[fetchWebinarsFromAPI] Fetching webinars from API with force_sync=${forceSync}`);
  
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
  
  return data.webinars || [];
}

/**
 * Refresh webinars from API with force option
 */
export async function refreshWebinarsFromAPI(userId: string, force: boolean = false): Promise<any> {
  console.log(`[refreshWebinarsFromAPI] Starting refresh with force=${force}`);
  
  // Make the API call to fetch fresh data from Zoom
  const { data: refreshData, error: refreshError } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'list-webinars',
      force_sync: force 
    }
  });
  
  if (refreshError) {
    console.error('[refreshWebinarsFromAPI] Error during refresh:', refreshError);
    throw refreshError;
  }
  
  if (refreshData.error) {
    console.error('[refreshWebinarsFromAPI] API returned error:', refreshData.error);
    throw new Error(refreshData.error);
  }
  
  console.log('[refreshWebinarsFromAPI] Sync completed successfully:', refreshData);
  
  return refreshData;
}

/**
 * Update participant data for webinars
 */
export async function updateParticipantDataAPI(): Promise<any> {
  console.log('[updateParticipantDataAPI] Updating participant data');
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'update-webinar-participants'
    }
  });
  
  if (error) {
    console.error('[updateParticipantDataAPI] Error:', error);
    throw error;
  }
  
  console.log('[updateParticipantDataAPI] Update completed:', data);
  return data;
}

/**
 * Fetch webinar instances from API
 */
export async function fetchWebinarInstancesAPI(webinarId: string): Promise<any> {
  console.log(`[fetchWebinarInstancesAPI] Fetching instances for webinar ID: ${webinarId}`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'get-webinar-instances',
      webinar_id: webinarId
    }
  });
  
  if (error) {
    console.error('[fetchWebinarInstancesAPI] Error:', error);
    throw error;
  }
  
  console.log(`[fetchWebinarInstancesAPI] Retrieved ${data.instances?.length || 0} instances`);
  return data.instances || [];
}

/**
 * Fetch instance participants from API
 */
export async function fetchInstanceParticipantsAPI(webinarId: string, instanceId: string): Promise<any> {
  console.log(`[fetchInstanceParticipantsAPI] Fetching participants for webinar ID: ${webinarId}, instance ID: ${instanceId}`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'get-instance-participants',
      webinar_id: webinarId,
      instance_id: instanceId
    }
  });
  
  if (error) {
    console.error('[fetchInstanceParticipantsAPI] Error:', error);
    throw error;
  }
  
  return {
    registrants: data.registrants || [],
    attendees: data.attendees || []
  };
}

/**
 * Fetch webinar recordings from API
 */
export async function fetchWebinarRecordingsAPI(webinarId: string): Promise<any> {
  console.log(`[fetchWebinarRecordingsAPI] Fetching recordings for webinar ID: ${webinarId}`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'get-webinar-recordings',
      webinar_id: webinarId
    }
  });
  
  if (error) {
    console.error('[fetchWebinarRecordingsAPI] Error:', error);
    throw error;
  }
  
  if (data.error) {
    console.error('[fetchWebinarRecordingsAPI] API returned error:', data.error);
    throw new Error(data.error);
  }
  
  console.log(`[fetchWebinarRecordingsAPI] Retrieved recordings data for webinar ${webinarId}`);
  return data;
}

/**
 * Start comprehensive async webinar sync and return job ID immediately
 */
export async function startAsyncWebinarSync(userId: string, force: boolean = false): Promise<any> {
  console.log(`[startAsyncWebinarSync] Starting comprehensive async sync with force=${force}`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'start-async-sync',
      force_sync: force 
    }
  });
  
  if (error) {
    console.error('[startAsyncWebinarSync] Function invocation error:', error);
    throw new Error(error.message || 'Failed to start comprehensive async sync');
  }
  
  if (data.error) {
    console.error('[startAsyncWebinarSync] API error:', data.error);
    throw new Error(data.error);
  }
  
  console.log('[startAsyncWebinarSync] Comprehensive async sync started:', data);
  return data;
}

/**
 * Get sync job status and progress
 */
export async function getSyncJobStatus(jobId: string): Promise<any> {
  console.log(`[getSyncJobStatus] Getting status for job: ${jobId}`);
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'get-sync-status',
      job_id: jobId
    }
  });
  
  if (error) {
    console.error('[getSyncJobStatus] Function invocation error:', error);
    throw new Error(error.message || 'Failed to get sync status');
  }
  
  if (data.error) {
    console.error('[getSyncJobStatus] API error:', data.error);
    throw new Error(data.error);
  }
  
  return data;
}

/**
 * Poll sync job until completion with extended timeout for comprehensive sync
 */
export async function pollSyncJob(
  jobId: string, 
  onProgress?: (progress: any) => void,
  pollingInterval: number = 3000,
  maxAttempts: number = 200 // 10 minutes max for comprehensive sync
): Promise<any> {
  console.log(`[pollSyncJob] Starting to poll comprehensive sync job: ${jobId}`);
  
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const status = await getSyncJobStatus(jobId);
      
      if (onProgress) {
        onProgress(status);
      }
      
      // Job completed successfully
      if (status.status === 'completed') {
        console.log(`[pollSyncJob] Comprehensive sync job completed successfully: ${jobId}`);
        return status;
      }
      
      // Job failed
      if (status.status === 'failed') {
        console.error(`[pollSyncJob] Comprehensive sync job failed: ${jobId}`, status.error_details);
        throw new Error(status.error_details?.error || 'Comprehensive sync job failed');
      }
      
      // Job still running, continue polling
      if (status.status === 'running' || status.status === 'pending') {
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        attempts++;
        continue;
      }
      
      // Unknown status
      console.warn(`[pollSyncJob] Unknown job status: ${status.status}`);
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
      attempts++;
      
    } catch (error) {
      console.error(`[pollSyncJob] Error polling comprehensive sync job ${jobId}:`, error);
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new Error(`Comprehensive sync polling timeout after ${maxAttempts} attempts`);
      }
      
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }
  }
  
  throw new Error(`Comprehensive sync polling timeout for job ${jobId}`);
}
