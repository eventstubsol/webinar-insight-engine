
import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { createErrorResponse, createSuccessResponse } from "./cors.ts";
import { 
  ZoomApiClient,
  getZoomJwtToken
} from "./auth/index.ts";
import {
  handleSaveCredentials,
  handleCheckCredentialsStatus,
  getZoomCredentials,
  verifyZoomCredentials,
  handleVerifyCredentials,
  handleValidateToken,
  handleValidateScopes,
  handleGetCredentials,
  updateCredentialsVerification
} from "./credentials/index.ts";
import { 
  handleListWebinars,
  handleGetWebinar,
  handleGetParticipants,
  handleUpdateWebinarParticipants,
  handleGetWebinarInstances,
  handleGetInstanceParticipants,
  handleGetWebinarExtendedData
} from "./webinar-operations/index.ts";
import { executeInBackground } from './backgroundTasks.ts';
import { handleApiError, ErrorCategory } from './errorHandling.ts';
import { CircuitState, circuitRegistry } from './circuitBreaker.ts';
import { RateLimitCategory, rateRegistry } from './rateLimiter.ts';

// Operation timeout settings (default, can be overridden for specific operations)
const DEFAULT_OPERATION_TIMEOUT = 30000; // 30 seconds
const EXTENDED_OPERATION_TIMEOUT = 60000; // 60 seconds for heavier operations

// Generate a unique request ID for tracking
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

// Helper to execute a function with timeout and error handling
export async function executeWithTimeout<T>(
  operation: () => Promise<T>, 
  timeoutMs: number, 
  operationName: string,
  requestId: string
): Promise<T> {
  console.log(`[zoom-api:router] [${requestId}] Starting operation ${operationName} with ${timeoutMs}ms timeout`);
  
  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation ${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    // Race between the operation and timeout
    return await Promise.race([
      operation(),
      timeoutPromise
    ]);
  } catch (error) {
    console.error(`[zoom-api:router] [${requestId}] Operation ${operationName} failed:`, error);
    throw error;
  }
}

// Process actions that might take longer using background tasks
export async function processLongRunningAction(
  req: Request, 
  supabaseAdmin: any, 
  user: any, 
  body: any
) {
  const action = body?.action;
  const requestId = generateRequestId();
  
  console.log(`[zoom-api:router] [${requestId}] Processing long-running action: ${action}`);
  
  // Get the circuit breaker for this action
  const circuitBreaker = circuitRegistry.getBreaker(`api:${action}`);
  
  // Check circuit breaker state
  if (!circuitBreaker.canRequest()) {
    console.warn(`[zoom-api:router] [${requestId}] Circuit breaker open for ${action}, rejecting request`);
    return createErrorResponse(
      "Service temporarily unavailable due to previous failures. Please try again later.",
      503,
      { 'Retry-After': '60' }
    );
  }
  
  try {
    // For update webinar participants, start as a background task and return early
    if (action === "update-webinar-participants") {
      const credentials = await getZoomCredentials(supabaseAdmin, user.id);
      if (!credentials) {
        return createErrorResponse("Zoom credentials not found", 400);
      }
      
      // Verify credentials
      const token = await verifyZoomCredentials(credentials);
      const apiClient = new ZoomApiClient(token);
      
      // Start background task
      const backgroundTask = executeInBackground(
        `${action}_${requestId}`,
        async () => {
          try {
            const result = await handleUpdateWebinarParticipants(req, supabaseAdmin, user, credentials, apiClient);
            circuitBreaker.recordSuccess();
            return result;
          } catch (error) {
            circuitBreaker.recordFailure();
            console.error(`[zoom-api:router] [${requestId}] Background task failed:`, error);
            return handleApiError(error);
          }
        }
      );
      
      // Return immediate success response
      return createSuccessResponse({
        message: "Participant update started in the background",
        requestId,
        status: "processing"
      });
    }
    
    // Regular handling for non-background operations
    let response;
    const operationTimeout = action === "list-webinars" ? 
      EXTENDED_OPERATION_TIMEOUT : DEFAULT_OPERATION_TIMEOUT;
    
    // Route to the appropriate handler based on action
    switch (action) {
      case "save-credentials":
        response = await executeWithTimeout(
          () => handleSaveCredentials(req, supabaseAdmin, user, body),
          operationTimeout,
          "save-credentials",
          requestId
        );
        break;
      
      case "check-credentials-status":
        response = await executeWithTimeout(
          () => handleCheckCredentialsStatus(req, supabaseAdmin, user),
          operationTimeout,
          "check-credentials-status",
          requestId
        );
        break;
      
      case "get-credentials":
        response = await executeWithTimeout(
          () => handleGetCredentials(req, supabaseAdmin, user),
          operationTimeout,
          "get-credentials",
          requestId
        );
        break;
      
      case "validate-token":
        // New endpoint: only validate token generation
        console.log(`[zoom-api:router] [${requestId}] Getting credentials for token validation for user ${user.id}`);
        const tokenValidationCreds = await getZoomCredentials(supabaseAdmin, user.id);
        if (!tokenValidationCreds) {
          console.error(`[zoom-api:router] [${requestId}] No credentials found for user ${user.id} during token validation`);
          return createErrorResponse("Zoom credentials not found. Please save credentials first.", 400);
        }
        
        console.log(`[zoom-api:router] [${requestId}] Found credentials, proceeding with token validation for user ${user.id}`);
        response = await executeWithTimeout(
          () => handleValidateToken(req, supabaseAdmin, user, tokenValidationCreds),
          operationTimeout,
          "validate-token",
          requestId
        );
        break;
        
      case "validate-scopes":
        // New endpoint: only validate OAuth scopes
        console.log(`[zoom-api:router] [${requestId}] Getting credentials for scope validation for user ${user.id}`);
        const scopeValidationCreds = await getZoomCredentials(supabaseAdmin, user.id);
        if (!scopeValidationCreds) {
          console.error(`[zoom-api:router] [${requestId}] No credentials found for user ${user.id} during scope validation`);
          return createErrorResponse("Zoom credentials not found. Please save credentials first.", 400);
        }
        
        console.log(`[zoom-api:router] [${requestId}] Found credentials, proceeding with scope validation for user ${user.id}`);
        response = await executeWithTimeout(
          () => handleValidateScopes(req, supabaseAdmin, user, scopeValidationCreds),
          operationTimeout,
          "validate-scopes",
          requestId
        );
        break;
      
      case "verify-credentials":
        // Get Zoom credentials for this action
        console.log(`[zoom-api:router] [${requestId}] Getting credentials for verification for user ${user.id}`);
        const verifyCredentials = await getZoomCredentials(supabaseAdmin, user.id);
        if (!verifyCredentials) {
          console.error(`[zoom-api:router] [${requestId}] No credentials found for user ${user.id} during verification`);
          return createErrorResponse("Zoom credentials not found. Please save credentials first.", 400);
        }
        
        console.log(`[zoom-api:router] [${requestId}] Found credentials, proceeding with verification for user ${user.id}`);
        response = await executeWithTimeout(
          () => handleVerifyCredentials(req, supabaseAdmin, user, verifyCredentials),
          operationTimeout,
          "verify-credentials",
          requestId
        );
        break;
        
      default:
        // For other actions, we need to verify credentials first
        const credentials = await getZoomCredentials(supabaseAdmin, user.id);
        if (!credentials) {
          return createErrorResponse("Zoom credentials not found", 400);
        }

        try {
          // Verify credentials for actions that require valid credentials
          const token = await executeWithTimeout(
            () => verifyZoomCredentials(credentials),
            operationTimeout,
            "verify-zoom-credentials",
            requestId
          );
          
          // If token has changed, update it in the database
          if (token !== credentials.access_token) {
            await updateCredentialsVerification(supabaseAdmin, user.id, true, token);
            console.log(`[zoom-api:router] [${requestId}] Updated access token for user ${user.id}`);
          }
          
          // Create API client with rate limiting
          const apiClient = new ZoomApiClient(token);
          
          // Route to the correct action handler with timeout protection
          switch (action) {
            case "list-webinars":
              // Use rate limiting for this heavy operation
              response = await rateRegistry.executeWithRateLimit(
                RateLimitCategory.HEAVY,
                async () => {
                  return await executeWithTimeout(
                    () => handleListWebinars(req, supabaseAdmin, user, credentials, body.force_sync || false, apiClient),
                    EXTENDED_OPERATION_TIMEOUT,
                    "list-webinars",
                    requestId
                  );
                }
              );
              break;
              
            case "get-webinar":
              // Use medium rate limiting
              response = await rateRegistry.executeWithRateLimit(
                RateLimitCategory.MEDIUM,
                async () => {
                  return await executeWithTimeout(
                    () => handleGetWebinar(req, supabaseAdmin, user, credentials, body.id, apiClient),
                    operationTimeout,
                    "get-webinar",
                    requestId
                  );
                }
              );
              break;
              
            case "get-participants":
              // Use medium rate limiting
              response = await rateRegistry.executeWithRateLimit(
                RateLimitCategory.MEDIUM,
                async () => {
                  return await executeWithTimeout(
                    () => handleGetParticipants(req, supabaseAdmin, user, credentials, body.id, apiClient),
                    operationTimeout,
                    "get-participants",
                    requestId
                  );
                }
              );
              break;
              
            case "get-webinar-instances":
              response = await rateRegistry.executeWithRateLimit(
                RateLimitCategory.MEDIUM,
                async () => {
                  return await executeWithTimeout(
                    () => handleGetWebinarInstances(req, supabaseAdmin, user, credentials, body.webinar_id, apiClient),
                    operationTimeout,
                    "get-webinar-instances",
                    requestId
                  );
                }
              );
              break;
              
            case "get-instance-participants":
              response = await rateRegistry.executeWithRateLimit(
                RateLimitCategory.MEDIUM,
                async () => {
                  return await executeWithTimeout(
                    () => handleGetInstanceParticipants(req, supabaseAdmin, user, credentials, body.webinar_id, body.instance_id, apiClient),
                    operationTimeout,
                    "get-instance-participants",
                    requestId
                  );
                }
              );
              break;
              
            case "get-webinar-extended-data":
              response = await rateRegistry.executeWithRateLimit(
                RateLimitCategory.HEAVY,
                async () => {
                  return await executeWithTimeout(
                    () => handleGetWebinarExtendedData(req, supabaseAdmin, user, credentials, body.webinar_id, apiClient),
                    EXTENDED_OPERATION_TIMEOUT,
                    "get-webinar-extended-data",
                    requestId
                  );
                }
              );
              break;
              
            default:
              return createErrorResponse(`Unknown action: ${action}`, 400);
          }
        } catch (credentialError) {
          // If verification fails, mark credentials as invalid
          await updateCredentialsVerification(supabaseAdmin, user.id, false);
          console.error(`[zoom-api:router] [${requestId}] Credential verification failed for user ${user.id}:`, credentialError);
          return createErrorResponse(`Authentication failed: ${credentialError.message}`, 401);
        }
    }
    
    // Record success in circuit breaker
    circuitBreaker.recordSuccess();
    
    // Add request ID to response for tracking
    const responseData = await response.json();
    const enhancedResponse = createSuccessResponse({
      ...responseData,
      requestId
    }, response.status);
    
    return enhancedResponse;
  } catch (error) {
    // Record failure in circuit breaker
    circuitBreaker.recordFailure();
    
    console.error(`[zoom-api:router] [${requestId}] Error in ${action} action:`, error);
    return handleApiError(error);
  }
}

// The main router function with improved error handling and diagnostics
export async function routeRequest(req: Request, supabaseAdmin: any, user: any, body: any) {
  const action = body?.action;
  const requestId = generateRequestId();
  
  console.log(`[zoom-api:router] [${requestId}] Routing action: ${action}`);
  
  try {
    return await processLongRunningAction(req, supabaseAdmin, user, body);
  } catch (error) {
    console.error(`[zoom-api:router] [${requestId}] Unhandled error:`, error);
    return handleApiError(error);
  }
}
