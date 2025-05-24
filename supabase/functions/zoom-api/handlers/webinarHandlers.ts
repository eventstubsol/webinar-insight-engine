
import { getValidAccessToken } from '../auth.ts';
import { corsHeaders } from '../cors.ts';

export async function handleGetWebinar(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  id: string
): Promise<Response> {
  try {
    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id, credentials);

    // Fetch webinar from Zoom API
    const webinarResponse = await fetch(`https://api.zoom.us/v2/webinars/${id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!webinarResponse.ok) {
      const errorText = await webinarResponse.text();
      console.error('Zoom API error:', errorText);
      throw new Error(`Zoom API error: ${webinarResponse.status} ${errorText}`);
    }

    const webinarData = await webinarResponse.json();

    return new Response(JSON.stringify(webinarData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch webinar' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}

export async function handleGetParticipants(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  id: string
): Promise<Response> {
  try {
    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id, credentials);

    // Fetch registrants from Zoom API
    const registrantsResponse = await fetch(`https://api.zoom.us/v2/webinars/${id}/registrants?status=approved`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!registrantsResponse.ok) {
      const errorText = await registrantsResponse.text();
      console.error('Zoom API error (registrants):', errorText);
      throw new Error(`Zoom API error (registrants): ${registrantsResponse.status} ${errorText}`);
    }

    const registrantsData = await registrantsResponse.json();

    // Fetch attendees from Zoom API
    const attendeesResponse = await fetch(`https://api.zoom.us/v2/webinars/${id}/participants`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!attendeesResponse.ok) {
      const errorText = await attendeesResponse.text();
      console.error('Zoom API error (attendees):', errorText);
      throw new Error(`Zoom API error (attendees): ${attendeesResponse.status} ${errorText}`);
    }

    const attendeesData = await attendeesResponse.json();

    return new Response(JSON.stringify({
      registrants: registrantsData.registrants || [],
      attendees: attendeesData.participants || []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch participants' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}

export async function handleGetWebinarInstances(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  webinarId: string
): Promise<Response> {
  try {
    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id, credentials);

    // Fetch webinar instances from Zoom API
    const instancesResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/instances`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!instancesResponse.ok) {
      const errorText = await instancesResponse.text();
      console.error('Zoom API error (instances):', errorText);
      throw new Error(`Zoom API error (instances): ${instancesResponse.status} ${errorText}`);
    }

    const instancesData = await instancesResponse.json();

    return new Response(JSON.stringify({
      instances: instancesData.occurrences || []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch webinar instances' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}

export async function handleGetInstanceParticipants(
  req: Request,
  supabaseAdmin: any,
  user: any,
  credentials: any,
  webinarId: string,
  instanceId: string
): Promise<Response> {
  try {
    // Get access token
    const accessToken = await getValidAccessToken(supabaseAdmin, user.id, credentials);

    // Fetch registrants for the instance from Zoom API
    const registrantsResponse = await fetch(
      `https://api.zoom.us/v2/webinars/${webinarId}/registrants?occurrence_id=${instanceId}&status=approved`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!registrantsResponse.ok) {
      const errorText = await registrantsResponse.text();
      console.error('Zoom API error (instance registrants):', errorText);
      throw new Error(`Zoom API error (instance registrants): ${registrantsResponse.status} ${errorText}`);
    }

    const registrantsData = await registrantsResponse.json();

    // Fetch attendees for the instance from Zoom API
    const attendeesResponse = await fetch(
      `https://api.zoom.us/v2/webinars/${webinarId}/participants?occurrence_id=${instanceId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!attendeesResponse.ok) {
      const errorText = await attendeesResponse.text();
      console.error('Zoom API error (instance attendees):', errorText);
      throw new Error(`Zoom API error (instance attendees): ${attendeesResponse.status} ${errorText}`);
    }

    const attendeesData = await attendeesResponse.json();

    return new Response(JSON.stringify({
      registrants: registrantsData.registrants || [],
      attendees: attendeesData.participants || []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to fetch instance participants' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}
