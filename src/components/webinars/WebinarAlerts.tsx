
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WebinarAlertsProps {
  credentialsStatus: {
    hasCredentials: boolean;
    isVerified: boolean;
  } | null;
  verified: boolean;
  showWizard: boolean;
  onSetupZoom: () => void;
  onDismissError?: () => void;
  errorBannerDismissed?: boolean;
}

export const WebinarAlerts: React.FC<WebinarAlertsProps> = ({
  credentialsStatus,
  verified,
  showWizard,
  onSetupZoom,
  onDismissError,
  errorBannerDismissed = false
}) => {
  if (!credentialsStatus) return null;
  
  // Only show the alert when credentials are missing, the wizard is not open,
  // and the user hasn't dismissed the error banner
  if (credentialsStatus.hasCredentials || showWizard || errorBannerDismissed) return null;

  // Use a more subtle alert style
  return (
    <Alert className="bg-blue-50 border-blue-200 mb-4 max-w-2xl mx-auto relative">
      {onDismissError && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDismissError} 
          className="absolute right-2 top-2 p-0 h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
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
