
import { toast } from '@/hooks/use-toast';

export const OPERATION_TIMEOUT = 90000; // Increased to 90 seconds
export const PROGRESS_UPDATE_INTERVAL = 5000;

export interface ProgressStage {
  delay: number;
  message: string;
}

export const SYNC_PROGRESS_STAGES: ProgressStage[] = [
  { delay: 5000, message: "Fetching webinars from Zoom..." },
  { delay: 15000, message: "Processing webinar data..." },
  { delay: 30000, message: "Enhancing with additional details..." },
  { delay: 45000, message: "Saving to database..." },
  { delay: 60000, message: "Almost done, finalizing sync..." },
  { delay: 75000, message: "Completing final operations..." }
];

export class OperationManager {
  private progressTimers: number[] = [];
  private progressToast: any;

  async executeWithTimeout<T>(
    operation: () => Promise<T>, 
    timeoutMs: number = OPERATION_TIMEOUT,
    onTimeout?: () => void
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
    } catch (error: any) {
      clearTimeout(timeoutId!);
      
      if (error.message?.includes('timed out') && onTimeout) {
        onTimeout();
      }
      
      throw error;
    }
  }

  startProgressFeedback(progressCallback?: (stage: string) => void) {
    SYNC_PROGRESS_STAGES.forEach((stage) => {
      const timer = setTimeout(() => {
        if (progressCallback) {
          progressCallback(stage.message);
        }
      }, stage.delay) as unknown as number;
      this.progressTimers.push(timer);
    });
  }

  stopProgressFeedback() {
    this.progressTimers.forEach(timer => clearTimeout(timer));
    this.progressTimers = [];
    
    if (this.progressToast) {
      this.progressToast.dismiss();
      this.progressToast = null;
    }
  }

  showProgressToast(message: string) {
    if (this.progressToast) {
      this.progressToast.dismiss();
    }
    
    this.progressToast = toast({
      title: "Syncing webinars",
      description: message,
      duration: 0, // Don't auto-dismiss
    });
  }

  showSuccessToast(message: string, description?: string) {
    this.stopProgressFeedback();
    
    toast({
      title: message,
      description: description,
      variant: 'default'
    });
  }

  showErrorToast(title: string, description: string, variant: 'destructive' | 'warning' = 'destructive') {
    this.stopProgressFeedback();
    
    toast({
      title,
      description,
      variant
    });
  }
}

export const operationManager = new OperationManager();
