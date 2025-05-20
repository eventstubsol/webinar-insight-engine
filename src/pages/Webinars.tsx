
import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarsList } from '@/components/webinars/WebinarsList';
import { WebinarHeader } from '@/components/webinars/WebinarHeader';
import { WebinarError } from '@/components/webinars/WebinarError';
import { WebinarSetupGuide } from '@/components/webinars/WebinarSetupGuide';
import { ZoomIntegrationWizard } from '@/components/webinars/ZoomIntegrationWizard';
import { useZoomWebinars, useZoomCredentials, useZoomCredentialsVerification } from '@/hooks/useZoomApi';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

const Webinars = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { webinars, isLoading, isRefetching, error, errorDetails, refreshWebinars, lastSyncTime, credentialsStatus } = useZoomWebinars();
  const { verifyCredentials, isVerifying, verified, scopesError, verificationDetails } = useZoomCredentialsVerification();
  const { checkCredentialsStatus } = useZoomCredentials();
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("webinars");
  const [showWizard, setShowWizard] = useState(false);
  
  // Memoize the refresh function to prevent unnecessary recreations
  const handleAutoRefresh = useCallback(async () => {
    if (!error && credentialsStatus?.hasCredentials) {
      try {
        await refreshWebinars();
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
  }, [refreshWebinars, error, toast, credentialsStatus]);

  // Check if this is the first login and open wizard if needed
  useEffect(() => {
    if (user && !isLoading && credentialsStatus !== undefined) {
      // If user is logged in and we've checked their credentials status
      if (!credentialsStatus?.hasCredentials) {
        // If they don't have credentials, show the wizard
        setShowWizard(true);
      }
    }
  }, [user, credentialsStatus, isLoading]);

  // Set up automatic refresh on mount and when dependencies change
  useEffect(() => {
    // Skip auto-refresh if there are credential errors
    if (!credentialsStatus?.hasCredentials || errorDetails.isScopesError || scopesError) {
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
  }, [handleAutoRefresh, isLoading, isRefetching, error, lastSyncTime, errorDetails, scopesError, credentialsStatus]);
  
  useEffect(() => {
    // Track if data has been loaded at least once
    if (!isLoading && isFirstLoad) {
      setIsFirstLoad(false);
    }

    // If we have credential errors or scope errors, automatically switch to the setup tab
    if ((error && (errorDetails.isMissingCredentials || errorDetails.isScopesError)) && activeTab !== "setup") {
      setActiveTab("setup");
    }
  }, [isLoading, error, errorDetails, activeTab, isRefetching, webinars, isFirstLoad]);
  
  const handleSetupZoom = () => {
    setShowWizard(true);
  };
  
  const handleWizardComplete = async () => {
    setShowWizard(false);
    // Re-check credentials status
    await checkCredentialsStatus();
    // Refresh webinars
    refreshWebinars();
    // Switch to webinars tab
    setActiveTab("webinars");
  };
  
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
          onSetupZoom={handleSetupZoom}
          credentialsStatus={credentialsStatus}
        />

        {/* Zoom Integration Wizard Dialog */}
        <Dialog open={showWizard} onOpenChange={setShowWizard}>
          <DialogContent className="max-w-4xl p-0">
            <ZoomIntegrationWizard 
              onComplete={handleWizardComplete}
              onCancel={() => setShowWizard(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Show First Time Setup Alert when no credentials exist but wizard is closed */}
        {credentialsStatus && !credentialsStatus.hasCredentials && !showWizard && (
          <Alert className="bg-blue-50 border-blue-200 mb-4">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Connect Your Zoom Account</AlertTitle>
            <AlertDescription className="text-blue-700">
              <p>You need to connect your Zoom account to view your webinars.</p>
              <Button 
                onClick={handleSetupZoom} 
                className="mt-2 bg-blue-600 hover:bg-blue-700"
              >
                Connect Zoom Account
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Show credential verification success message */}
        {credentialsStatus?.hasCredentials && credentialsStatus.isVerified && verified && (
          <Alert className="bg-green-50 border-green-200 mb-4">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Zoom Account Connected</AlertTitle>
            <AlertDescription className="text-green-700">
              Your Zoom account is successfully connected. You can now manage and analyze your webinars.
            </AlertDescription>
          </Alert>
        )}

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
