
import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarsList } from '@/components/webinars/WebinarsList';
import { WebinarHeader } from '@/components/webinars/WebinarHeader';
import { WebinarError } from '@/components/webinars/WebinarError';
import { WebinarSetupGuide } from '@/components/webinars/WebinarSetupGuide';
import { useZoomWebinars, useZoomCredentialsVerification } from '@/hooks/useZoomApi';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

const Webinars = () => {
  const { webinars, isLoading, isRefetching, error, errorDetails, refreshWebinars } = useZoomWebinars();
  const { verifyCredentials, isVerifying, verified, scopesError, verificationDetails } = useZoomCredentialsVerification();
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("webinars");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { toast } = useToast();
  
  // Memoize the refresh function to prevent unnecessary recreations
  const handleAutoRefresh = useCallback(async () => {
    if (!error) {
      try {
        await refreshWebinars();
        setLastSyncTime(new Date());
        // Silent toast for background refreshes
        toast({
          title: 'Webinars synced',
          description: 'Webinar data has been updated from Zoom',
          variant: 'default'
        });
      } catch (err) {
        console.error('Auto-refresh failed:', err);
        // Only show error toast for auto-refresh failures if it's a new error
        toast({
          title: 'Sync failed',
          description: 'Could not automatically refresh webinar data',
          variant: 'destructive'
        });
      }
    }
  }, [refreshWebinars, error, toast]);

  // Set up automatic refresh on mount and when dependencies change
  useEffect(() => {
    // Skip auto-refresh if there are credential errors
    if (errorDetails.isMissingCredentials || errorDetails.isScopesError || scopesError) {
      return;
    }

    // Initial refresh on mount if not loading
    if (!isLoading && !isRefetching && !error && !lastSyncTime) {
      handleAutoRefresh();
    }

    // Set up interval for periodic refreshes
    const intervalId = setInterval(() => {
      handleAutoRefresh();
    }, AUTO_REFRESH_INTERVAL);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [handleAutoRefresh, isLoading, isRefetching, error, lastSyncTime, errorDetails, scopesError]);
  
  useEffect(() => {
    // Track if data has been loaded at least once
    if (!isLoading && isFirstLoad) {
      setIsFirstLoad(false);
    }

    // If we have credential errors or scope errors, automatically switch to the setup tab
    if ((error && (errorDetails.isMissingCredentials || errorDetails.isScopesError)) && activeTab !== "setup") {
      setActiveTab("setup");
    }
    
    // Update last sync time when data is successfully loaded
    if (!isLoading && !isRefetching && !error && webinars.length > 0) {
      setLastSyncTime(new Date());
    }
  }, [isLoading, error, errorDetails, activeTab, isRefetching, webinars, isFirstLoad]);
  
  const errorMessage = error?.message || 'An error occurred while connecting to the Zoom API';
  
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <WebinarHeader 
          errorDetails={errorDetails}
          isRefetching={isRefetching}
          isLoading={isLoading}
          refreshWebinars={refreshWebinars}
          lastSyncTime={lastSyncTime}
        />

        {errorDetails.isMissingCredentials || errorDetails.isScopesError || error ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="webinars">Webinars</TabsTrigger>
              <TabsTrigger value="setup">API Setup</TabsTrigger>
            </TabsList>
            <TabsContent value="webinars">
              <WebinarError 
                errorMessage={errorMessage}
                errorDetails={errorDetails}
                onSetupClick={() => setActiveTab("setup")}
              />
              <div className="grid gap-6 mt-4">
                <WebinarsList webinars={webinars} isLoading={isLoading || isFirstLoad} error={error} />
              </div>
            </TabsContent>
            <TabsContent value="setup">
              <WebinarSetupGuide 
                scopesError={scopesError}
                verifyCredentials={verifyCredentials}
                isVerifying={isVerifying}
                verified={verified}
                verificationDetails={verificationDetails}
              />
              {verified && (
                <div className="flex justify-center mt-4">
                  <Button onClick={() => setActiveTab("webinars")} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    View Your Webinars
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : error ? (
          <>
            <WebinarError 
              errorMessage={errorMessage}
              errorDetails={errorDetails}
              onSetupClick={() => {}}
            />
            <div className="grid gap-6">
              <WebinarsList webinars={webinars} isLoading={isLoading || isFirstLoad} error={error} />
            </div>
          </>
        ) : (
          <div className="grid gap-6">
            <WebinarsList webinars={webinars} isLoading={isLoading || isFirstLoad} error={error} />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Webinars;
