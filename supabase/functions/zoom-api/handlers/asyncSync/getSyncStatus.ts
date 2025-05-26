
import { corsHeaders } from '../../cors.ts';

export async function handleGetSyncStatus(req: Request, supabase: any, user: any, jobId: string) {
  console.log(`[sync-status] Getting status for job: ${jobId}, user: ${user.id}`);
  
  try {
    if (!jobId) {
      throw new Error('Job ID is required');
    }
    
    // Get job status from database
    const { data: jobData, error: jobError } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();
    
    if (jobError || !jobData) {
      console.error('[sync-status] Job not found or access denied:', jobError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Job not found or access denied'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Prepare response with job status
    const response = {
      success: true,
      job_id: jobData.id,
      status: jobData.status,
      progress: jobData.progress,
      total_items: jobData.total_items,
      processed_items: jobData.processed_items,
      started_at: jobData.started_at,
      completed_at: jobData.completed_at,
      metadata: jobData.metadata,
      results: jobData.results,
      error_details: jobData.error_details
    };
    
    // If job is completed, also return updated webinar data
    if (jobData.status === 'completed') {
      const { data: webinars } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });
      
      response.webinars = webinars || [];
    }
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[sync-status] Error getting sync status:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
