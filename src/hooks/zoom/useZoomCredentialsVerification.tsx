
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function useZoomCredentialsVerification() {
  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [scopesError, setScopesError] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  
  const verifyCredentials = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to verify Zoom credentials',
        variant: 'destructive'
      });
      return false;
    }
    
    setIsVerifying(true);
    setScopesError(false);
    setVerificationDetails(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('zoom-api', {
        body: { action: 'verify-credentials' }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data.success) {
        setVerified(true);
        setVerificationDetails(data);
        toast({
          title: 'Zoom API Connected',
          description: `Successfully connected as ${data.user?.email || 'Zoom User'}.`
        });
        return true;
      } else {
        // Check if it's specifically a scopes error
        if (data.code === 'missing_scopes' || 
            data.error?.toLowerCase().includes('scopes') || 
            data.details?.code === 4711) {
          setScopesError(true);
        }
        
        throw new Error(data.error || 'Verification failed');
      }
    } catch (err: any) {
      console.error('Verification error details:', err);
      
      // Check if the error message mentions scopes
      if (err.message?.toLowerCase().includes('scopes') || 
          err.message?.toLowerCase().includes('scope') || 
          (err.response?.data && err.response.data.code === 4711)) {
        setScopesError(true);
      }
      
      toast({
        title: 'Verification Failed',
        description: err.message || 'Could not verify Zoom API credentials',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };
  
  return {
    verifyCredentials,
    isVerifying,
    verified,
    scopesError,
    verificationDetails
  };
}
