
import { corsHeaders } from '../../cors.ts';
import { getZoomJwtToken } from '../../auth.ts';
import { fetchUserInfo } from '../sync/userInfoFetcher.ts';
import { fetchWebinarsFromZoomAPI } from '../sync/nonDestructiveSync.ts';
import { checkDatabaseCache } from '../sync/databaseCache.ts';

export async function handleStartAsyncSync(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[async-sync] Starting async sync for user: ${user.id}, force_sync: ${force_sync}`);
  
  try {
    // Check if we can use cached data for immediate response
    const cacheResult = await checkDatabaseCache(supabase, user.id, force_sync);
    
    // Create sync job record
    const { data: jobData, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        user_id: user.id,
        job_type: 'webinar_sync',
        status: 'pending',
        progress: 0,
        metadata: { force_sync, started_at: new Date().toISOString() }
      })
      .select()
      .single();
    
    if (jobError || !jobData) {
      console.error('[async-sync] Failed to create sync job:', jobError);
      throw new Error('Failed to create sync job');
    }
    
    const jobId = jobData.id;
    console.log(`[async-sync] Created sync job: ${jobId}`);
    
    // Start background processing
    processAsyncSync(supabase, user, credentials, jobId, force_sync);
    
    // Return immediate response with job ID and any cached data
    const response = {
      success: true,
      job_id: jobId,
      status: 'started',
      cached_data: cacheResult.shouldUseCachedData ? cacheResult.cacheResponse : null,
      message: 'Sync job started. Use job_id to check progress.'
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[async-sync] Error starting async sync:', error);
    
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

// Background processing function (fire and forget)
async function processAsyncSync(supabase: any, user: any, credentials: any, jobId: string, force_sync: boolean) {
  try {
    console.log(`[async-sync] Background processing started for job: ${jobId}`);
    
    // Update job status to running
    await updateJobProgress(supabase, jobId, {
      status: 'running',
      progress: 10,
      processed_items: 0
    });
    
    // Get Zoom token
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Update progress
    await updateJobProgress(supabase, jobId, {
      progress: 20,
      metadata: { step: 'token_obtained' }
    });
    
    // Get user info
    const meData = await fetchUserInfo(token);
    
    // Update progress
    await updateJobProgress(supabase, jobId, {
      progress: 30,
      metadata: { step: 'user_info_fetched', user_email: meData.email }
    });
    
    // Fetch webinars from API
    const allWebinars = await fetchWebinarsFromZoomAPI(token, meData.id);
    
    // Update progress
    await updateJobProgress(supabase, jobId, {
      progress: 50,
      total_items: allWebinars.length,
      metadata: { step: 'webinars_fetched', webinars_count: allWebinars.length }
    });
    
    // Get existing webinars for upsert
    const { data: existingWebinars } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id);
    
    // Process webinars in batches
    const batchSize = 10;
    let processed = 0;
    
    for (let i = 0; i < allWebinars.length; i += batchSize) {
      const batch = allWebinars.slice(i, i + batchSize);
      
      // Process each webinar in the batch
      for (const webinar of batch) {
        try {
          const webinarData = {
            user_id: user.id,
            webinar_id: webinar.id,
            webinar_uuid: webinar.uuid,
            topic: webinar.topic,
            start_time: webinar.start_time,
            duration: webinar.duration,
            timezone: webinar.timezone,
            agenda: webinar.agenda || '',
            host_email: webinar.host_email,
            status: webinar.status,
            type: webinar.type,
            actual_start_time: webinar.actual_start_time || null,
            actual_duration: webinar.actual_duration || null,
            raw_data: webinar,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          await supabase
            .from('zoom_webinars')
            .upsert(webinarData, {
              onConflict: 'user_id,webinar_id',
              ignoreDuplicates: false
            });
          
          processed++;
          
        } catch (error) {
          console.error(`[async-sync] Error processing webinar ${webinar.id}:`, error);
        }
      }
      
      // Update progress after each batch
      const progress = Math.min(50 + Math.round((processed / allWebinars.length) * 40), 90);
      await updateJobProgress(supabase, jobId, {
        progress,
        processed_items: processed,
        metadata: { step: 'processing_webinars', processed, total: allWebinars.length }
      });
    }
    
    // Complete the job
    await updateJobProgress(supabase, jobId, {
      status: 'completed',
      progress: 100,
      processed_items: processed,
      completed_at: new Date().toISOString(),
      results: {
        webinars_processed: processed,
        total_webinars: allWebinars.length,
        completed_at: new Date().toISOString()
      }
    });
    
    console.log(`[async-sync] Background processing completed for job: ${jobId}, processed: ${processed} webinars`);
    
  } catch (error) {
    console.error(`[async-sync] Background processing failed for job: ${jobId}:`, error);
    
    // Mark job as failed
    await updateJobProgress(supabase, jobId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_details: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}

async function updateJobProgress(supabase: any, jobId: string, updates: any) {
  try {
    const { error } = await supabase
      .from('sync_jobs')
      .update(updates)
      .eq('id', jobId);
    
    if (error) {
      console.error(`[async-sync] Failed to update job ${jobId}:`, error);
    }
  } catch (error) {
    console.error(`[async-sync] Error updating job progress:`, error);
  }
}
