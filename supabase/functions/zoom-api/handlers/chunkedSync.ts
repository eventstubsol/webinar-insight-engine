
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { recordSyncHistory } from './sync/syncStatsCalculator.ts';

export interface ChunkSyncOptions {
  dataType: 'participants' | 'chat' | 'polls' | 'questions' | 'recordings' | 'instances';
  webinarIds: string[];
  batchSize: number;
  chunkIndex: number;
  totalChunks: number;
}

/**
 * Handle chunked sync operations for specific data types
 */
export async function handleChunkedSync(
  req: Request,
  supabase: any,
  user: any,
  credentials: any,
  options: ChunkSyncOptions
) {
  console.log(`[zoom-api][chunked-sync] Starting ${options.dataType} sync for chunk ${options.chunkIndex + 1}/${options.totalChunks}`);
  console.log(`[zoom-api][chunked-sync] Processing ${options.webinarIds.length} webinars:`, options.webinarIds);

  try {
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    switch (options.dataType) {
      case 'participants':
        const participantResults = await syncParticipantChunk(supabase, user.id, options.webinarIds, token);
        processedCount = participantResults.processed;
        successCount = participantResults.success;
        errorCount = participantResults.errors;
        break;
        
      case 'chat':
        const chatResults = await syncChatChunk(supabase, user.id, options.webinarIds, token);
        processedCount = chatResults.processed;
        successCount = chatResults.success;
        errorCount = chatResults.errors;
        break;
        
      case 'polls':
        const pollResults = await syncPollChunk(supabase, user.id, options.webinarIds, token);
        processedCount = pollResults.processed;
        successCount = pollResults.success;
        errorCount = pollResults.errors;
        break;
        
      case 'questions':
        const qaResults = await syncQuestionChunk(supabase, user.id, options.webinarIds, token);
        processedCount = qaResults.processed;
        successCount = qaResults.success;
        errorCount = qaResults.errors;
        break;
        
      case 'recordings':
        const recordingResults = await syncRecordingChunk(supabase, user.id, options.webinarIds, token);
        processedCount = recordingResults.processed;
        successCount = recordingResults.success;
        errorCount = recordingResults.errors;
        break;
        
      case 'instances':
        const instanceResults = await syncInstanceChunk(supabase, user.id, options.webinarIds, token);
        processedCount = instanceResults.processed;
        successCount = instanceResults.success;
        errorCount = instanceResults.errors;
        break;
        
      default:
        throw new Error(`Unknown data type: ${options.dataType}`);
    }

    // Record chunk completion
    await recordSyncHistory(
      supabase,
      user.id,
      `chunk-${options.dataType}`,
      errorCount > 0 ? 'partial' : 'success',
      successCount,
      `Chunk ${options.chunkIndex + 1}/${options.totalChunks}: ${successCount}/${processedCount} webinars processed successfully`
    );

    return new Response(JSON.stringify({
      success: true,
      dataType: options.dataType,
      chunkIndex: options.chunkIndex,
      totalChunks: options.totalChunks,
      processed: processedCount,
      successful: successCount,
      errors: errorCount,
      errorDetails: errors,
      isComplete: options.chunkIndex >= options.totalChunks - 1
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[zoom-api][chunked-sync] Error in ${options.dataType} chunk:`, error);
    
    await recordSyncHistory(
      supabase,
      user.id,
      `chunk-${options.dataType}`,
      'error',
      0,
      `Chunk ${options.chunkIndex + 1} failed: ${error.message}`
    );
    
    throw error;
  }
}

/**
 * Sync participant data for a chunk of webinars
 */
async function syncParticipantChunk(supabase: any, userId: string, webinarIds: string[], token: string) {
  let processed = 0;
  let success = 0;
  let errors = 0;

  for (const webinarId of webinarIds) {
    processed++;
    try {
      // Fetch registrants
      const registrantsRes = await fetch(
        `https://api.zoom.us/v2/webinars/${webinarId}/registrants?page_size=300`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let registrants: any[] = [];
      if (registrantsRes.ok) {
        const registrantsData = await registrantsRes.json();
        registrants = registrantsData.registrants || [];
      }

      // Fetch participants/attendees
      const participantsRes = await fetch(
        `https://api.zoom.us/v2/past_webinars/${webinarId}/participants?page_size=300`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let participants: any[] = [];
      if (participantsRes.ok) {
        const participantsData = await participantsRes.json();
        participants = participantsData.participants || [];
      }

      // Store registrants
      for (const registrant of registrants) {
        await supabase
          .from('zoom_webinar_participants')
          .upsert({
            user_id: userId,
            webinar_id: webinarId,
            participant_id: registrant.id,
            participant_type: 'registrant',
            name: `${registrant.first_name} ${registrant.last_name}`,
            email: registrant.email,
            raw_data: registrant
          }, {
            onConflict: 'user_id,webinar_id,participant_id,participant_type'
          });
      }

      // Store participants/attendees
      for (const participant of participants) {
        await supabase
          .from('zoom_webinar_participants')
          .upsert({
            user_id: userId,
            webinar_id: webinarId,
            participant_id: participant.id || participant.user_id,
            participant_type: 'attendee',
            name: participant.name,
            email: participant.email,
            join_time: participant.join_time,
            leave_time: participant.leave_time,
            duration: participant.duration,
            raw_data: participant
          }, {
            onConflict: 'user_id,webinar_id,participant_id,participant_type'
          });
      }

      success++;
      console.log(`[chunked-sync] Synced ${registrants.length} registrants and ${participants.length} attendees for webinar ${webinarId}`);
    } catch (err) {
      errors++;
      console.warn(`[chunked-sync] Error syncing participants for webinar ${webinarId}:`, err);
    }
  }

  return { processed, success, errors };
}

/**
 * Sync chat data for a chunk of webinars
 */
async function syncChatChunk(supabase: any, userId: string, webinarIds: string[], token: string) {
  let processed = 0;
  let success = 0;
  let errors = 0;

  for (const webinarId of webinarIds) {
    processed++;
    try {
      const chatRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/chat`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        const messages = chatData.messages || [];

        for (const message of messages) {
          await supabase
            .from('zoom_webinar_chat')
            .upsert({
              user_id: userId,
              webinar_id: webinarId,
              sender_id: message.sender_id,
              sender_name: message.sender_name,
              sender_email: message.sender_email,
              message: message.message,
              message_time: message.date_time,
              recipient_type: message.recipient?.type,
              recipient_id: message.recipient?.id,
              recipient_name: message.recipient?.name,
              raw_data: message
            }, {
              onConflict: 'user_id,webinar_id,sender_id,message_time'
            });
        }

        success++;
        console.log(`[chunked-sync] Synced ${messages.length} chat messages for webinar ${webinarId}`);
      } else {
        success++; // Not an error if no chat data available
      }
    } catch (err) {
      errors++;
      console.warn(`[chunked-sync] Error syncing chat for webinar ${webinarId}:`, err);
    }
  }

  return { processed, success, errors };
}

/**
 * Sync poll data for a chunk of webinars
 */
async function syncPollChunk(supabase: any, userId: string, webinarIds: string[], token: string) {
  let processed = 0;
  let success = 0;
  let errors = 0;

  for (const webinarId of webinarIds) {
    processed++;
    try {
      const pollsRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/polls`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (pollsRes.ok) {
        const pollsData = await pollsRes.json();
        const polls = pollsData.polls || [];

        for (const poll of polls) {
          // Store poll definition
          await supabase
            .from('zoom_webinar_polls')
            .upsert({
              user_id: userId,
              webinar_id: webinarId,
              poll_id: poll.id,
              title: poll.title,
              status: poll.status,
              questions: poll.questions,
              start_time: poll.start_time,
              end_time: poll.end_time,
              total_participants: poll.total_participants,
              raw_data: poll
            }, {
              onConflict: 'user_id,webinar_id,poll_id'
            });

          // Store individual poll responses
          const responses = poll.responses || [];
          for (const response of responses) {
            await supabase
              .from('zoom_webinar_poll_responses')
              .upsert({
                user_id: userId,
                webinar_id: webinarId,
                poll_id: poll.id,
                name: response.name,
                email: response.email,
                responses: response.responses,
                response_time: response.response_time,
                raw_data: response
              }, {
                onConflict: 'user_id,webinar_id,poll_id,email'
              });
          }
        }

        success++;
        console.log(`[chunked-sync] Synced ${polls.length} polls for webinar ${webinarId}`);
      } else {
        success++; // Not an error if no poll data available
      }
    } catch (err) {
      errors++;
      console.warn(`[chunked-sync] Error syncing polls for webinar ${webinarId}:`, err);
    }
  }

  return { processed, success, errors };
}

/**
 * Sync Q&A data for a chunk of webinars
 */
async function syncQuestionChunk(supabase: any, userId: string, webinarIds: string[], token: string) {
  let processed = 0;
  let success = 0;
  let errors = 0;

  for (const webinarId of webinarIds) {
    processed++;
    try {
      const qaRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/qa`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (qaRes.ok) {
        const qaData = await qaRes.json();
        const questions = qaData.questions || [];

        for (const qa of questions) {
          await supabase
            .from('zoom_webinar_questions')
            .upsert({
              user_id: userId,
              webinar_id: webinarId,
              question_id: qa.question_id,
              question: qa.question,
              answer: qa.answer,
              name: qa.name,
              email: qa.email,
              question_time: qa.date_time,
              answer_time: qa.answer_date_time,
              answered: !!qa.answer,
              answered_by: qa.answered_by,
              raw_data: qa
            }, {
              onConflict: 'user_id,webinar_id,question_id'
            });
        }

        success++;
        console.log(`[chunked-sync] Synced ${questions.length} Q&A items for webinar ${webinarId}`);
      } else {
        success++; // Not an error if no Q&A data available
      }
    } catch (err) {
      errors++;
      console.warn(`[chunked-sync] Error syncing Q&A for webinar ${webinarId}:`, err);
    }
  }

  return { processed, success, errors };
}

/**
 * Sync recording data for a chunk of webinars
 */
async function syncRecordingChunk(supabase: any, userId: string, webinarIds: string[], token: string) {
  let processed = 0;
  let success = 0;
  let errors = 0;

  for (const webinarId of webinarIds) {
    processed++;
    try {
      const recordingsRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/recordings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (recordingsRes.ok) {
        const recordingsData = await recordingsRes.json();
        const recordings = recordingsData.recording_files || [];

        for (const recording of recordings) {
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
              recording_start: recording.recording_start,
              recording_end: recording.recording_end,
              duration: recording.duration,
              password: recording.password,
              raw_data: recording
            }, {
              onConflict: 'user_id,webinar_id,recording_id'
            });
        }

        success++;
        console.log(`[chunked-sync] Synced ${recordings.length} recordings for webinar ${webinarId}`);
      } else {
        success++; // Not an error if no recordings available
      }
    } catch (err) {
      errors++;
      console.warn(`[chunked-sync] Error syncing recordings for webinar ${webinarId}:`, err);
    }
  }

  return { processed, success, errors };
}

/**
 * Sync instance data for a chunk of webinars
 */
async function syncInstanceChunk(supabase: any, userId: string, webinarIds: string[], token: string) {
  let processed = 0;
  let success = 0;
  let errors = 0;

  for (const webinarId of webinarIds) {
    processed++;
    try {
      const instancesRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarId}/instances`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (instancesRes.ok) {
        const instancesData = await instancesRes.json();
        const instances = instancesData.webinars || [];

        for (const instance of instances) {
          await supabase
            .from('zoom_webinar_instances')
            .upsert({
              user_id: userId,
              webinar_id: webinarId,
              webinar_uuid: instance.uuid,
              instance_id: instance.uuid,
              topic: instance.topic,
              start_time: instance.start_time,
              end_time: instance.end_time,
              duration: instance.duration,
              status: instance.status,
              raw_data: instance
            }, {
              onConflict: 'user_id,webinar_id,instance_id'
            });
        }

        success++;
        console.log(`[chunked-sync] Synced ${instances.length} instances for webinar ${webinarId}`);
      } else {
        success++; // Not an error if no instances available
      }
    } catch (err) {
      errors++;
      console.warn(`[chunked-sync] Error syncing instances for webinar ${webinarId}:`, err);
    }
  }

  return { processed, success, errors };
}
