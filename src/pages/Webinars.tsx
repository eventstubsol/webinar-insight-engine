
import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarsList } from '@/components/webinars/WebinarsList';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/useZoomApi';
import { LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from '@/hooks/use-toast';

const Webinars = () => {
  const { webinars, isLoading, isRefetching, error, refreshWebinars } = useZoomWebinars();
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  
  const handleCreateWebinar = () => {
    setIsCreateLoading(true);
    toast({
      title: "Feature Coming Soon",
      description: "Creating webinars will be available in a future update.",
    });
    setTimeout(() => setIsCreateLoading(false), 1000);
  };
  
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Webinars</h1>
            <p className="text-muted-foreground">Manage and analyze your Zoom webinar events</p>
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Zoom API Error</AlertTitle>
            <AlertDescription>
              {error.message || 'An error occurred while connecting to the Zoom API'}
            </AlertDescription>
            <AlertDescription className="mt-2 text-xs">
              Make sure your Zoom API credentials are properly configured in Supabase Edge Functions 
              and your Zoom account has webinar capabilities enabled.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          <WebinarsList webinars={webinars} isLoading={isLoading} error={error} />
        </div>
      </div>
    </AppLayout>
  );
};

export default Webinars;
