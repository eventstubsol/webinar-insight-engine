
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

// Operation timeout (15 seconds - reduced from 30 to prevent client timeouts)
const OPERATION_TIMEOUT = 15000;

// Helper to execute a function with timeout
export async function executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  console.log(`[zoom-api:router] Starting operation ${operationName} with ${timeoutMs}ms timeout`);
  
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        console.error(`[zoom-api:router] Operation ${operationName} timed out after ${timeoutMs}ms`);
        reject(new Error(`Operation ${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

// The main router function
export async function routeRequest(req: Request, supabaseAdmin: any, user: any, body: any) {
  const action = body?.action;
  console.log(`[zoom-api:router] Routing action: ${action}`);
  
  // Route to the appropriate handler based on action with timeout protection
  try {
    let response;
    
    switch (action) {
      case "save-credentials":
        response = await executeWithTimeout(
          () => handleSaveCredentials(req, supabaseAdmin, user, body),
          OPERATION_TIMEOUT,
          "save-credentials"
        );
        break;
      
      case "check-credentials-status":
        response = await executeWithTimeout(
          () => handleCheckCredentialsStatus(req, supabaseAdmin, user),
          OPERATION_TIMEOUT,
          "check-credentials-status"
        );
        break;
      
      case "get-credentials":
        response = await executeWithTimeout(
          () => handleGetCredentials(req, supabaseAdmin, user),
          OPERATION_TIMEOUT,
          "get-credentials"
        );
        break;
      
      case "verify-credentials":
        // Get Zoom credentials for this action
        const verifyCredentials = await getZoomCredentials(supabaseAdmin, user.id);
        if (!verifyCredentials) {
          return createErrorResponse("Zoom credentials not found", 400);
        }
        
        response = await executeWithTimeout(
          () => handleVerifyCredentials(req, supabaseAdmin, user, verifyCredentials),
          OPERATION_TIMEOUT,
          "verify-credentials"
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
            OPERATION_TIMEOUT,
            "verify-zoom-credentials"
          );
          
          // If token has changed, update it in the database
          if (token !== credentials.access_token) {
            await updateCredentialsVerification(supabaseAdmin, user.id, true, token);
            console.log(`Updated access token for user ${user.id}`);
          }
          
          // Create API client with rate limiting
          const apiClient = new ZoomApiClient(token);
          
          // Route to the correct action handler with timeout protection
          switch (action) {
            case "list-webinars":
              response = await executeWithTimeout(
                () => handleListWebinars(req, supabaseAdmin, user, credentials, body.force_sync || false, apiClient),
                OPERATION_TIMEOUT,
                "list-webinars"
              );
              break;
              
            case "get-webinar":
              response = await executeWithTimeout(
                () => handleGetWebinar(req, supabaseAdmin, user, credentials, body.id, apiClient),
                OPERATION_TIMEOUT,
                "get-webinar"
              );
              break;
              
            case "get-participants":
              response = await executeWithTimeout(
                () => handleGetParticipants(req, supabaseAdmin, user, credentials, body.id, apiClient),
                OPERATION_TIMEOUT,
                "get-participants"
              );
              break;
              
            case "update-webinar-participants":
              response = await executeWithTimeout(
                () => handleUpdateWebinarParticipants(req, supabaseAdmin, user, credentials, apiClient),
                OPERATION_TIMEOUT,
                "update-webinar-participants"
              );
              break;
              
            case "get-webinar-instances":
              response = await executeWithTimeout(
                () => handleGetWebinarInstances(req, supabaseAdmin, user, credentials, body.webinar_id, apiClient),
                OPERATION_TIMEOUT,
                "get-webinar-instances"
              );
              break;
              
            case "get-instance-participants":
              response = await executeWithTimeout(
                () => handleGetInstanceParticipants(req, supabaseAdmin, user, credentials, body.webinar_id, body.instance_id, apiClient),
                OPERATION_TIMEOUT,
                "get-instance-participants"
              );
              break;
              
            case "get-webinar-extended-data":
              response = await executeWithTimeout(
                () => handleGetWebinarExtendedData(req, supabaseAdmin, user, credentials, body.webinar_id, apiClient),
                OPERATION_TIMEOUT,
                "get-webinar-extended-data"
              );
              break;
              
            default:
              return createErrorResponse(`Unknown action: ${action}`, 400);
          }
        } catch (credentialError) {
          // If verification fails, mark credentials as invalid
          await updateCredentialsVerification(supabaseAdmin, user.id, false);
          console.error(`Credential verification failed for user ${user.id}:`, credentialError);
          return createErrorResponse(`Authentication failed: ${credentialError.message}`, 401);
        }
    }
    
    return response;
  } catch (error) {
    console.error(`[zoom-api] Error in ${action} action:`, error);
    
    // For timeouts or network errors
    if (error.message && error.message.includes('timed out')) {
      return createErrorResponse("Operation timed out. Please try again later.", 504);
    }
    
    return createErrorResponse(error.message || "An unknown error occurred", 400);
  }
}
