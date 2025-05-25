import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { corsHeaders, handleCors, addCorsHeaders, createErrorResponse } from "./cors.ts";
import { 
  verifyZoomCredentials, 
  getZoomCredentials,
  handleSaveCredentials,
  handleCheckCredentialsStatus,
  handleVerifyCredentials 
} from "./credentials.ts";
import { 
  handleListWebinars, 
  handleGetWebinar, 
  handleGetParticipants, 
  handleUpdateWebinarParticipants,
  handleGetWebinarInstances,
  handleGetInstanceParticipants,
  handleSyncSingleWebinar
} from "./webinars.ts";

// Maximum timeout for operations (30 seconds)
const OPERATION_TIMEOUT = 30000;

// Helper to execute a function with timeout
async function executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  const corsResponse = await handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Get the request body with timeout guard
    let body;
    try {
      const bodyText = await executeWithTimeout(() => req.text(), 5000);
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        return createErrorResponse("Invalid JSON in request body", 400);
      }
    } catch (e) {
      return createErrorResponse("Request body timeout or invalid request format", 400);
    }

    const action = body?.action;
    if (!action) {
      return createErrorResponse("Missing 'action' parameter", 400);
    }

    // Create client
    let supabaseAdmin;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (!supabaseUrl || !serviceRoleKey) {
        return createErrorResponse("Missing required environment variables", 500);
      }
      
      supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    } catch (error) {
      console.error("Failed to create Supabase client:", error);
      return createErrorResponse("Failed to initialize database connection", 500);
    }

    // Get the user from the JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse("Missing Authorization header", 401);
    }
    
    const token = authHeader.replace("Bearer ", "");

    // Verify the JWT and get the user
    let user;
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user) {
        return createErrorResponse("Invalid token or user not found", 401);
      }
      user = data.user;
    } catch (error) {
      console.error("Error verifying token:", error);
      return createErrorResponse("Authentication failed", 401);
    }

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
          
          // Route to the correct action handler with timeout protection
          switch (action) {
            case "list-webinars":
              response = await executeWithTimeout(
                () => handleListWebinars(req, supabaseAdmin, user, credentials, body.force_sync || false),
                OPERATION_TIMEOUT
              );
              break;
              
            case "get-webinar":
              response = await executeWithTimeout(
                () => handleGetWebinar(req, supabaseAdmin, user, credentials, body.id),
                OPERATION_TIMEOUT
              );
              break;
              
            case "get-participants":
              response = await executeWithTimeout(
                () => handleGetParticipants(req, supabaseAdmin, user, credentials, body.id),
                OPERATION_TIMEOUT
              );
              break;
              
            case "update-webinar-participants":
              response = await executeWithTimeout(
                () => handleUpdateWebinarParticipants(req, supabaseAdmin, user, credentials),
                OPERATION_TIMEOUT
              );
              break;
              
            case "get-webinar-instances":
              response = await executeWithTimeout(
                () => handleGetWebinarInstances(req, supabaseAdmin, user, credentials, body.webinar_id),
                OPERATION_TIMEOUT
              );
              break;
              
            case "get-instance-participants":
              response = await executeWithTimeout(
                () => handleGetInstanceParticipants(req, supabaseAdmin, user, credentials, body.webinar_id, body.instance_id),
                OPERATION_TIMEOUT
              );
              break;
              
            case "sync-single-webinar":
              response = await executeWithTimeout(
                () => handleSyncSingleWebinar(req, supabaseAdmin, user, credentials, body.webinar_id),
                OPERATION_TIMEOUT
              );
              break;
              
            default:
              return createErrorResponse(`Unknown action: ${action}`, 400);
          }
      }
      
      // Ensure CORS headers are added to the response
      return addCorsHeaders(response);
    } catch (error) {
      console.error(`[zoom-api] Error in ${action} action:`, error);
      
      // For timeouts or network errors
      if (error.message && error.message.includes('timed out')) {
        return createErrorResponse("Operation timed out. Please try again later.", 504);
      }
      
      return createErrorResponse(error.message || "An unknown error occurred", 400);
    }
  } catch (error) {
    console.error("[zoom-api] Unhandled error:", error);
    return createErrorResponse(error.message || "An unknown error occurred", 500);
  }
});
