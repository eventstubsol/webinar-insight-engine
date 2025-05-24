
// Timeout utilities for operation management
const OPERATION_TIMEOUT = 25000;

// Helper to execute a function with timeout
export async function executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number = OPERATION_TIMEOUT): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}
