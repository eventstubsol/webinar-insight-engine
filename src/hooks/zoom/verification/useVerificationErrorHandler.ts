
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useVerificationErrorHandler(timeoutCallback?: () => void) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Set up a timeout for the verification process
  const setupVerificationTimeout = useCallback((timeout: number = 30000) => {
    setIsVerifying(true);
    
    // Clear any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Set a new timeout
    const id = setTimeout(() => {
      setIsVerifying(false);
      if (timeoutCallback) {
        timeoutCallback();
      }
    }, timeout);
    
    setTimeoutId(id);
  }, [timeoutId, timeoutCallback]);

  // Clear the timeout
  const clearVerificationTimeout = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVerifying(false);
  }, [timeoutId]);

  // Update submitting state
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setIsVerifying(isSubmitting);
  }, []);

  // Handle showing an error toast
  const showErrorToast = useCallback((title: string, message: string) => {
    toast({
      title,
      description: message,
      variant: 'destructive'
    });
  }, [toast]);

  // Handle showing a success toast
  const showSuccessToast = useCallback((email?: string) => {
    const message = email 
      ? `Successfully connected to Zoom account: ${email}` 
      : 'Successfully connected to Zoom account';
    
    toast({
      title: 'Verification Successful',
      description: message,
      variant: 'success'
    });
  }, [toast]);

  // Determine appropriate error messages for different error contexts
  const determineErrorMessage = useCallback((err: Error | any, context: 'token' | 'scopes' | 'save' = 'token') => {
    const message = err?.message || 'An unknown error occurred';
    
    // Default error messages for each context
    const defaultMessages = {
      token: 'Failed to validate API credentials. Please check your Account ID, Client ID, and Client Secret.',
      scopes: 'Your Zoom app is missing required OAuth scopes. Please update your app configuration.',
      save: 'Failed to save credentials. Please try again later.'
    };
    
    // Check for specific error patterns
    if (message.includes('401') || message.includes('unauthorized') || message.includes('invalid_client')) {
      return 'Authentication failed. Please check your credentials and try again.';
    }
    
    if (message.includes('403') || message.includes('forbidden')) {
      return 'Your account does not have permission to access Zoom Webinars. Please check your account type and permissions.';
    }
    
    if (message.includes('429') || message.includes('rate limit')) {
      return 'Rate limit exceeded. Please try again in a few minutes.';
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'The request timed out. Please check your internet connection and try again.';
    }
    
    if (message.includes('network') || message.includes('NETWORK_ERROR')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    // If no specific pattern is matched, return context-specific default message
    return message.includes('Failed to') ? message : defaultMessages[context];
  }, []);

  // Function to check if we're currently submitting
  const isSubmitting = useCallback(() => {
    return isVerifying;
  }, [isVerifying]);

  return {
    setupVerificationTimeout,
    clearVerificationTimeout,
    setSubmitting,
    determineErrorMessage,
    showErrorToast,
    showSuccessToast,
    isVerifying,
    isSubmitting
  };
}
