
import { useState, useRef, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useZoomCredentialsLoader } from '@/hooks/zoom/useZoomCredentialsLoader';
import { ZoomCredentials, VerificationDetails } from '@/components/webinars/zoom-integration/types';

// Define verification stages for better state management
export enum VerificationStage {
  Idle = 'idle',
  SavingCredentials = 'saving_credentials',
  ValidatingToken = 'validating_token',
  ValidatingScopes = 'validating_scopes',
  Complete = 'complete',
  Failed = 'failed'
}

export interface VerificationState {
  stage: VerificationStage;
  isSubmitting: boolean;
  error: string | null;
  scopesError: boolean;
  tokenValidated: boolean;
  scopesValidated: boolean;
  verificationDetails: VerificationDetails | null;
}

export function useZoomVerificationFlow() {
  const { toast } = useToast();
  const { savedCredentials, fetchSavedCredentials } = useZoomCredentialsLoader();
  
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
  
  // Refs for tracking request state
  const verificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const requestInProgressRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      isSubmittingRef.current = false;
      requestInProgressRef.current = false;
    };
  }, []);
  
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
  
  // Set up a verification timeout with proper cleanup
  const setupVerificationTimeout = (timeoutMs: number = 45000) => {
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
    }
    
    verificationTimeoutRef.current = setTimeout(() => {
      if (isSubmittingRef.current) {
        console.log('Operation timed out');
        abortControllerRef.current?.abort();
        
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          isSubmitting: false,
          error: "Operation timed out. Please try again."
        }));
        
        isSubmittingRef.current = false;
        requestInProgressRef.current = false;
        
        toast({
          title: 'Operation Timed Out',
          description: 'The server took too long to respond. Please try again.',
          variant: 'destructive'
        });
      }
    }, timeoutMs);
  };
  
  // Stage 1: Save credentials
  const saveCredentials = async (credentials: ZoomCredentials): Promise<boolean> => {
    if (requestInProgressRef.current) {
      console.log('Request already in progress, not starting a new save operation');
      return false;
    }
    
    // Reset state and prepare for submission
    setVerificationState(prev => ({
      ...prev,
      stage: VerificationStage.SavingCredentials,
      isSubmitting: true,
      error: null
    }));
    
    isSubmittingRef.current = true;
    requestInProgressRef.current = true;
    
    // Create new abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Set verification timeout
    setupVerificationTimeout();
    
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
        console.error('Save credentials error details:', saveError);
        throw new Error(saveError.message || 'Failed to save credentials');
      }
      
      if (!saveData?.success) {
        console.error('Save credentials failed with data:', saveData);
        throw new Error(saveData?.error || 'Failed to save credentials');
      }
      
      console.log('Credentials saved successfully');
      return true;
      
    } catch (err: any) {
      console.error('Error saving credentials:', err);
      
      // Enhanced error classification
      if (err.message?.toLowerCase().includes('timeout') || 
         err.message?.toLowerCase().includes('timed out')) {
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          error: "The save operation timed out. This could be due to network issues or server load."
        }));
        
        toast({
          title: 'Save Operation Timed Out',
          description: 'The server took too long to respond. Please try again.',
          variant: 'destructive'
        });
      }
      // Check for network related errors
      else if (err.message?.includes('Failed to send') || 
          err.message?.toLowerCase().includes('err_insufficient_resources') ||
          err.message?.toLowerCase().includes('network') ||
          err.message?.toLowerCase().includes('connection')) {
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          error: "Network error. Please wait a moment and try again."
        }));
        
        toast({
          title: 'Network Error',
          description: 'Could not connect to the server. Please try again in a moment.',
          variant: 'destructive'
        });
      } else {
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          error: err.message || 'Failed to save Zoom credentials'
        }));
        
        toast({
          title: 'Save Failed',
          description: err.message || 'Could not save Zoom API credentials',
          variant: 'destructive'
        });
      }
      
      return false;
    } finally {
      // Don't reset isSubmitting yet - we continue to next stage if successful
      requestInProgressRef.current = false;
    }
  };
  
  // Stage 2: Validate token
  const validateToken = async (): Promise<boolean> => {
    if (requestInProgressRef.current) {
      console.log('Request already in progress, not starting token validation');
      return false;
    }
    
    // Update state for token validation stage
    setVerificationState(prev => ({
      ...prev,
      stage: VerificationStage.ValidatingToken,
      error: null
    }));
    
    requestInProgressRef.current = true;
    
    // Create new abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      console.log('Validating token...');
      
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'validate-token'
        }
      });
      
      if (tokenError) {
        console.error('Token validation failed with error:', tokenError);
        throw new Error(tokenError.message || 'Token validation failed');
      }
      
      // Log the full response for debugging
      console.log('Token validation response data:', tokenData);
      
      if (tokenData.success && tokenData.token_validated) {
        console.log('Token validation successful');
        
        setVerificationState(prev => ({
          ...prev,
          tokenValidated: true
        }));
        
        return true;
      } else {
        throw new Error(tokenData.error || 'Token validation failed with an unknown error');
      }
    } catch (err: any) {
      console.error('Token validation error:', err);
      
      // Determine error type and create user-friendly message
      const errorMessage = determineErrorMessage(err, 'token');
      
      setVerificationState(prev => ({
        ...prev,
        error: errorMessage,
        stage: VerificationStage.Failed
      }));
      
      toast({
        title: 'Token Validation Failed',
        description: errorMessage || 'Could not validate Zoom API credentials',
        variant: 'destructive'
      });
      
      return false;
    } finally {
      requestInProgressRef.current = false;
    }
  };
  
  // Stage 3: Validate scopes
  const validateScopes = async (): Promise<boolean> => {
    if (requestInProgressRef.current) {
      console.log('Request already in progress, not starting scope validation');
      return false;
    }
    
    // Update state for scope validation stage
    setVerificationState(prev => ({
      ...prev,
      stage: VerificationStage.ValidatingScopes,
      error: null,
      scopesError: false
    }));
    
    requestInProgressRef.current = true;
    
    // Create new abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      console.log('Validating OAuth scopes...');
      
      const { data: scopesData, error: scopesError } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'validate-scopes'
        }
      });
      
      if (scopesError) {
        console.error('Scope validation failed with error:', scopesError);
        throw new Error(scopesError.message || 'Scope validation failed');
      }
      
      // Log the full response for debugging
      console.log('Scopes validation response data:', scopesData);
      
      if (scopesData.success && scopesData.scopes_validated) {
        console.log('Scope validation successful:', scopesData);
        
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Complete,
          isSubmitting: false,
          scopesValidated: true,
          verificationDetails: {
            success: true,
            user_email: scopesData.user_email || scopesData.user?.email,
            user: scopesData.user
          }
        }));
        
        toast({
          title: 'Zoom Integration Successful',
          description: `Connected as ${scopesData.user_email || 
                        scopesData.user?.email || 
                        'Zoom User'}`
        });
        
        return true;
      } else if (scopesData.error?.toLowerCase()?.includes('scopes') || 
               (scopesData.headers && scopesData.headers['X-Error-Type'] === 'missing_scopes')) {
        // Handle scopes error
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          isSubmitting: false,
          error: 'Missing required OAuth scopes',
          scopesError: true
        }));
        
        throw new Error(scopesData.error || 'Missing required OAuth scopes');
      } else {
        // General validation failure
        throw new Error(scopesData.error || 'Scope validation failed');
      }
    } catch (err: any) {
      console.error('Scope validation error:', err);
      
      // Check if this is a missing scopes error
      if (err.message?.toLowerCase().includes('scopes') || 
          err.message?.toLowerCase().includes('scope') || 
          err.message?.toLowerCase().includes('4711')) {
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          isSubmitting: false,
          error: 'Missing required OAuth scopes. Please check your Zoom app configuration.',
          scopesError: true
        }));
        
        toast({
          title: 'Missing OAuth Scopes',
          description: 'Your Zoom app is missing required permissions. Please check the configuration.',
          variant: 'destructive'
        });
      } else {
        // Determine other error types and create user-friendly message
        const errorMessage = determineErrorMessage(err, 'scopes');
        
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          isSubmitting: false,
          error: errorMessage
        }));
        
        toast({
          title: 'Scope Validation Failed',
          description: errorMessage || 'Could not validate Zoom app permissions',
          variant: 'destructive'
        });
      }
      
      return false;
    } finally {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
        verificationTimeoutRef.current = null;
      }
      
      isSubmittingRef.current = false;
      requestInProgressRef.current = false;
    }
  };
  
  // Helper function to determine user-friendly error messages
  const determineErrorMessage = (error: any, context: 'token' | 'scopes'): string => {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return `The ${context} validation process timed out. This could be due to network issues or server load.`;
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return `Network error during ${context} validation. Please check your internet connection and try again.`;
    }
    
    if (message.includes('invalid client') || message.includes('client_id') || message.includes('client_secret')) {
      return 'Invalid client credentials. Please check your Client ID and Client Secret.';
    }
    
    if (message.includes('invalid account') || message.includes('account_id')) {
      return 'Invalid account ID. Please verify your Zoom Account ID.';
    }
    
    if (message.includes('rate limit')) {
      return 'Rate limit exceeded. Please wait a moment before trying again.';
    }
    
    if (context === 'token') {
      if (message.includes('token')) {
        return 'Token generation failed. Please check your Zoom API credentials.';
      }
      return error.message || 'Failed to validate Zoom API credentials';
    }
    
    if (context === 'scopes') {
      if (message.includes('scopes')) {
        return 'Missing required OAuth scopes. Please check your Zoom app configuration.';
      }
      return error.message || 'Failed to validate Zoom app permissions';
    }
    
    return error.message || `Failed during ${context} validation`;
  };
  
  // Legacy combined verification for backward compatibility
  const verifyCredentials = async (): Promise<boolean> => {
    if (requestInProgressRef.current) {
      console.log('Request already in progress, not starting a new verify operation');
      return false;
    }
    
    requestInProgressRef.current = true;
    
    try {
      console.log('Verifying credentials...');
      
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'verify-credentials'
        }
      });
      
      if (verifyError) {
        // Enhanced error logging
        console.error('Verification failed with error:', verifyError);
        throw new Error(verifyError.message || 'Verification failed');
      }
      
      // Log the full response for debugging
      console.log('Verification response data:', verifyData);
      
      if (verifyData.success || verifyData.verified) {
        console.log('Verification successful:', verifyData);
        
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Complete,
          isSubmitting: false,
          tokenValidated: true,
          scopesValidated: true,
          verificationDetails: {
            success: true,
            user_email: verifyData.user_email || verifyData.user?.email,
            user: verifyData.user
          }
        }));
        
        toast({
          title: 'Zoom Integration Successful',
          description: `Connected as ${verifyData.user_email || 
                        verifyData.user?.email || 
                        'Zoom User'}`
        });
        
        return true;
      } else if (verifyData.code === 'missing_scopes' || 
               verifyData.error?.toLowerCase().includes('scopes') || 
               verifyData.details?.code === 4711) {
        // Handle scopes error
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          isSubmitting: false,
          error: 'Missing required OAuth scopes',
          scopesError: true
        }));
        
        throw new Error(verifyData.error || 'Missing required OAuth scopes');
      } else {
        // General verification failure
        throw new Error(verifyData.error || 'Verification failed');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      
      // More detailed error classification
      if (err.message?.toLowerCase().includes('scopes') || 
          err.message?.toLowerCase().includes('scope') || 
          err.message?.toLowerCase().includes('4711')) {
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          isSubmitting: false,
          error: 'Missing required OAuth scopes. Please check your Zoom app configuration.',
          scopesError: true
        }));
      } else if (err.message?.toLowerCase().includes('timeout') || 
                 err.message?.toLowerCase().includes('timed out')) {
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          isSubmitting: false,
          error: 'The verification process timed out. This could be due to network issues or server load.'
        }));
      } else if (err.message?.toLowerCase().includes('network') || 
                 err.message?.toLowerCase().includes('connection')) {
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          isSubmitting: false,
          error: 'Network error. Please check your internet connection and try again.'
        }));
      } else {
        // Default error
        setVerificationState(prev => ({
          ...prev,
          stage: VerificationStage.Failed,
          isSubmitting: false,
          error: err.message || 'Failed to verify Zoom credentials'
        }));
      }
      
      // Provide more specific toast messages based on error type
      let toastTitle = 'Verification Failed';
      let toastDesc = err.message || 'Could not verify Zoom API credentials';
      
      if (err.message?.toLowerCase().includes('timeout')) {
        toastTitle = 'Verification Timed Out';
        toastDesc = 'The verification process took too long. Please try again.';
      } else if (err.message?.toLowerCase().includes('scopes')) {
        toastTitle = 'Missing OAuth Scopes';
        toastDesc = 'Your Zoom app is missing required permissions. Please check the configuration.';
      }
      
      toast({
        title: toastTitle,
        description: toastDesc,
        variant: 'destructive'
      });
      
      return false;
    } finally {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
        verificationTimeoutRef.current = null;
      }
      
      isSubmittingRef.current = false;
      requestInProgressRef.current = false;
    }
  };
  
  // Main handler that orchestrates the staged verification process
  const handleVerificationProcess = async (credentials: ZoomCredentials) => {
    if (!credentials.account_id || !credentials.client_id || !credentials.client_secret) {
      setVerificationState(prev => ({
        ...prev,
        error: "Please fill in all credential fields"
      }));
      
      toast({
        title: 'Missing Information',
        description: 'Please provide Account ID, Client ID, and Client Secret',
        variant: 'destructive'
      });
      
      return false;
    }
    
    // Set overall submitting state
    setVerificationState(prev => ({
      ...prev,
      isSubmitting: true
    }));
    
    isSubmittingRef.current = true;
    
    // Stage 1: Save credentials
    const saveSuccess = await saveCredentials(credentials);
    
    if (!saveSuccess) {
      // Save failed, end process
      isSubmittingRef.current = false;
      setVerificationState(prev => ({
        ...prev,
        isSubmitting: false,
        stage: VerificationStage.Failed
      }));
      return false;
    }
    
    // Stage 2: Validate token
    const tokenValidated = await validateToken();
    
    if (!tokenValidated) {
      // Token validation failed, end process
      isSubmittingRef.current = false;
      setVerificationState(prev => ({
        ...prev,
        isSubmitting: false,
        stage: VerificationStage.Failed
      }));
      return false;
    }
    
    // Stage 3: Validate scopes
    const scopesValidated = await validateScopes();
    
    // Final state reset if needed (scopesValidated function handles its own state)
    if (!scopesValidated) {
      isSubmittingRef.current = false;
    }
    
    return scopesValidated;
  };
  
  // Reset specific errors
  const clearError = () => {
    setVerificationState(prev => ({
      ...prev,
      error: null
    }));
  };
  
  // Reset scopes error specifically
  const clearScopesError = () => {
    setVerificationState(prev => ({
      ...prev,
      scopesError: false
    }));
  };
  
  return {
    // State
    isSubmitting: verificationState.isSubmitting,
    error: verificationState.error,
    scopesError: verificationState.scopesError,
    verificationDetails: verificationState.verificationDetails,
    verificationStage: verificationState.stage,
    savedCredentials,
    
    // Main verification flow
    handleVerificationProcess,
    
    // Stage-specific verification methods (for advanced use)
    saveCredentials,
    validateToken,
    validateScopes,
    verifyCredentials, // Legacy combined approach
    
    // Helper actions
    clearError,
    clearScopesError,
    resetVerificationState
  };
}
