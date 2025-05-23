
import { useVerificationFlow, VerificationStage, VerificationDetails } from './verification';

export { VerificationStage };
export type { VerificationDetails };

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
    savedCredentials: null // This will be populated by the useZoomCredentialsLoader
  };
}
