
import { corsHeaders } from './cors.ts';

// Create a standardized error response
export function createErrorResponse(error: Error) {
  // Enhanced error response with more details and user-friendly messages
  let errorMessage = error.message || 'Unknown error';
  let errorCode = 500;
  let errorType = 'unknown_error';
  
  // Format error message for common issues
  if (errorMessage.includes('Account ID') || errorMessage.includes('account_id')) {
    errorMessage = 'Zoom Account ID is missing, invalid, or not correctly set.';
    errorType = 'account_id_error';
  } else if (errorMessage.includes('client credentials') || errorMessage.includes('invalid_client')) {
    errorMessage = 'Invalid Zoom Client ID or Client Secret. Please check your credentials.';
    errorType = 'credentials_error';
  } else if (errorMessage.includes('capabilities')) {
    errorMessage = 'Your Zoom account does not have webinar capabilities enabled. This requires a Zoom paid plan with webinars.';
    errorCode = 403;
    errorType = 'capabilities_error';
  } else if (errorMessage.includes('scopes')) {
    errorMessage = 'Missing required OAuth scopes in your Zoom App. Please update your Zoom Server-to-Server OAuth app to include: user:read:user:admin, user:read:user:master, webinar:read:webinar:admin, webinar:write:webinar:admin';
    errorCode = 403;
    errorType = 'scopes_error';
  } else if (errorMessage.includes('Unauthorized')) {
    errorMessage = 'You are not authorized to access this resource. Please log in again.';
    errorCode = 401;
    errorType = 'auth_error';
  }
  
  const errorResponse = {
    error: errorMessage,
    code: errorType
  };
  
  return new Response(JSON.stringify(errorResponse), {
    status: errorCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
