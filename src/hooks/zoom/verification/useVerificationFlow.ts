
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useVerificationState } from './useVerificationState';
import { useVerificationAPIs } from './useVerificationAPIs';
import { useVerificationErrorHandler } from './useVerificationErrorHandler';
import { ZoomCredentials, VerificationStage, VerificationDetails } from './types';

export function useVerificationFlow() {
  const [error, setError] = useState<string | null>(null);
  const { verificationState, updateVerificationState, resetVerificationState } = useVerificationState();
  const { validateToken, validateScopes, saveCredentials } = useVerificationAPIs();
  const { 
    setupVerificationTimeout, 
    clearVerificationTimeout, 
    setSubmitting,
    determineErrorMessage,
    showErrorToast,
    showSuccessToast,
    isSubmitting
  } = useVerificationErrorHandler(() => {
    // Handle timeout
    setSubmitting(false);
    updateVerificationState({
      stage: VerificationStage.INPUT,
      isVerifying: false,
      error: 'Operation timed out. The server took too long to respond.'
    });
  });
  
  const { toast } = useToast();
  
  // Handle verification flow using a step-by-step approach
  const verifyCredentials = async (credentials: ZoomCredentials): Promise<VerificationDetails | null> => {
    // Reset any previous errors
    setError(null);
    setSubmitting(true);
    
    try {
      // Update state to show we're validating the token
      updateVerificationState({
        stage: VerificationStage.TOKEN_VALIDATION,
        isVerifying: true
      });
      
      // Set up timeout for the entire operation
      setupVerificationTimeout(45000); // 45 seconds timeout
      
      console.log('Starting token validation...');
      // Step 1: Validate that we can generate a token
      const tokenResult = await validateToken(credentials);
      
      if (!tokenResult.success) {
        throw new Error(tokenResult.error || 'Failed to validate token');
      }
      
      console.log('Token validation successful, checking scopes...');
      
      // Update state to show we're validating scopes
      updateVerificationState({
        stage: VerificationStage.SCOPE_VALIDATION,
        isVerifying: true
      });
      
      // Step 2: Validate that the token has the required scopes
      const scopeResult = await validateScopes(credentials);
      
      if (!scopeResult.success) {
        throw new Error(scopeResult.error || 'Failed to validate OAuth scopes');
      }
      
      console.log('Scope validation successful, saving credentials...');
      
      // Update state to show we're saving credentials
      updateVerificationState({
        stage: VerificationStage.SAVING,
        isVerifying: true
      });
      
      // Step 3: Save the credentials with the backend
      const saveResult = await saveCredentials(credentials);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save credentials');
      }
      
      console.log('Credentials saved successfully!');
      
      // Clear timeout as operation completed successfully
      clearVerificationTimeout();
      
      // All steps completed successfully!
      updateVerificationState({
        stage: VerificationStage.COMPLETED,
        isVerifying: false,
        details: {
          user: saveResult.data?.user,
          verified: true,
          scopes: scopeResult.data?.scopes || []
        }
      });
      
      // Show success toast
      showSuccessToast(saveResult.data?.user?.email);
      
      return {
        user: saveResult.data?.user,
        verified: true,
        scopes: scopeResult.data?.scopes || []
      };
    } catch (err: any) {
      console.error('Verification flow error:', err);
      
      // Get a user-friendly error message
      let stage: VerificationStage;
      let errorContext: 'token' | 'scopes' | 'save' = 'token';
      
      // Determine the stage where the error occurred
      if (verificationState.stage === VerificationStage.SCOPE_VALIDATION) {
        stage = VerificationStage.SCOPE_ERROR;
        errorContext = 'scopes';
      } else if (verificationState.stage === VerificationStage.SAVING) {
        stage = VerificationStage.INPUT;
        errorContext = 'save';
      } else {
        stage = VerificationStage.INPUT;
        errorContext = 'token';
      }
      
      // Get a user-friendly error message
      const errorMessage = determineErrorMessage(err, errorContext);
      
      // Update state with error
      updateVerificationState({
        stage,
        isVerifying: false,
        error: errorMessage
      });
      
      // Show error toast
      showErrorToast(`Verification failed`, errorMessage);
      
      // Set error for form display
      setError(errorMessage);
      
      return null;
    } finally {
      // Always ensure we clean up and reset state
      setSubmitting(false);
      clearVerificationTimeout();
    }
  };

  const resetVerification = () => {
    clearVerificationTimeout();
    setSubmitting(false);
    setError(null);
    resetVerificationState();
  };

  // Create handleVerificationProcess from verifyCredentials for backwards compatibility
  const handleVerificationProcess = async (credentials: ZoomCredentials): Promise<boolean> => {
    const result = await verifyCredentials(credentials);
    return !!result;
  };

  // Add clearScopesError method
  const clearScopesError = () => {
    updateVerificationState({
      scopesError: false
    });
  };

  // Extract values from verificationState for convenience
  const scopesError = verificationState.scopesError;
  const verificationStage = verificationState.stage;
  const verificationDetails = verificationState.verificationDetails || verificationState.details;

  return {
    verifyCredentials,
    resetVerification,
    error,
    verificationState,
    isSubmitting: isSubmitting(),
    currentStage: verificationState.stage,
    verificationDetails,
    // Add additional properties needed by useZoomIntegrationWizard
    scopesError,
    verificationStage,
    savedCredentials: null, // Will be populated in useZoomIntegrationWizard
    handleVerificationProcess,
    clearScopesError
  };
}
