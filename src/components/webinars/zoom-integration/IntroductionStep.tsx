
import React from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronRight, Check, Info } from "lucide-react";

interface IntroductionStepProps {
  onNext: () => void;
  onCancel?: () => void;
  hasCredentials: boolean;
}

export const IntroductionStep: React.FC<IntroductionStepProps> = ({
  onNext,
  onCancel,
  hasCredentials
}) => {
  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-700" />
        <AlertTitle className="text-blue-800">Setting Up Zoom Integration</AlertTitle>
        <AlertDescription className="text-blue-700">
          <p>This wizard will guide you through connecting your Zoom account to ZoomLytics.</p>
          <p className="mt-2">You'll need to create a Server-to-Server OAuth app in the Zoom Marketplace to integrate with your Zoom account.</p>
        </AlertDescription>
      </Alert>

      <div className="rounded-md border p-4">
        <h3 className="font-medium text-lg mb-2">What you'll need:</h3>
        <ul className="space-y-2">
          <li className="flex items-start">
            <Check className="h-5 w-5 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
            <span>A Zoom account with admin privileges</span>
          </li>
          <li className="flex items-start">
            <Check className="h-5 w-5 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Access to create apps in Zoom Marketplace (most Zoom accounts have this capability)</span>
          </li>
          <li className="flex items-start">
            <Check className="h-5 w-5 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
            <span>For webinar features: A Zoom account with webinar capabilities (usually requires a paid plan)</span>
          </li>
        </ul>
      </div>

      {hasCredentials && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>You already have credentials saved</AlertTitle>
          <AlertDescription>
            We found your previously saved Zoom credentials. You can proceed to verify them or edit if needed.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Completely Secure</AlertTitle>
        <AlertDescription>
          Your Zoom credentials are securely stored in our database and are only accessible by you. We never share your credentials with third parties.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={onNext} className="mt-4 sm:mt-0">
          Let's Get Started
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
