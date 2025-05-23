
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function CredentialStatus() {
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkCredentialStatus();
  }, []);

  const checkCredentialStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('zoom_credentials')
        .select('is_verified')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        setHasCredentials(false);
        setIsVerified(false);
      } else {
        setHasCredentials(true);
        setIsVerified(data.is_verified);
      }
    } catch (error) {
      console.error('Error checking credential status:', error);
      setHasCredentials(false);
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (!hasCredentials || !isVerified) {
    return (
      <Alert className="mb-6" variant="destructive">
        <AlertDescription className="flex items-center justify-between">
          <span>
            {!hasCredentials 
              ? "No Zoom account connected. Connect your account to start analyzing webinars."
              : "Your Zoom credentials need to be reverified. Please reconnect your account."}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/settings')}
          >
            Go to Settings
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
