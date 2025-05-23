
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * BaseZoomService - Base class with shared utilities for Zoom services
 */
export class BaseZoomService {
  /**
   * Helper method to show toast notifications
   */
  protected static showToast(title: string, description: string, variant: 'default' | 'destructive' = 'default') {
    toast({
      title,
      description,
      variant
    });
  }

  /**
   * Helper method for API calls to edge functions
   */
  protected static async invokeEdgeFunction(action: string, params: Record<string, any> = {}) {
    try {
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action,
          ...params
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`[BaseZoomService] Error invoking edge function (${action}):`, error);
      throw error;
    }
  }
}
