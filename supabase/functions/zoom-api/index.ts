
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { corsHeaders, handleCors, addCorsHeaders, createErrorResponse } from "./cors.ts";
import { routeRequest } from "./router.ts";
import { handleApiError } from './errorHandling.ts';
import { circuitRegistry } from './circuitBreaker.ts';
import { rateRegistry } from './rateLimiter.ts';
import { taskTracker } from './backgroundTasks.ts';

// Simple in-memory rate limiter for overall request rate
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute per user
const requestLog: Record<string, { count: number, timestamp: number }> = {};

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLog = requestLog[userId];
  
  // If no previous requests or window expired, reset
  if (!userLog || now - userLog.timestamp > RATE_LIMIT_WINDOW) {
    requestLog[userId] = { count: 1, timestamp: now };
    return true;
  }
  
  // If under limit, increment and allow
  if (userLog.count < MAX_REQUESTS_PER_WINDOW) {
    userLog.count++;
    return true;
  }
  
  // Rate limit exceeded
  return false;
}

// Service health check endpoint
function handleHealthCheck(req: Request): Response {
  if (req.url.endsWith('/health')) {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      circuits: circuitRegistry.getAllStatus(),
      rateLimits: rateRegistry.getStatus(),
      activeBackgroundTasks: taskTracker.getActiveTasksCount()
    };
    
    return new Response(
      JSON.stringify(health),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
  return null;
}

// Register shutdown handler for clean resource release
if (typeof addEventListener !== 'undefined') {
  addEventListener('beforeunload', (event) => {
    console.log(`[zoom-api] Function shutting down due to: ${event.detail?.reason || 'unknown reason'}`);
    
    // Log active resources
    const activeTasks = taskTracker.getActiveTasksCount();
    if (activeTasks > 0) {
      console.log(`[zoom-api] ${activeTasks} background tasks still active`);
    }
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight requests - this must come first
  const corsResponse = await handleCors(req);
  if (corsResponse) {
    console.log("Returning CORS preflight response");
    return corsResponse;
  }
  
  // Health check endpoint
  const healthResponse = handleHealthCheck(req);
  if (healthResponse) {
    return healthResponse;
  }
  
  try {
    // Generate a request ID for tracing
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Parse request body with better error handling
    let body;
    try {
      const bodyText = await req.text();
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        console.error("Failed to parse request body as JSON:", e);
        return createErrorResponse("Invalid JSON in request body", 400);
      }
    } catch (e) {
      console.error("Failed to read request body:", e);
      return createErrorResponse("Request body timeout or invalid request format", 400);
    }

    const action = body?.action;
    if (!action) {
      console.error("Missing action parameter");
      return createErrorResponse("Missing 'action' parameter", 400);
    }

    console.log(`[zoom-api] [${requestId}] Processing action: ${action}`);

    // Create client
    let supabaseAdmin;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (!supabaseUrl || !serviceRoleKey) {
        console.error("Missing required environment variables");
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
      console.error("Missing Authorization header");
      return createErrorResponse("Missing Authorization header", 401);
    }
    
    const token = authHeader.replace("Bearer ", "");

    // Verify the JWT and get the user
    let user;
    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user) {
        console.error("Invalid token or user not found:", error);
        return createErrorResponse("Invalid token or user not found", 401);
      }
      user = data.user;
      console.log(`[zoom-api] [${requestId}] Authenticated user: ${user.id}`);
      
      // Apply rate limiting
      const isWithinLimit = checkRateLimit(user.id);
      if (!isWithinLimit) {
        console.warn(`[zoom-api] [${requestId}] Rate limit exceeded for user ${user.id}`);
        return createErrorResponse(
          "Too many requests. Please wait a moment before trying again.", 
          429, 
          { "Retry-After": "60" }
        );
      }
      
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
    return handleApiError(error);
  }
});
