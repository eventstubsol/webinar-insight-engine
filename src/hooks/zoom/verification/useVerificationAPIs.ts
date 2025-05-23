
import { useCallback } from 'react';
import { ZoomCredentials } from './types';

// Define API result types
interface ApiResult {
  success: boolean;
  error?: string;
  data?: any;
  isScopesError?: boolean;
}

export function useVerificationAPIs() {
  // Validate that we can generate a token with the given credentials
  const validateToken = useCallback(async (credentials: ZoomCredentials): Promise<ApiResult> => {
    try {
      const response = await fetch('/functions/zoom-api/credentials/validate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        throw new Error(`Validation failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Unknown token validation error'
        };
      }
      
      return {
        success: true,
        data: data
      };
    } catch (err: any) {
      console.error('Token validation error:', err);
      return {
        success: false,
        error: err.message || 'Failed to validate token'
      };
    }
  }, []);
  
  // Validate that the token has the required OAuth scopes
  const validateScopes = useCallback(async (credentials: ZoomCredentials): Promise<ApiResult> => {
    try {
      const response = await fetch('/functions/zoom-api/credentials/validate-scopes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        throw new Error(`Scope validation failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Unknown scope validation error',
          isScopesError: true
        };
      }
      
      return {
        success: true,
        data: {
          // Ensure we have a scopes property
          scopes: data.scopes || []
        }
      };
    } catch (err: any) {
      console.error('Scope validation error:', err);
      return {
        success: false,
        error: err.message || 'Failed to validate OAuth scopes',
        isScopesError: true
      };
    }
  }, []);
  
  // Save credentials to the backend
  const saveCredentials = useCallback(async (credentials: ZoomCredentials): Promise<ApiResult> => {
    try {
      const response = await fetch('/functions/zoom-api/credentials/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        throw new Error(`Save credentials failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Unknown save credentials error'
        };
      }
      
      return {
        success: true,
        data: {
          user: data.user || {
            email: data.user_email
          },
          user_email: data.user_email
        }
      };
    } catch (err: any) {
      console.error('Save credentials error:', err);
      return {
        success: false,
        error: err.message || 'Failed to save credentials'
      };
    }
  }, []);
  
  return {
    validateToken,
    validateScopes,
    saveCredentials
  };
}
