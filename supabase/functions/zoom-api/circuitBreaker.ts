
/**
 * Enhanced circuit breaker implementation with persistent state tracking
 */

// Circuit breaker states
export enum CircuitState {
  CLOSED = 'closed',   // Normal operation
  OPEN = 'open',       // Failing, rejecting requests
  HALF_OPEN = 'half_open' // Testing if system recovered
}

// Default settings for the circuit breaker
const DEFAULT_FAILURE_THRESHOLD = 3;    // Number of failures before opening the circuit
const DEFAULT_RESET_TIMEOUT = 60000;    // Time in ms before trying half-open state (1 minute)
const DEFAULT_HALF_OPEN_REQUESTS = 1;   // Number of requests to try in half-open state

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold: number;   // How many failures before opening
  resetTimeout: number;       // Time before trying half-open (ms)
  halfOpenRequests: number;   // How many requests to allow in half-open
  name: string;               // Name for tracking and logging
}

// In-memory circuit breaker state
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number | null = null;
  private halfOpenAttempts: number = 0;
  private readonly config: CircuitBreakerConfig;
  
  constructor(config?: Partial<CircuitBreakerConfig>) {
    // Default configuration with overrides
    this.config = {
      failureThreshold: DEFAULT_FAILURE_THRESHOLD,
      resetTimeout: DEFAULT_RESET_TIMEOUT,
      halfOpenRequests: DEFAULT_HALF_OPEN_REQUESTS,
      name: 'default',
      ...config
    };
  }
  
  /**
   * Checks if the circuit allows a request
   */
  public canRequest(): boolean {
    this.updateState();
    
    if (this.state === CircuitState.CLOSED) {
      return true;
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Allow limited requests in half-open state
      if (this.halfOpenAttempts < this.config.halfOpenRequests) {
        this.halfOpenAttempts++;
        return true;
      }
      return false;
    } else {
      // Circuit is open, don't allow requests
      return false;
    }
  }
  
  /**
   * Record a successful request
   */
  public recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      // Success in half-open state resets the circuit
      console.log(`[CircuitBreaker:${this.config.name}] Success in half-open state, closing circuit`);
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.halfOpenAttempts = 0;
      this.lastFailureTime = null;
    } else if (this.state === CircuitState.CLOSED) {
      // Reset any accumulated failures in closed state
      this.failureCount = 0;
    }
  }
  
  /**
   * Record a failed request
   */
  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    // Check if we need to open the circuit
    if (this.state === CircuitState.CLOSED && 
        this.failureCount >= this.config.failureThreshold) {
      console.warn(`[CircuitBreaker:${this.config.name}] Threshold reached (${this.failureCount} failures), opening circuit`);
      this.state = CircuitState.OPEN;
    } else if (this.state === CircuitState.HALF_OPEN) {
      // Failed while testing in half-open, back to open
      console.warn(`[CircuitBreaker:${this.config.name}] Failed in half-open state, reopening circuit`);
      this.state = CircuitState.OPEN;
      this.halfOpenAttempts = 0;
    }
  }
  
  /**
   * Get the current circuit state
   */
  public getState(): CircuitState {
    this.updateState();
    return this.state;
  }
  
  /**
   * Get detailed status for diagnostics
   */
  public getStatus(): any {
    this.updateState();
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenAttempts: this.halfOpenAttempts,
      config: this.config
    };
  }
  
  /**
   * Reset the circuit breaker to closed state
   */
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
  }
  
  /**
   * Update circuit state based on timing
   */
  private updateState(): void {
    // If open and reset timeout passed, move to half-open
    if (this.state === CircuitState.OPEN && 
        this.lastFailureTime !== null &&
        Date.now() - this.lastFailureTime > this.config.resetTimeout) {
      console.log(`[CircuitBreaker:${this.config.name}] Reset timeout elapsed, moving to half-open state`);
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenAttempts = 0;
    }
  }
}

// Create a registry of circuit breakers for different endpoints
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();
  
  /**
   * Get a circuit breaker for a specific name, creating it if needed
   */
  public getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({
        name,
        ...config
      }));
    }
    return this.breakers.get(name)!;
  }
  
  /**
   * Get status of all circuit breakers
   */
  public getAllStatus(): Record<string, any> {
    const result: Record<string, any> = {};
    this.breakers.forEach((breaker, name) => {
      result[name] = breaker.getStatus();
    });
    return result;
  }
}

// Global registry instance
export const circuitRegistry = new CircuitBreakerRegistry();
