import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { InstanceEnhancementButton } from './InstanceEnhancementButton';

interface WebinarHeaderProps {
  errorDetails: any;
  isRefetching: boolean;
  isLoading: boolean;
  refreshWebinars: (force?: boolean) => Promise<void>;
  lastSyncTime: Date | null;
  onSetupZoom: () => void;
  credentialsStatus: any;
}

export const WebinarHeader: React.FC<WebinarHeaderProps> = ({
  errorDetails,
  isRefetching,
  isLoading,
  refreshWebinars,
  lastSyncTime,
  onSetupZoom,
  credentialsStatus
}) => {

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webinars</h1>
        <p className="text-muted-foreground mt-1">
          Manage and analyze your Zoom webinars
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Last sync info */}
        {lastSyncTime && (
          <div className="text-sm text-muted-foreground">
            Last synced: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* Instance Enhancement Button */}
          <InstanceEnhancementButton />
          
          {/* Sync Button */}
          <Button
            onClick={() => refreshWebinars(true)}
            disabled={isRefetching || isLoading}
            variant="default"
            size="sm"
            className="gap-2"
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isRefetching ? 'Syncing...' : 'Sync'}
          </Button>

          {/* Setup button - only show if no credentials or verification failed */}
          {(!credentialsStatus?.hasCredentials || errorDetails.isMissingCredentials) && (
            <Button
              onClick={onSetupZoom}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Setup Zoom
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
