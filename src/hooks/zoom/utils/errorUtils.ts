
import { WebinarErrorDetails } from '../types/webinarTypes';

/**
 * Enhance error message for better user experience
 */
export function enhanceErrorMessage(err: any): string {
  let errorMessage = err.message || 'An error occurred while fetching webinars';
  
  // Provide more helpful error messages based on common patterns
  if (errorMessage.includes('credentials not configured')) {
    return 'Zoom credentials not configured. Please complete the Zoom setup wizard.';
  } else if (errorMessage.includes('capabilities')) {
    return 'Your Zoom account does not have webinar capabilities enabled. This requires a paid Zoom plan.';
  } else if (errorMessage.includes('scopes') || errorMessage.includes('scope') || errorMessage.includes('4711')) {
    return 'Missing required OAuth scopes in your Zoom App. Update your Zoom Server-to-Server OAuth app to include: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin';
  }
  
  return errorMessage;
}

/**
 * Parse error to get detailed error information
 */
export function parseErrorDetails(error: Error | null): WebinarErrorDetails {
  if (!error) {
    return {
      isMissingCredentials: false,
      isCapabilitiesError: false,
      isScopesError: false,
      missingSecrets: []
    };
  }
  
  const errorMessage = error.message || '';
  
  return {
    isMissingCredentials: errorMessage.includes('credentials not configured'),
    isCapabilitiesError: errorMessage.includes('capabilities'),
    isScopesError: errorMessage.includes('scopes') || 
                  errorMessage.includes('scope') || 
                  errorMessage.includes('4711'),
    missingSecrets: []
  };
}
