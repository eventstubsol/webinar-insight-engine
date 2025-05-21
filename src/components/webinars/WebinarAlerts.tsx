
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WebinarAlertsProps {
  credentialsStatus: {
    hasCredentials: boolean;
    isVerified: boolean;
  } | null;
  verified: boolean;
  showWizard: boolean;
  onSetupZoom: () => void;
}

export const WebinarAlerts: React.FC<WebinarAlertsProps> = ({
  credentialsStatus,
  verified,
  showWizard,
  onSetupZoom
}) => {
  if (!credentialsStatus) return null;
  
  return (
    <>
      {/* Show First Time Setup Alert when no credentials exist but wizard is closed */}
      {credentialsStatus && !credentialsStatus.hasCredentials && !showWizard && (
        <Alert className="bg-blue-50 border-blue-200 mb-4">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Connect Your Zoom Account</AlertTitle>
          <AlertDescription className="text-blue-700">
            <p>You need to connect your Zoom account to view your webinars.</p>
            <Button 
              onClick={onSetupZoom} 
              className="mt-2 bg-blue-600 hover:bg-blue-700"
            >
              Connect Zoom Account
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Success banner removed - now showing in TopNav as a badge */}
    </>
  );
};
