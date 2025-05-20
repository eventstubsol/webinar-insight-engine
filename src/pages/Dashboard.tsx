
import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { RecentWebinars } from '@/components/dashboard/RecentWebinars';
import { WebinarMetrics } from '@/components/dashboard/WebinarMetrics';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ZoomIntegrationWizard } from '@/components/webinars/ZoomIntegrationWizard';
import { useZoomCredentials } from '@/hooks/zoom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const { credentialsStatus, checkCredentialsStatus } = useZoomCredentials();
  
  const hasZoomCredentials = credentialsStatus?.hasCredentials;
  
  const handleConnectZoom = () => {
    setShowWizard(true);
  };
  
  const handleWizardComplete = async () => {
    setShowWizard(false);
    // Re-check credentials status
    await checkCredentialsStatus();
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's an overview of your analytics.</p>
          </div>
        </div>

        {/* Show Zoom setup banner for new users without credentials */}
        {!hasZoomCredentials && (
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
            <AttendanceChart />
            <WebinarMetrics />
          </div>
          
          <RecentWebinars />
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
