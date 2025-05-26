
import { corsHeaders } from '../../cors.ts';
import { getZoomJwtToken } from '../../auth.ts';
import { fetchUserInfo } from '../sync/userInfoFetcher.ts';
import { checkDatabaseCache } from '../sync/databaseCache.ts';

export async function handleStartAsyncSync(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`[async-sync] Starting comprehensive async sync for user: ${user.id}, force_sync: ${force_sync}`);
  
  try {
    // Check if we can use cached data for immediate response
    const cacheResult = await checkDatabaseCache(supabase, user.id, force_sync);
    
    // Create sync job record with comprehensive metadata
    const { data: jobData, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        user_id: user.id,
        job_type: 'comprehensive_webinar_sync',
        status: 'pending',
        progress: 0,
        total_items: 0, // Will be updated as we discover the scope
        processed_items: 0,
        metadata: { 
          force_sync, 
          started_at: new Date().toISOString(),
          current_stage: 'initialization',
          stages: {
            metadata_fetch: { status: 'pending', progress: 0, total: 0 },
            participant_sync: { status: 'pending', progress: 0, total: 0 },
            instance_sync: { status: 'pending', progress: 0, total: 0 },
            recording_sync: { status: 'pending', progress: 0, total: 0 },
            enhancement: { status: 'pending', progress: 0, total: 0 }
          }
        }
      })
      .select()
      .single();
    
    if (jobError || !jobData) {
      console.error('[async-sync] Failed to create sync job:', jobError);
      throw new Error('Failed to create sync job');
    }
    
    const jobId = jobData.id;
    console.log(`[async-sync] Created comprehensive sync job: ${jobId}`);
    
    // Start comprehensive background processing with fire-and-forget pattern
    EdgeRuntime.waitUntil(processComprehensiveAsyncSync(supabase, user, credentials, jobId, force_sync));
    
    // Return immediate response with job ID and any cached data
    const response = {
      success: true,
      job_id: jobId,
      status: 'started',
      message: 'Comprehensive sync job started. This will fetch all webinar data including metadata, participants, instances, recordings, and enhancements.',
      cached_data: cacheResult.shouldUseCachedData ? cacheResult.cacheResponse : null,
      estimated_duration: '2-5 minutes for complete sync'
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[async-sync] Error starting comprehensive async sync:', error);
    
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

// Comprehensive background sync processor
async function processComprehensiveAsyncSync(
  supabase: any, 
  user: any, 
  credentials: any, 
  jobId: string, 
  force_sync: boolean
) {
  console.log(`[comprehensive-sync] Starting background processing for job: ${jobId}`);
  
  try {
    // Generate authentication token
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    const meData = await fetchUserInfo(token);
    
    // Update job status to running
    await updateJobStatus(supabase, jobId, 'running', 0, 'Initializing comprehensive sync...');
    
    // Stage 1: Comprehensive Webinar Metadata Fetch
    console.log(`[comprehensive-sync] Stage 1: Fetching comprehensive webinar metadata`);
    const webinars = await executeMetadataStage(supabase, jobId, token, meData.id, force_sync);
    
    // Stage 2: Participant Data Sync
    console.log(`[comprehensive-sync] Stage 2: Syncing participant data for ${webinars.length} webinars`);
    await executeParticipantStage(supabase, jobId, token, webinars, user.id);
    
    // Stage 3: Instance Data Sync
    console.log(`[comprehensive-sync] Stage 3: Syncing instance data`);
    await executeInstanceStage(supabase, jobId, token, webinars, user.id);
    
    // Stage 4: Recording Data Sync
    console.log(`[comprehensive-sync] Stage 4: Syncing recording data`);
    await executeRecordingStage(supabase, jobId, token, webinars, user.id);
    
    // Stage 5: Enhancement and Enrichment
    console.log(`[comprehensive-sync] Stage 5: Applying enhancements`);
    await executeEnhancementStage(supabase, jobId, token, webinars, user.id);
    
    // Final completion
    const finalResults = {
      webinars_processed: webinars.length,
      total_stages_completed: 5,
      comprehensive_sync: true,
      completion_time: new Date().toISOString()
    };
    
    await supabase
      .from('sync_jobs')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        results: finalResults,
        metadata: {
          ...jobId.metadata,
          current_stage: 'completed',
          final_results: finalResults
        }
      })
      .eq('id', jobId);
    
    console.log(`[comprehensive-sync] ✅ Comprehensive sync completed successfully for job: ${jobId}`);
    
  } catch (error) {
    console.error(`[comprehensive-sync] ❌ Error in comprehensive sync for job ${jobId}:`, error);
    
    await supabase
      .from('sync_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_details: {
          error: error.message,
          timestamp: new Date().toISOString(),
          stage: 'comprehensive_sync_error'
        }
      })
      .eq('id', jobId);
  }
}

// Stage execution functions
async function executeMetadataStage(supabase: any, jobId: string, token: string, userId: string, force_sync: boolean) {
  await updateStageStatus(supabase, jobId, 'metadata_fetch', 'running', 0, 'Fetching webinar metadata...');
  
  // Import the comprehensive webinar fetcher
  const { fetchWebinarsFromZoomAPI, performNonDestructiveUpsert } = await import('../sync/nonDestructiveSync.ts');
  
  const webinars = await fetchWebinarsFromZoomAPI(token, userId);
  
  if (webinars.length > 0) {
    const { data: existingWebinars } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', userId);
    
    await performNonDestructiveUpsert(supabase, userId, webinars, existingWebinars || []);
  }
  
  await updateStageStatus(supabase, jobId, 'metadata_fetch', 'completed', 100, `Processed ${webinars.length} webinars`);
  await updateJobProgress(supabase, jobId, 20); // 20% complete after stage 1
  
  return webinars;
}

async function executeParticipantStage(supabase: any, jobId: string, token: string, webinars: any[], userId: string) {
  await updateStageStatus(supabase, jobId, 'participant_sync', 'running', 0, 'Syncing participant data...');
  
  let processed = 0;
  const completedWebinars = webinars.filter(w => w.status === 'ended' || w.status === 'aborted');
  
  for (const webinar of completedWebinars) {
    try {
      // Fetch registrants and attendees
      const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/registrants?page_size=300`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (registrantsResponse.ok) {
        const registrantsData = await registrantsResponse.json();
        await syncParticipantData(supabase, userId, webinar.id, 'registrant', registrantsData.registrants || []);
      }
      
      const attendeesResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/absentees?page_size=300`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (attendeesResponse.ok) {
        const attendeesData = await attendeesResponse.json();
        await syncParticipantData(supabase, userId, webinar.id, 'attendee', attendeesData.registrants || []);
      }
      
      processed++;
      const progress = Math.round((processed / completedWebinars.length) * 100);
      await updateStageStatus(supabase, jobId, 'participant_sync', 'running', progress, `Processed ${processed}/${completedWebinars.length} webinars`);
      
    } catch (error) {
      console.warn(`[participant-sync] Failed to sync participants for webinar ${webinar.id}:`, error);
    }
  }
  
  await updateStageStatus(supabase, jobId, 'participant_sync', 'completed', 100, `Completed participant sync for ${processed} webinars`);
  await updateJobProgress(supabase, jobId, 40); // 40% complete after stage 2
}

async function executeInstanceStage(supabase: any, jobId: string, token: string, webinars: any[], userId: string) {
  await updateStageStatus(supabase, jobId, 'instance_sync', 'running', 0, 'Syncing instance data...');
  
  let processed = 0;
  const recurringWebinars = webinars.filter(w => w.type === 6 || w.type === 9); // Recurring webinars
  
  for (const webinar of recurringWebinars) {
    try {
      const instancesResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/instances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (instancesResponse.ok) {
        const instancesData = await instancesResponse.json();
        await syncInstanceData(supabase, userId, webinar.id, instancesData.webinars || []);
      }
      
      processed++;
      const progress = Math.round((processed / recurringWebinars.length) * 100);
      await updateStageStatus(supabase, jobId, 'instance_sync', 'running', progress, `Processed ${processed}/${recurringWebinars.length} recurring webinars`);
      
    } catch (error) {
      console.warn(`[instance-sync] Failed to sync instances for webinar ${webinar.id}:`, error);
    }
  }
  
  await updateStageStatus(supabase, jobId, 'instance_sync', 'completed', 100, `Completed instance sync for ${processed} recurring webinars`);
  await updateJobProgress(supabase, jobId, 60); // 60% complete after stage 3
}

async function executeRecordingStage(supabase: any, jobId: string, token: string, webinars: any[], userId: string) {
  await updateStageStatus(supabase, jobId, 'recording_sync', 'running', 0, 'Syncing recording data...');
  
  let processed = 0;
  const completedWebinars = webinars.filter(w => w.status === 'ended');
  
  for (const webinar of completedWebinars) {
    try {
      const recordingsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/recordings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (recordingsResponse.ok) {
        const recordingsData = await recordingsResponse.json();
        await syncRecordingData(supabase, userId, webinar.id, recordingsData);
      }
      
      processed++;
      const progress = Math.round((processed / completedWebinars.length) * 100);
      await updateStageStatus(supabase, jobId, 'recording_sync', 'running', progress, `Processed ${processed}/${completedWebinars.length} completed webinars`);
      
    } catch (error) {
      console.warn(`[recording-sync] Failed to sync recordings for webinar ${webinar.id}:`, error);
    }
  }
  
  await updateStageStatus(supabase, jobId, 'recording_sync', 'completed', 100, `Completed recording sync for ${processed} webinars`);
  await updateJobProgress(supabase, jobId, 80); // 80% complete after stage 4
}

async function executeEnhancementStage(supabase: any, jobId: string, token: string, webinars: any[], userId: string) {
  await updateStageStatus(supabase, jobId, 'enhancement', 'running', 0, 'Applying enhancements...');
  
  // Import enhancement functions
  const { enhanceWebinarsWithAllData } = await import('../sync/webinarEnhancementOrchestrator.ts');
  
  try {
    const enhancedWebinars = await enhanceWebinarsWithAllData(webinars, token, supabase, userId);
    
    // Update webinars with enhanced data
    for (const webinar of enhancedWebinars) {
      await supabase
        .from('zoom_webinars')
        .update({
          actual_start_time: webinar.actual_start_time,
          actual_duration: webinar.actual_duration,
          host_email: webinar.host_email,
          host_name: webinar.host_name,
          host_first_name: webinar.host_first_name,
          host_last_name: webinar.host_last_name,
          raw_data: webinar,
          last_synced_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('webinar_id', webinar.id);
    }
    
    await updateStageStatus(supabase, jobId, 'enhancement', 'completed', 100, `Enhanced ${enhancedWebinars.length} webinars with timing and host data`);
    
  } catch (error) {
    console.warn(`[enhancement] Enhancement stage failed, continuing:`, error);
    await updateStageStatus(supabase, jobId, 'enhancement', 'failed', 100, `Enhancement failed: ${error.message}`);
  }
  
  await updateJobProgress(supabase, jobId, 100); // 100% complete after stage 5
}

// Helper functions
async function updateJobStatus(supabase: any, jobId: string, status: string, progress: number, message: string) {
  await supabase
    .from('sync_jobs')
    .update({
      status,
      progress,
      metadata: { current_message: message, updated_at: new Date().toISOString() }
    })
    .eq('id', jobId);
}

async function updateJobProgress(supabase: any, jobId: string, progress: number) {
  await supabase
    .from('sync_jobs')
    .update({ progress })
    .eq('id', jobId);
}

async function updateStageStatus(supabase: any, jobId: string, stage: string, status: string, progress: number, message: string) {
  const { data: currentJob } = await supabase
    .from('sync_jobs')
    .select('metadata')
    .eq('id', jobId)
    .single();
  
  const metadata = currentJob?.metadata || {};
  const stages = metadata.stages || {};
  
  stages[stage] = {
    status,
    progress,
    message,
    updated_at: new Date().toISOString()
  };
  
  await supabase
    .from('sync_jobs')
    .update({
      metadata: {
        ...metadata,
        current_stage: stage,
        stages
      }
    })
    .eq('id', jobId);
}

// Data sync helper functions
async function syncParticipantData(supabase: any, userId: string, webinarId: string, type: string, participants: any[]) {
  for (const participant of participants) {
    await supabase
      .from('zoom_webinar_participants')
      .upsert({
        user_id: userId,
        webinar_id: webinarId,
        participant_id: participant.id,
        participant_type: type,
        name: participant.first_name && participant.last_name 
          ? `${participant.first_name} ${participant.last_name}` 
          : participant.name,
        email: participant.email,
        join_time: participant.join_time ? new Date(participant.join_time).toISOString() : null,
        leave_time: participant.leave_time ? new Date(participant.leave_time).toISOString() : null,
        duration: participant.duration,
        raw_data: participant
      }, {
        onConflict: 'user_id,webinar_id,participant_id,participant_type'
      });
  }
}

async function syncInstanceData(supabase: any, userId: string, webinarId: string, instances: any[]) {
  for (const instance of instances) {
    await supabase
      .from('zoom_webinar_instances')
      .upsert({
        user_id: userId,
        webinar_id: webinarId,
        instance_id: instance.uuid,
        webinar_uuid: instance.uuid,
        topic: instance.topic,
        start_time: instance.start_time ? new Date(instance.start_time).toISOString() : null,
        end_time: instance.end_time ? new Date(instance.end_time).toISOString() : null,
        duration: instance.duration,
        status: instance.status,
        raw_data: instance
      }, {
        onConflict: 'user_id,webinar_id,instance_id'
      });
  }
}

async function syncRecordingData(supabase: any, userId: string, webinarId: string, recordingData: any) {
  if (!recordingData.recording_files) return;
  
  for (const recording of recordingData.recording_files) {
    await supabase
      .from('zoom_webinar_recordings')
      .upsert({
        user_id: userId,
        webinar_id: webinarId,
        recording_id: recording.id,
        recording_type: recording.recording_type,
        file_type: recording.file_type,
        file_size: recording.file_size,
        play_url: recording.play_url,
        download_url: recording.download_url,
        status: recording.status,
        recording_start: recording.recording_start ? new Date(recording.recording_start).toISOString() : null,
        recording_end: recording.recording_end ? new Date(recording.recording_end).toISOString() : null,
        raw_data: recording
      }, {
        onConflict: 'user_id,webinar_id,recording_id'
      });
  }
}
