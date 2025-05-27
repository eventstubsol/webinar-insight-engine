
// Reduced timeouts for minimal sync approach
export const OPERATION_TIMEOUT = 25000; // 25 seconds (down from 45s)
export const API_TIMEOUT = 20000; // 20 seconds for individual API calls

/**
 * Execute operation with timeout protection for minimal sync
 */
export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeout: number = OPERATION_TIMEOUT,
  onTimeout?: () => void
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }
      reject(new Error(`Operation timed out after ${timeout}ms`));
    }, timeout);
  });
  
  try {
    const result = await Promise.race([operation(), timeoutPromise]);
    clearTimeout(timeoutHandle);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle);
    throw error;
  }
}
