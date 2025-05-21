import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ZoomWebinar } from '../types';

// Fetch webinars from database
export async function fetchWebinarsFromDatabase(userId: string): Promise<ZoomWebinar[] | null> {
  console.log('[fetchWebinarsFromDatabase] Fetching webinars from database');
  
  const { data: dbWebinars, error: dbError } = await supabase
    .from('zoom_webinars')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });
  
  if (dbError) {
    console.error('[fetchWebinarsFromDatabase] Error:', dbError);
    return null;
  }
  
  if (!dbWebinars || dbWebinars.length === 0) {
    console.log('[fetchWebinarsFromDatabase] No webinars found in database');
    return [];
  }
  
  console.log(`[fetchWebinarsFromDatabase] Found ${dbWebinars.length} webinars in database`);
  
  // Transform to ZoomWebinar format with proper type handling
  return dbWebinars.map(item => {
    // Parse the raw_data if it's a string, use as-is if it's already an object
    let parsedRawData: Record<string, any> = {};
    
    if (item.raw_data) {
      if (typeof item.raw_data === 'string') {
        try {
          parsedRawData = JSON.parse(item.raw_data);
        } catch (e) {
          console.error('Failed to parse raw_data:', e);
        }
      } else {
        // Assume it's already an object
        parsedRawData = item.raw_data as Record<string, any>;
      }
    }
    
    // Create a properly typed ZoomWebinar object
    const webinar: ZoomWebinar = {
      id: item.webinar_id,
      uuid: item.webinar_uuid,
      topic: item.topic,
      start_time: item.start_time,
      duration: item.duration,
      timezone: item.timezone,
      agenda: item.agenda || '',
      host_email: item.host_email,
      status: item.status,
      type: item.type,
      registrants_count: parsedRawData?.registrants_count || 0,
      participants_count: parsedRawData?.participants_count || 0,
      raw_data: parsedRawData
    };
    
    return webinar;
  });
}

// Fetch webinars from API
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

// Enhance error message for better user experience
export function enhanceErrorMessage(err: any): string {
  let errorMessage = err.message || 'An error occurred while fetching webinars';
  
  // Provide more helpful error messages based on common patterns
  if (errorMessage.includes('credentials not configured')) {
    return 'Zoom credentials not configured. Please complete the Zoom setup wizard.';
  } else if (errorMessage.includes('capabilities')) {
    return 'Your Zoom account does not have webinar capabilities enabled. This requires a paid Zoom plan.';
  } else if (errorMessage.includes('scopes') || errorMessage.includes('scope') || errorMessage.includes('4711')) {
    return 'Missing required OAuth scopes in your Zoom App. Update your Zoom Server-to-Server OAuth app to include: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin';
  }
  
  return errorMessage;
}

// Update participant data for webinars
export async function updateParticipantDataForWebinars(userId: string | undefined): Promise<void> {
  if (!userId) {
    console.log('[updateParticipantDataForWebinars] No userId provided');
    toast({
      title: 'Authentication required',
      description: 'You must be logged in to update participant data',
      variant: 'destructive'
    });
    throw new Error('Authentication Required: You must be logged in to update participant data');
  }
  
  console.log(`[updateParticipantDataForWebinars] Updating participant data for user ${userId}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('zoom-api', {
      body: { 
        action: 'update-webinar-participants',
        user_id: userId // Pass userId to Edge Function
      }
    });
    
    if (error) {
      console.error('[updateParticipantDataForWebinars] Error:', error);
      throw error;
    }
    
    console.log('[updateParticipantDataForWebinars] Update completed:', data);
    
    // Show toast with results
    toast({
      title: 'Participant data updated',
      description: data.message || `Updated ${data.updated} webinars with participant data`,
      variant: 'success'
    });
  } catch (err: any) {
    console.error('[updateParticipantDataForWebinars] Unhandled error:', err);
    
    // Show error toast with enhanced message
    toast({
      title: 'Update failed',
      description: enhanceErrorMessage(err),
      variant: 'destructive'
    });
    
    throw err;
  }
}

// Fetch sync history
export async function fetchSyncHistory(userId: string): Promise<any[]> {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('zoom_sync_history')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_type', 'webinars')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!error && data) {
      return data;
    }
    return [];
  } catch (err) {
    console.error('Error fetching sync history:', err);
    return [];
  }
}
