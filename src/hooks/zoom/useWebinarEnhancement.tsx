
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { EnhancementType } from './utils/enhancementUtils';

export function useWebinarEnhancement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const enhanceWebinar = async (type: EnhancementType, webinarId: string) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to enhance webinar data',
        variant: 'destructive'
      });
      return;
    }

    const loadingKey = `${webinarId}-${type}`;
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const actionMap = {
        participants: 'enhance-participants',
        host: 'enhance-host-details',
        panelists: 'enhance-panelist-details',
        settings: 'enhance-settings',
        recordings: 'get-webinar-recordings'
      };

      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: actionMap[type],
          webinar_id: webinarId
        }
      });

      if (error) {
        console.error(`[useWebinarEnhancement] Error enhancing ${type}:`, error);
        throw new Error(error.message || `Failed to enhance ${type} data`);
      }

      if (data.error) {
        console.error(`[useWebinarEnhancement] API error enhancing ${type}:`, data.error);
        throw new Error(data.error);
      }

      // Invalidate relevant queries to refetch updated data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['zoom-webinar', user.id, webinarId] }),
        queryClient.invalidateQueries({ queryKey: ['zoom-webinar-details', webinarId] }),
        type === 'participants' && queryClient.invalidateQueries({ queryKey: ['zoom-webinar-participants', webinarId] }),
        type === 'recordings' && queryClient.invalidateQueries({ queryKey: ['zoom-webinar-recordings', webinarId] })
      ].filter(Boolean));

      // Success message based on enhancement type
      const successMessages = {
        participants: 'Participant data loaded successfully',
        host: 'Host details loaded successfully',
        panelists: 'Panelist information loaded successfully',
        settings: 'Webinar settings loaded successfully',
        recordings: 'Recording information loaded successfully'
      };

      toast({
        title: 'Enhancement complete',
        description: successMessages[type],
        variant: 'default'
      });

      console.log(`[useWebinarEnhancement] Successfully enhanced ${type} for webinar ${webinarId}:`, data);

    } catch (error: any) {
      console.error(`[useWebinarEnhancement] Enhancement failed:`, error);
      
      toast({
        title: 'Enhancement failed',
        description: error.message || `Failed to load ${type} data`,
        variant: 'destructive'
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  return {
    enhanceWebinar,
    loadingStates
  };
}
