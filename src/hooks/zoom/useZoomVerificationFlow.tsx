
import { useVerificationFlow, VerificationStage, VerificationDetails } from './verification';

export { VerificationStage };
export type { VerificationDetails };

// This file is kept for backward compatibility
// The implementation has been refactored into smaller, more focused hooks
export function useZoomVerificationFlow() {
  return useVerificationFlow();
}
