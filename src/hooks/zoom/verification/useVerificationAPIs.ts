
import { useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { VerificationStage, ZoomCredentials } from './types';
import { useToast } from "@/hooks/use-toast";

export function useVerificationAPIs() {
  const { toast } = useToast();
  
  // Refs for tracking request state
  const requestInProgressRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Helper to create a new abort controller
  const createAbortController = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
  };
  
  // Save credentials API call
  const saveCredentials = async (credentials: ZoomCredentials) => {
    if (requestInProgressRef.current) {
      console.log('Request already in progress, not starting a new save operation');
      return { success: false, error: 'Request already in progress' };
    }
    
    requestInProgressRef.current = true;
    createAbortController();
    
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
        return { success: false, error: saveError.message || 'Failed to save credentials' };
      }
      
      if (!saveData?.success) {
        console.error('Save credentials failed with data:', saveData);
        return { success: false, error: saveData?.error || 'Failed to save credentials' };
      }
      
      console.log('Credentials saved successfully');
      return { success: true, data: saveData };
      
    } catch (err: any) {
      console.error('Error saving credentials:', err);
      return { success: false, error: err.message || 'Failed to save credentials' };
    } finally {
      requestInProgressRef.current = false;
    }
  };
  
  // Validate token API call
  const validateToken = async () => {
    if (requestInProgressRef.current) {
      console.log('Request already in progress, not starting token validation');
      return { success: false, error: 'Request already in progress' };
    }
    
    requestInProgressRef.current = true;
    createAbortController();
    
    try {
      console.log('Validating token...');
      
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'validate-token'
        }
      });
      
      if (tokenError) {
        console.error('Token validation failed with error:', tokenError);
        return { success: false, error: tokenError.message || 'Token validation failed' };
      }
      
      // Log the full response for debugging
      console.log('Token validation response data:', tokenData);
      
      if (tokenData.success && tokenData.token_validated) {
        console.log('Token validation successful');
        return { success: true, data: tokenData };
      } else {
        return { 
          success: false, 
          error: tokenData.error || 'Token validation failed with an unknown error' 
        };
      }
    } catch (err: any) {
      console.error('Token validation error:', err);
      return { success: false, error: err.message || 'Failed to validate token' };
    } finally {
      requestInProgressRef.current = false;
    }
  };
  
  // Validate scopes API call
  const validateScopes = async () => {
    if (requestInProgressRef.current) {
      console.log('Request already in progress, not starting scope validation');
      return { success: false, error: 'Request already in progress' };
    }
    
    requestInProgressRef.current = true;
    createAbortController();
    
    try {
      console.log('Validating OAuth scopes...');
      
      const { data: scopesData, error: scopesError } = await supabase.functions.invoke('zoom-api', {
        body: { 
          action: 'validate-scopes'
        }
      });
      
      if (scopesError) {
        console.error('Scope validation failed with error:', scopesError);
        return { success: false, error: scopesError.message || 'Scope validation failed' };
      }
      
      // Log the full response for debugging
      console.log('Scopes validation response data:', scopesData);
      
      if (scopesData.success && scopesData.scopes_validated) {
        console.log('Scope validation successful:', scopesData);
        
        return { 
          success: true, 
          data: {
            user_email: scopesData.user_email || scopesData.user?.email,
            user: scopesData.user
          } 
        };
      } else if (scopesData.error?.toLowerCase()?.includes('scopes') || 
               (scopesData.headers && scopesData.headers['X-Error-Type'] === 'missing_scopes')) {
        // Handle scopes error
        return { 
          success: false, 
          error: scopesData.error || 'Missing required OAuth scopes',
          isScopesError: true 
        };
      } else {
        // General validation failure
        return { 
          success: false, 
          error: scopesData.error || 'Scope validation failed' 
        };
      }
    } catch (err: any) {
      console.error('Scope validation error:', err);
      
      // Check if this is a missing scopes error
      const isScopesError = err.message?.toLowerCase().includes('scopes') || 
          err.message?.toLowerCase().includes('scope') || 
          err.message?.toLowerCase().includes('4711');
          
      return { 
        success: false, 
        error: err.message || 'Failed to validate scopes',
        isScopesError
      };
    } finally {
      requestInProgressRef.current = false;
    }
  };
  
  // Legacy combined verification for backward compatibility
  const verifyCredentials = async () => {
    if (requestInProgressRef.current) {
      console.log('Request already in progress, not starting a new verify operation');
      return { success: false, error: 'Request already in progress' };
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
        console.error('Verification failed with error:', verifyError);
        return { success: false, error: verifyError.message || 'Verification failed' };
      }
      
      // Log the full response for debugging
      console.log('Verification response data:', verifyData);
      
      if (verifyData.success || verifyData.verified) {
        console.log('Verification successful:', verifyData);
        
        return { 
          success: true, 
          data: {
            user_email: verifyData.user_email || verifyData.user?.email,
            user: verifyData.user
          }
        };
      } else if (verifyData.code === 'missing_scopes' || 
               verifyData.error?.toLowerCase().includes('scopes') || 
               verifyData.details?.code === 4711) {
        // Handle scopes error
        return { 
          success: false, 
          error: verifyData.error || 'Missing required OAuth scopes',
          isScopesError: true
        };
      } else {
        // General verification failure
        return { 
          success: false, 
          error: verifyData.error || 'Verification failed' 
        };
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      
      // Check if this is a missing scopes error
      const isScopesError = err.message?.toLowerCase().includes('scopes') || 
          err.message?.toLowerCase().includes('scope') || 
          err.message?.toLowerCase().includes('4711');
          
      return { 
        success: false, 
        error: err.message || 'Verification failed',
        isScopesError
      };
    } finally {
      requestInProgressRef.current = false;
    }
  };
  
  // Cleanup function to abort any pending requests
  const abortPendingRequests = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    requestInProgressRef.current = false;
  };
  
  return {
    saveCredentials,
    validateToken,
    validateScopes,
    verifyCredentials,
    abortPendingRequests,
    isRequestInProgress: () => requestInProgressRef.current
  };
}
