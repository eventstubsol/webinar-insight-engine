
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

// CORS headers to ensure the function can be called from the frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, // No content
      headers: corsHeaders 
    });
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user from the JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token or user not found" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Define buckets configuration
    const buckets = [
      { name: 'avatars', isPublic: true },
      { name: 'webinar_reports', isPublic: false },
      { name: 'webinar_exports', isPublic: false },
      { name: 'user_uploads', isPublic: false }
    ];
    
    const results = [];

    // Process each bucket
    for (const bucket of buckets) {
      try {
        // Check if bucket exists first to avoid errors
        const { data: existingBuckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = existingBuckets?.some(b => b.name === bucket.name);
        
        if (!bucketExists) {
          // Create bucket if it doesn't exist
          const { data, error } = await supabaseAdmin.storage.createBucket(bucket.name, {
            public: bucket.isPublic
          });
          
          if (error) {
            console.error(`Error creating bucket ${bucket.name}:`, error);
            results.push({ bucket: bucket.name, success: false, error: error.message });
          } else {
            console.log(`Successfully created bucket: ${bucket.name}`);
            results.push({ bucket: bucket.name, success: true });
          }
        } else {
          console.log(`Bucket already exists: ${bucket.name}`);
          results.push({ bucket: bucket.name, success: true, alreadyExists: true });
        }
      } catch (error) {
        console.error(`Error processing bucket ${bucket.name}:`, error);
        results.push({ bucket: bucket.name, success: false, error: error.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Storage initialization complete',
      results 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Storage initialization error:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Unknown error initializing storage"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
