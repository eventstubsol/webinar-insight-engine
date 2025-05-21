
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";
import { corsHeaders } from "./cors.ts";
import { verifyZoomCredentials, getZoomCredentials } from "./credentials.ts";
import { 
  handleListWebinars, 
  handleGetWebinar, 
  handleGetParticipants, 
  handleUpdateWebinarParticipants,
  handleGetWebinarInstances,
  handleGetInstanceParticipants
} from "./webinars.ts";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error("Missing or invalid request body");
    }

    const action = body.action;
    if (!action) {
      throw new Error("Missing 'action' parameter");
    }

    // Create client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user from the JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");

    // Verify the JWT and get the user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Invalid token or user not found");
    }

    // Get Zoom credentials
    const credentials = await getZoomCredentials(supabaseAdmin, user.id);
    if (!credentials) {
      throw new Error("Zoom credentials not found");
    }

    // Verify credentials for actions that require valid credentials
    if (action === "list-webinars" || 
        action === "get-webinar" || 
        action === "get-participants" || 
        action === "update-webinar-participants" ||
        action === "get-webinar-instances" ||
        action === "get-instance-participants") {
      await verifyZoomCredentials(credentials);
    }

    // Route to the correct action handler
    switch (action) {
      case "list-webinars":
        return await handleListWebinars(req, supabaseAdmin, user, credentials, body.force_sync || false);
      case "get-webinar":
        return await handleGetWebinar(req, supabaseAdmin, user, credentials, body.id);
      case "get-participants":
        return await handleGetParticipants(req, supabaseAdmin, user, credentials, body.id);
      case "update-webinar-participants":
        return await handleUpdateWebinarParticipants(req, supabaseAdmin, user, credentials);
      case "get-webinar-instances":
        return await handleGetWebinarInstances(req, supabaseAdmin, user, credentials, body.webinar_id);
      case "get-instance-participants":
        return await handleGetInstanceParticipants(req, supabaseAdmin, user, credentials, body.webinar_id, body.instance_id);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("[zoom-api] Error:", error);
    
    return new Response(JSON.stringify({
      error: error.message || "An unknown error occurred"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
