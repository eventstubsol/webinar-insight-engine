
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

    // Process webinars in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < completedWebinars.length; i += batchSize) {
      const batch = completedWebinars.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (webinar) => {
        try {
          console.log(`[handleUpdateWebinarParticipants] Processing webinar ${webinar.webinar_id}`);
          
          // Fetch registrants count with better error handling
          let registrantsCount = 0;
          let registrantsError = null;
          try {
            const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.webinar_id}/registrants?status=approved&page_size=300`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (registrantsResponse.ok) {
              const registrantsData = await registrantsResponse.json();
              registrantsCount = registrantsData.total_records || 0;
              console.log(`[handleUpdateWebinarParticipants] Webinar ${webinar.webinar_id} registrants: ${registrantsCount}`);
              
              // Store individual registrant records
              if (registrantsData.registrants && registrantsData.registrants.length > 0) {
                for (const registrant of registrantsData.registrants) {
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
              }
            } else {
              registrantsError = `HTTP ${registrantsResponse.status}: ${await registrantsResponse.text()}`;
              console.log(`[handleUpdateWebinarParticipants] Registrants fetch failed for ${webinar.webinar_id}: ${registrantsError}`);
            }
          } catch (error) {
            registrantsError = error.message;
            console.log(`[handleUpdateWebinarParticipants] Error fetching registrants for ${webinar.webinar_id}: ${registrantsError}`);
          }

          // Fetch participants count with improved error handling and correct endpoint
          let participantsCount = 0;
          let participantsError = null;
          
          // Try the past webinar participants endpoint for completed webinars
          try {
            const participantsResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar.webinar_id}/participants?page_size=300`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (participantsResponse.ok) {
              const participantsData = await participantsResponse.json();
              participantsCount = participantsData.total_records || 0;
              console.log(`[handleUpdateWebinarParticipants] Webinar ${webinar.webinar_id} participants: ${participantsCount}`);
              
              // Store individual participant records
              if (participantsData.participants && participantsData.participants.length > 0) {
                for (const participant of participantsData.participants) {
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
              }
            } else {
              const errorText = await participantsResponse.text();
              participantsError = `HTTP ${participantsResponse.status}: ${errorText}`;
              console.log(`[handleUpdateWebinarParticipants] Past participants fetch failed for ${webinar.webinar_id}: ${participantsError}`);
              
              // Try the regular participants endpoint as fallback
              try {
                const fallbackResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.webinar_id}/participants?page_size=300`, {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                });
                
                if (fallbackResponse.ok) {
                  const fallbackData = await fallbackResponse.json();
                  participantsCount = fallbackData.total_records || 0;
                  console.log(`[handleUpdateWebinarParticipants] Fallback participants endpoint worked for ${webinar.webinar_id}: ${participantsCount}`);
                } else {
                  console.log(`[handleUpdateWebinarParticipants] Fallback participants endpoint also failed for ${webinar.webinar_id}`);
                }
              } catch (fallbackError) {
                console.log(`[handleUpdateWebinarParticipants] Fallback participants endpoint error for ${webinar.webinar_id}: ${fallbackError.message}`);
              }
            }
          } catch (error) {
            participantsError = error.message;
            console.log(`[handleUpdateWebinarParticipants] Error fetching participants for ${webinar.webinar_id}: ${participantsError}`);
          }

          // Update the webinar record with participant data
          if (registrantsCount > 0 || participantsCount > 0 || registrantsError || participantsError) {
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
                registrants_count: registrantsCount,
                participants_count: participantsCount,
                participant_data_updated_at: new Date().toISOString(),
                // Store error information for debugging
                ...(registrantsError && { registrants_fetch_error: registrantsError }),
                ...(participantsError && { participants_fetch_error: participantsError })
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
              } else {
                updatedCount++;
                console.log(`[handleUpdateWebinarParticipants] Updated webinar ${webinar.webinar_id} - registrants: ${registrantsCount}, participants: ${participantsCount}`);
                if (registrantsError) console.log(`[handleUpdateWebinarParticipants] Registrants error stored: ${registrantsError}`);
                if (participantsError) console.log(`[handleUpdateWebinarParticipants] Participants error stored: ${participantsError}`);
              }
            }
          }

        } catch (error) {
          console.error(`[handleUpdateWebinarParticipants] Error processing webinar ${webinar.webinar_id}:`, error);
        }
      }));

      // Add a small delay between batches to respect rate limits
      if (i + batchSize < completedWebinars.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[handleUpdateWebinarParticipants] Successfully updated participant data for ${updatedCount} webinars`);

    return new Response(JSON.stringify({ 
      message: 'Participant data updated', 
      updated: updatedCount,
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
