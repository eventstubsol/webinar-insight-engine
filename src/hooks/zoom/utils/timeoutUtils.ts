
// Re-export from the new operation utils
export * from './operationUtils';

// Specific exports for backward compatibility
export const executeWithTimeout = (
  operation: () => Promise<any>, 
  timeoutMs?: number,
  onTimeout?: () => void
) => {
  const { operationManager } = require('./operationUtils');
  return operationManager.executeWithTimeout(operation, timeoutMs, onTimeout);
};

export const OPERATION_TIMEOUT = 90000;
