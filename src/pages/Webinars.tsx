
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarsList } from '@/components/webinars/WebinarsList';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/useZoomApi';
import { LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const Webinars = () => {
  const { webinars, isLoading, isRefetching, error, refreshWebinars } = useZoomWebinars();
  const [isCreateLoading, setIsCreateLoading] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  useEffect(() => {
    // Track if data has been loaded at least once
    if (!isLoading && isFirstLoad) {
      setIsFirstLoad(false);
    }
  }, [isLoading]);
  
  const handleCreateWebinar = () => {
    setIsCreateLoading(true);
    toast({
      title: "Feature Coming Soon",
      description: "Creating webinars will be available in a future update.",
    });
    setTimeout(() => setIsCreateLoading(false), 1000);
  };
  
  const errorMessage = error?.message || 'An error occurred while connecting to the Zoom API';
  const isCredentialsError = errorMessage.includes('credentials') || 
                            errorMessage.includes('token') || 
                            errorMessage.includes('Failed to generate');
  
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Webinars</h1>
            <p className="text-muted-foreground">Manage and analyze your Zoom webinar events</p>
          </div>
          <div className="flex gap-2">
            {!isCredentialsError && (
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
            {isCredentialsError && (
              <Button variant="outline" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Zoom API Error</AlertTitle>
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
            {isCredentialsError ? (
              <AlertDescription className="mt-2">
                <p className="font-semibold">Required steps:</p>
                <ol className="list-decimal ml-5 mt-1 space-y-1">
                  <li>Verify your Zoom Account ID, Client ID, and Client Secret are correctly set in Supabase Edge Functions secrets</li>
                  <li>Ensure your Zoom Server-to-Server OAuth app is published in the Zoom Marketplace</li>
                  <li>Make sure your Zoom app has the <code className="px-1 py-0.5 bg-destructive/10 rounded">webinar:read</code> and <code className="px-1 py-0.5 bg-destructive/10 rounded">webinar:write</code> scopes</li>
                  <li>Verify your Zoom account has webinar capabilities enabled (requires a paid plan)</li>
                </ol>
              </AlertDescription>
            ) : (
              <AlertDescription className="mt-2 text-xs">
                Make sure your Zoom API credentials are properly configured in Supabase Edge Functions 
                and your Zoom account has webinar capabilities enabled.
              </AlertDescription>
            )}
          </Alert>
        )}

        <div className="grid gap-6">
          <WebinarsList webinars={webinars} isLoading={isLoading || isFirstLoad} error={error} />
        </div>
      </div>
    </AppLayout>
  );
};

export default Webinars;
