
import { corsHeaders, createErrorResponse } from './cors.ts';

// Error categories for better handling and reporting
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  CONFIGURATION = 'configuration',
  NETWORK = 'network',
  RATE_LIMIT = 'rate_limit',
  VALIDATION = 'validation',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  UNKNOWN = 'unknown'
}

// Standard error interface for consistent error structure
export interface ZoomApiError {
  message: string;
  status: number;
  code: string;
  category: ErrorCategory;
  originalError?: any;
  retryable: boolean;
}

/**
 * Create a standardized error object
 */
export function createZoomApiError(
  message: string, 
  status: number = 400,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  code: string = 'error',
  originalError?: any,
  retryable: boolean = false
): ZoomApiError {
  return {
    message,
    status,
    code,
    category,
    originalError,
    retryable
  };
}

/**
 * Parse error from response or error object to standardized error
 */
export function parseError(error: any): ZoomApiError {
  // Handle various error types in a structured way
  if (error.message?.toLowerCase().includes('timeout') || error.message?.toLowerCase().includes('timed out')) {
    return createZoomApiError(
      'The operation timed out. The operation may still be processing in the background.',
      504,
      ErrorCategory.NETWORK,
      'timeout_error',
      error,
      true
    );
  }
  
  if (error.message?.includes('rate limit') || error.status === 429) {
    return createZoomApiError(
      'Rate limit exceeded. Please try again later.',
      429,
      ErrorCategory.RATE_LIMIT,
      'rate_limit_exceeded',
      error,
      true
    );
  }
  
  if (error.message?.toLowerCase().includes('network') || 
      error.message?.toLowerCase().includes('connection') ||
      error.message?.toLowerCase().includes('fetch failed')) {
    return createZoomApiError(
      'Network error occurred. Please check your connection and try again.',
      503,
      ErrorCategory.NETWORK,
      'network_error',
      error,
      true
    );
  }
  
  if (error.message?.toLowerCase().includes('token') || error.message?.toLowerCase().includes('auth') ||
      error.status === 401) {
    return createZoomApiError(
      'Authentication failed. Please reconnect your Zoom account.',
      401,
      ErrorCategory.AUTHENTICATION,
      'auth_error',
      error,
      false
    );
  }
  
  if (error.message?.toLowerCase().includes('scopes') || 
      error.message?.toLowerCase().includes('permission') ||
      error.status === 403) {
    return createZoomApiError(
      'Missing required permissions. Please update your Zoom app configuration with the required scopes.',
      403,
      ErrorCategory.AUTHORIZATION,
      'missing_scopes',
      error,
      false
    );
  }

  if (error.message?.toLowerCase().includes('account_id') || 
      error.message?.toLowerCase().includes('client_id') || 
      error.message?.toLowerCase().includes('client_secret')) {
    return createZoomApiError(
      'Invalid Zoom credentials. Please check your configuration.',
      400,
      ErrorCategory.CONFIGURATION,
      'invalid_credentials',
      error,
      false
    );
  }
  
  // Default error handling
  return createZoomApiError(
    error.message || 'An unknown error occurred',
    error.status || 400,
    ErrorCategory.UNKNOWN,
    'unknown_error',
    error,
    false
  );
}

/**
 * Create a user-friendly error response with proper headers and error details
 */
export function handleApiError(error: any): Response {
  const parsedError = parseError(error);
  
  console.error(`[API Error] [${parsedError.category}] [${parsedError.code}] ${parsedError.message}`);
  
  return createErrorResponse(
    parsedError.message,
    parsedError.status,
    {
      'X-Error-Code': parsedError.code,
      'X-Error-Category': parsedError.category,
      'X-Retryable': parsedError.retryable ? 'true' : 'false'
    }
  );
}
