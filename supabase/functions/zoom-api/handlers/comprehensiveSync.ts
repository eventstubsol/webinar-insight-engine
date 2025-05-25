import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { fetchWebinarsFromZoomAPI, performNonDestructiveUpsert } from './sync/nonDestructiveSync.ts';
import { enhanceWebinarsWithParticipantData } from './sync/participantDataProcessor.ts';
import { calculateSyncStats, recordSyncHistory } from './sync/syncStatsCalculator.ts';

export interface SyncProgress {
  stage: string;
  progress: number;
  total: number;
  message: string;
  completed: string[];
  current: string;
}

export interface ComprehensiveSyncOptions {
  includeParticipants: boolean;
  includeInstances: boolean;
  includeChat: boolean;
  includePolls: boolean;
  includeQuestions: boolean;
  includeRecordings: boolean;
  includeEngagement: boolean;
  batchSize: number;
}

/**
 * Comprehensive sync that fetches basic webinar data only
 * Extended data is now handled by chunked operations
 */
export async function handleComprehensiveSync(
  req: Request, 
  supabase: any, 
  user: any, 
  credentials: any, 
  options: ComprehensiveSyncOptions
) {
  console.log(`[zoom-api][comprehensive-sync] Starting basic comprehensive sync for user: ${user.id}`);
  console.log(`[zoom-api][comprehensive-sync] Options:`, options);
  
  const syncId = crypto.randomUUID();
  let progress: SyncProgress = {
    stage: 'initializing',
    progress: 0,
    total: 100,
    message: 'Initializing comprehensive sync...',
    completed: [],
    current: 'Setup'
  };

  try {
    // Get Zoom token
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    // Get user info
    const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!meResponse.ok) {
      const meData = await meResponse.json();
      throw new Error(`Failed to get user info: ${meData.message || 'Unknown error'}`);
    }
    
    const meData = await meResponse.json();
    console.log(`[zoom-api][comprehensive-sync] User: ${meData.email}`);

    // Stage 1: Fetch core webinar data
    progress = updateProgress(progress, 'webinars', 50, 'Fetching core webinar data...');
    const allWebinars = await fetchWebinarsFromZoomAPI(token, meData.id);
    console.log(`[zoom-api][comprehensive-sync] Fetched ${allWebinars.length} webinars`);

    // Stage 2: Enhanced participant data for basic counts
    progress = updateProgress(progress, 'basic-participants', 75, 'Fetching basic participant counts...');
    const enhancedWebinars = await enhanceWebinarsWithParticipantData(allWebinars, token);

    // Stage 3: Sync core data
    progress = updateProgress(progress, 'core-sync', 90, 'Syncing core webinar data...');
    const { data: existingWebinars } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id);
    
    const syncResults = await performNonDestructiveUpsert(supabase, user.id, enhancedWebinars, existingWebinars || []);

    // Calculate final statistics
    progress = updateProgress(progress, 'finalizing', 95, 'Calculating final statistics...');
    const statsResult = await calculateSyncStats(supabase, user.id, syncResults, allWebinars.length);

    // Record comprehensive sync in history
    await recordSyncHistory(
      supabase,
      user.id,
      'comprehensive-basic',
      'success',
      syncResults.newWebinars + syncResults.updatedWebinars,
      `Basic comprehensive sync completed: ${syncResults.newWebinars} new, ${syncResults.updatedWebinars} updated webinars. Use chunked sync for detailed data.`
    );

    progress = updateProgress(progress, 'completed', 100, 'Basic comprehensive sync completed successfully!');

    // Get final webinar list
    const { data: finalWebinars } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    const finalWebinarsList = finalWebinars?.map(w => ({
      id: w.webinar_id,
      uuid: w.webinar_uuid,
      topic: w.topic,
      start_time: w.start_time,
      duration: w.duration,
      timezone: w.timezone,
      agenda: w.agenda || '',
      host_email: w.host_email,
      status: w.status,
      type: w.type,
      ...w.raw_data
    })) || [];

    return new Response(JSON.stringify({ 
      webinars: finalWebinarsList,
      source: 'comprehensive-basic',
      syncId,
      progress,
      syncResults: {
        ...syncResults,
        totalWebinars: statsResult.totalWebinarsInDB,
        basicSyncOnly: true,
        nextStep: 'Use chunked sync for detailed participant, chat, poll, and recording data'
      },
      // Return webinar IDs for chunked operations
      availableWebinars: finalWebinarsList.map(w => ({
        id: w.id,
        topic: w.topic,
        start_time: w.start_time,
        status: w.status
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[zoom-api][comprehensive-sync] Error:', error);
    
    await recordSyncHistory(
      supabase,
      user.id,
      'comprehensive-basic',
      'error',
      0,
      error.message || 'Unknown error during comprehensive sync'
    );
    
    throw error;
  }
}

function updateProgress(current: SyncProgress, stage: string, progress: number, message: string): SyncProgress {
  return {
    ...current,
    stage,
    progress,
    message,
    completed: [...current.completed, current.current].filter(Boolean),
    current: stage
  };
}

/**
 * Sync webinar instances for recurring webinars
 */
async function syncWebinarInstances(supabase: any, userId: string, webinars: any[], token: string, batchSize: number) {
  console.log(`[zoom-api][sync-instances] Processing ${webinars.length} webinars for instances`);
  
  for (let i = 0; i < webinars.length; i += batchSize) {
    const batch = webinars.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (webinar) => {
      try {
        const instancesRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}/instances`, {
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
                webinar_id: webinar.id,
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
          
          console.log(`[zoom-api][sync-instances] Synced ${instances.length} instances for webinar ${webinar.id}`);
        }
      } catch (err) {
        console.warn(`[zoom-api][sync-instances] Error fetching instances for webinar ${webinar.id}:`, err);
      }
    }));
  }
}

/**
 * Sync detailed participant lists
 */
async function syncDetailedParticipants(supabase: any, userId: string, webinars: any[], token: string, batchSize: number) {
  console.log(`[zoom-api][sync-participants] Processing detailed participants for ${webinars.length} webinars`);
  
  const completedWebinars = webinars.filter(w => {
    const webinarStartTime = new Date(w.start_time);
    const now = new Date();
    return w.status === 'ended' || (webinarStartTime < now && now.getTime() - webinarStartTime.getTime() > (w.duration || 60) * 60 * 1000);
  });
  
  for (let i = 0; i < completedWebinars.length; i += batchSize) {
    const batch = completedWebinars.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (webinar) => {
      try {
        // Fetch registrants
        let registrants: any[] = [];
        let nextPageToken = '';
        
        do {
          const registrantsRes = await fetch(
            `https://api.zoom.us/v2/webinars/${webinar.id}/registrants?page_size=300${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (registrantsRes.ok) {
            const registrantsData = await registrantsRes.json();
            registrants = registrants.concat(registrantsData.registrants || []);
            nextPageToken = registrantsData.next_page_token || '';
          } else {
            break;
          }
        } while (nextPageToken);
        
        // Fetch participants/attendees
        let participants: any[] = [];
        nextPageToken = '';
        
        do {
          const participantsRes = await fetch(
            `https://api.zoom.us/v2/past_webinars/${webinar.id}/participants?page_size=300${nextPageToken ? `&next_page_token=${nextPageToken}` : ''}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (participantsRes.ok) {
            const participantsData = await participantsRes.json();
            participants = participants.concat(participantsData.participants || []);
            nextPageToken = participantsData.next_page_token || '';
          } else {
            break;
          }
        } while (nextPageToken);
        
        // Store registrants
        for (const registrant of registrants) {
          await supabase
            .from('zoom_webinar_participants')
            .upsert({
              user_id: userId,
              webinar_id: webinar.id,
              participant_id: registrant.id,
              participant_type: 'registrant',
              name: registrant.first_name + ' ' + registrant.last_name,
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
              webinar_id: webinar.id,
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
        
        console.log(`[zoom-api][sync-participants] Synced ${registrants.length} registrants and ${participants.length} attendees for webinar ${webinar.id}`);
      } catch (err) {
        console.warn(`[zoom-api][sync-participants] Error fetching participants for webinar ${webinar.id}:`, err);
      }
    }));
  }
}

/**
 * Sync chat messages
 */
async function syncChatData(supabase: any, userId: string, webinars: any[], token: string, batchSize: number) {
  console.log(`[zoom-api][sync-chat] Processing chat data for ${webinars.length} webinars`);
  
  const completedWebinars = webinars.filter(w => w.status === 'ended');
  
  for (let i = 0; i < completedWebinars.length; i += batchSize) {
    const batch = completedWebinars.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (webinar) => {
      try {
        const chatRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}/chat`, {
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
                webinar_id: webinar.id,
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
          
          console.log(`[zoom-api][sync-chat] Synced ${messages.length} chat messages for webinar ${webinar.id}`);
        }
      } catch (err) {
        console.warn(`[zoom-api][sync-chat] Error fetching chat for webinar ${webinar.id}:`, err);
      }
    }));
  }
}

/**
 * Sync Q&A data
 */
async function syncQuestionData(supabase: any, userId: string, webinars: any[], token: string, batchSize: number) {
  console.log(`[zoom-api][sync-qa] Processing Q&A data for ${webinars.length} webinars`);
  
  const completedWebinars = webinars.filter(w => w.status === 'ended');
  
  for (let i = 0; i < completedWebinars.length; i += batchSize) {
    const batch = completedWebinars.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (webinar) => {
      try {
        const qaRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}/qa`, {
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
                webinar_id: webinar.id,
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
          
          console.log(`[zoom-api][sync-qa] Synced ${questions.length} Q&A items for webinar ${webinar.id}`);
        }
      } catch (err) {
        console.warn(`[zoom-api][sync-qa] Error fetching Q&A for webinar ${webinar.id}:`, err);
      }
    }));
  }
}

/**
 * Sync poll data
 */
async function syncPollData(supabase: any, userId: string, webinars: any[], token: string, batchSize: number) {
  console.log(`[zoom-api][sync-polls] Processing poll data for ${webinars.length} webinars`);
  
  const completedWebinars = webinars.filter(w => w.status === 'ended');
  
  for (let i = 0; i < completedWebinars.length; i += batchSize) {
    const batch = completedWebinars.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (webinar) => {
      try {
        const pollsRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}/polls`, {
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
                webinar_id: webinar.id,
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
                  webinar_id: webinar.id,
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
          
          console.log(`[zoom-api][sync-polls] Synced ${polls.length} polls for webinar ${webinar.id}`);
        }
      } catch (err) {
        console.warn(`[zoom-api][sync-polls] Error fetching polls for webinar ${webinar.id}:`, err);
      }
    }));
  }
}

/**
 * Sync recording data
 */
async function syncRecordingData(supabase: any, userId: string, webinars: any[], token: string, batchSize: number) {
  console.log(`[zoom-api][sync-recordings] Processing recording data for ${webinars.length} webinars`);
  
  const completedWebinars = webinars.filter(w => w.status === 'ended');
  
  for (let i = 0; i < completedWebinars.length; i += batchSize) {
    const batch = completedWebinars.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (webinar) => {
      try {
        const recordingsRes = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.id}/recordings`, {
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
                webinar_id: webinar.id,
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
          
          console.log(`[zoom-api][sync-recordings] Synced ${recordings.length} recordings for webinar ${webinar.id}`);
        }
      } catch (err) {
        console.warn(`[zoom-api][sync-recordings] Error fetching recordings for webinar ${webinar.id}:`, err);
      }
    }));
  }
}
