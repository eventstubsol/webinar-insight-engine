
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Clock } from 'lucide-react';
import { useSingleWebinarSync } from '@/hooks/zoom/useSingleWebinarSync';
import { formatDistanceToNow } from 'date-fns';

interface WebinarSyncButtonProps {
  webinarId: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  showLastSync?: boolean;
  className?: string;
}

export const WebinarSyncButton: React.FC<WebinarSyncButtonProps> = ({
  webinarId,
  size = 'sm',
  variant = 'outline',
  showLastSync = false,
  className
}) => {
  const { syncWebinar, isSyncing, syncingWebinarId, getLastSyncTime } = useSingleWebinarSync();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  const isThisWebinarSyncing = isSyncing && syncingWebinarId === webinarId;

  // Load last sync time on mount
  useEffect(() => {
    const loadLastSync = async () => {
      const syncTime = await getLastSyncTime(webinarId);
      setLastSync(syncTime);
    };
    loadLastSync();
  }, [webinarId, getLastSyncTime]);

  const handleSync = () => {
    syncWebinar(webinarId);
  };

  const syncTooltip = lastSync 
    ? `Last synced: ${formatDistanceToNow(lastSync, { addSuffix: true })}`
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
            {size !== 'icon' && (isThisWebinarSyncing ? 'Syncing...' : 'Sync')}
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
