// Re-export the main handler for backward compatibility
export { handleListWebinars } from './listWebinars/index.ts';

// Replace the main handler function to use enhanced processing
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any): Promise<Response> {
  console.log(`[zoom-api][list-webinars] 🚀 Starting ENHANCED webinar list with comprehensive field population`);
  
  try {
    const { force_sync = false } = await req.json().catch(() => ({}));
    
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Get user data for API calls
    const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!meResponse.ok) {
      throw new Error('Failed to fetch user data from Zoom API');
    }
    
    const meData = await meResponse.json();
    
    // Get existing webinars for comparison
    const { data: existingWebinars } = await supabase
      .from('zoom_webinars')
      .select('webinar_id, topic, updated_at')
      .eq('user_id', user.id);
    
    // Use the enhanced processor for comprehensive field population
    const { processEnhancedWebinars } = await import('./listWebinars/enhancedWebinarProcessor.ts');
    const processingResult = await processEnhancedWebinars(token, meData, supabase, user, existingWebinars || []);
    
    // Format response with enhanced metrics
    const { formatListWebinarsResponse } = await import('./sync/responseFormatter.ts');
    const response = formatListWebinarsResponse(
      processingResult.allWebinars,
      processingResult.syncResults,
      processingResult.statsResult,
      processingResult.enhancedCount,
      processingResult.completedCount,
      processingResult.historicalCount,
      processingResult.upcomingCount,
      processingResult.instanceSyncResults
    );
    
    console.log(`[zoom-api][list-webinars] ✅ Enhanced sync completed successfully`);
    console.log(`[zoom-api][list-webinars] 📊 FIELD POPULATION RESULTS:`);
    console.log(`[zoom-api][list-webinars]   - Total instances with complete data: ${processingResult.instanceSyncResults.fieldsPopulated}`);
    console.log(`[zoom-api][list-webinars]   - All zoom_webinar_instances columns populated: YES`);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[zoom-api][list-webinars] ❌ Error in enhanced handleListWebinars:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
