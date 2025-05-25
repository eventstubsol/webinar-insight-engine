import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

import { corsHeaders } from './cors.ts';
import { getZoomCredentials, getZoomJwtToken } from './auth.ts';

import { handleListWebinars } from './handlers/listWebinars.ts';
import { handleGetWebinar } from './handlers/getWebinar.ts';
import { handleGetParticipants } from './handlers/getParticipants.ts';
import { handleGetWebinarInstances } from './handlers/getWebinarInstances.ts';
import { handleGetInstanceParticipants } from './handlers/getInstanceParticipants.ts';
import { handleUpdateWebinarParticipants } from './handlers/updateWebinarParticipants.ts';
import { handleSyncSingleWebinar } from './handlers/syncSingleWebinar.ts';

import { handleGetWebinarRecordings } from './handlers/getWebinarRecordings.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply 30-second timeout to all operations
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out after 30000ms')), 30000);
  });

  try {
    const result = await Promise.race([
      handleRequest(req),
      timeoutPromise
    ]);
    return result as Response;
  } catch (error) {
    console.error('[zoom-api] Error in index:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleRequest(req: Request): Promise<Response> {
  try {
    const { action, ...params } = await req.json();
    console.log(`[zoom-api] Received action: ${action}`);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    // Get user's Zoom credentials
    const credentials = await getZoomCredentials(supabase, user.id);

    // Route to appropriate handler
    switch (action) {
      case 'list-webinars':
        return await handleListWebinars(req, supabase, user, credentials, params.force_sync || false);
      
      case 'get-webinar':
        return await handleGetWebinar(req, supabase, user, credentials);
      
      case 'get-participants':
        return await handleGetParticipants(req, supabase, user, credentials);
      
      case 'get-webinar-instances':
        return await handleGetWebinarInstances(req, supabase, user, credentials);
      
      case 'get-instance-participants':
        return await handleGetInstanceParticipants(req, supabase, user, credentials);
      
      case 'update-webinar-participants':
        return await handleUpdateWebinarParticipants(req, supabase, user, credentials);
      
      case 'sync-single-webinar':
        return await handleSyncSingleWebinar(req, supabase, user, credentials);
      
      case 'get-webinar-recordings':
        return await handleGetWebinarRecordings(req, supabase, user, credentials);
      
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('[zoom-api] Error handling request:', error);
    throw error;
  }
}

async function handleGetWebinar(req: Request, supabase: any, user: any, credentials: any) {
  console.log('[zoom-api] Handling get-webinar action');
  try {
    const { webinar_id } = await req.json();

    if (!webinar_id) {
      return new Response(JSON.stringify({ error: 'Missing webinar_id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get token
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);

    // Fetch webinar details from Zoom API
    const webinarResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!webinarResponse.ok) {
      const errorData = await webinarResponse.json();
      console.error('[zoom-api] Error fetching webinar details:', errorData);
      return new Response(JSON.stringify({ error: `Failed to fetch webinar details: ${errorData.message || webinarResponse.statusText}` }), {
        status: webinarResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const webinarData = await webinarResponse.json();

    // Return the webinar data
    return new Response(JSON.stringify(webinarData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[zoom-api] Error in get-webinar action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetParticipants(req: Request, supabase: any, user: any, credentials: any) {
  console.log('[zoom-api] Handling get-participants action');
  try {
    const { webinar_id } = await req.json();

    if (!webinar_id) {
      return new Response(JSON.stringify({ error: 'Missing webinar_id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get token
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);

    // Fetch registrants from Zoom API
    const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}/registrants?status=approved`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!registrantsResponse.ok) {
      const errorData = await registrantsResponse.json();
      console.error('[zoom-api] Error fetching registrants:', errorData);
      return new Response(JSON.stringify({ error: `Failed to fetch registrants: ${errorData.message || registrantsResponse.statusText}` }), {
        status: registrantsResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const registrantsData = await registrantsResponse.json();
    const registrants = registrantsData.registrants || [];

    // Fetch attendees from Zoom API
    const attendeesResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}/participants`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!attendeesResponse.ok) {
      const errorData = await attendeesResponse.json();
      console.error('[zoom-api] Error fetching attendees:', errorData);
      return new Response(JSON.stringify({ error: `Failed to fetch attendees: ${errorData.message || attendeesResponse.statusText}` }), {
        status: attendeesResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const attendeesData = await attendeesResponse.json();
    const attendees = attendeesData.participants || [];

    // Return the participants data
    return new Response(JSON.stringify({ registrants, attendees }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[zoom-api] Error in get-participants action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetWebinarInstances(req: Request, supabase: any, user: any, credentials: any) {
  console.log('[zoom-api] Handling get-webinar-instances action');
  try {
    const { webinar_id } = await req.json();

    if (!webinar_id) {
      return new Response(JSON.stringify({ error: 'Missing webinar_id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get token
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);

    // Fetch past webinar instances from Zoom API
    const instancesResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar_id}/instances`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!instancesResponse.ok) {
      const errorData = await instancesResponse.json();
      console.error('[zoom-api] Error fetching webinar instances:', errorData);
      return new Response(JSON.stringify({ error: `Failed to fetch webinar instances: ${errorData.message || instancesResponse.statusText}` }), {
        status: instancesResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const instancesData = await instancesResponse.json();
    const instances = instancesData.webinars || [];

    // Return the instances data
    return new Response(JSON.stringify({ instances }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[zoom-api] Error in get-webinar-instances action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetInstanceParticipants(req: Request, supabase: any, user: any, credentials: any) {
  console.log('[zoom-api] Handling get-instance-participants action');
  try {
    const { webinar_id, instance_id } = await req.json();

    if (!webinar_id || !instance_id) {
      return new Response(JSON.stringify({ error: 'Missing webinar_id or instance_id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get token
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);

    // Fetch registrants from Zoom API
    const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}/registrants?status=approved`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!registrantsResponse.ok) {
      const errorData = await registrantsResponse.json();
      console.error('[zoom-api] Error fetching registrants:', errorData);
      return new Response(JSON.stringify({ error: `Failed to fetch registrants: ${errorData.message || registrantsResponse.statusText}` }), {
        status: registrantsResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const registrantsData = await registrantsResponse.json();
    const registrants = registrantsData.registrants || [];

    // Fetch attendees from Zoom API
    const attendeesResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinar_id}/participants?instance_id=${instance_id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!attendeesResponse.ok) {
      const errorData = await attendeesResponse.json();
      console.error('[zoom-api] Error fetching attendees:', errorData);
      return new Response(JSON.stringify({ error: `Failed to fetch attendees: ${errorData.message || attendeesResponse.statusText}` }), {
        status: attendeesResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const attendeesData = await attendeesResponse.json();
    const attendees = attendeesData.participants || [];

    // Return the participants data
    return new Response(JSON.stringify({ registrants, attendees }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[zoom-api] Error in get-instance-participants action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleUpdateWebinarParticipants(req: Request, supabase: any, user: any, credentials: any) {
  console.log('[zoom-api] Handling update-webinar-participants action');
  try {
    // Fetch all webinars for the user from the database
    const { data: webinars, error: webinarsError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', user.id);

    if (webinarsError) {
      console.error('[zoom-api] Error fetching webinars from database:', webinarsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch webinars from database' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!webinars || webinars.length === 0) {
      console.log('[zoom-api] No webinars found for user, skipping participant update');
      return new Response(JSON.stringify({ message: 'No webinars found for user, skipping participant update' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get token
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);

    let updatedCount = 0;

    // Iterate through each webinar and update participants
    for (const webinar of webinars) {
      try {
        // Fetch registrants from Zoom API
        const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.webinar_id}/registrants?status=approved`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!registrantsResponse.ok) {
          const errorData = await registrantsResponse.json();
          console.warn(`[zoom-api] Error fetching registrants for webinar ${webinar.webinar_id}:`, errorData);
          continue; // Skip to the next webinar
        }

        const registrantsData = await registrantsResponse.json();
        const registrants = registrantsData.registrants || [];

        // Fetch attendees from Zoom API
        const attendeesResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.webinar_id}/participants`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!attendeesResponse.ok) {
          const errorData = await attendeesResponse.json();
          console.warn(`[zoom-api] Error fetching attendees for webinar ${webinar.webinar_id}:`, errorData);
          continue; // Skip to the next webinar
        }

        const attendeesData = await attendeesResponse.json();
        const attendees = attendeesData.participants || [];

        // Update webinar in the database with participant data
        const { error: updateError } = await supabase
          .from('zoom_webinars')
          .update({
            raw_data: {
              ...webinar.raw_data,
              registrants_count: registrants.length,
              participants_count: attendees.length
            }
          })
          .eq('webinar_id', webinar.webinar_id);

        if (updateError) {
          console.error(`[zoom-api] Error updating webinar ${webinar.webinar_id} in database:`, updateError);
          continue; // Skip to the next webinar
        }

        updatedCount++;
        console.log(`[zoom-api] Successfully updated participant data for webinar ${webinar.webinar_id}`);

      } catch (error) {
        console.error(`[zoom-api] Error processing webinar ${webinar.webinar_id}:`, error);
      }
    }

    // Return the update status
    return new Response(JSON.stringify({ message: 'Participant data update completed', updated: updatedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[zoom-api] Error in update-webinar-participants action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleSyncSingleWebinar(req: Request, supabase: any, user: any, credentials: any) {
  console.log('[zoom-api] Handling sync-single-webinar action');
  try {
    const { webinar_id } = await req.json();

    if (!webinar_id) {
      return new Response(JSON.stringify({ error: 'Missing webinar_id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get token
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);

    // Fetch webinar details from Zoom API
    const webinarResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!webinarResponse.ok) {
      const errorData = await webinarResponse.json();
      console.error('[zoom-api] Error fetching webinar details:', errorData);
      return new Response(JSON.stringify({ error: `Failed to fetch webinar details: ${errorData.message || webinarResponse.statusText}` }), {
        status: webinarResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const webinarData = await webinarResponse.json();

    // Fetch registrants from Zoom API
    const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}/registrants?status=approved`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!registrantsResponse.ok) {
      const errorData = await registrantsResponse.json();
      console.warn('[zoom-api] Error fetching registrants:', errorData);
      // It's a warning because we can still sync the basic webinar details
    }

    const registrantsData = await registrantsResponse.json();
    const registrants = registrantsData.registrants || [];

    // Fetch attendees from Zoom API
    const attendeesResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}/participants`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!attendeesResponse.ok) {
      const errorData = await attendeesResponse.json();
      console.warn('[zoom-api] Error fetching attendees:', errorData);
      // It's a warning because we can still sync the basic webinar details
    }

    const attendeesData = await attendeesResponse.json();
    const attendees = attendeesData.participants || [];

    // Prepare webinar data for database
    const webinarDataForDb = {
      user_id: user.id,
      webinar_id: webinarData.id,
      webinar_uuid: webinarData.uuid,
      topic: webinarData.topic,
      start_time: webinarData.start_time,
      duration: webinarData.duration,
      timezone: webinarData.timezone,
      agenda: webinarData.agenda || '',
      host_email: webinarData.host_email,
      status: webinarData.status,
      type: webinarData.type,
      raw_data: {
        ...webinarData,
        registrants_count: registrants.length,
        participants_count: attendees.length
      }
    };

    // Upsert webinar data into the database
    const { error: upsertError } = await supabase
      .from('zoom_webinars')
      .upsert(webinarDataForDb, {
        onConflict: 'user_id,webinar_id',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('[zoom-api] Error upserting webinar:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to sync webinar' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return success message
    return new Response(JSON.stringify({ message: 'Webinar synced successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[zoom-api] Error in sync-single-webinar action:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
