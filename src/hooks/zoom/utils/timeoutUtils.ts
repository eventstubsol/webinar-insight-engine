
import { toast } from '@/hooks/use-toast';

// OPTIMIZED operation timeout - increased to work within new 60s edge function timeout
export const OPERATION_TIMEOUT = 50000; // 50 seconds - safely within 60s edge function timeout

/**
 * Execute a function with a timeout and optimized error handling
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
 * NEW: Batch processing helper with timeout protection
 */
export async function executeWithBatchTimeout<T>(
  items: T[],
  batchSize: number,
  processBatch: (batch: T[]) => Promise<T[]>,
  totalTimeoutMs: number
): Promise<T[]> {
  const startTime = Date.now();
  const results: T[] = [];
  
  console.log(`[executeWithBatchTimeout] Processing ${items.length} items in batches of ${batchSize}`);
  
  for (let i = 0; i < items.length; i += batchSize) {
    const remainingTime = totalTimeoutMs - (Date.now() - startTime);
    
    if (remainingTime <= 2000) { // Less than 2 seconds remaining
      console.warn(`[executeWithBatchTimeout] Insufficient time remaining (${remainingTime}ms), stopping batch processing`);
      // Add remaining items as-is
      results.push(...items.slice(i));
      break;
    }
    
    const batch = items.slice(i, i + batchSize);
    const batchStartTime = Date.now();
    
    try {
      const batchTimeout = Math.min(10000, remainingTime - 1000); // 10s max or remaining time minus buffer
      const timeoutPromise = new Promise<T[]>((_, reject) => 
        setTimeout(() => reject(new Error('Batch timeout')), batchTimeout)
      );
      
      const processedBatch = await Promise.race([
        processBatch(batch),
        timeoutPromise
      ]);
      
      results.push(...processedBatch);
      console.log(`[executeWithBatchTimeout] Batch ${Math.floor(i/batchSize) + 1} completed in ${Date.now() - batchStartTime}ms`);
      
    } catch (error) {
      console.error(`[executeWithBatchTimeout] Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
      // Add original batch items on failure
      results.push(...batch);
    }
  }
  
  console.log(`[executeWithBatchTimeout] Completed processing ${results.length} items in ${Date.now() - startTime}ms`);
  return results;
}
