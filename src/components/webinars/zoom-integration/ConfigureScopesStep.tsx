
import React from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronLeft, ChevronRight, AlertTriangle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConfigureScopesStepProps {
  onNext: () => void;
  onBack: () => void;
  scopesError: boolean;
}

export const ConfigureScopesStep: React.FC<ConfigureScopesStepProps> = ({
  onNext,
  onBack,
  scopesError
}) => {
  const { toast } = useToast();
  
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `${label} Copied`,
        description: `${label} has been copied to your clipboard.`
      });
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Step 2: Configure App Scopes</h3>
      
      {scopesError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing Required Scopes</AlertTitle>
          <AlertDescription>
            The Zoom app you configured is missing required OAuth scopes. Please make sure to add ALL of the scopes listed below.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="rounded-md border p-4 bg-amber-50 border-amber-200">
        <h4 className="font-medium text-amber-800 mb-2">Required Scopes</h4>
        <p className="text-amber-700 text-sm mb-3">
          In the Scopes section, click "Add Scopes" and add the following scopes:
        </p>
        
        <div className="space-y-2">
          <div className="bg-white border border-amber-200 rounded-md p-2 flex justify-between items-center">
            <code className="text-sm font-mono">user:read:user:admin</code>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleCopyToClipboard("user:read:user:admin", "Scope")}
              className="h-7 px-2"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="bg-white border border-amber-200 rounded-md p-2 flex justify-between items-center">
            <code className="text-sm font-mono">user:read:user:master</code>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleCopyToClipboard("user:read:user:master", "Scope")}
              className="h-7 px-2"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="bg-white border border-amber-200 rounded-md p-2 flex justify-between items-center">
            <code className="text-sm font-mono">webinar:read:webinar:admin</code>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleCopyToClipboard("webinar:read:webinar:admin", "Scope")}
              className="h-7 px-2"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="bg-white border border-amber-200 rounded-md p-2 flex justify-between items-center">
            <code className="text-sm font-mono">webinar:write:webinar:admin</code>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleCopyToClipboard("webinar:write:webinar:admin", "Scope")}
              className="h-7 px-2"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        <div className="mt-4">
          <img 
            src="https://i.imgur.com/5oJ5MGt.png" 
            alt="Configure App Scopes" 
            className="rounded-md max-w-full h-auto border"
          />
        </div>
      </div>
      
      <Alert>
        <AlertTitle>After Adding Scopes</AlertTitle>
        <AlertDescription>
          After adding the required scopes, continue through the app creation process. You'll need to complete all required fields to activate your app.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="mt-4 sm:mt-0">
          Continue to Credentials
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
