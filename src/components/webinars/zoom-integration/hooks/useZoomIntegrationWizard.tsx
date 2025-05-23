
import { useState, useCallback, useEffect } from 'react';
import { VerificationStage, ZoomCredentials } from '../../../hooks/zoom/verification/types';
import { useZoomVerificationFlow } from '../../../hooks/zoom/useZoomVerificationFlow';
import { useZoomCredentialsLoader } from '../../../hooks/zoom/useZoomCredentialsLoader';

export function useZoomIntegrationWizard() {
  // Step handling
  const [currentStep, setCurrentStep] = useState(0);
  const [showNextStep, setShowNextStep] = useState(false);
  
  // Load the verification flow and saved credentials
  const verificationFlow = useZoomVerificationFlow();
  const { credentials: savedCredentials, isLoading: isLoadingCredentials } = useZoomCredentialsLoader();
  
  // Extract properties from the verification flow
  const { 
    isVerifying, 
    currentStage, 
    scopesError, 
    error, 
    clearScopesError, 
    handleVerificationProcess,
    verificationState
  } = verificationFlow;
  
  // Track if we're currently on the success step
  const [isOnSuccessStep, setIsOnSuccessStep] = useState(false);

  // Watch for changes in verification state
  useEffect(() => {
    // If verification is complete, move to success step
    if (currentStage === VerificationStage.COMPLETE && !isOnSuccessStep) {
      setCurrentStep(4); // Success step
      setShowNextStep(true);
      setIsOnSuccessStep(true);
    }
    
    // If there's a scope error, show the scopes step
    if (currentStage === VerificationStage.SCOPE_ERROR) {
      setCurrentStep(2);
    }
  }, [currentStage, isOnSuccessStep]);

  // Navigate to next step
  const goToNextStep = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
      setShowNextStep(false);
    }
  }, [currentStep]);

  // Navigate to previous step
  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setShowNextStep(false);
      if (isOnSuccessStep) {
        setIsOnSuccessStep(false);
      }
    }
  }, [currentStep, isOnSuccessStep]);

  // Mark the current step as complete, allowing progression
  const completeCurrentStep = useCallback(() => {
    setShowNextStep(true);
  }, []);

  // Handle the entire process from the EnterCredentialsStep
  const handleCredentialsSubmit = useCallback(async (credentials: ZoomCredentials) => {
    try {
      await handleVerificationProcess(credentials);
      return true;
    } catch (err) {
      console.error("Verification process failed:", err);
      return false;
    }
  }, [handleVerificationProcess]);
  
  // Get completed status for a step
  const isStepCompleted = useCallback((step: number) => {
    if (step < currentStep) {
      return true;
    }
    if (step === currentStep) {
      return showNextStep;
    }
    return false;
  }, [currentStep, showNextStep]);

  return {
    currentStep,
    isStepCompleted,
    goToNextStep,
    goToPreviousStep,
    completeCurrentStep,
    handleCredentialsSubmit,
    isSubmitting: isVerifying,
    verificationStage: currentStage,
    scopesError,
    clearScopesError,
    savedCredentials,
    isLoadingCredentials,
    error,
    verificationDetails: verificationState.verificationDetails
  };
}
