
import { getValidAccessToken } from '../auth.ts';
import { corsHeaders } from '../cors.ts';

export async function handleUpdateWebinarParticipants(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any
): Promise<Response> {
  try {
    console.log(`[handleUpdateWebinarParticipants] Starting for user ${user.id}`);

    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id, credentials);

    // Fetch all webinars from the database for the user
    const { data: webinars, error: dbError } = await supabaseAdmin
      .from('zoom_webinars')
      .select('webinar_id, status, start_time, duration')
      .eq('user_id', user.id);

    if (dbError) {
      console.error('[handleUpdateWebinarParticipants] DB error fetching webinars:', dbError);
      throw new Error(`DB error fetching webinars: ${dbError.message}`);
    }

    if (!webinars || webinars.length === 0) {
      console.log('[handleUpdateWebinarParticipants] No webinars found for user');
      return new Response(JSON.stringify({ message: 'No webinars found for user', updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let updatedCount = 0;
    let successfulUpdates = 0;
    let partialFailures = 0;
    const now = new Date();

    // Filter webinars that have likely ended (based on start_time + duration)
    const completedWebinars = webinars.filter(webinar => {
      if (!webinar.start_time) return false;
      
      const startTime = new Date(webinar.start_time);
      const estimatedEndTime = new Date(startTime.getTime() + (webinar.duration || 60) * 60 * 1000);
      
      // Include webinars that ended more than 30 minutes ago (to ensure they're truly finished)
      const bufferTime = 30 * 60 * 1000; // 30 minutes in milliseconds
      return estimatedEndTime.getTime() + bufferTime < now.getTime();
    });

    console.log(`[handleUpdateWebinarParticipants] Processing ${completedWebinars.length} completed webinars out of ${webinars.length} total`);

    // Helper function to fetch registrants with proper error handling
    const fetchRegistrants = async (webinarId: string, retryCount = 0): Promise<{ count: number, data: any[], error?: string }> => {
      try {
        const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/registrants?status=approved&page_size=300`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          return {
            count: data.total_records || 0,
            data: data.registrants || []
          };
        } else if (response.status === 404) {
          console.log(`[handleUpdateWebinarParticipants] No registrants found for webinar ${webinarId} (404)`);
          return { count: 0, data: [] };
        } else if (response.status === 429 && retryCount < 2) {
          // Rate limit hit, wait and retry
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`[handleUpdateWebinarParticipants] Rate limited, retrying in ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return fetchRegistrants(webinarId, retryCount + 1);
        } else {
          const errorText = await response.text();
          return {
            count: 0,
            data: [],
            error: `HTTP ${response.status}: ${errorText}`
          };
        }
      } catch (error) {
        return {
          count: 0,
          data: [],
          error: error.message
        };
      }
    };

    // Helper function to fetch participants with proper endpoint selection
    const fetchParticipants = async (webinarId: string, isCompleted: boolean, retryCount = 0): Promise<{ count: number, data: any[], error?: string }> => {
      try {
        // Use different endpoints based on webinar status
        const endpoint = isCompleted 
          ? `https://api.zoom.us/v2/past_webinars/${webinarId}/participants?page_size=300`
          : `https://api.zoom.us/v2/webinars/${webinarId}/participants?page_size=300`;

        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          return {
            count: data.total_records || 0,
            data: data.participants || []
          };
        } else if (response.status === 404) {
          // If past_webinars endpoint fails, try the regular endpoint as fallback
          if (isCompleted && endpoint.includes('past_webinars')) {
            console.log(`[handleUpdateWebinarParticipants] Past webinar endpoint failed for ${webinarId}, trying regular endpoint`);
            return fetchParticipants(webinarId, false, retryCount);
          }
          console.log(`[handleUpdateWebinarParticipants] No participants found for webinar ${webinarId} (404)`);
          return { count: 0, data: [] };
        } else if (response.status === 429 && retryCount < 2) {
          // Rate limit hit, wait and retry
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`[handleUpdateWebinarParticipants] Rate limited, retrying in ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return fetchParticipants(webinarId, isCompleted, retryCount + 1);
        } else {
          const errorText = await response.text();
          return {
            count: 0,
            data: [],
            error: `HTTP ${response.status}: ${errorText}`
          };
        }
      } catch (error) {
        return {
          count: 0,
          data: [],
          error: error.message
        };
      }
    };

    // Process webinars in smaller batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < completedWebinars.length; i += batchSize) {
      const batch = completedWebinars.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (webinar) => {
        try {
          console.log(`[handleUpdateWebinarParticipants] Processing webinar ${webinar.webinar_id}`);
          
          const isCompleted = true; // All webinars in this loop are completed
          
          // Fetch registrants and participants in parallel
          const [registrantsResult, participantsResult] = await Promise.all([
            fetchRegistrants(webinar.webinar_id),
            fetchParticipants(webinar.webinar_id, isCompleted)
          ]);

          let hasUpdates = false;
          let updateData: any = {};

          // Store individual registrant records if we have data
          if (registrantsResult.data.length > 0) {
            for (const registrant of registrantsResult.data) {
              await supabaseAdmin
                .from('zoom_webinar_participants')
                .upsert({
                  user_id: user.id,
                  webinar_id: webinar.webinar_id,
                  participant_id: registrant.id,
                  participant_type: 'registrant',
                  name: `${registrant.first_name || ''} ${registrant.last_name || ''}`.trim(),
                  email: registrant.email,
                  raw_data: registrant
                }, {
                  onConflict: 'user_id,webinar_id,participant_id,participant_type'
                });
            }
            hasUpdates = true;
          }

          // Store individual participant records if we have data
          if (participantsResult.data.length > 0) {
            for (const participant of participantsResult.data) {
              await supabaseAdmin
                .from('zoom_webinar_participants')
                .upsert({
                  user_id: user.id,
                  webinar_id: webinar.webinar_id,
                  participant_id: participant.id,
                  participant_type: 'attendee',
                  name: participant.name,
                  email: participant.user_email,
                  join_time: participant.join_time ? new Date(participant.join_time) : null,
                  leave_time: participant.leave_time ? new Date(participant.leave_time) : null,
                  duration: participant.duration || 0,
                  raw_data: participant
                }, {
                  onConflict: 'user_id,webinar_id,participant_id,participant_type'
                });
            }
            hasUpdates = true;
          }

          // Update the webinar record with counts and status
          if (hasUpdates || registrantsResult.error || participantsResult.error) {
            // Get the current raw_data
            const { data: currentWebinar } = await supabaseAdmin
              .from('zoom_webinars')
              .select('raw_data')
              .eq('webinar_id', webinar.webinar_id)
              .eq('user_id', user.id)
              .single();

            if (currentWebinar) {
              const updatedRawData = {
                ...currentWebinar.raw_data,
                registrants_count: registrantsResult.count,
                participants_count: participantsResult.count,
                participant_data_updated_at: new Date().toISOString(),
                ...(registrantsResult.error && { registrants_fetch_error: registrantsResult.error }),
                ...(participantsResult.error && { participants_fetch_error: participantsResult.error })
              };

              const { error: updateError } = await supabaseAdmin
                .from('zoom_webinars')
                .update({ 
                  raw_data: updatedRawData,
                  updated_at: new Date().toISOString()
                })
                .eq('webinar_id', webinar.webinar_id)
                .eq('user_id', user.id);

              if (updateError) {
                console.error(`[handleUpdateWebinarParticipants] DB error updating webinar ${webinar.webinar_id}:`, updateError);
                partialFailures++;
              } else {
                updatedCount++;
                if (!registrantsResult.error && !participantsResult.error) {
                  successfulUpdates++;
                }
                console.log(`[handleUpdateWebinarParticipants] Updated webinar ${webinar.webinar_id} - registrants: ${registrantsResult.count}, participants: ${participantsResult.count}`);
                if (registrantsResult.error) console.log(`[handleUpdateWebinarParticipants] Registrants error: ${registrantsResult.error}`);
                if (participantsResult.error) console.log(`[handleUpdateWebinarParticipants] Participants error: ${participantsResult.error}`);
              }
            }
          }

        } catch (error) {
          console.error(`[handleUpdateWebinarParticipants] Error processing webinar ${webinar.webinar_id}:`, error);
          partialFailures++;
        }
      }));

      // Add a small delay between batches to respect rate limits
      if (i + batchSize < completedWebinars.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const message = successfulUpdates === updatedCount 
      ? `Successfully updated participant data for ${updatedCount} webinars`
      : `Updated ${updatedCount} webinars with ${partialFailures} partial failures`;

    console.log(`[handleUpdateWebinarParticipants] ${message}`);

    return new Response(JSON.stringify({ 
      message,
      updated: updatedCount,
      successful: successfulUpdates,
      partial_failures: partialFailures,
      total_webinars: webinars.length,
      completed_webinars: completedWebinars.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('[handleUpdateWebinarParticipants] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to update webinar participants' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}
