
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { handleCors, addCorsHeaders, createErrorResponse } from "./cors.ts";
import { createRequestContext } from "./requestHandler.ts";
import { routeCredentialActions, routeWebinarActions } from "./actionRouter.ts";
import { getZoomCredentials } from "./credentials.ts";

serve(async (req: Request) => {
  // Track request start time for timeout management
  (req as any).startTime = Date.now();
  
  // Handle CORS preflight requests
  const corsResponse = await handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Create request context with authentication and body parsing
    const context = await createRequestContext(req);
    const action = context.body?.action;
    
    if (!action) {
      return createErrorResponse("Missing 'action' parameter", 400);
    }

    // Try credential-related actions first (don't require verified Zoom credentials)
    const credentialResponse = await routeCredentialActions(action, context);
    if (credentialResponse) {
      return addCorsHeaders(credentialResponse);
    }

    // For other actions, we need verified Zoom credentials
    const credentials = await getZoomCredentials(context.supabaseAdmin, context.user.id);
    if (!credentials) {
      return createErrorResponse("Zoom credentials not found", 400);
    }

    // Route to webinar actions that require verified credentials
    const response = await routeWebinarActions(action, context, credentials);
    return addCorsHeaders(response);

  } catch (error) {
    console.error("[zoom-api] Error:", error);
    
    // For timeouts or network errors
    if (error.message && error.message.includes('timed out')) {
      return createErrorResponse("Operation timed out. The sync may still be running in the background.", 504);
    }
    
    // Handle specific error types
    if (error.message.includes('Authorization')) {
      return createErrorResponse("Authentication failed", 401);
    }
    
    if (error.message.includes('Invalid JSON')) {
      return createErrorResponse("Invalid JSON in request body", 400);
    }
    
    if (error.message.includes('Missing Authorization')) {
      return createErrorResponse("Missing Authorization header", 401);
    }
    
    return createErrorResponse(error.message || "An unknown error occurred", 400);
  }
});
