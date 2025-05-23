
import React from 'react';
import { AlertTriangle, Settings, X, RefreshCw, InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircuitBreakerState, ErrorCategory } from '@/hooks/zoom/verification';

interface WebinarErrorProps {
  errorMessage: string;
  errorDetails: {
    isMissingCredentials: boolean;
    isCapabilitiesError: boolean;
    isScopesError: boolean;
    missingSecrets: string[];
    errorCategory?: string;
    circuitBreakerState?: CircuitBreakerState;
    retryable?: boolean;
  };
  onSetupClick: () => void;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export const WebinarError: React.FC<WebinarErrorProps> = ({
  errorMessage,
  errorDetails,
  onSetupClick,
  onDismiss,
  onRetry
}) => {
  // Error title based on category
  const getErrorTitle = () => {
    if (errorDetails.isMissingCredentials) return 'Zoom API Connection Required';
    if (errorDetails.isCapabilitiesError) return 'Zoom Webinar Access Error';
    if (errorDetails.isScopesError) return 'Zoom API Permission Error';
    
    // Titles based on error category
    if (errorDetails.errorCategory) {
      switch (errorDetails.errorCategory) {
        case ErrorCategory.AUTHENTICATION:
          return 'Authentication Failed';
        case ErrorCategory.AUTHORIZATION:
          return 'Access Denied';
        case ErrorCategory.CONFIGURATION:
          return 'Configuration Error';
        case ErrorCategory.NETWORK:
          return 'Network Error';
        case ErrorCategory.RATE_LIMIT:
          return 'Rate Limit Exceeded';
        case ErrorCategory.SERVICE_UNAVAILABLE:
          return 'Service Unavailable';
        default:
          return 'Zoom API Error';
      }
    }
    
    return 'Zoom API Error';
  };
  
  // Generate appropriate icon based on error type
  const ErrorIcon = () => {
    if (errorDetails.errorCategory === ErrorCategory.SERVICE_UNAVAILABLE ||
        errorDetails.circuitBreakerState === CircuitBreakerState.OPEN) {
      return <RefreshCw className="h-4 w-4 text-red-600" />;
    }
    
    if (errorDetails.errorCategory === ErrorCategory.RATE_LIMIT) {
      return <InfoIcon className="h-4 w-4 text-amber-600" />;
    }
    
    return <AlertTriangle className="h-4 w-4" />;
  };
  
  // Circuit breaker specific messages
  const getCircuitBreakerMessage = () => {
    if (errorDetails.circuitBreakerState === CircuitBreakerState.OPEN) {
      return (
        <AlertDescription className="mt-2">
          <p className="font-semibold">Service protection enabled:</p>
          <ol className="list-decimal ml-5 mt-1 space-y-1">
            <li>The system has temporarily disabled Zoom API requests due to multiple failures</li>
            <li>This is an automatic protection mechanism that will reset shortly</li>
            <li>You can try again in a minute, or check your Zoom account settings</li>
          </ol>
        </AlertDescription>
      );
    }
    return null;
  };
  
  return (
    <Alert variant="destructive" className="relative mb-4">
      {onDismiss && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDismiss} 
          className="absolute right-2 top-2 p-0 h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <ErrorIcon />
      <AlertTitle>{getErrorTitle()}</AlertTitle>
      <AlertDescription>
        {errorMessage}
      </AlertDescription>
      
      {/* Circuit breaker specific message */}
      {getCircuitBreakerMessage()}
      
      {errorDetails.isMissingCredentials ? (
        <AlertDescription className="mt-2">
          <p className="font-semibold">Required configuration:</p>
          <ol className="list-decimal ml-5 mt-1 space-y-1">
            {errorDetails.isScopesError ? (
              <li className="text-amber-800">Update your Zoom Server-to-Server OAuth app to include required scopes</li>
            ) : (
              <li>Create a Server-to-Server OAuth app in the Zoom Marketplace with the proper scopes</li>
            )}
            <li>Add your Zoom API credentials to Supabase Edge Function secrets</li>
            <li>Make sure your Zoom account has webinar capabilities (requires a paid plan)</li>
          </ol>
          <Button variant="outline" onClick={onSetupClick} className="mt-2">
            <Settings className="h-4 w-4 mr-2" />
            View Setup Instructions
          </Button>
        </AlertDescription>
      ) : errorDetails.isCapabilitiesError ? (
        <AlertDescription className="mt-2">
          <p className="font-semibold">Your Zoom account does not have webinar capabilities:</p>
          <ol className="list-decimal ml-5 mt-1 space-y-1">
            <li>Webinar functionality requires a Zoom paid plan that includes webinars</li>
            <li>Verify your Zoom account type and enabled features</li>
            <li>Contact Zoom support if you believe you should have webinar access</li>
          </ol>
        </AlertDescription>
      ) : errorDetails.isScopesError ? (
        <AlertDescription className="mt-2">
          <p className="font-semibold">Missing required OAuth scopes:</p>
          <ol className="list-decimal ml-5 mt-1 space-y-1">
            <li>Your Zoom Server-to-Server OAuth app is missing required scopes</li>
            <li>Make sure you add <strong>ALL</strong> of these scopes to your Zoom app:</li>
            <ul className="list-disc ml-5 mt-1 space-y-1 text-amber-800">
              <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">user:read:user:admin</code></li>
              <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">user:read:user:master</code></li>
              <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">webinar:read:webinar:admin</code></li>
              <li><code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs font-mono">webinar:write:webinar:admin</code></li>
            </ul>
            <li>Save changes and re-activate your app</li>
            <li>Return to the Setup tab to verify your credentials</li>
          </ol>
          <Button variant="outline" onClick={onSetupClick} className="mt-2">
            <Settings className="h-4 w-4 mr-2" />
            View Setup Instructions
          </Button>
        </AlertDescription>
      ) : (
        <div className="flex flex-col space-y-2 mt-2">
          <AlertDescription className="text-xs">
            {errorDetails.retryable ? 
              "This error is temporary. You can try again in a moment." : 
              "This may require updating your Zoom API settings or reconnecting your account."}
          </AlertDescription>
          
          {errorDetails.retryable && onRetry && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry
              </Button>
            </div>
          )}
        </div>
      )}
    </Alert>
  );
};
