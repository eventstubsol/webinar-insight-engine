import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { WebinarDistributionChart } from '@/components/dashboard/WebinarDistributionChart';
import { RegistrationAttendanceChart } from '@/components/dashboard/RegistrationAttendanceChart';
import { RecentWebinars } from '@/components/dashboard/RecentWebinars';
import { UpcomingWebinars } from '@/components/dashboard/UpcomingWebinars';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ZoomIntegrationWizard } from '@/components/webinars/ZoomIntegrationWizard';
import { useZoomCredentials } from '@/hooks/zoom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ArrowRight, Loader2, WifiOff } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/zoom';
import { calculateWebinarStats } from '@/components/dashboard/charts/RegistrationAttendanceUtils';
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  
  const { 
    credentialsStatus, 
    checkCredentialsStatus, 
    isLoading: credentialsLoading,
    error: credentialsError
  } = useZoomCredentials();
  
  const { 
    refreshWebinars, 
    isRefetching, 
    webinars, 
    error: webinarsError 
  } = useZoomWebinars();
  
  const hasZoomCredentials = credentialsStatus?.hasCredentials;

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => {
      setNetworkStatus('offline');
      toast({
        title: "Network connection lost",
        description: "You're currently offline. Some features may be unavailable.",
        variant: "destructive"
      });
    };

    // Set initial status
    setNetworkStatus(navigator.onLine ? 'online' : 'offline');

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Calculate webinar stats for the registration & attendance chart using monthly data
  const registrationAttendanceData = React.useMemo(() => {
    return calculateWebinarStats(webinars, isRefetching);
  }, [webinars, isRefetching]);
  
  const handleConnectZoom = () => {
    if (networkStatus === 'offline') {
      toast({
        title: "Network Unavailable",
        description: "You're currently offline. Please check your internet connection to set up Zoom integration.",
        variant: "destructive"
      });
      return;
    }
    setShowWizard(true);
  };
  
  const handleWizardComplete = async () => {
    setShowWizard(false);
    // Re-check credentials status
    try {
      await checkCredentialsStatus();
    } catch (error) {
      console.error("Failed to check credentials status:", error);
      toast({
        title: "Connection Error",
        description: "Could not verify Zoom credentials. Please try again later.",
        variant: "destructive"
      });
    }
  };

  // Show error states if there are issues with the APIs
  const renderApiErrors = () => {
    if (credentialsError || webinarsError) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            {credentialsError || webinarsError || "There was an error connecting to the server. Please try again later."}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (networkStatus === 'offline') {
      return (
        <Alert variant="destructive" className="mb-4">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Network Connection Unavailable</AlertTitle>
          <AlertDescription>
            You're currently offline. Some features may be unavailable until your internet connection is restored.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };

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
              {/* Buttons removed here */}
            </div>
          )}
        </div>

        {/* Show API errors if any */}
        {renderApiErrors()}

        {/* Show loading indicator while checking credentials */}
        {credentialsLoading && (
          <div className="flex items-center justify-center h-12 my-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Checking Zoom integration...</span>
          </div>
        )}

        {/* Show Zoom setup banner for new users without credentials */}
        {!credentialsLoading && !hasZoomCredentials && (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Set up your Zoom integration</AlertTitle>
            <AlertDescription className="text-blue-700">
              <p>Connect your Zoom account to start tracking your webinar analytics.</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <Button 
                  onClick={handleConnectZoom} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={networkStatus === 'offline'}
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

        {/* Zoom Integration Wizard Dialog */}
        <Dialog 
          open={showWizard} 
          onOpenChange={(open) => {
            if (!open) setShowWizard(false);
          }}
        >
          <DialogContent className="max-w-4xl p-0">
            <DialogTitle className="sr-only">Zoom Integration Setup</DialogTitle>
            <ZoomIntegrationWizard 
              onComplete={handleWizardComplete}
              onCancel={() => setShowWizard(false)}
            />
          </DialogContent>
        </Dialog>

        <div className="grid gap-6">
          <DashboardStats />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WebinarDistributionChart />
            <RegistrationAttendanceChart 
              data={registrationAttendanceData} 
              isLoading={isRefetching}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UpcomingWebinars />
            <RecentWebinars />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;