
import { Request } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { createErrorResponse } from "./cors.ts";
import { 
  handleSaveCredentials, 
  handleCheckCredentialsStatus,
  handleVerifyCredentials,
  getZoomCredentials,
  verifyZoomCredentials,
  ZoomApiClient
} from "./auth.ts";
import { 
  handleListWebinars, 
  handleGetWebinar, 
  handleGetParticipants, 
  handleUpdateWebinarParticipants,
  handleGetWebinarInstances,
  handleGetInstanceParticipants,
  handleGetWebinarExtendedData
} from "./webinars.ts";

// Operation timeout (30 seconds)
const OPERATION_TIMEOUT = 30000;

// Helper to execute a function with timeout
export async function executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

// The main router function
export async function routeRequest(req: Request, supabaseAdmin: any, user: any, body: any) {
  const action = body?.action;
  
  // Route to the appropriate handler based on action with timeout protection
  try {
    let response;
    
    switch (action) {
      case "save-credentials":
        response = await executeWithTimeout(
          () => handleSaveCredentials(req, supabaseAdmin, user, body),
          OPERATION_TIMEOUT
        );
        break;
      
      case "check-credentials-status":
        response = await executeWithTimeout(
          () => handleCheckCredentialsStatus(req, supabaseAdmin, user),
          OPERATION_TIMEOUT
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
          OPERATION_TIMEOUT
        );
        break;
        
      default:
        // For other actions, we need to verify credentials first
        const credentials = await getZoomCredentials(supabaseAdmin, user.id);
        if (!credentials) {
          return createErrorResponse("Zoom credentials not found", 400);
        }

        // Verify credentials for actions that require valid credentials
        await verifyZoomCredentials(credentials);
        
        // Create API client with rate limiting
        const apiClient = new ZoomApiClient(credentials.accessToken);
        
        // Route to the correct action handler with timeout protection
        switch (action) {
          case "list-webinars":
            response = await executeWithTimeout(
              () => handleListWebinars(req, supabaseAdmin, user, credentials, body.force_sync || false, apiClient),
              OPERATION_TIMEOUT
            );
            break;
            
          case "get-webinar":
            response = await executeWithTimeout(
              () => handleGetWebinar(req, supabaseAdmin, user, credentials, body.id, apiClient),
              OPERATION_TIMEOUT
            );
            break;
            
          case "get-participants":
            response = await executeWithTimeout(
              () => handleGetParticipants(req, supabaseAdmin, user, credentials, body.id, apiClient),
              OPERATION_TIMEOUT
            );
            break;
            
          case "update-webinar-participants":
            response = await executeWithTimeout(
              () => handleUpdateWebinarParticipants(req, supabaseAdmin, user, credentials, apiClient),
              OPERATION_TIMEOUT
            );
            break;
            
          case "get-webinar-instances":
            response = await executeWithTimeout(
              () => handleGetWebinarInstances(req, supabaseAdmin, user, credentials, body.webinar_id, apiClient),
              OPERATION_TIMEOUT
            );
            break;
            
          case "get-instance-participants":
            response = await executeWithTimeout(
              () => handleGetInstanceParticipants(req, supabaseAdmin, user, credentials, body.webinar_id, body.instance_id, apiClient),
              OPERATION_TIMEOUT
            );
            break;
            
          case "get-webinar-extended-data":
            response = await executeWithTimeout(
              () => handleGetWebinarExtendedData(req, supabaseAdmin, user, credentials, body.webinar_id, apiClient),
              OPERATION_TIMEOUT
            );
            break;
            
          default:
            return createErrorResponse(`Unknown action: ${action}`, 400);
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
