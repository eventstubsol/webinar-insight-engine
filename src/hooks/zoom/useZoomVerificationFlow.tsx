
import { useVerificationFlow, VerificationStage, VerificationDetails, ZoomCredentials } from './verification';

export { VerificationStage };
export type { VerificationDetails, ZoomCredentials as ZoomVerificationCredentials };

// This file is kept for backward compatibility
// The implementation has been refactored into smaller, more focused hooks
export function useZoomVerificationFlow() {
  const verificationFlow = useVerificationFlow();
  
  // Ensure all properties needed by useZoomIntegrationWizard are included
  return {
    ...verificationFlow,
    // Ensure these specific properties exist
    scopesError: verificationFlow.verificationState.scopesError,
    verificationStage: verificationFlow.currentStage,
    savedCredentials: null, // This will be populated by the useZoomCredentialsLoader
    handleVerificationProcess: verificationFlow.handleVerificationProcess,
    clearScopesError: verificationFlow.clearScopesError
  };
}
