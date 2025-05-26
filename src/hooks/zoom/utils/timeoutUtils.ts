
import { toast } from '@/hooks/use-toast';

// Increased operation timeout to 75 seconds (allowing for edge function's 90s timeout)
export const OPERATION_TIMEOUT = 75000;

/**
 * Execute a function with a timeout and progress feedback
 */
export async function executeWithTimeout<T>(
  operation: () => Promise<T>, 
  timeoutMs: number, 
  onTimeout: () => void
): Promise<T> {
  let timeoutId: number;
  
  try {
    const result = await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs) as unknown as number;
      })
    ]);
    
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    
    // If it's a timeout error, run the timeout callback
    if (error.message && error.message.includes('timed out')) {
      onTimeout();
    }
    
    throw error;
  }
}

/**
 * Execute a long-running operation with progress feedback
 */
export async function executeWithProgressFeedback<T>(
  operation: () => Promise<T>,
  progressCallback?: (stage: string) => void
): Promise<T> {
  const stages = [
    { delay: 5000, message: "Fetching webinars from Zoom..." },
    { delay: 15000, message: "Processing webinar data..." },
    { delay: 30000, message: "Enhancing with additional details..." },
    { delay: 45000, message: "Saving to database..." },
    { delay: 60000, message: "Almost done, finalizing sync..." }
  ];

  // Set up progress feedback
  const progressTimers: number[] = [];
  
  stages.forEach((stage, index) => {
    const timer = setTimeout(() => {
      if (progressCallback) {
        progressCallback(stage.message);
      }
    }, stage.delay) as unknown as number;
    progressTimers.push(timer);
  });

  try {
    const result = await executeWithTimeout(
      operation,
      OPERATION_TIMEOUT,
      () => {
        if (progressCallback) {
          progressCallback("Operation is taking longer than expected. Please wait...");
        }
      }
    );
    
    // Clear all progress timers
    progressTimers.forEach(timer => clearTimeout(timer));
    
    return result;
  } catch (error) {
    // Clear all progress timers
    progressTimers.forEach(timer => clearTimeout(timer));
    throw error;
  }
}
