
import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { WebinarDistributionChart } from '@/components/dashboard/WebinarDistributionChart';
import { RegistrationAttendanceAreaChart } from '@/components/dashboard/RegistrationAttendanceAreaChart';
import { RecentWebinars } from '@/components/dashboard/RecentWebinars';
import { UpcomingWebinars } from '@/components/dashboard/UpcomingWebinars';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ZoomIntegrationWizard } from '@/components/webinars/ZoomIntegrationWizard';
import { useZoomCredentials, useZoomWebinars } from '@/hooks/zoom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ArrowRight, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { credentialsStatus, checkCredentialsStatus, isLoading: credentialsLoading, error: credentialsError } = useZoomCredentials();
  const { refreshWebinars, isRefetching, webinars, error: webinarsError, isLoading: webinarsLoading } = useZoomWebinars();
  
  const hasZoomCredentials = credentialsStatus?.hasCredentials;
  const isVerified = credentialsStatus?.isVerified;
  const isLoading = credentialsLoading || webinarsLoading;
  const anyError = credentialsError || webinarsError;
  
  // Effect to check if data is available on mount
  useEffect(() => {
    if (hasZoomCredentials && !webinars.length && !webinarsLoading && !webinarsError && !isRefetching) {
      console.log("Dashboard: No webinars data found, triggering refresh");
      refreshWebinars(true).catch(err => {
        console.error("Error refreshing webinars:", err);
      });
    }
  }, [hasZoomCredentials, webinars.length, webinarsLoading, webinarsError, isRefetching, refreshWebinars]);

  const handleConnectZoom = () => {
    setShowWizard(true);
  };
  
  const handleWizardComplete = async () => {
    setShowWizard(false);
    
    // Re-check credentials status
    await checkCredentialsStatus();
    
    // Force refresh webinars data
    try {
      await refreshWebinars(true);
      toast({
        title: "Data synchronized",
        description: "Your Zoom webinar data has been synchronized successfully."
      });
    } catch (error: any) {
      console.error("Error refreshing webinars after wizard completion:", error);
      toast({
        title: "Sync error",
        description: error.message || "Failed to sync your Zoom webinar data.",
        variant: "destructive"
      });
    }
  };

  const handleRefreshData = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      toast({
        title: "Refreshing data",
        description: "We're fetching the latest data from Zoom..."
      });
      
      await refreshWebinars(true);
      
      toast({
        title: "Data refreshed",
        description: "Your dashboard has been updated with the latest data."
      });
    } catch (error: any) {
      toast({
        title: "Refresh failed",
        description: error.message || "Failed to refresh dashboard data.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Debug info for development
  console.log("Dashboard render:", {
    hasCredentials: hasZoomCredentials,
    isVerified,
    webiarsCount: webinars.length,
    isLoading,
    isRefetching,
    anyError: !!anyError
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's an overview of your webinars.</p>
          </div>
          
          {hasZoomCredentials && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1" 
                onClick={handleRefreshData}
                disabled={isRefreshing || isRefetching}
              >
                {(isRefreshing || isRefetching) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh Data
              </Button>
            </div>
          )}
        </div>

        {/* Show loading indicator while checking credentials */}
        {isLoading && (
          <div className="flex items-center justify-center h-12 my-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
          </div>
        )}

        {/* Show error banner if there's any error */}
        {anyError && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading dashboard</AlertTitle>
            <AlertDescription>
              {anyError.message || "We encountered a problem loading your dashboard data."}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshData}
                  className="bg-destructive/10"
                >
                  Retry
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleConnectZoom}
                  className="bg-destructive/10"
                >
                  Verify Zoom Connection
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Show Zoom setup banner for new users without credentials */}
        {!isLoading && !hasZoomCredentials && !anyError && (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Set up your Zoom integration</AlertTitle>
            <AlertDescription className="text-blue-700">
              <p>Connect your Zoom account to start tracking your webinar analytics.</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <Button 
                  onClick={handleConnectZoom} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Set Up Zoom Integration
                </Button>
                <Button 
                  variant="outline" 
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => navigate('/webinars')}
                >
                  Go to Webinars <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Show verification message if credentials exist but aren't verified */}
        {!isLoading && hasZoomCredentials && !isVerified && !anyError && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Zoom credentials need verification</AlertTitle>
            <AlertDescription className="text-yellow-700">
              <p>Your Zoom credentials need to be verified before we can display your webinar data.</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <Button 
                  onClick={handleConnectZoom} 
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Verify Credentials
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Zoom Integration Wizard Dialog */}
        <Dialog open={showWizard} onOpenChange={setShowWizard}>
          <DialogContent className="max-w-4xl p-0">
            <ZoomIntegrationWizard 
              onComplete={handleWizardComplete}
              onCancel={() => setShowWizard(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Empty state when verified but no webinars */}
        {!isLoading && hasZoomCredentials && isVerified && webinars.length === 0 && !anyError && (
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle>No webinar data found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">We couldn't find any webinar data in your Zoom account.</p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleRefreshData} disabled={isRefreshing || isRefetching}>
                  {(isRefreshing || isRefetching) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>Refresh Data</>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/webinars')}
                >
                  Go to Webinars
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show dashboard content when everything is good */}
        {(!isLoading || webinars.length > 0) && hasZoomCredentials && !anyError && (
          <div className="grid gap-6">
            <DashboardStats isRefreshing={isRefreshing || isRefetching} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WebinarDistributionChart isRefreshing={isRefreshing || isRefetching} />
              <RegistrationAttendanceAreaChart isRefreshing={isRefreshing || isRefetching} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UpcomingWebinars isRefreshing={isRefreshing || isRefetching} />
              <RecentWebinars isRefreshing={isRefreshing || isRefetching} />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
