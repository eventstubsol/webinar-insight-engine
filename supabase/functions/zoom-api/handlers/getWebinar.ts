
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';

// Handle getting webinar by id
export async function handleGetWebinar(req: Request, supabase: any, user: any, credentials: any, id: string) {
  if (!id) {
    throw new Error('Webinar ID is required');
  }
  
  const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
  
  const response = await fetch(`https://api.zoom.us/v2/webinars/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('Zoom webinar details error:', data);
    throw new Error(`Failed to fetch webinar details: ${data.message || 'Unknown error'}`);
  }

  return new Response(JSON.stringify({ webinar: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
