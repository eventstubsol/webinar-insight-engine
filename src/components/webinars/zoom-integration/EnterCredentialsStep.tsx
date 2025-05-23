
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronLeft, Info, AlertTriangle, RefreshCw, ChevronRight, Loader2 } from "lucide-react";
import { ZoomCredentials } from './types';

interface EnterCredentialsStepProps {
  onVerify: () => void;
  onBack: () => void;
  credentials: ZoomCredentials;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  isSubmitting: boolean;
  isLoadingCredentials: boolean;
}

export const EnterCredentialsStep: React.FC<EnterCredentialsStepProps> = ({
  onVerify,
  onBack,
  credentials,
  onChange,
  error,
  isSubmitting,
  isLoadingCredentials
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Step 3: Enter Your Zoom API Credentials</h3>
      
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-700" />
        <AlertTitle className="text-blue-800">Where to Find Your Credentials</AlertTitle>
        <AlertDescription className="text-blue-700">
          <p>Once your app is created and activated, you can find your credentials on the app detail page:</p>
          <ul className="list-disc ml-5 mt-1">
            <li>Account ID is found on your Zoom account profile page</li>
            <li>Client ID and Client Secret are on your app's credentials tab</li>
          </ul>
        </AlertDescription>
      </Alert>

      {isLoadingCredentials && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span>Loading saved credentials...</span>
        </div>
      )}

      <div className="rounded-md border p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="account_id">Zoom Account ID</Label>
          <Input
            id="account_id"
            name="account_id"
            placeholder="Enter your Zoom Account ID"
            value={credentials.account_id}
            onChange={onChange}
          />
          <p className="text-xs text-muted-foreground">
            Found on your Zoom Account Profile page
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="client_id">Client ID</Label>
          <Input
            id="client_id"
            name="client_id"
            placeholder="Enter your Client ID"
            value={credentials.client_id}
            onChange={onChange}
          />
          <p className="text-xs text-muted-foreground">
            Found on your app's Credentials tab in Zoom Marketplace
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="client_secret">Client Secret</Label>
          <Input
            id="client_secret"
            name="client_secret"
            type="password"
            placeholder="Enter your Client Secret"
            value={credentials.client_secret}
            onChange={onChange}
          />
          <p className="text-xs text-muted-foreground">
            Found on your app's Credentials tab in Zoom Marketplace
          </p>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={onVerify} 
          className="mt-4 sm:mt-0"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              Verify & Save
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
