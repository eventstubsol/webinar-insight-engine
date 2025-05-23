
import React from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { VerificationDetails } from './types';

interface SuccessStepProps {
  onComplete: () => void;
  verificationDetails: VerificationDetails | null;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({
  onComplete,
  verificationDetails
}) => {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto p-3 bg-green-50 rounded-full w-16 h-16 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
      </div>
      
      <h3 className="text-xl font-medium">Zoom Integration Successful!</h3>
      
      <Alert variant="success" className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Connection Established</AlertTitle>
        <AlertDescription className="text-green-700">
          {verificationDetails?.user_email ? 
            `Successfully connected as ${verificationDetails.user_email}` :
            verificationDetails?.user?.email ?
            `Successfully connected as ${verificationDetails.user.email}` :
            'Your Zoom account has been successfully connected'}
        </AlertDescription>
      </Alert>
      
      <p className="text-muted-foreground">
        You can now access and manage your Zoom webinars through ZoomLytics
      </p>
      
      <Button onClick={onComplete} className="mt-2">
        Start Using ZoomLytics
      </Button>
    </div>
  );
};
