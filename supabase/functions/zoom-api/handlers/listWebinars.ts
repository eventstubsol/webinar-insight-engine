
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

// Use the comprehensive handler that includes ALL sync operations
import { handleFixedListWebinars } from './listWebinars/fixedIndex.ts';

// Main handler function that routes to the enhanced processor
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any): Promise<Response> {
  console.log(`[zoom-api][list-webinars] 🚀 Starting ENHANCED webinar list with DEBUGGING`);
  console.log(`[zoom-api][list-webinars] 🎯 CRITICAL FIX: Implementing comprehensive instance creation debugging`);
  
  try {
    const { force_sync = false } = await req.json().catch(() => ({}));
    
    // Use the fixed handler for comprehensive processing
    return await handleFixedListWebinars(req, supabase, user, credentials, force_sync);
    
  } catch (error) {
    console.error('[zoom-api][list-webinars] ❌ Error in enhanced handleListWebinars:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
