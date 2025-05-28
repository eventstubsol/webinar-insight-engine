
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from './cors.ts'
import { getZoomCredentials } from './utils/credentialsManager.ts'
import { handleListWebinars } from './handlers/listWebinars.ts'
import { handleGetWebinarDetails } from './handlers/getWebinarDetails.ts'
import { handleGetWebinarParticipants } from './handlers/getWebinarParticipants.ts'
import { handleGetWebinarInstances } from './handlers/getWebinarInstances.ts'
import { handleUpdateWebinarParticipants } from './handlers/updateWebinarParticipants.ts'
import { handleGetWebinarRecordings } from './handlers/getWebinarRecordings.ts'
import { handleEnhanceWebinarInstances } from './handlers/enhanceWebinarInstances.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, ...params } = await req.json()
    console.log(`[zoom-api] Received action: ${action}`)

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    console.log(`Getting Zoom credentials for user ${user.id}`)
    const credentials = await getZoomCredentials(supabase, user.id)

    // Route to appropriate handler
    switch (action) {
      case 'list-webinars':
        return await handleListWebinars(req, supabase, user, credentials)
      
      case 'get-webinar-details':
        return await handleGetWebinarDetails(req, supabase, user, credentials, params.id)
      
      case 'get-participants':
        return await handleGetWebinarParticipants(req, supabase, user, credentials, params.id)
      
      case 'get-webinar-instances':
        return await handleGetWebinarInstances(req, supabase, user, credentials, params.id)
      
      case 'update-webinar-participants':
        return await handleUpdateWebinarParticipants(req, supabase, user, credentials)
      
      case 'get-webinar-recordings':
        return await handleGetWebinarRecordings(req, supabase, user, credentials, params.id)
      
      case 'enhance-webinar-instances':
        return await handleEnhanceWebinarInstances(req, supabase, user, credentials)
      
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (error) {
    console.error('[zoom-api] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
