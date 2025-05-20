
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarsList } from '@/components/webinars/WebinarsList';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw, AlertTriangle, ArrowLeft, ExternalLink, Settings } from 'lucide-react';
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
                            errorMessage.includes('Failed to generate') ||
                            errorMessage.includes('authentication') ||
                            errorMessage.includes('Account ID');
  
  const isCapabilitiesError = errorMessage.includes('capabilities');
  
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
                  <li>Verify the format of your Zoom Account ID: <code className="px-1 py-0.5 bg-destructive/10 rounded">{"[REDACTED]"}</code> - should be a string like "abc123DEF456ghi789JKL"</li>
                  <li>Make sure your Zoom Server-to-Server OAuth app is published in the Zoom Marketplace</li>
                  <li>Ensure your Zoom app has the <code className="px-1 py-0.5 bg-destructive/10 rounded">webinar:read</code> and <code className="px-1 py-0.5 bg-destructive/10 rounded">webinar:write</code> scopes</li>
                  <li>Check that your Client ID and Client Secret match what's shown in your Zoom app</li>
                </ol>
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <a 
                    href="https://marketplace.zoom.us/develop/apps" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    Go to Zoom Marketplace Developer Settings <ExternalLink className="h-3 w-3" />
                  </a>
                  <a 
                    href="https://supabase.com/dashboard/project/dcvlxtkxqyaznxxvkynd/settings/functions" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    Configure Supabase Edge Function Secrets <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </AlertDescription>
            ) : isCapabilitiesError ? (
              <AlertDescription className="mt-2">
                <p className="font-semibold">Your Zoom account does not have webinar capabilities:</p>
                <ol className="list-decimal ml-5 mt-1 space-y-1">
                  <li>Webinar functionality requires a Zoom paid plan that includes webinars</li>
                  <li>Verify your Zoom account type and enabled features</li>
                  <li>Contact Zoom support if you believe you should have webinar access</li>
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
