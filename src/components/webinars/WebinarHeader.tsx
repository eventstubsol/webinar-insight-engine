
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings, Plus } from 'lucide-react';
import { UpdateParticipantDataButton } from '@/components/dashboard/charts/UpdateParticipantDataButton';
import { BulkParticipantSyncButton } from './BulkParticipantSyncButton';
import { ZoomWebinar } from '@/hooks/zoom';

interface WebinarHeaderProps {
  errorDetails: any;
  isRefetching: boolean;
  isLoading: boolean;
  refreshWebinars: (force?: boolean) => Promise<void>;
  lastSyncTime: Date | null;
  onSetupZoom: () => void;
  credentialsStatus: any;
  webinars?: ZoomWebinar[];
}

export const WebinarHeader: React.FC<WebinarHeaderProps> = ({
  errorDetails,
  isRefetching,
  isLoading,
  refreshWebinars,
  lastSyncTime,
  onSetupZoom,
  credentialsStatus,
  webinars = []
}) => {
  const hasCredentials = credentialsStatus?.hasCredentials;
  const isDisabled = isLoading || isRefetching || !hasCredentials;

  const handleRefresh = async () => {
    await refreshWebinars(true);
  };

  const handleParticipantSync = () => {
    // This will be called when bulk sync completes
    refreshWebinars();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">Webinars</h1>
        <p className="text-muted-foreground mt-1">
          Manage and analyze your Zoom webinars
          {lastSyncTime && (
            <span className="ml-2 text-sm">
              • Last synced: {lastSyncTime.toLocaleString()}
            </span>
          )}
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
        {hasCredentials && (
          <>
            <BulkParticipantSyncButton
              webinars={webinars}
              onSyncComplete={handleParticipantSync}
            />
            
            <UpdateParticipantDataButton
              isUpdating={isRefetching}
              isDisabled={isDisabled}
              onUpdate={handleParticipantSync}
            />
          </>
        )}
        
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isDisabled}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Syncing...' : 'Refresh'}
        </Button>
        
        {!hasCredentials && (
          <Button onClick={onSetupZoom} className="gap-2">
            <Settings className="h-4 w-4" />
            Setup Zoom
          </Button>
        )}
      </div>
    </div>
  );
};
