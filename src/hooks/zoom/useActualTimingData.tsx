
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useActualTimingData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const fetchActualTimingData = async (webinarId: string) => {
    if (!user || !webinarId) {
      throw new Error('User not authenticated or webinar ID missing');
    }

    setIsLoading(true);
    
    try {
      console.log(`[useActualTimingData] Fetching actual timing data for webinar: ${webinarId}`);
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'get-actual-timing-data',
          webinar_id: webinarId
        }
      });

      if (error) {
        console.error(`[useActualTimingData] Error:`, error);
        throw new Error(error.message || 'Failed to fetch actual timing data');
      }

      console.log(`[useActualTimingData] Success:`, data);
      
      toast({
        title: 'Actual timing data updated',
        description: 'The webinar has been updated with actual start time and duration.',
      });

      return data;
      
    } catch (error) {
      console.error(`[useActualTimingData] Failed to fetch actual timing data:`, error);
      
      toast({
        title: 'Failed to fetch timing data',
        description: error.message || 'Could not retrieve actual timing data for this webinar.',
        variant: 'destructive'
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchActualTimingData,
    isLoading
  };
}
