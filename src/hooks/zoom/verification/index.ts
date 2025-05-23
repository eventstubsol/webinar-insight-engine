
// Export the needed verification hooks and types
export { VerificationStage, type VerificationState, type VerificationDetails, type ZoomCredentials } from './types';
export { useVerificationState } from './useVerificationState';
export { useVerificationAPIs } from './useVerificationAPIs';
export { useVerificationErrorHandler } from './useVerificationErrorHandler';
export { useVerificationFlow } from './useVerificationFlow';

// Export circuit breaker states for use in the frontend
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

// Export error categories for better frontend handling
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
