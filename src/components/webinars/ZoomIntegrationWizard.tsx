import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  Settings 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/hooks/useAuth';

interface ZoomIntegrationWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

// Main steps of the wizard
enum WizardStep {
  Introduction = 0,
  CreateApp = 1,
  ConfigureScopes = 2,
  EnterCredentials = 3,
  VerifyConnection = 4,
  Success = 5
}

export const ZoomIntegrationWizard: React.FC<ZoomIntegrationWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.Introduction);
  const [credentials, setCredentials] = useState({
    account_id: '',
    client_id: '',
    client_secret: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopesError, setScopesError] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleChangeCredentials = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: `${label} Copied`,
        description: `${label} has been copied to your clipboard.`
      });
    });
  };

  const handleVerifyCredentials = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to verify credentials",
        variant: "destructive"
      });
      return;
    }

    if (!credentials.account_id || !credentials.client_id || !credentials.client_secret) {
      setError("All fields are required");
      return;
    }

    setError(null);
    setScopesError(false);
    setIsSubmitting(true);

    try {
      console.log('Verifying Zoom credentials...');
      
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'save-credentials',
          account_id: credentials.account_id,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to call Zoom API edge function');
      }

      if (data?.success) {
        setVerificationDetails(data);
        setCurrentStep(WizardStep.Success);
        toast({
          title: 'Zoom Integration Successful',
          description: `Connected as ${data.user_email || 'Zoom User'}`
        });
      } else {
        // Check if it's a scopes error
        if (data?.code === 'missing_scopes' || 
            data?.error?.toLowerCase().includes('scopes') || 
            data?.details?.code === 4711) {
          setScopesError(true);
          setCurrentStep(WizardStep.ConfigureScopes);
          throw new Error('Missing required OAuth scopes for Zoom integration');
        }
        
        throw new Error(data?.error || 'Verification failed');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      
      // Check for specific error types
      if (err.message?.includes('Failed to send a request') || 
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('NetworkError')) {
        
        // Network error - if within retry limit, we can try again
        if (retryCount < 2) {
          setRetryCount(prevCount => prevCount + 1);
          setError(`Network error. Retrying... (Attempt ${retryCount + 1}/3)`);
          
          // Wait 2 seconds and retry
          setTimeout(() => {
            handleVerifyCredentials();
          }, 2000);
          return;
        } else {
          setError('Network connection error. Please check your internet connection and try again later.');
        }
      } else if (err.message?.toLowerCase().includes('scopes') || 
                err.message?.toLowerCase().includes('scope') || 
                err.message?.toLowerCase().includes('4711')) {
        // Scopes error
        setScopesError(true);
        setCurrentStep(WizardStep.ConfigureScopes);
        setError('Your Zoom app is missing the required OAuth scopes. Please add all the required scopes.');
      } else {
        // General error
        setError(err.message || 'Failed to verify Zoom credentials');
      }
      
      toast({
        title: 'Verification Failed',
        description: err.message || 'Could not verify Zoom API credentials',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setCurrentStep(prev => prev + 1 as WizardStep);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1 as WizardStep);
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const renderIntroduction = () => (
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
        <Button onClick={handleNext} className="mt-4 sm:mt-0">
          Let's Get Started
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderCreateApp = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Step 1: Create a Server-to-Server OAuth App</h3>
      
      <ol className="space-y-4 list-decimal pl-5">
        <li>
          <div className="font-medium">Go to the Zoom App Marketplace</div>
          <p className="text-muted-foreground text-sm mt-1">
            Visit the Zoom App Marketplace and sign in with your Zoom account
          </p>
          <Button variant="outline" className="mt-2" asChild>
            <a href="https://marketplace.zoom.us/develop/create" target="_blank" rel="noopener noreferrer" className="flex items-center">
              Open Zoom Marketplace
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </li>
        
        <li>
          <div className="font-medium">Click on "Develop" and then "Build App"</div>
          <p className="text-muted-foreground text-sm mt-1">
            In the dropdown menu, select "Server-to-Server OAuth" as the app type
          </p>
          <div className="mt-2 rounded-md border p-3 bg-gray-50">
            <img 
              src="https://i.imgur.com/NeSvJmN.png" 
              alt="Select Server-to-Server OAuth" 
              className="rounded-md max-w-full h-auto"
            />
          </div>
        </li>

        <li>
          <div className="font-medium">Name your app</div>
          <p className="text-muted-foreground text-sm mt-1">
            Give your app a name like "ZoomLytics Integration" and provide a short description
          </p>
        </li>
      </ol>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} className="mt-4 sm:mt-0">
          Continue to Scopes
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderConfigureScopes = () => (
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
        <Info className="h-4 w-4" />
        <AlertTitle>After Adding Scopes</AlertTitle>
        <AlertDescription>
          After adding the required scopes, continue through the app creation process. You'll need to complete all required fields to activate your app.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} className="mt-4 sm:mt-0">
          Continue to Credentials
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderEnterCredentials = () => (
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

      <div className="rounded-md border p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="account_id">Zoom Account ID</Label>
          <Input
            id="account_id"
            name="account_id"
            placeholder="Enter your Zoom Account ID"
            value={credentials.account_id}
            onChange={handleChangeCredentials}
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
            onChange={handleChangeCredentials}
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
            onChange={handleChangeCredentials}
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
        <Button variant="outline" onClick={handleBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handleVerifyCredentials} 
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

  const renderSuccess = () => (
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
            'Your Zoom account has been successfully connected'}
        </AlertDescription>
      </Alert>
      
      <p className="text-muted-foreground">
        You can now access and manage your Zoom webinars through ZoomLytics
      </p>
      
      <Button onClick={handleComplete} className="mt-2">
        Start Using ZoomLytics
      </Button>
    </div>
  );

  // Render the appropriate content based on the current step
  const renderStepContent = () => {
    switch (currentStep) {
      case WizardStep.Introduction:
        return renderIntroduction();
      case WizardStep.CreateApp:
        return renderCreateApp();
      case WizardStep.ConfigureScopes:
        return renderConfigureScopes();
      case WizardStep.EnterCredentials:
        return renderEnterCredentials();
      case WizardStep.Success:
        return renderSuccess();
      default:
        return renderIntroduction();
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Zoom Integration Wizard</CardTitle>
        <CardDescription>
          Connect your Zoom account to access and manage your webinars
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {[
              "Introduction",
              "Create App",
              "Configure",
              "Credentials",
              "Success"
            ].map((step, index) => (
              <div 
                key={index} 
                className={`flex flex-col items-center ${index > currentStep ? 'text-muted-foreground' : ''}`}
              >
                <div 
                  className={`rounded-full w-8 h-8 flex items-center justify-center border ${
                    index < currentStep 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : index === currentStep 
                        ? 'bg-primary/20 border-primary text-primary' 
                        : 'bg-muted border-muted-foreground text-muted-foreground'
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{step}</span>
              </div>
            ))}
          </div>
          <div className="relative h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 ease-in-out"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>
        
        {renderStepContent()}
      </CardContent>
    </Card>
  );
};