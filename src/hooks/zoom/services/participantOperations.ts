
import { supabase } from '@/integrations/supabase/client';

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
 * Fetch webinar instances from API with enhanced error handling
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
