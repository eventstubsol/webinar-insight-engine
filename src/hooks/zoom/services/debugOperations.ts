
import { supabase } from '@/integrations/supabase/client';

/**
 * Debug API responses - helps identify API endpoint issues
 */
export async function debugAPIResponses(): Promise<any> {
  console.log('[debugAPIResponses] Starting API debugging session');
  
  const { data, error } = await supabase.functions.invoke('zoom-api', {
    body: { 
      action: 'debug-api'
    }
  });
  
  if (error) {
    console.error('[debugAPIResponses] Function invocation error:', error);
    throw new Error(error.message || 'Failed to invoke debug API function');
  }
  
  if (data.error) {
    console.error('[debugAPIResponses] API error:', data.error);
    throw new Error(data.error);
  }
  
  console.log('[debugAPIResponses] Debug completed:', data);
  return data;
}
