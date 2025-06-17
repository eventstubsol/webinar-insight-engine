
/**
 * Enhanced registrant data processor with batch processing and rate limiting
 */

// Rate limiting configuration
const BATCH_SIZE = 5; // Process 5 webinars at a time
const BATCH_DELAY_MS = 2000; // 2 seconds between batches
const API_TIMEOUT_MS = 15000; // 15 seconds per API call
const MAX_RETRIES = 2;

/**
 * Enhanced registrant data processor for webinar enhancement orchestrator
 */
export async function enhanceWebinarsWithRegistrantData(
  webinars: any[], 
  token: string,
  supabase?: any,
  userId?: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Processing registrant data for ${webinars.length} webinars with batch processing`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] No webinars to process`);
    return [];
  }
  
  // Check if registrant syncing is enabled (can be disabled via env variable)
  const enableRegistrantSync = Deno.env.get('ENABLE_REGISTRANT_SYNC') !== 'false';
  if (!enableRegistrantSync) {
    console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Registrant sync disabled via environment variable`);
    return webinars.map(w => ({ ...w, _registrant_sync_disabled: true }));
  }
  
  const results: any[] = [];
  const totalBatches = Math.ceil(webinars.length / BATCH_SIZE);
  let totalRegistrants = 0;
  let successfulEnhancements = 0;
  let failedEnhancements = 0;
  
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Processing ${webinars.length} webinars in ${totalBatches} batches of ${BATCH_SIZE}`);
  
  // Process webinars in batches
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = batchIndex * BATCH_SIZE;
    const endIndex = Math.min(startIndex + BATCH_SIZE, webinars.length);
    const batch = webinars.slice(startIndex, endIndex);
    
    console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} webinars)`);
    
    try {
      // Process batch with timeout protection
      const batchResults = await Promise.race([
        processBatchWithRegistrants(batch, token, supabase, userId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Batch timeout')), API_TIMEOUT_MS * 2)
        )
      ]) as any[];
      
      // Collect results
      for (const result of batchResults) {
        results.push(result);
        if (result._enhanced_with_registrants === true) {
          successfulEnhancements++;
          totalRegistrants += result.registrants_count || 0;
        } else {
          failedEnhancements++;
        }
      }
      
      console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Batch ${batchIndex + 1} completed: ${batchResults.filter(r => r._enhanced_with_registrants).length}/${batch.length} successful`);
      
    } catch (error) {
      console.error(`[zoom-api][enhanceWebinarsWithRegistrantData] Batch ${batchIndex + 1} failed:`, error);
      
      // Add failed webinars to results with error markers
      for (const webinar of batch) {
        results.push({
          ...webinar,
          registrants_count: 0,
          _enhanced_with_registrants: false,
          _registrants_error: `Batch processing failed: ${error.message}`,
          _batch_failed: true
        });
        failedEnhancements++;
      }
    }
    
    // Add delay between batches (except for last batch)
    if (batchIndex < totalBatches - 1) {
      console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
  
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] ✅ BATCH PROCESSING COMPLETE:`);
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData]   - Successful enhancements: ${successfulEnhancements}/${webinars.length}`);
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData]   - Failed enhancements: ${failedEnhancements}/${webinars.length}`);
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData]   - Total registrants found: ${totalRegistrants}`);
  
  return results;
}

/**
 * Process a batch of webinars with registrant data
 */
async function processBatchWithRegistrants(
  batch: any[],
  token: string,
  supabase?: any,
  userId?: string
): Promise<any[]> {
  // Process webinars in batch concurrently but with individual error handling
  const batchPromises = batch.map(webinar => 
    processWebinarRegistrants(webinar, token, supabase, userId)
  );
  
  // Wait for all webinars in batch to complete
  const batchResults = await Promise.allSettled(batchPromises);
  
  return batchResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`[zoom-api][processBatchWithRegistrants] Webinar ${batch[index].id} failed:`, result.reason);
      return {
        ...batch[index],
        registrants_count: 0,
        _enhanced_with_registrants: false,
        _registrants_error: result.reason?.message || 'Processing failed'
      };
    }
  });
}

/**
 * Process registrant data for a single webinar with timeout and retry logic
 */
async function processWebinarRegistrants(
  webinar: any,
  token: string,
  supabase?: any,
  userId?: string,
  retryCount: number = 0
): Promise<any> {
  try {
    console.log(`[zoom-api][processWebinarRegistrants] Fetching registrants for webinar: ${webinar.id}`);
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('API call timeout')), API_TIMEOUT_MS)
    );
    
    // Make API call with timeout protection
    const registrantsRes = await Promise.race([
      fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/registrants?page_size=300`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }),
      timeoutPromise
    ]) as Response;
    
    let registrantsCount = 0;
    let registrantsData: any[] = [];
    let storedCount = 0;
    
    if (registrantsRes.ok) {
      const registrantsResponse = await registrantsRes.json();
      registrantsData = registrantsResponse.registrants || [];
      registrantsCount = registrantsResponse.total_records || registrantsData.length;
      
      console.log(`[zoom-api][processWebinarRegistrants] Found ${registrantsCount} registrants for webinar ${webinar.id}`);
      
      // Store registrants in database efficiently if supabase client is provided
      if (supabase && userId && registrantsData.length > 0) {
        try {
          storedCount = await storeRegistrantsEfficiently(supabase, userId, webinar.id, registrantsData);
        } catch (dbError) {
          console.error(`[zoom-api][processWebinarRegistrants] Database error for webinar ${webinar.id}:`, dbError);
          // Continue processing even if database storage fails
        }
      }
    } else {
      const errorText = await registrantsRes.text();
      console.log(`[zoom-api][processWebinarRegistrants] No registrants found for webinar ${webinar.id}: ${errorText}`);
    }
    
    // Return enhanced webinar object
    return {
      ...webinar,
      registrants_count: registrantsCount,
      registrants_data: registrantsData,
      _enhanced_with_registrants: true,
      _registrants_stored_count: storedCount,
      _api_call_duration: Date.now() // Simple timing marker
    };
    
  } catch (error) {
    console.error(`[zoom-api][processWebinarRegistrants] Error processing webinar ${webinar.id}:`, error);
    
    // Retry logic for transient failures
    if (retryCount < MAX_RETRIES && (error.message.includes('timeout') || error.message.includes('network'))) {
      console.log(`[zoom-api][processWebinarRegistrants] Retrying webinar ${webinar.id} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return processWebinarRegistrants(webinar, token, supabase, userId, retryCount + 1);
    }
    
    // Return webinar with error marker after max retries
    return {
      ...webinar,
      registrants_count: 0,
      _enhanced_with_registrants: false,
      _registrants_error: error.message || 'Unknown error',
      _retry_count: retryCount
    };
  }
}

/**
 * Efficiently store registrants using upsert operations
 */
async function storeRegistrantsEfficiently(
  supabase: any,
  userId: string,
  webinarId: string,
  registrantsData: any[]
): Promise<number> {
  if (!registrantsData || registrantsData.length === 0) {
    return 0;
  }
  
  try {
    // Use efficient upsert with conflict resolution
    const registrantsToUpsert = registrantsData.map((registrant: any) => ({
      user_id: userId,
      webinar_id: webinarId,
      participant_type: 'registrant',
      participant_id: registrant.id,
      email: registrant.email,
      name: `${registrant.first_name || ''} ${registrant.last_name || ''}`.trim(),
      join_time: registrant.create_time,
      raw_data: registrant
    }));
    
    // Use upsert to handle duplicates efficiently
    const { error: upsertError, count } = await supabase
      .from('zoom_webinar_participants')
      .upsert(registrantsToUpsert, {
        onConflict: 'user_id,webinar_id,participant_type,participant_id',
        ignoreDuplicates: false
      })
      .select('id', { count: 'exact' });
    
    if (upsertError) {
      console.error(`[zoom-api][storeRegistrantsEfficiently] Upsert error for webinar ${webinarId}:`, upsertError);
      return 0;
    }
    
    const storedCount = count || registrantsData.length;
    console.log(`[zoom-api][storeRegistrantsEfficiently] Efficiently stored ${storedCount} registrants for webinar ${webinarId}`);
    return storedCount;
    
  } catch (dbError) {
    console.error(`[zoom-api][storeRegistrantsEfficiently] Database error for webinar ${webinarId}:`, dbError);
    return 0;
  }
}
