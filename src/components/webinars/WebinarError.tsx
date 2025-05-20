
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface WebinarErrorProps {
  errorMessage: string;
  errorDetails: {
    isMissingCredentials: boolean;
    isCapabilitiesError: boolean;
    isScopesError: boolean;
    missingSecrets: string[];
  };
  onSetupClick: () => void;
}

export const WebinarError: React.FC<WebinarErrorProps> = ({
  errorMessage,
  errorDetails,
  onSetupClick,
}) => {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Zoom API {errorDetails.isMissingCredentials ? 'Connection Required' : 'Error'}</AlertTitle>
      <AlertDescription>
        {errorMessage}
      </AlertDescription>
      {errorDetails.isMissingCredentials ? (
        <AlertDescription className="mt-2">
          <p className="font-semibold">Required configuration:</p>
          <ol className="list-decimal ml-5 mt-1 space-y-1">
            {errorDetails.isScopesError ? (
              <li className="text-amber-800">Update your Zoom Server-to-Server OAuth app to include required scopes</li>
            ) : (
              <li>Create a Server-to-Server OAuth app in the Zoom Marketplace with the proper scopes</li>
            )}
            <li>Add your Zoom API credentials to Supabase Edge Function secrets</li>
            <li>Make sure your Zoom account has webinar capabilities (requires a paid plan)</li>
          </ol>
          <Button variant="outline" onClick={onSetupClick} className="mt-2">
            <Settings className="h-4 w-4 mr-2" />
            View Setup Instructions
          </Button>
        </AlertDescription>
      ) : errorDetails.isCapabilitiesError ? (
        <AlertDescription className="mt-2">
          <p className="font-semibold">Your Zoom account does not have webinar capabilities:</p>
          <ol className="list-decimal ml-5 mt-1 space-y-1">
            <li>Webinar functionality requires a Zoom paid plan that includes webinars</li>
            <li>Verify your Zoom account type and enabled features</li>
            <li>Contact Zoom support if you believe you should have webinar access</li>
          </ol>
        </AlertDescription>
      ) : errorDetails.isScopesError ? (
        <AlertDescription className="mt-2">
          <p className="font-semibold">Missing required OAuth scopes:</p>
          <ol className="list-decimal ml-5 mt-1 space-y-1">
            <li>Your Zoom Server-to-Server OAuth app is missing required scopes</li>
            <li>Make sure you add <strong>ALL</strong> of these scopes to your Zoom app:</li>
            <ul className="list-disc ml-5 mt-1 space-y-1 text-amber-800">
              <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">user:read:user:admin</code></li>
              <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">user:read:user</code></li>
              <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">webinar:read:admin</code></li>
              <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">webinar:write:admin</code></li>
            </ul>
            <li>Save changes and re-activate your app</li>
            <li>Return to the Setup tab to verify your credentials</li>
          </ol>
          <Button variant="outline" onClick={onSetupClick} className="mt-2">
            <Settings className="h-4 w-4 mr-2" />
            View Setup Instructions
          </Button>
        </AlertDescription>
      ) : (
        <AlertDescription className="mt-2 text-xs">
          Make sure your Zoom API credentials are properly configured in Supabase Edge Functions 
          and your Zoom account has webinar capabilities enabled.
        </AlertDescription>
      )}
    </Alert>
  );
};
