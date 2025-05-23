
import { useZoomCredentialsLoader } from '@/hooks/zoom/useZoomCredentialsLoader';
import { useVerificationState } from './useVerificationState';
import { useVerificationAPIs } from './useVerificationAPIs';
import { useVerificationErrorHandler } from './useVerificationErrorHandler';
import { VerificationStage, VerificationDetails, ZoomCredentials } from './types';

export function useVerificationFlow() {
  const { savedCredentials, fetchSavedCredentials } = useZoomCredentialsLoader();
  
  // Get the state management hooks
  const stateManager = useVerificationState();
  
  // Get the API call hooks
  const apiCalls = useVerificationAPIs();
  
  // Get error handling hooks
  const errorHandler = useVerificationErrorHandler(() => {
    // Handle timeout by updating state
    stateManager.updateStateForStage(
      VerificationStage.Failed, 
      false, 
      "Operation timed out. Please try again."
    );
    apiCalls.abortPendingRequests();
  });

  // Main handler that orchestrates the staged verification process
  const handleVerificationProcess = async (credentials: ZoomCredentials) => {
    if (!credentials.account_id || !credentials.client_id || !credentials.client_secret) {
      stateManager.setError("Please fill in all credential fields");
      
      errorHandler.showErrorToast(
        'Missing Information',
        'Please provide Account ID, Client ID, and Client Secret'
      );
      
      return false;
    }
    
    // Set overall submitting state
    stateManager.setSubmitting(true);
    errorHandler.setSubmitting(true);
    
    // Stage 1: Save credentials
    stateManager.updateStateForStage(VerificationStage.SavingCredentials);
    errorHandler.setupVerificationTimeout();
    
    const saveResult = await apiCalls.saveCredentials(credentials);
    
    if (!saveResult.success) {
      // Format error message for save operation
      const errorMessage = errorHandler.determineErrorMessage(
        { message: saveResult.error }, 
        'save'
      );
      
      stateManager.failVerification(errorMessage);
      errorHandler.setSubmitting(false);
      errorHandler.showErrorToast('Save Failed', errorMessage);
      return false;
    }
    
    // Stage 2: Validate token
    stateManager.updateStateForStage(VerificationStage.ValidatingToken);
    const tokenResult = await apiCalls.validateToken();
    
    if (!tokenResult.success) {
      // Format error message for token validation
      const errorMessage = errorHandler.determineErrorMessage(
        { message: tokenResult.error }, 
        'token'
      );
      
      stateManager.failVerification(errorMessage);
      errorHandler.setSubmitting(false);
      errorHandler.showErrorToast('Token Validation Failed', errorMessage);
      return false;
    }
    
    stateManager.setTokenValidated(true);
    
    // Stage 3: Validate scopes
    stateManager.updateStateForStage(VerificationStage.ValidatingScopes);
    const scopesResult = await apiCalls.validateScopes();
    
    if (!scopesResult.success) {
      // Format error message for scopes validation
      const errorMessage = errorHandler.determineErrorMessage(
        { message: scopesResult.error }, 
        'scopes'
      );
      
      stateManager.failVerification(
        errorMessage, 
        scopesResult.isScopesError || false
      );
      
      errorHandler.setSubmitting(false);
      
      const toastTitle = scopesResult.isScopesError ? 
        'Missing OAuth Scopes' : 
        'Scope Validation Failed';
        
      errorHandler.showErrorToast(toastTitle, errorMessage);
      return false;
    }
    
    // All validations passed
    const verificationDetails: VerificationDetails = {
      success: true,
      user_email: scopesResult.data?.user_email,
      user: scopesResult.data?.user
    };
    
    stateManager.completeVerification(verificationDetails);
    errorHandler.setSubmitting(false);
    errorHandler.clearVerificationTimeout();
    
    errorHandler.showSuccessToast(
      scopesResult.data?.user_email || verificationDetails.user_email
    );
    
    return true;
  };
  
  return {
    // State
    isSubmitting: stateManager.verificationState.isSubmitting,
    error: stateManager.verificationState.error,
    scopesError: stateManager.verificationState.scopesError,
    verificationDetails: stateManager.verificationState.verificationDetails,
    verificationStage: stateManager.verificationState.stage,
    savedCredentials,
    
    // Main verification flow
    handleVerificationProcess,
    
    // Stage-specific verification methods (for advanced use)
    saveCredentials: async (credentials: ZoomCredentials) => {
      stateManager.updateStateForStage(VerificationStage.SavingCredentials);
      errorHandler.setupVerificationTimeout();
      const result = await apiCalls.saveCredentials(credentials);
      if (!result.success) {
        stateManager.failVerification(result.error || 'Failed to save credentials');
      }
      return result.success;
    },
    
    validateToken: async () => {
      stateManager.updateStateForStage(VerificationStage.ValidatingToken);
      const result = await apiCalls.validateToken();
      if (result.success) {
        stateManager.setTokenValidated(true);
      } else {
        stateManager.failVerification(result.error || 'Failed to validate token');
      }
      return result.success;
    },
    
    validateScopes: async () => {
      stateManager.updateStateForStage(VerificationStage.ValidatingScopes);
      const result = await apiCalls.validateScopes();
      if (result.success) {
        const verificationDetails: VerificationDetails = {
          success: true,
          user_email: result.data?.user_email,
          user: result.data?.user
        };
        stateManager.completeVerification(verificationDetails);
        errorHandler.showSuccessToast(result.data?.user_email);
      } else {
        stateManager.failVerification(
          result.error || 'Failed to validate scopes',
          result.isScopesError || false
        );
      }
      return result.success;
    },
    
    verifyCredentials: async () => {
      stateManager.updateStateForStage(VerificationStage.ValidatingScopes);
      const result = await apiCalls.verifyCredentials();
      if (result.success) {
        const verificationDetails: VerificationDetails = {
          success: true,
          user_email: result.data?.user_email,
          user: result.data?.user
        };
        stateManager.completeVerification(verificationDetails);
        errorHandler.showSuccessToast(result.data?.user_email);
      } else {
        stateManager.failVerification(
          result.error || 'Failed to verify credentials',
          result.isScopesError || false
        );
      }
      return result.success;
    },
    
    // Helper actions
    clearError: () => stateManager.setError(null),
    clearScopesError: () => stateManager.setScopesError(false),
    resetVerificationState: stateManager.resetVerificationState
  };
}
