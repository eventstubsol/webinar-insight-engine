
import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { WebinarsList } from '@/components/webinars/WebinarsList';
import { WebinarFilters } from '@/components/webinars/WebinarFilters';
import { WebinarHeader } from '@/components/webinars/WebinarHeader';
import { WebinarError } from '@/components/webinars/WebinarError';
import { WebinarSetupGuide } from '@/components/webinars/WebinarSetupGuide';
import { ZoomIntegrationWizard } from '@/components/webinars/ZoomIntegrationWizard';
import { useZoomWebinars, useZoomCredentials, useZoomCredentialsVerification } from '@/hooks/zoom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
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
import { 
  ToggleGroup, 
  ToggleGroupItem 
} from "@/components/ui/toggle-group";
import { CheckCircle2, Clock, Info, Grid, List } from 'lucide-react';
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
  
  // New state variables for the UI redesign
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'upcoming', 'past', 'drafts'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  
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
  
  // Fixed return type to void to match expected type
  const handleWizardComplete = async () => {
    setShowWizard(false);
    // Re-check credentials status
    await checkCredentialsStatus();
    // Refresh webinars
    await refreshWebinars();
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
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>All Webinars</CardTitle>
                      <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'list' | 'grid')}>
                        <ToggleGroupItem value="list" aria-label="List view">
                          <List className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="grid" aria-label="Grid view">
                          <Grid className="h-4 w-4" />
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <CardDescription>Manage and view all your Zoom webinar sessions</CardDescription>
                    
                    {/* Webinar Type Tabs */}
                    <Tabs value={filterTab} onValueChange={setFilterTab} className="mt-6">
                      <TabsList className="mb-4">
                        <TabsTrigger value="all">All Webinars</TabsTrigger>
                        <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                        <TabsTrigger value="past">Past</TabsTrigger>
                        <TabsTrigger value="drafts">Drafts</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    
                    {/* Search and Filter */}
                    <div className="mt-4">
                      <WebinarFilters 
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onDateFilterChange={setDateFilter}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <WebinarsList 
                      webinars={webinars} 
                      isLoading={isLoading || isFirstLoad} 
                      error={error}
                      viewMode={viewMode}
                      filterTab={filterTab}
                    />
                  </CardContent>
                </Card>
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
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Webinars</CardTitle>
                <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'list' | 'grid')}>
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <Grid className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <CardDescription>Manage and view all your Zoom webinar sessions</CardDescription>
              
              {/* Webinar Type Tabs */}
              <Tabs value={filterTab} onValueChange={setFilterTab} className="mt-6">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Webinars</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="past">Past</TabsTrigger>
                  <TabsTrigger value="drafts">Drafts</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Search and Filter */}
              <div className="mt-4">
                <WebinarFilters 
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onDateFilterChange={setDateFilter}
                />
              </div>
            </CardHeader>
            <CardContent>
              <WebinarsList 
                webinars={webinars} 
                isLoading={isLoading || isFirstLoad} 
                error={error}
                viewMode={viewMode}
                filterTab={filterTab}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Webinars;
