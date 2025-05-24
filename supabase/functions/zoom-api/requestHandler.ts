
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { createErrorResponse } from "./cors.ts";
import { executeWithTimeout } from "./timeout.ts";

export interface RequestContext {
  supabaseAdmin: any;
  user: any;
  body: any;
  req: Request;
}

// Initialize Supabase client and validate environment
export async function initializeSupabase(): Promise<any> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing required environment variables");
  }
  
  return createClient(supabaseUrl, serviceRoleKey);
}

// Parse and validate request body
export async function parseRequestBody(req: Request): Promise<any> {
  const bodyText = await executeWithTimeout(() => req.text(), 5000);
  try {
    return JSON.parse(bodyText);
  } catch (e) {
    throw new Error("Invalid JSON in request body");
  }
}

// Authenticate user from JWT token
export async function authenticateUser(req: Request, supabaseAdmin: any): Promise<any> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }
  
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !data.user) {
    throw new Error("Invalid token or user not found");
  }
  
  return data.user;
}

// Create request context with all necessary components
export async function createRequestContext(req: Request): Promise<RequestContext> {
  try {
    const supabaseAdmin = await initializeSupabase();
    const body = await parseRequestBody(req);
    const user = await authenticateUser(req, supabaseAdmin);
    
    return {
      supabaseAdmin,
      user,
      body,
      req
    };
  } catch (error) {
    throw error;
  }
}
