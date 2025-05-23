
// Background task processing utility for Zoom API edge functions
// This allows long-running operations to continue after response is sent

/**
 * Tracks active background tasks
 */
interface BackgroundTaskTracker {
  activeTasks: Map<string, Promise<any>>;
  addTask(taskId: string, taskPromise: Promise<any>): void;
  removeTask(taskId: string): void;
  getActiveTasksCount(): number;
}

// Global tracker for all background tasks
export const taskTracker: BackgroundTaskTracker = {
  activeTasks: new Map<string, Promise<any>>(),
  
  addTask(taskId: string, taskPromise: Promise<any>) {
    this.activeTasks.set(taskId, taskPromise);
    console.log(`[BackgroundTasks] Added task ${taskId}, active tasks: ${this.getActiveTasksCount()}`);
  },
  
  removeTask(taskId: string) {
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.delete(taskId);
      console.log(`[BackgroundTasks] Completed task ${taskId}, active tasks: ${this.getActiveTasksCount()}`);
    }
  },
  
  getActiveTasksCount() {
    return this.activeTasks.size;
  }
};

/**
 * Execute a task in the background using Deno's EdgeRuntime.waitUntil
 * This allows the function to return a response while the task continues
 */
export function executeInBackground<T>(
  taskId: string,
  taskFn: () => Promise<T>
): Promise<T> {
  const taskPromise = taskFn()
    .then(result => {
      taskTracker.removeTask(taskId);
      return result;
    })
    .catch(error => {
      console.error(`[BackgroundTasks] Task ${taskId} failed:`, error);
      taskTracker.removeTask(taskId);
      throw error;
    });

  taskTracker.addTask(taskId, taskPromise);
  
  try {
    // Use Deno.EdgeRuntime.waitUntil if available (Supabase Edge Runtime)
    if (typeof Deno !== 'undefined' && 'EdgeRuntime' in Deno) {
      // @ts-ignore: EdgeRuntime exists in Supabase but TS definition may not be available
      Deno.EdgeRuntime.waitUntil(taskPromise);
    }
  } catch (err) {
    console.warn('[BackgroundTasks] EdgeRuntime.waitUntil not available:', err.message);
  }
  
  return taskPromise;
}

// Setup shutdown event listener to log information about in-progress tasks
if (typeof addEventListener !== 'undefined') {
  addEventListener('beforeunload', (event) => {
    const taskCount = taskTracker.getActiveTasksCount();
    if (taskCount > 0) {
      console.log(`[BackgroundTasks] Function shutting down with ${taskCount} active tasks`);
    }
  });
}
