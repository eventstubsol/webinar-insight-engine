
/**
 * Enhanced error handling utilities for Zoom operations
 */

export function enhanceErrorMessage(err: any): string {
  let errorMessage = err?.message || 'An error occurred while fetching webinars';
  
  if (errorMessage.includes('credentials not configured')) {
    return 'Zoom credentials not configured. Please complete the Zoom setup wizard.';
  } else if (errorMessage.includes('capabilities')) {
    return 'Your Zoom account does not have webinar capabilities enabled. This requires a paid Zoom plan.';
  } else if (errorMessage.includes('scopes') || errorMessage.includes('scope') || errorMessage.includes('4711')) {
    return 'Missing required OAuth scopes in your Zoom App. Update your Zoom Server-to-Server OAuth app to include: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin';
  }
  
  return errorMessage;
}

export function isCredentialsError(errorMessage: string): boolean {
  return errorMessage.includes('credentials not configured') || 
         errorMessage.includes('Authentication Error');
}

export function isScopesError(errorMessage: string): boolean {
  return errorMessage.includes('scopes') || 
         errorMessage.includes('scope') || 
         errorMessage.includes('4711');
}

export function isCapabilitiesError(errorMessage: string): boolean {
  return errorMessage.includes('capabilities');
}

export function isServerError(errorMessage: string): boolean {
  return errorMessage.includes('500') || 
         errorMessage.includes('Internal Server Error');
}

export function parseErrorDetails(error: Error | null) {
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
    isMissingCredentials: isCredentialsError(errorMessage),
    isCapabilitiesError: isCapabilitiesError(errorMessage),
    isScopesError: isScopesError(errorMessage),
    missingSecrets: []
  };
}
