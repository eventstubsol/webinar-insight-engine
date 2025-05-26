
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PlusCircle, ArrowLeft, Settings, LoaderCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SyncTimingDataButton } from './SyncTimingDataButton';

interface WebinarHeaderProps {
  errorDetails: {
    isMissingCredentials: boolean;
    isScopesError: boolean;
  };
  isRefetching: boolean;
  isLoading: boolean;
  refreshWebinars: (force?: boolean) => Promise<void>;
  lastSyncTime: Date | null;
  onSetupZoom: () => void;
  credentialsStatus: {
    hasCredentials: boolean;
    isVerified: boolean;
  } | null;
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
  const [isCreateLoading, setIsCreateLoading] = React.useState(false);

  const handleCreateWebinar = () => {
    setIsCreateLoading(true);
    toast({
      title: "Feature Coming Soon",
      description: "Creating webinars will be available in a future update.",
    });
    setTimeout(() => setIsCreateLoading(false), 1000);
  };

  const handleTimingSyncComplete = async () => {
    try {
      await refreshWebinars(false);
    } catch (error) {
      console.error('Error refreshing after timing sync:', error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webinars</h1>
        <p className="text-muted-foreground">Manage and analyze your Zoom webinar events</p>
      </div>
      <div className="flex gap-2">
        {credentialsStatus?.hasCredentials ? (
          <>
            <Button onClick={handleCreateWebinar} disabled={isCreateLoading}>
              {isCreateLoading ? (
                <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-2" />
              )}
              Create Webinar
            </Button>
            <SyncTimingDataButton 
              onSyncComplete={handleTimingSyncComplete}
              variant="outline"
              size="default"
            />
            <Button variant="outline" onClick={onSetupZoom}>
              <Settings className="h-4 w-4 mr-2" />
              Zoom Settings
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onSetupZoom}>
              <Settings className="h-4 w-4 mr-2" />
              Connect Zoom Account
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
