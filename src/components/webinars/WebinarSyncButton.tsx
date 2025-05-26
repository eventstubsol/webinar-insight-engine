
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Clock } from 'lucide-react';
import { useSingleWebinarSync } from '@/hooks/zoom/useSingleWebinarSync';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface WebinarSyncButtonProps {
  webinarId: string;
  webinarUuid?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  showLastSync?: boolean;
  includeTimingData?: boolean;
  className?: string;
}

export const WebinarSyncButton: React.FC<WebinarSyncButtonProps> = ({
  webinarId,
  webinarUuid,
  size = 'sm',
  variant = 'outline',
  showLastSync = false,
  includeTimingData = true,
  className
}) => {
  const { syncWebinar, isSyncing, syncingWebinarId, getLastSyncTime } = useSingleWebinarSync();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isCustomSyncing, setIsCustomSyncing] = useState(false);
  
  const isThisWebinarSyncing = (isSyncing && syncingWebinarId === webinarId) || isCustomSyncing;

  // Load last sync time on mount
  useEffect(() => {
    const loadLastSync = async () => {
      const syncTime = await getLastSyncTime(webinarId);
      setLastSync(syncTime);
    };
    loadLastSync();
  }, [webinarId, getLastSyncTime]);

  const handleSync = async () => {
    if (includeTimingData) {
      // Custom sync that includes timing data fetch
      setIsCustomSyncing(true);
      
      try {
        console.log('[WebinarSyncButton] Starting comprehensive sync with timing data');
        
        // First do the regular sync
        await syncWebinar(webinarId);
        
        // Then fetch timing data
        const { data, error } = await supabase.functions.invoke('zoom-api', {
          body: {
            action: 'fetch-timing-data',
            webinar_id: webinarId,
            webinar_uuid: webinarUuid
          }
        });

        if (error) {
          console.error('[WebinarSyncButton] Timing data fetch error:', error);
          toast({
            title: 'Sync completed with warnings',
            description: 'Webinar synced but timing data fetch failed',
            variant: 'destructive'
          });
        } else if (data.error) {
          console.error('[WebinarSyncButton] Timing data API error:', data.error);
          toast({
            title: 'Sync completed with warnings', 
            description: 'Webinar synced but timing data unavailable',
            variant: 'destructive'
          });
        } else {
          console.log('[WebinarSyncButton] Complete sync successful');
          toast({
            title: 'Complete sync successful',
            description: 'Webinar and timing data updated',
            variant: 'default'
          });
        }
        
      } catch (error) {
        console.error('[WebinarSyncButton] Comprehensive sync error:', error);
        toast({
          title: 'Sync error',
          description: 'Failed to complete comprehensive sync',
          variant: 'destructive'
        });
      } finally {
        setIsCustomSyncing(false);
      }
    } else {
      // Regular sync only
      syncWebinar(webinarId);
    }
  };

  const syncTooltip = lastSync 
    ? `Last synced: ${formatDistanceToNow(lastSync, { addSuffix: true })}`
    : includeTimingData 
      ? 'Sync webinar and fetch timing data'
      : 'Sync this webinar';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleSync}
            disabled={isThisWebinarSyncing}
            className="gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isThisWebinarSyncing ? 'animate-spin' : ''}`} />
            {size !== 'icon' && (isThisWebinarSyncing ? 'Syncing...' : includeTimingData ? 'Full Sync' : 'Sync')}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{syncTooltip}</p>
        </TooltipContent>
      </Tooltip>
      
      {showLastSync && lastSync && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(lastSync, { addSuffix: true })}</span>
        </div>
      )}
    </div>
  );
};
