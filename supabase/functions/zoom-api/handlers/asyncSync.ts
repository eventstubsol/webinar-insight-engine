
import { corsHeaders } from '../cors.ts';
import { startAsyncWebinarSync, getSyncJobStatus } from './asyncSync/asyncSyncManager.ts';

export async function handleAsyncSync(req: Request) {
  try {
    const body = await req.json();
    const { action, force_sync, job_id } = body;
    
    console.log(`[asyncSync] Handling action: ${action}`);
    
    if (action === 'start-async-sync') {
      console.log(`[asyncSync] Starting async sync with force_sync: ${force_sync}`);
      const result = await startAsyncWebinarSync(force_sync || false);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'get-sync-status') {
      if (!job_id) {
        return new Response(JSON.stringify({ error: 'job_id is required for status check' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`[asyncSync] Getting status for job: ${job_id}`);
      const result = await getSyncJobStatus(job_id);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: `Unknown async sync action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[asyncSync] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error during async sync', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
