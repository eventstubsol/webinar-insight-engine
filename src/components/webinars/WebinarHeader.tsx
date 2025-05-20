
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PlusCircle, RefreshCw, ArrowLeft, Settings, LoaderCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WebinarHeaderProps {
  errorDetails: {
    isMissingCredentials: boolean;
    isScopesError: boolean;
  };
  isRefetching: boolean;
  isLoading: boolean;
  refreshWebinars: () => Promise<void>;
}

export const WebinarHeader: React.FC<WebinarHeaderProps> = ({
  errorDetails,
  isRefetching,
  isLoading,
  refreshWebinars,
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
      </div>
      <div className="flex gap-2">
        {!errorDetails.isMissingCredentials && (
          <>
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
            <Button onClick={handleCreateWebinar} disabled={isCreateLoading}>
              {isCreateLoading ? (
                <LoaderCircle className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-2" />
              )}
              Create Webinar
            </Button>
          </>
        )}
        {(errorDetails.isMissingCredentials || errorDetails.isScopesError) ? (
          <>
            <Button variant="outline" asChild>
              <a 
                href="https://supabase.com/dashboard/project/dcvlxtkxqyaznxxvkynd/settings/functions" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure Zoom API
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
};
