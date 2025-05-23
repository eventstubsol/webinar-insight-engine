
import { useState, useRef, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useZoomCredentialsLoader } from '@/hooks/zoom/useZoomCredentialsLoader';
import { ZoomCredentials, VerificationDetails } from '@/components/webinars/zoom-integration/types';

export function useZoomVerificationFlow() {
  const { toast } = useToast();
  const { savedCredentials, fetchSavedCredentials } = useZoomCredentialsLoader();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopesError, setScopesError] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<VerificationDetails | null>(null);
  
  // Refs for tracking request state
  const verificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const requestInProgressRef = useRef<boolean>(false);
  
  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
      }
      isSubmittingRef.current = false;
      requestInProgressRef.current = false;
    };
  }, []);
  
  const saveCredentials = async (credentials: ZoomCredentials): Promise<boolean> => {
    if (requestInProgressRef.current) {
      console.log('Request already in progress, not starting a new save operation');
      return false;
    }
    
    // Reset state
    setError(null);
    setScopesError(false);
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    requestInProgressRef.current = true;
    
    // Set a timeout to prevent hanging submission
    if (verificationTimeoutRef.current) {
      clearTimeout(verificationTimeoutRef.current);
    }
    
    verificationTimeoutRef.current = setTimeout(() => {
      if (isSubmittingRef.current) {
        console.log('Operation timed out');
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        requestInProgressRef.current = false;
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
      
      if (!saveData?.success) {
        throw new Error(saveData?.error || 'Failed to save credentials');
      }
      
      console.log('Credentials saved successfully');
      return true;
      
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
      
      return false;
    } finally {
      // Don't set isSubmitting to false here as we might continue to verification
      requestInProgressRef.current = false;
    }
  };
  
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
        throw new Error(verifyError.message || 'Verification failed');
      }
      
      if (verifyData.success || verifyData.verified) {
        console.log('Verification successful:', verifyData);
        setVerificationDetails(verifyData);
        
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
        setScopesError(true);
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
      }
      
      setError(err.message || 'Failed to verify Zoom credentials');
      
      toast({
        title: 'Verification Failed',
        description: err.message || 'Could not verify Zoom API credentials',
        variant: 'destructive'
      });
      
      return false;
    } finally {
      if (verificationTimeoutRef.current) {
        clearTimeout(verificationTimeoutRef.current);
        verificationTimeoutRef.current = null;
      }
      
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      requestInProgressRef.current = false;
    }
  };
  
  const handleVerificationProcess = async (credentials: ZoomCredentials) => {
    // First, save credentials
    const saveSuccess = await saveCredentials(credentials);
    
    if (saveSuccess) {
      // Then verify if save was successful
      return await verifyCredentials();
    }
    
    // If save failed, don't attempt verification
    setIsSubmitting(false);
    isSubmittingRef.current = false;
    return false;
  };
  
  return {
    isSubmitting,
    error,
    scopesError,
    verificationDetails,
    savedCredentials,
    handleVerificationProcess,
    setScopesError,
    setError
  };
}
