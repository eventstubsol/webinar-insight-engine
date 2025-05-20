
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
async function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  return null
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = await handleCors(req)
  if (corsResponse) return corsResponse

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Get request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      throw new Error('Invalid request body');
    }
    
    const action = body?.action;
    const id = body?.id;

    // Get Zoom access token
    async function getZoomAccessToken() {
      const clientId = Deno.env.get('ZOOM_CLIENT_ID')
      const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET')

      if (!clientId || !clientSecret) {
        throw new Error('Zoom API credentials not configured')
      }

      const credentials = `${clientId}:${clientSecret}`
      const encodedCredentials = btoa(credentials)

      const response = await fetch('https://zoom.us/oauth/token?grant_type=client_credentials', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${encodedCredentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Zoom token error:', data)
        throw new Error(`Failed to get Zoom token: ${data.error}`)
      }

      return data.access_token
    }

    // Get webinars from Zoom
    if (action === 'list-webinars') {
      const token = await getZoomAccessToken()
      
      const response = await fetch('https://api.zoom.us/v2/users/me/webinars?page_size=300', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Zoom webinars error:', data)
        throw new Error(`Failed to fetch webinars: ${data.message || 'Unknown error'}`)
      }

      return new Response(JSON.stringify({ webinars: data.webinars || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Get webinar details
    else if (action === 'get-webinar' && id) {
      const token = await getZoomAccessToken()
      
      const response = await fetch(`https://api.zoom.us/v2/webinars/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error('Zoom webinar details error:', data)
        throw new Error(`Failed to fetch webinar details: ${data.message || 'Unknown error'}`)
      }

      return new Response(JSON.stringify({ webinar: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Get webinar participants (registrants and attendees)
    else if (action === 'get-participants' && id) {
      const token = await getZoomAccessToken()
      
      const [registrantsRes, attendeesRes] = await Promise.all([
        fetch(`https://api.zoom.us/v2/webinars/${id}/registrants?page_size=300`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`https://api.zoom.us/v2/past_webinars/${id}/participants?page_size=300`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ])
      
      const [registrantsData, attendeesData] = await Promise.all([
        registrantsRes.json(),
        attendeesRes.json()
      ])
      
      return new Response(JSON.stringify({
        registrants: registrantsRes.ok ? registrantsData.registrants || [] : [],
        attendees: attendeesRes.ok ? attendeesData.participants || [] : []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Zoom API error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
