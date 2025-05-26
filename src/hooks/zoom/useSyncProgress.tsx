
import { useState, useEffect, useRef } from 'react';
import { getSyncJobStatus } from './services/apiOperations';

interface SyncProgress {
  jobId: string | null;
  status: string;
  progress: number;
  totalItems: number;
  processedItems: number;
  isPolling: boolean;
  error: string | null;
  results: any;
}

export function useSyncProgress() {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    jobId: null,
    status: 'idle',
    progress: 0,
    totalItems: 0,
    processedItems: 0,
    isPolling: false,
    error: null,
    results: null
  });
  
  const pollingIntervalRef = useRef<number | null>(null);
  
  const startPolling = (jobId: string) => {
    console.log(`[useSyncProgress] Starting to poll job: ${jobId}`);
    
    setSyncProgress(prev => ({
      ...prev,
      jobId,
      status: 'pending',
      isPolling: true,
      error: null
    }));
    
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Start polling
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const status = await getSyncJobStatus(jobId);
        
        setSyncProgress(prev => ({
          ...prev,
          status: status.status,
          progress: status.progress || 0,
          totalItems: status.total_items || 0,
          processedItems: status.processed_items || 0,
          results: status.results,
          error: status.status === 'failed' ? status.error_details?.error : null
        }));
        
        // Stop polling if job is complete or failed
        if (status.status === 'completed' || status.status === 'failed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          setSyncProgress(prev => ({
            ...prev,
            isPolling: false
          }));
          
          console.log(`[useSyncProgress] Polling stopped for job: ${jobId}, final status: ${status.status}`);
        }
        
      } catch (error) {
        console.error(`[useSyncProgress] Error polling job ${jobId}:`, error);
        
        setSyncProgress(prev => ({
          ...prev,
          error: error.message,
          isPolling: false
        }));
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 2000); // Poll every 2 seconds
  };
  
  const stopPolling = () => {
    console.log('[useSyncProgress] Stopping polling');
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setSyncProgress(prev => ({
      ...prev,
      isPolling: false
    }));
  };
  
  const resetProgress = () => {
    console.log('[useSyncProgress] Resetting progress');
    
    stopPolling();
    
    setSyncProgress({
      jobId: null,
      status: 'idle',
      progress: 0,
      totalItems: 0,
      processedItems: 0,
      isPolling: false,
      error: null,
      results: null
    });
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);
  
  return {
    syncProgress,
    startPolling,
    stopPolling,
    resetProgress
  };
}
