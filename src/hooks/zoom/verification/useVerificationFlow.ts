
import { useCallback } from 'react';
import { useVerificationState } from './useVerificationState';
import { useVerificationAPIs } from './useVerificationAPIs';
import { useVerificationErrorHandler } from './useVerificationErrorHandler';
import { VerificationStage, ZoomCredentials } from './types';

export function useVerificationFlow() {
  // Get necessary hooks
  const {
    verificationState,
    updateStage,
    setSubmitting,
    setScopesError,
    setVerificationDetails,
    completeVerification,
    failVerification,
    resetVerificationState
  } = useVerificationState();
  
  const {
    validateToken,
    validateScopes,
    saveCredentials
  } = useVerificationAPIs();
  
  const {
    showErrorToast,
    showSuccessToast,
    determineErrorMessage,
    setSubmitting: setErrorSubmitting,
    setupVerificationTimeout,
    clearVerificationTimeout
  } = useVerificationErrorHandler(() => {
    // Handle timeout by failing verification
    failVerification('Verification timed out. Please try again.');
  });
  
  // Clear any scope errors that might have been set
  const clearScopesError = useCallback(() => {
    setScopesError(false);
  }, [setScopesError]);
  
  // Handle the verification process
  const handleVerificationProcess = useCallback(async (credentials: ZoomCredentials) => {
    resetVerificationState();
    setSubmitting(true);
    setErrorSubmitting(true);
    setupVerificationTimeout();
    
    try {
      // Step 1: Validate the token
      updateStage(VerificationStage.TOKEN_VALIDATION);
      console.log('Validating token...');
      
      const tokenResult = await validateToken(credentials);
      if (!tokenResult.success) {
        const errorMsg = determineErrorMessage(new Error(tokenResult.error || 'Token validation failed'), 'token');
        failVerification(errorMsg);
        showErrorToast('Token Validation Failed', errorMsg);
        return;
      }
      
      // Step 2: Validate scopes
      updateStage(VerificationStage.SCOPE_VALIDATION);
      console.log('Validating scopes...');
      
      const scopesResult = await validateScopes(credentials);
      if (!scopesResult.success) {
        // Set scopes error state
        setScopesError(true);
        
        // Update state
        updateStage(VerificationStage.SCOPE_ERROR);
        
        const errorMsg = determineErrorMessage(new Error(scopesResult.error || 'Missing required OAuth scopes'), 'scopes');
        showErrorToast('Scope Validation Failed', errorMsg);
        return;
      }
      
      // Step 3: Save credentials
      updateStage(VerificationStage.SAVING);
      console.log('Saving credentials...');
      
      const saveResult = await saveCredentials(credentials);
      if (!saveResult.success) {
        const errorMsg = determineErrorMessage(new Error(saveResult.error || 'Failed to save credentials'), 'save');
        failVerification(errorMsg);
        showErrorToast('Save Failed', errorMsg);
        return;
      }
      
      // Complete verification successfully
      const verificationDetails = saveResult.data || { success: true };
      setVerificationDetails(verificationDetails);
      completeVerification(verificationDetails);
      
      // Show success toast
      showSuccessToast(verificationDetails.user_email || verificationDetails.user?.email);
    } catch (err: any) {
      console.error('Verification process error:', err);
      
      // Determine error category and message
      const errorMsg = determineErrorMessage(err);
      
      // Check if this is a scopes error
      if (err.message && (
        err.message.includes('scope') || 
        err.message.includes('OAuth') || 
        err.message.includes('permission')
      )) {
        setScopesError(true);
        updateStage(VerificationStage.SCOPE_ERROR);
      } else {
        failVerification(errorMsg);
      }
      
      // Show toast
      showErrorToast('Verification Failed', errorMsg);
    } finally {
      setSubmitting(false);
      setErrorSubmitting(false);
      clearVerificationTimeout();
    }
  }, [
    updateStage, 
    setSubmitting, 
    setScopesError,
    validateToken, 
    validateScopes, 
    saveCredentials,
    completeVerification,
    failVerification,
    setVerificationDetails,
    showSuccessToast,
    showErrorToast,
    determineErrorMessage,
    setErrorSubmitting,
    setupVerificationTimeout,
    clearVerificationTimeout,
    resetVerificationState
  ]);
  
  return {
    verificationState,
    handleVerificationProcess,
    clearScopesError,
    resetVerificationState,
    // Additional properties for convenience
    isVerifying: verificationState.isSubmitting,
    currentStage: verificationState.stage,
    scopesError: verificationState.scopesError,
    error: verificationState.error
  };
}
