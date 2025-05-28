
import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { enhanceInstanceDataFromDatabase } from './instanceEnhancement/hybridDataPopulator.ts';
import { enhanceInstanceWithDirectPastApi } from './instanceEnhancement/directPastApiService.ts';

/**
 * Enhanced webinar instances handler
 * Implements comprehensive data fetching fix for zoom_webinar_instances
 */
export async function handleEnhanceWebinarInstances(
  req: Request, 
  supabase: any, 
  user: any, 
  credentials: any
): Promise<Response> {
  console.log(`[enhance-instances] 🚀 Starting comprehensive instance enhancement for user: ${user.id}`);
  
  try {
    const { method = 'hybrid', webinar_id = null } = await req.json().catch(() => ({}));
    
    let results: any = {};
    
    if (method === 'hybrid' || method === 'all') {
      console.log(`[enhance-instances] 🔄 Phase 1: Hybrid database enhancement`);
      
      // Phase 1: Immediate data population from existing tables
      const hybridResults = await enhanceInstanceDataFromDatabase(supabase, user.id);
      results.hybrid = hybridResults;
      
      console.log(`[enhance-instances] ✅ Hybrid enhancement complete: ${hybridResults.dataEnhanced} instances enhanced`);
    }
    
    if (method === 'api' || method === 'all') {
      console.log(`[enhance-instances] 🔄 Phase 2: Direct past API enhancement`);
      
      // Phase 2: Direct past API integration
      const token = await getZoomJwtToken(
        credentials.account_id, 
        credentials.client_id, 
        credentials.client_secret
      );
      
      const apiResults = await enhanceInstancesWithDirectApi(
        supabase, 
        user.id, 
        token, 
        webinar_id
      );
      results.api = apiResults;
      
      console.log(`[enhance-instances] ✅ API enhancement complete: ${apiResults.enhanced} instances enhanced`);
    }
    
    // Phase 3: Quality assessment
    const qualityResults = await assessInstanceDataQuality(supabase, user.id);
    results.quality = qualityResults;
    
    const response = {
      success: true,
      message: 'Instance enhancement completed',
      results,
      summary: {
        total_instances: qualityResults.totalInstances,
        enhanced_instances: results.hybrid?.dataEnhanced || 0 + results.api?.enhanced || 0,
        data_completeness: qualityResults.dataCompleteness,
        status_accuracy: qualityResults.statusAccuracy,
        participant_coverage: qualityResults.participantCoverage
      },
      timestamp: new Date().toISOString()
    };
    
    console.log(`[enhance-instances] 🎉 Enhancement complete. Summary:`, response.summary);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[enhance-instances] ❌ Error in handleEnhanceWebinarInstances:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function enhanceInstancesWithDirectApi(
  supabase: any,
  userId: string,
  token: string,
  specificWebinarId: string | null = null
): Promise<{ enhanced: number; failed: number; errors: string[] }> {
  const result = { enhanced: 0, failed: 0, errors: [] };
  
  try {
    // Get instances that need API enhancement
    let query = supabase
      .from('zoom_webinar_instances')
      .select(`
        *,
        zoom_webinars!inner(webinar_id, status, start_time, duration)
      `)
      .eq('user_id', userId)
      .or('actual_start_time.is.null,participants_count.eq.0,status.eq.unknown');
    
    if (specificWebinarId) {
      query = query.eq('webinar_id', specificWebinarId);
    }
    
    const { data: instances, error: instancesError } = await query.limit(20); // Process in batches
    
    if (instancesError) {
      result.errors.push(`Failed to fetch instances: ${instancesError.message}`);
      return result;
    }
    
    console.log(`[api-enhancer] Found ${instances?.length || 0} instances for API enhancement`);
    
    if (!instances || instances.length === 0) {
      return result;
    }
    
    // Process instances in parallel (with rate limiting)
    const enhancementPromises = instances.map(async (instance) => {
      try {
        const webinar = instance.zoom_webinars;
        const enhancementResult = await enhanceInstanceWithDirectPastApi(
          token,
          instance,
          webinar,
          supabase
        );
        
        if (enhancementResult.success) {
          result.enhanced++;
        } else {
          result.failed++;
          result.errors.push(`Instance ${instance.id}: ${enhancementResult.error}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Instance ${instance.id}: ${error.message}`);
      }
    });
    
    await Promise.all(enhancementPromises);
    
    console.log(`[api-enhancer] API enhancement complete: ${result.enhanced} enhanced, ${result.failed} failed`);
    return result;
    
  } catch (error) {
    result.errors.push(`API enhancement error: ${error.message}`);
    return result;
  }
}

async function assessInstanceDataQuality(
  supabase: any,
  userId: string
): Promise<{
  totalInstances: number;
  dataCompleteness: number;
  statusAccuracy: number;
  participantCoverage: number;
  detailedStats: any;
}> {
  try {
    const { data: instances, error } = await supabase
      .from('zoom_webinar_instances')
      .select('*')
      .eq('user_id', userId);
    
    if (error || !instances) {
      return {
        totalInstances: 0,
        dataCompleteness: 0,
        statusAccuracy: 0,
        participantCoverage: 0,
        detailedStats: {}
      };
    }
    
    const total = instances.length;
    let hasActualTiming = 0;
    let hasParticipantCounts = 0;
    let hasProperStatus = 0;
    
    for (const instance of instances) {
      if (instance.actual_start_time && instance.actual_duration) {
        hasActualTiming++;
      }
      
      if (instance.participants_count > 0 || instance.registrants_count > 0) {
        hasParticipantCounts++;
      }
      
      if (instance.status && instance.status !== 'unknown') {
        hasProperStatus++;
      }
    }
    
    return {
      totalInstances: total,
      dataCompleteness: total > 0 ? Math.round((hasActualTiming / total) * 100) : 0,
      statusAccuracy: total > 0 ? Math.round((hasProperStatus / total) * 100) : 0,
      participantCoverage: total > 0 ? Math.round((hasParticipantCounts / total) * 100) : 0,
      detailedStats: {
        hasActualTiming,
        hasParticipantCounts,
        hasProperStatus,
        dataSourceBreakdown: instances.reduce((acc: any, inst) => {
          const source = inst.data_source || 'unknown';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {})
      }
    };
  } catch (error) {
    console.error('[quality-assessment] Error assessing data quality:', error);
    return {
      totalInstances: 0,
      dataCompleteness: 0,
      statusAccuracy: 0,
      participantCoverage: 0,
      detailedStats: { error: error.message }
    };
  }
}
