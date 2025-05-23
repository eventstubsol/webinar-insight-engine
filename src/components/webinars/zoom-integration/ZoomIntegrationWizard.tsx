
import React, { useState, useEffect, useRef } from 'react';
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
  const verificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  
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

  // Fetch credentials when the wizard opens - with a delay to prevent race conditions
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        fetchSavedCredentials();
      }, 500); // Add a small delay
      
      return () => clearTimeout(timer);
    }
  }, [user, fetchSavedCredentials]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
      isSubmittingRef.current = false;
    };
  }, []);

  const handleChangeCredentials = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  // Step 1: Save credentials
  const handleSaveCredentials = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save credentials",
        variant: "destructive"
      });
      return;
    }

    if (!credentials.account_id || !credentials.client_id || !credentials.client_secret) {
      setError("All fields are required");
      return;
    }

    // Reset state
    setError(null);
    setScopesError(false);
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    
    // Set a timeout to prevent hanging submission
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
    }
    
    verificationTimeoutRef.current = setTimeout(() => {
      if (isSubmittingRef.current) {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        setError("Operation timed out. Please try again.");
        
        toast({
          title: 'Operation Timed Out',
          description: 'The server took too long to respond. Please try again.',
          variant: 'destructive'
        });
      }
    }, 20000); // 20 second timeout

    try {
      console.log('Saving credentials...');
      
      const { data: saveData, error: saveError } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'save-credentials',
          account_id: credentials.account_id,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret
        }
      });

      if (saveError) {
        throw new Error(saveError.message || 'Failed to save credentials');
      }

      if (!saveData.success) {
        throw new Error(saveData.error || 'Failed to save credentials');
      }
      
      console.log('Credentials saved successfully, proceeding to verification');
      
      // Step 2: Verify the saved credentials
      await handleVerifyCredentials();
      
    } catch (err: any) {
      console.error('Error saving credentials:', err);
      
      // Check for network related errors
      if (err.message?.includes('Failed to send') || 
          err.message?.toLowerCase().includes('err_insufficient_resources') ||
          err.message?.toLowerCase().includes('network') ||
          err.message?.toLowerCase().includes('timeout')) {
        setError("Network error. Please wait a moment and try again.");
        
        toast({
          title: 'Network Error',
          description: 'Could not connect to the server. Please try again in a moment.',
          variant: 'destructive'
        });
      } else {
        setError(err.message || 'Failed to save Zoom credentials');
        
        toast({
          title: 'Save Failed',
          description: err.message || 'Could not save Zoom API credentials',
          variant: 'destructive'
        });
      }
      
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
        verificationTimeoutRef.current = null;
      }
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };
  
  // Step 2: Verify saved credentials
  const handleVerifyCredentials = async () => {
    try {
      console.log('Verifying credentials...');
      
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'verify-credentials'
        }
      });

      if (verifyError) {
        throw new Error(verifyError.message || 'Verification failed');
      }

      if (verifyData.success || verifyData.verified) {
        if (verificationTimeoutRef.current) {
          clearTimeout(verificationTimeoutRef.current);
          verificationTimeoutRef.current = null;
        }
        
        console.log('Verification successful:', verifyData);
        setVerificationDetails(verifyData);
        setCurrentStep(WizardStep.Success);
        
        toast({
          title: 'Zoom Integration Successful',
          description: `Connected as ${verifyData.user_email || 
                        verifyData.user?.email || 
                        'Zoom User'}`
        });
      } else if (verifyData.code === 'missing_scopes' || 
               verifyData.error?.toLowerCase().includes('scopes') || 
               verifyData.details?.code === 4711) {
        // Handle scopes error
        setScopesError(true);
        setCurrentStep(WizardStep.ConfigureScopes);
        throw new Error(verifyData.error || 'Missing required OAuth scopes');
      } else {
        // General verification failure
        throw new Error(verifyData.error || 'Verification failed');
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
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
        verificationTimeoutRef.current = null;
      }
      setIsSubmitting(false);
      isSubmittingRef.current = false;
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
            onVerify={handleSaveCredentials} 
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
