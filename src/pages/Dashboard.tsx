
import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { WebinarDistributionChart } from '@/components/dashboard/WebinarDistributionChart';
import { RegistrationAttendanceChart } from '@/components/dashboard/RegistrationAttendanceChart';
import { RecentWebinars } from '@/components/dashboard/RecentWebinars';
import { UpcomingWebinars } from '@/components/dashboard/UpcomingWebinars';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ZoomIntegrationWizard } from '@/components/webinars/ZoomIntegrationWizard';
import { useZoomCredentials } from '@/hooks/zoom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useZoomWebinars } from '@/hooks/zoom';
import { calculateWebinarStats } from '@/components/dashboard/charts/RegistrationAttendanceUtils';
import { needsSync } from '@/components/dashboard/utils/statsUtils';

const Dashboard = () => {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const { credentialsStatus, checkCredentialsStatus, isLoading: credentialsLoading } = useZoomCredentials();
  const { refreshWebinars, isRefetching, webinars, lastSyncTime } = useZoomWebinars();
  
  const hasZoomCredentials = credentialsStatus?.hasCredentials;
  const shouldSync = needsSync(webinars, lastSyncTime);

  // Calculate webinar stats for the registration & attendance chart using monthly data
  const registrationAttendanceData = React.useMemo(() => {
    return calculateWebinarStats(webinars, isRefetching);
  }, [webinars, isRefetching]);
  
  const handleConnectZoom = () => {
    setShowWizard(true);
  };
  
  const handleWizardComplete = async () => {
    setShowWizard(false);
    await checkCredentialsStatus();
  };

  const handleSyncData = async () => {
    try {
      await refreshWebinars(true);
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's an overview of your webinars.</p>
          </div>
          
          {hasZoomCredentials && shouldSync && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSyncData}
                disabled={isRefetching}
                variant="outline"
                size="sm"
              >
                {isRefetching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Data
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Show loading indicator while checking credentials */}
        {credentialsLoading && (
          <div className="flex items-center justify-center h-12 my-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Checking Zoom integration...</span>
          </div>
        )}

        {/* Only show Zoom setup banner for users without credentials */}
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
        <Dialog open={showWizard} onOpenChange={setShowWizard}>
          <DialogContent className="max-w-4xl p-0">
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
