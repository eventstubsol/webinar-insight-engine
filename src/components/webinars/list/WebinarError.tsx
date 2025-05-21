
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

interface WebinarErrorProps {
  error: Error | null;
}

export const WebinarError: React.FC<WebinarErrorProps> = ({ error }) => {
  if (!error) return null;
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error loading webinars</AlertTitle>
      <AlertDescription>
        {error.message || 'Failed to load webinars from Zoom. Please check your Zoom API configuration in the Supabase dashboard.'}
      </AlertDescription>
      <AlertDescription className="mt-2 text-xs">
        You need to configure a Server-to-Server OAuth app in Zoom Marketplace with the proper scopes (webinar:read, webinar:write).
        Make sure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET are properly set in your Supabase Edge Functions secrets.
      </AlertDescription>
    </Alert>
  );
};
