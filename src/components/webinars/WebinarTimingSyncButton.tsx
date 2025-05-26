
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface WebinarTimingSyncButtonProps {
  webinarId: string;
  webinarStatus: string;
  onSyncComplete?: () => void;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  className?: string;
}

export const WebinarTimingSyncButton: React.FC<WebinarTimingSyncButtonProps> = ({
  webinarId,
  webinarStatus,
  onSyncComplete,
  size = 'sm',
  variant = 'outline',
  className
}) => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncTiming = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to sync timing data',
        variant: 'destructive'
      });
      return;
    }

    if (webinarStatus !== 'ended') {
      toast({
        title: 'Cannot sync timing',
        description: 'Timing data is only available for completed webinars',
        variant: 'destructive'
      });
      return;
    }

    setIsSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'sync-single-webinar',
          webinar_id: webinarId,
          sync_timing_only: true
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Timing data synced',
        description: 'Actual timing data has been updated from Zoom',
        variant: 'default'
      });

      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error: any) {
      console.error('Error syncing timing data:', error);
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync timing data',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Only show for completed webinars
  if (webinarStatus !== 'ended') {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={handleSyncTiming}
          disabled={isSyncing}
          className={`gap-1 ${className}`}
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {size !== 'icon' && (isSyncing ? 'Syncing...' : 'Sync Timing')}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Sync actual timing data from Zoom</p>
      </TooltipContent>
    </Tooltip>
  );
};
