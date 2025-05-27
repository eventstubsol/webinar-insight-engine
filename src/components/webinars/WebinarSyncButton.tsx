
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Clock, Zap, Sparkles } from 'lucide-react';
import { useSingleWebinarSync } from '@/hooks/zoom/useSingleWebinarSync';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface WebinarSyncButtonProps {
  webinarId: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  showLastSync?: boolean;
  className?: string;
  mode?: 'single' | 'timing' | 'enhance'; // New enhance mode for on-demand enhancement
}

export const WebinarSyncButton: React.FC<WebinarSyncButtonProps> = ({
  webinarId,
  size = 'sm',
  variant = 'outline',
  showLastSync = false,
  className,
  mode = 'single'
}) => {
  const { user } = useAuth();
  const { syncWebinar, isSyncing, syncingWebinarId, getLastSyncTime } = useSingleWebinarSync();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const isThisWebinarSyncing = isSyncing && syncingWebinarId === webinarId;
  const isThisWebinarEnhancing = isEnhancing;

  // Load last sync time on mount
  useEffect(() => {
    const loadLastSync = async () => {
      const syncTime = await getLastSyncTime(webinarId);
      setLastSync(syncTime);
    };
    loadLastSync();
  }, [webinarId, getLastSyncTime]);

  const handleSync = () => {
    if (mode === 'enhance') {
      handleEnhance();
    } else {
      syncWebinar(webinarId);
    }
  };

  const handleEnhance = async () => {
    if (!user) return;
    
    setIsEnhancing(true);
    try {
      console.log(`[WebinarSyncButton] Enhancing webinar: ${webinarId}`);
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'enhance-single-webinar',
          webinar_id: webinarId
        }
      });
      
      if (error) {
        console.error('[WebinarSyncButton] Enhancement error:', error);
        toast({
          title: 'Enhancement failed',
          description: error.message || 'Failed to enhance webinar data',
          variant: 'destructive'
        });
        return;
      }
      
      console.log('[WebinarSyncButton] Enhancement completed:', data);
      
      toast({
        title: 'Webinar enhanced',
        description: data.enhancement_status === 'cached' 
          ? 'Webinar data is current' 
          : 'Webinar enhanced with detailed host, panelist, and participant data',
        variant: 'default'
      });
      
      // Update last sync time
      setLastSync(new Date());
      
    } catch (error: any) {
      console.error('[WebinarSyncButton] Enhancement exception:', error);
      toast({
        title: 'Enhancement failed',
        description: 'Failed to enhance webinar data',
        variant: 'destructive'
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const getButtonText = () => {
    if (isThisWebinarEnhancing) {
      return 'Enhancing...';
    }
    if (isThisWebinarSyncing) {
      return mode === 'timing' ? 'Enhancing...' : 'Syncing...';
    }
    
    switch (mode) {
      case 'enhance':
        return 'Enhance';
      case 'timing':
        return 'Enhance Timing';
      default:
        return 'Sync';
    }
  };

  const getTooltipText = () => {
    switch (mode) {
      case 'enhance':
        return lastSync 
          ? `Last enhanced: ${formatDistanceToNow(lastSync, { addSuffix: true })}. Click to enhance with host, panelist, and participant data.`
          : 'Enhance this webinar with detailed host, panelist, and participant data';
      case 'timing':
        return lastSync 
          ? `Last timing enhancement: ${formatDistanceToNow(lastSync, { addSuffix: true })}`
          : 'Enhance this webinar with actual timing data (Phase 2)';
      default:
        return lastSync 
          ? `Last synced: ${formatDistanceToNow(lastSync, { addSuffix: true })}`
          : 'Sync this webinar';
    }
  };

  const getIcon = () => {
    const isLoading = isThisWebinarSyncing || isThisWebinarEnhancing;
    
    switch (mode) {
      case 'enhance':
        return <Sparkles className={`h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />;
      case 'timing':
        return <Zap className={`h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />;
      default:
        return <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />;
    }
  };

  const getVariant = () => {
    if (mode === 'enhance') return 'default';
    if (mode === 'timing') return 'secondary';
    return variant;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={getVariant()}
            size={size}
            onClick={handleSync}
            disabled={isThisWebinarSyncing || isThisWebinarEnhancing}
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
