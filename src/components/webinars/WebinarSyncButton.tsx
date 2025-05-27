
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Clock, Zap } from 'lucide-react';
import { useSingleWebinarSync } from '@/hooks/zoom/useSingleWebinarSync';
import { formatDistanceToNow } from 'date-fns';

interface WebinarSyncButtonProps {
  webinarId: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  showLastSync?: boolean;
  className?: string;
  mode?: 'single' | 'timing'; // New prop to indicate sync mode
}

export const WebinarSyncButton: React.FC<WebinarSyncButtonProps> = ({
  webinarId,
  size = 'sm',
  variant = 'outline',
  showLastSync = false,
  className,
  mode = 'single'
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

  const getButtonText = () => {
    if (isThisWebinarSyncing) {
      return mode === 'timing' ? 'Enhancing...' : 'Syncing...';
    }
    return mode === 'timing' ? 'Enhance Timing' : 'Sync';
  };

  const getTooltipText = () => {
    if (mode === 'timing') {
      return lastSync 
        ? `Last timing enhancement: ${formatDistanceToNow(lastSync, { addSuffix: true })}`
        : 'Enhance this webinar with actual timing data (Phase 2)';
    }
    
    return lastSync 
      ? `Last synced: ${formatDistanceToNow(lastSync, { addSuffix: true })}`
      : 'Sync this webinar';
  };

  const getIcon = () => {
    if (mode === 'timing') {
      return <Zap className={`h-4 w-4 ${isThisWebinarSyncing ? 'animate-pulse' : ''}`} />;
    }
    return <RefreshCw className={`h-4 w-4 ${isThisWebinarSyncing ? 'animate-spin' : ''}`} />;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={mode === 'timing' ? 'secondary' : variant}
            size={size}
            onClick={handleSync}
            disabled={isThisWebinarSyncing}
            className="gap-1"
          >
            {getIcon()}
            {size !== 'icon' && getButtonText()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
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
