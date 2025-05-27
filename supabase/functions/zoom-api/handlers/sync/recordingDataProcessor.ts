
/**
 * Processes and enhances webinars with recording data from Zoom API
 */
export async function enhanceWebinarsWithRecordingData(webinars: any[], token: string) {
  console.log(`[zoom-api][recording-processor] Processing recording data for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][recording-processor] No webinars to process for recordings`);
    return webinars;
  }
  
  // Only process completed webinars (recordings are only available for completed webinars)
  const completedWebinars = webinars.filter(webinar => 
    webinar.status === 'ended' || webinar.status === 'aborted'
  );
  
  console.log(`[zoom-api][recording-processor] Found ${completedWebinars.length} completed webinars to check for recordings`);
  
  // Process recordings for completed webinars
  const recordingPromises = completedWebinars.map(async (webinar) => {
    try {
      console.log(`[zoom-api][recording-processor] Fetching recordings for webinar: ${webinar.id}`);
      
      const recordingData = await fetchWebinarRecordings(token, webinar.id);
      
      if (recordingData && recordingData.recordings && recordingData.recordings.length > 0) {
        console.log(`[zoom-api][recording-processor] Found ${recordingData.recordings.length} recordings for webinar ${webinar.id}`);
        
        // Enhance webinar with recording data
        webinar.recording_data = recordingData;
        webinar.has_recordings = true;
        webinar.recording_count = recordingData.recordings.length;
        
        // Add primary recording info to webinar for easy access
        const primaryRecording = recordingData.recordings.find(r => r.recording_type === 'shared_screen_with_speaker_view') || 
                                recordingData.recordings[0];
        
        if (primaryRecording) {
          webinar.primary_recording = {
            download_url: primaryRecording.download_url,
            play_url: primaryRecording.play_url,
            password: primaryRecording.password,
            status: primaryRecording.status,
            file_type: primaryRecording.file_type,
            file_size: primaryRecording.file_size,
            recording_start: primaryRecording.recording_start,
            recording_end: primaryRecording.recording_end
          };
        }
      } else {
        console.log(`[zoom-api][recording-processor] No recordings found for webinar ${webinar.id}`);
        webinar.has_recordings = false;
        webinar.recording_count = 0;
      }
      
      return webinar;
    } catch (error) {
      console.error(`[zoom-api][recording-processor] Error fetching recordings for webinar ${webinar.id}:`, error);
      // Don't fail the entire process for one webinar
      webinar.recording_error = error.message;
      webinar.has_recordings = false;
      return webinar;
    }
  });
  
  // Wait for all recording data to be fetched
  await Promise.all(recordingPromises);
  
  console.log(`[zoom-api][recording-processor] Recording data processing completed`);
  return webinars;
}

/**
 * Fetches recording data for a specific webinar from Zoom API
 */
export async function fetchWebinarRecordings(token: string, webinarId: string): Promise<any> {
  const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/recordings`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      // No recordings found - this is normal for webinars without recordings
      console.log(`[zoom-api][recording-processor] No recordings found for webinar ${webinarId} (404)`);
      return null;
    }
    
    const errorData = await response.json().catch(() => ({}));
    console.error(`[zoom-api][recording-processor] Failed to fetch recordings for webinar ${webinarId}:`, errorData);
    throw new Error(`Failed to fetch recordings: ${errorData.message || response.status}`);
  }
  
  return await response.json();
}

/**
 * Stores recording data in the database
 */
export async function storeRecordingData(supabase: any, userId: string, webinarId: string, recordingData: any): Promise<number> {
  if (!recordingData || !recordingData.recordings) {
    return 0;
  }
  
  console.log(`[zoom-api][recording-processor] Storing ${recordingData.recordings.length} recordings for webinar ${webinarId}`);
  
  let storedCount = 0;
  const currentTimestamp = new Date().toISOString();
  
  for (const recording of recordingData.recordings) {
    try {
      const recordingEntry = {
        user_id: userId,
        webinar_id: webinarId,
        recording_id: recording.id,
        instance_id: recordingData.instance_id || null,
        recording_type: recording.recording_type,
        file_type: recording.file_type || null,
        status: recording.status || 'completed',
        download_url: recording.download_url || null,
        play_url: recording.play_url || null,
        password: recording.password || null,
        duration: recording.recording_end && recording.recording_start 
          ? Math.round((new Date(recording.recording_end).getTime() - new Date(recording.recording_start).getTime()) / 1000 / 60)
          : null,
        file_size: recording.file_size || null,
        recording_start: recording.recording_start || null,
        recording_end: recording.recording_end || null,
        raw_data: recording,
        created_at: currentTimestamp,
        updated_at: currentTimestamp
      };
      
      // Use upsert to handle potential duplicates
      const { error: upsertError } = await supabase
        .from('zoom_webinar_recordings')
        .upsert(recordingEntry, {
          onConflict: 'user_id,webinar_id,recording_id',
          ignoreDuplicates: false
        });
      
      if (upsertError) {
        console.error(`[zoom-api][recording-processor] Error storing recording ${recording.id}:`, upsertError);
      } else {
        storedCount++;
      }
    } catch (error) {
      console.error(`[zoom-api][recording-processor] Error processing recording ${recording.id}:`, error);
    }
  }
  
  console.log(`[zoom-api][recording-processor] Successfully stored ${storedCount} recordings for webinar ${webinarId}`);
  return storedCount;
}
