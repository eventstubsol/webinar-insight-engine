
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/hooks/useAuth';
import { useZoomCredentialsLoader } from '@/hooks/zoom/useZoomCredentialsLoader';
import { ZoomCredentials, WizardStep, VerificationDetails } from './types';
import { ProgressIndicator } from './ProgressIndicator';
import { IntroductionStep } from './IntroductionStep';
import { CreateAppStep } from './CreateAppStep';
import { ConfigureScopesStep } from './ConfigureScopesStep';
import { EnterCredentialsStep } from './EnterCredentialsStep';
import { SuccessStep } from './SuccessStep';

interface ZoomIntegrationWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const ZoomIntegrationWizard: React.FC<ZoomIntegrationWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { savedCredentials, hasCredentials, isLoading: isLoadingCredentials, fetchSavedCredentials } = useZoomCredentialsLoader();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.Introduction);
  const [credentials, setCredentials] = useState<ZoomCredentials>({
    account_id: '',
    client_id: '',
    client_secret: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopesError, setScopesError] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<VerificationDetails | null>(null);

  // When savedCredentials loads, update the form
  useEffect(() => {
    if (savedCredentials) {
      setCredentials({
        account_id: savedCredentials.account_id || '',
        client_id: savedCredentials.client_id || '',
        client_secret: savedCredentials.client_secret || '',
      });
      
      // If there are saved credentials, show a toast notification
      toast({
        title: 'Credentials Pre-filled',
        description: 'Your previously saved Zoom credentials have been loaded.',
      });
    }
  }, [savedCredentials, toast]);

  // Fetch credentials when the wizard opens
  useEffect(() => {
    if (user) {
      fetchSavedCredentials();
    }
  }, [user, fetchSavedCredentials]);

  const handleChangeCredentials = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
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
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'save-credentials',
          account_id: credentials.account_id,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setVerificationDetails(data);
        setCurrentStep(WizardStep.Success);
        toast({
          title: 'Zoom Integration Successful',
          description: `Connected as ${data.user_email || data.user?.email || 'Zoom User'}`
        });
      } else {
        // Check if it's a scopes error
        if (data.code === 'missing_scopes' || 
            data.error?.toLowerCase().includes('scopes') || 
            data.details?.code === 4711) {
          setScopesError(true);
          setCurrentStep(WizardStep.ConfigureScopes);
        }
        
        throw new Error(data.error || 'Verification failed');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      
      // Check for scopes error in the message
      if (err.message?.toLowerCase().includes('scopes') || 
          err.message?.toLowerCase().includes('scope') || 
          err.message?.toLowerCase().includes('4711')) {
        setScopesError(true);
        setCurrentStep(WizardStep.ConfigureScopes);
      }
      
      setError(err.message || 'Failed to verify Zoom credentials');
      
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

  // Render the appropriate step content
  const renderStepContent = () => {
    switch (currentStep) {
      case WizardStep.Introduction:
        return (
          <IntroductionStep 
            onNext={handleNext} 
            onCancel={onCancel} 
            hasCredentials={hasCredentials} 
          />
        );
        
      case WizardStep.CreateApp:
        return (
          <CreateAppStep 
            onNext={handleNext} 
            onBack={handleBack} 
          />
        );
        
      case WizardStep.ConfigureScopes:
        return (
          <ConfigureScopesStep 
            onNext={handleNext} 
            onBack={handleBack} 
            scopesError={scopesError}
          />
        );
        
      case WizardStep.EnterCredentials:
        return (
          <EnterCredentialsStep 
            onVerify={handleVerifyCredentials} 
            onBack={handleBack}
            credentials={credentials}
            onChange={handleChangeCredentials}
            error={error}
            isSubmitting={isSubmitting}
            isLoadingCredentials={isLoadingCredentials}
          />
        );
        
      case WizardStep.Success:
        return (
          <SuccessStep 
            onComplete={handleComplete}
            verificationDetails={verificationDetails} 
          />
        );
        
      default:
        return (
          <IntroductionStep 
            onNext={handleNext} 
            onCancel={onCancel} 
            hasCredentials={hasCredentials} 
          />
        );
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
        <ProgressIndicator currentStep={currentStep} />
        {renderStepContent()}
      </CardContent>
    </Card>
  );
};
