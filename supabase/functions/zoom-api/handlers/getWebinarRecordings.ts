
import { corsHeaders } from '../cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { getZoomCredentials, verifyZoomCredentials } from '../credentials.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export async function handleGetWebinarRecordings(req: Request) {
  try {
    const body = await req.json();
    const { webinar_id } = body;

    if (!webinar_id) {
      return new Response(JSON.stringify({ error: 'Webinar ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[getWebinarRecordings] Fetching recordings for webinar: ${webinar_id}`);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Get user's Zoom credentials
    const credentials = await getZoomCredentials(user.id);
    if (!credentials) {
      throw new Error('No Zoom credentials found. Please connect your Zoom account first.');
    }

    // Verify and get token
    const token = await verifyZoomCredentials(credentials);

    // Fetch recordings from Zoom API
    const recordingsResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar_id}/recordings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!recordingsResponse.ok) {
      const errorData = await recordingsResponse.json();
      console.error('[getWebinarRecordings] Zoom API error:', errorData);
      
      if (recordingsResponse.status === 404) {
        return new Response(JSON.stringify({
          recordings: [],
          message: 'No recordings found for this webinar'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`Zoom API error: ${errorData.message || 'Unknown error'}`);
    }

    const recordingsData = await recordingsResponse.json();
    console.log(`[getWebinarRecordings] Retrieved recordings data for webinar ${webinar_id}`);

    return new Response(JSON.stringify(recordingsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[getWebinarRecordings] Error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch webinar recordings',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
