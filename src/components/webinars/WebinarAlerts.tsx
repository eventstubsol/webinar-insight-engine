
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
  
  // Only show the alert when credentials are missing and the wizard is not open
  if (credentialsStatus.hasCredentials || showWizard) return null;

  // Use a more subtle alert style
  return (
    <Alert className="bg-blue-50 border-blue-200 mb-4 max-w-2xl mx-auto">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800 text-sm">Connect Zoom Account</AlertTitle>
      <AlertDescription className="text-blue-700 text-xs">
        <Button 
          onClick={onSetupZoom} 
          size="sm"
          className="mt-1 bg-blue-600 hover:bg-blue-700"
        >
          Connect Zoom
        </Button>
      </AlertDescription>
    </Alert>
  );
};
