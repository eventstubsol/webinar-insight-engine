
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface EnhancementResult {
  success: boolean;
  results?: any;
  summary?: {
    total_instances: number;
    enhanced_instances: number;
    data_completeness: number;
    status_accuracy: number;
    participant_coverage: number;
  };
  error?: string;
}

export function useInstanceEnhancement() {
  const { user } = useAuth();
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [lastResult, setLastResult] = useState<EnhancementResult | null>(null);

  const enhanceInstances = async (
    method: 'hybrid' | 'api' | 'all' = 'hybrid',
    webinarId?: string
  ): Promise<EnhancementResult> => {
    if (!user) {
      const error = 'User not authenticated';
      toast({
        title: 'Authentication Error',
        description: error,
        variant: 'destructive'
      });
      return { success: false, error };
    }

    setIsEnhancing(true);
    
    try {
      console.log(`[useInstanceEnhancement] Starting enhancement with method: ${method}`);
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'enhance-webinar-instances',
          method,
          webinar_id: webinarId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const result: EnhancementResult = {
        success: data.success,
        results: data.results,
        summary: data.summary,
        error: data.error
      };

      setLastResult(result);

      if (result.success) {
        const { summary } = result;
        toast({
          title: 'Instance Enhancement Complete',
          description: `Enhanced ${summary?.enhanced_instances || 0} instances. Data completeness: ${summary?.data_completeness || 0}%`,
          variant: 'default'
        });
        
        console.log('[useInstanceEnhancement] Enhancement successful:', summary);
      } else {
        toast({
          title: 'Enhancement Failed',
          description: result.error || 'Unknown error occurred',
          variant: 'destructive'
        });
      }

      return result;

    } catch (err: any) {
      console.error('[useInstanceEnhancement] Enhancement error:', err);
      
      const result: EnhancementResult = {
        success: false,
        error: err.message || 'Failed to enhance instances'
      };
      
      setLastResult(result);
      
      toast({
        title: 'Enhancement Error',
        description: result.error,
        variant: 'destructive'
      });
      
      return result;
    } finally {
      setIsEnhancing(false);
    }
  };

  const enhanceHybrid = () => enhanceInstances('hybrid');
  const enhanceWithApi = () => enhanceInstances('api');
  const enhanceAll = () => enhanceInstances('all');
  const enhanceWebinar = (webinarId: string) => enhanceInstances('hybrid', webinarId);

  return {
    enhanceInstances,
    enhanceHybrid,
    enhanceWithApi,
    enhanceAll,
    enhanceWebinar,
    isEnhancing,
    lastResult
  };
}
