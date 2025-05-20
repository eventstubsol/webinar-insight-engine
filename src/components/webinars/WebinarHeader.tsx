
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PlusCircle, RefreshCw, ArrowLeft, Settings, LoaderCircle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WebinarHeaderProps {
  errorDetails: {
    isMissingCredentials: boolean;
    isScopesError: boolean;
  };
  isRefetching: boolean;
  isLoading: boolean;
  refreshWebinars: () => Promise<void>;
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

  return (
    <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Webinars</h1>
        <p className="text-muted-foreground">Manage and analyze your Zoom webinar events</p>
        {lastSyncTime && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3 mr-1" />
            Last synced: {format(lastSyncTime, 'MMM d, yyyy h:mm a')}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {credentialsStatus?.hasCredentials ? (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={refreshWebinars}
                    disabled={isLoading || isRefetching}
                  >
                    {isRefetching ? (
                      <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manually sync webinars from Zoom</p>
                  {lastSyncTime && (
                    <p className="text-xs">Last sync: {format(lastSyncTime, 'h:mm a')}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={handleCreateWebinar} disabled={isCreateLoading}>
              {isCreateLoading ? (
                <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-2" />
              )}
              Create Webinar
            </Button>
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
