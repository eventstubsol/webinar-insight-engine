
import { useRef, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

export function useVerificationErrorHandler(onTimeout: () => void) {
  const { toast } = useToast();
  const verificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
      isSubmittingRef.current = false;
    };
  }, []);
  
  // Set up a verification timeout with proper cleanup
  const setupVerificationTimeout = (timeoutMs: number = 45000) => {
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
    }
    
    verificationTimeoutRef.current = setTimeout(() => {
      if (isSubmittingRef.current) {
        console.log('Operation timed out');
        onTimeout();
        
        isSubmittingRef.current = false;
        
        toast({
          title: 'Operation Timed Out',
          description: 'The server took too long to respond. Please try again.',
          variant: 'destructive'
        });
      }
    }, timeoutMs);
  };
  
  // Clear timeout if exists
  const clearVerificationTimeout = () => {
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
      verificationTimeoutRef.current = null;
    }
  };
  
  // Set submitting state
  const setSubmitting = (isSubmitting: boolean) => {
    isSubmittingRef.current = isSubmitting;
  };
  
  // Helper function to determine user-friendly error messages
  const determineErrorMessage = (error: any, context: 'token' | 'scopes' | 'save'): string => {
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
    
    if (context === 'save') {
      return error.message || 'Failed to save Zoom API credentials';
    } else if (context === 'token') {
      if (message.includes('token')) {
        return 'Token generation failed. Please check your Zoom API credentials.';
      }
      return error.message || 'Failed to validate Zoom API credentials';
    } else if (context === 'scopes') {
      if (message.includes('scopes')) {
        return 'Missing required OAuth scopes. Please check your Zoom app configuration.';
      }
      return error.message || 'Failed to validate Zoom app permissions';
    }
    
    return error.message || `Failed during ${context} validation`;
  };
  
  // Show appropriate toast based on error
  const showErrorToast = (title: string, errorMessage: string) => {
    toast({
      title,
      description: errorMessage,
      variant: 'destructive'
    });
  };
  
  // Show success toast
  const showSuccessToast = (userEmail?: string) => {
    toast({
      title: 'Zoom Integration Successful',
      description: `Connected as ${userEmail || 'Zoom User'}`
    });
  };
  
  return {
    setupVerificationTimeout,
    clearVerificationTimeout,
    setSubmitting,
    determineErrorMessage,
    showErrorToast,
    showSuccessToast,
    isSubmitting: () => isSubmittingRef.current
  };
}
