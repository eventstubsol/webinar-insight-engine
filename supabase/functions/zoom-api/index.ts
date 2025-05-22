
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { corsHeaders, handleCors, addCorsHeaders, createErrorResponse } from "./cors.ts";
import { routeRequest } from "./router.ts";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  const corsResponse = await handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Get the request body
    let body;
    try {
      const bodyText = await req.text();
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

    // Route the request to the appropriate handler
    const response = await routeRequest(req, supabaseAdmin, user, body);
    
    // Ensure CORS headers are added to the response
    return addCorsHeaders(response);
  } catch (error) {
    console.error("[zoom-api] Unhandled error:", error);
    return createErrorResponse(error.message || "An unknown error occurred", 500);
  }
});
