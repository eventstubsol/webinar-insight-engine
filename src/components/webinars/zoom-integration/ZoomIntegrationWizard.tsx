
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useAuth } from '@/hooks/useAuth';
import { useZoomCredentialsLoader } from '@/hooks/zoom/useZoomCredentialsLoader';
import { useZoomVerificationFlow, VerificationStage } from '@/hooks/zoom/useZoomVerificationFlow';
import { ZoomCredentials, WizardStep } from './types';
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
  const { user } = useAuth();
  const { hasCredentials, isLoading: isLoadingCredentials, fetchSavedCredentials } = useZoomCredentialsLoader();
  
  // Verification flow state and logic from our custom hook
  const {
    isSubmitting,
    error,
    scopesError,
    verificationDetails,
    verificationStage,
    savedCredentials,
    handleVerificationProcess,
    clearScopesError
  } = useZoomVerificationFlow();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.Introduction);
  const [credentials, setCredentials] = useState<ZoomCredentials>({
    account_id: '',
    client_id: '',
    client_secret: ''
  });

  // When savedCredentials loads, update the form
  useEffect(() => {
    if (savedCredentials) {
      setCredentials({
        account_id: savedCredentials.account_id || '',
        client_id: savedCredentials.client_id || '',
        client_secret: savedCredentials.client_secret || '',
      });
    }
  }, [savedCredentials]);

  // Fetch credentials when the wizard opens - with a delay to prevent race conditions
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        fetchSavedCredentials();
      }, 500); // Add a small delay
      
      return () => clearTimeout(timer);
    }
  }, [user, fetchSavedCredentials]);
  
  // Update step when verification completes or when scopes error occurs
  useEffect(() => {
    if (verificationDetails) {
      setCurrentStep(WizardStep.Success);
    } else if (scopesError) {
      setCurrentStep(WizardStep.ConfigureScopes);
    }
  }, [verificationDetails, scopesError]);
  
  // Monitor verification stage
  useEffect(() => {
    console.log(`Verification stage changed to: ${verificationStage}`);
  }, [verificationStage]);

  const handleChangeCredentials = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveCredentials = async () => {
    if (!user) {
      return;
    }

    if (!credentials.account_id || !credentials.client_id || !credentials.client_secret) {
      return;
    }

    // Use our verification flow hook to handle the process
    const success = await handleVerificationProcess(credentials);
    
    if (success && verificationDetails) {
      setCurrentStep(WizardStep.Success);
    }
  };

  const handleNext = () => {
    setCurrentStep(prev => prev + 1 as WizardStep);
  };

  const handleBack = () => {
    if (currentStep === WizardStep.ConfigureScopes && scopesError) {
      // If we're going back from the scopes error screen, clear the error
      clearScopesError();
    }
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
            onVerify={handleSaveCredentials} 
            onBack={handleBack}
            credentials={credentials}
            onChange={handleChangeCredentials}
            error={error}
            isSubmitting={isSubmitting}
            isLoadingCredentials={isLoadingCredentials}
            verificationStage={verificationStage}
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
