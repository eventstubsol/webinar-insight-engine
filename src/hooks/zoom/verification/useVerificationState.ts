
import { useState } from 'react';
import { VerificationStage, VerificationState } from './types';

export function useVerificationState() {
  // Enhanced state management with verification stages
  const [verificationState, setVerificationState] = useState<VerificationState>({
    stage: VerificationStage.Idle,
    isSubmitting: false,
    error: null,
    scopesError: false,
    tokenValidated: false,
    scopesValidated: false,
    verificationDetails: null
  });
  
  // Reset verification state
  const resetVerificationState = () => {
    setVerificationState({
      stage: VerificationStage.Idle,
      isSubmitting: false,
      error: null,
      scopesError: false,
      tokenValidated: false,
      scopesValidated: false,
      verificationDetails: null
    });
  };
  
  // Update verification state with partial state
  const updateVerificationState = (updates: Partial<VerificationState>) => {
    setVerificationState(prev => ({
      ...prev,
      ...updates
    }));
  };
  
  // Update verification stage
  const updateStage = (stage: VerificationStage) => {
    setVerificationState(prev => ({
      ...prev,
      stage
    }));
  };
  
  // Set submission state
  const setSubmitting = (isSubmitting: boolean) => {
    setVerificationState(prev => ({
      ...prev,
      isSubmitting
    }));
  };
  
  // Set error state
  const setError = (error: string | null) => {
    setVerificationState(prev => ({
      ...prev,
      error
    }));
  };
  
  // Set scopes error state
  const setScopesError = (scopesError: boolean) => {
    setVerificationState(prev => ({
      ...prev,
      scopesError
    }));
  };
  
  // Set token validated state
  const setTokenValidated = (tokenValidated: boolean) => {
    setVerificationState(prev => ({
      ...prev,
      tokenValidated
    }));
  };
  
  // Set scopes validated state
  const setScopesValidated = (scopesValidated: boolean) => {
    setVerificationState(prev => ({
      ...prev,
      scopesValidated
    }));
  };
  
  // Set verification details
  const setVerificationDetails = (verificationDetails: VerificationState['verificationDetails']) => {
    setVerificationState(prev => ({
      ...prev,
      verificationDetails,
      details: verificationDetails // Add this to support both property names
    }));
  };

  // Update state for a specific stage
  const updateStateForStage = (stage: VerificationStage, isSubmitting: boolean = true, error: string | null = null) => {
    setVerificationState(prev => ({
      ...prev,
      stage,
      isSubmitting,
      error
    }));
  };

  // Handle verification completion
  const completeVerification = (details: VerificationState['verificationDetails']) => {
    setVerificationState(prev => ({
      ...prev,
      stage: VerificationStage.Complete,
      isSubmitting: false,
      verificationDetails: details,
      details: details, // Add this to support both property names
      tokenValidated: true,
      scopesValidated: true
    }));
  };

  // Handle verification failure
  const failVerification = (error: string, isScopesError: boolean = false) => {
    setVerificationState(prev => ({
      ...prev,
      stage: VerificationStage.Failed,
      isSubmitting: false,
      error,
      scopesError: isScopesError
    }));
  };
  
  return {
    verificationState,
    resetVerificationState,
    updateVerificationState,
    updateStage,
    setSubmitting,
    setError,
    setScopesError,
    setTokenValidated,
    setScopesValidated,
    setVerificationDetails,
    updateStateForStage,
    completeVerification,
    failVerification
  };
}
