
/**
 * Enhanced registrant data processor with aggressive timeout protection and fallback strategy
 */

// Aggressive timeout configuration
const BATCH_SIZE = 3; // Reduced from 5 to 3 webinars at a time
const BATCH_DELAY_MS = 1000; // Reduced from 2000ms to 1000ms
const API_TIMEOUT_MS = 8000; // Reduced from 15s to 8s per API call
const MAX_RETRIES = 1; // Reduced from 2 to 1
const MAX_TOTAL_PROCESSING_TIME = 25000; // 25 seconds maximum for all registrant processing
const MAX_WEBINARS_TO_PROCESS = 10; // Limit to recent webinars only

/**
 * Enhanced registrant data processor with circuit breaker and aggressive timeouts
 */
export async function enhanceWebinarsWithRegistrantData(
  webinars: any[], 
  token: string,
  supabase?: any,
  userId?: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Starting with aggressive timeout protection for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] No webinars to process`);
    return [];
  }
  
  // Check if registrant syncing is enabled
  const enableRegistrantSync = Deno.env.get('ENABLE_REGISTRANT_SYNC') !== 'false';
  const limitWebinarsForSync = Deno.env.get('LIMIT_REGISTRANT_WEBINARS') !== 'false';
  
  if (!enableRegistrantSync) {
    console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Registrant sync disabled via environment variable`);
    return webinars.map(w => ({ ...w, _registrant_sync_disabled: true }));
  }
  
  // Aggressive filtering: Only process recent webinars to avoid timeout
  let webinarsToProcess = webinars;
  if (limitWebinarsForSync && webinars.length > MAX_WEBINARS_TO_PROCESS) {
    // Sort by start_time and take the most recent webinars
    webinarsToProcess = [...webinars]
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .slice(0, MAX_WEBINARS_TO_PROCESS);
    
    console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Limited processing to ${MAX_WEBINARS_TO_PROCESS} most recent webinars out of ${webinars.length} total`);
  }
  
  const startTime = Date.now();
  const results: any[] = [];
  let totalRegistrants = 0;
  let successfulEnhancements = 0;
  let failedEnhancements = 0;
  
  // Process remaining webinars without registrant data
  const remainingWebinars = webinars.filter(w => 
    !webinarsToProcess.find(processed => processed.id === w.id)
  );
  
  try {
    // Process webinars in very small batches with aggressive timeout
    const totalBatches = Math.ceil(webinarsToProcess.length / BATCH_SIZE);
    console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Processing ${webinarsToProcess.length} webinars in ${totalBatches} batches of ${BATCH_SIZE}`);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Check global timeout before starting each batch
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_TOTAL_PROCESSING_TIME) {
        console.warn(`[zoom-api][enhanceWebinarsWithRegistrantData] Global timeout reached (${elapsed}ms), stopping processing`);
        
        // Add remaining webinars without registrant data
        const startIndex = batchIndex * BATCH_SIZE;
        const remainingInBatch = webinarsToProcess.slice(startIndex);
        for (const webinar of remainingInBatch) {
          results.push({
            ...webinar,
            registrants_count: 0,
            _enhanced_with_registrants: false,
            _registrants_error: 'Global timeout protection activated',
            _timeout_protection: true
          });
          failedEnhancements++;
        }
        break;
      }
      
      const startIndex = batchIndex * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, webinarsToProcess.length);
      const batch = webinarsToProcess.slice(startIndex, endIndex);
      
      console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} webinars)`);
      
      try {
        // Process batch with very aggressive timeout
        const batchTimeout = Math.min(API_TIMEOUT_MS * batch.length + 2000, 15000); // Max 15s per batch
        const batchResults = await Promise.race([
          processBatchWithRegistrants(batch, token, supabase, userId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Batch timeout')), batchTimeout)
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
      
      // Add minimal delay between batches (except for last batch)
      if (batchIndex < totalBatches - 1) {
        const remainingTime = MAX_TOTAL_PROCESSING_TIME - (Date.now() - startTime);
        if (remainingTime > BATCH_DELAY_MS + 5000) { // Only delay if we have time
          console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] Waiting ${BATCH_DELAY_MS}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        } else {
          console.warn(`[zoom-api][enhanceWebinarsWithRegistrantData] Skipping delay due to time constraints`);
        }
      }
    }
    
  } catch (error) {
    console.error(`[zoom-api][enhanceWebinarsWithRegistrantData] Fatal error in processing:`, error);
  }
  
  // Add webinars that weren't processed due to limits
  for (const webinar of remainingWebinars) {
    results.push({
      ...webinar,
      registrants_count: 0,
      _enhanced_with_registrants: false,
      _registrants_skip_reason: 'Excluded from processing due to volume limits',
      _volume_limited: true
    });
  }
  
  const totalElapsed = Date.now() - startTime;
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData] ✅ AGGRESSIVE TIMEOUT PROTECTION COMPLETE:`);
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData]   - Total processing time: ${totalElapsed}ms`);
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData]   - Webinars processed: ${webinarsToProcess.length}/${webinars.length}`);
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData]   - Successful enhancements: ${successfulEnhancements}`);
  console.log(`[zoom-api][enhanceWebinarsWithRegistrantData]   - Failed enhancements: ${failedEnhancements}`);
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
 * Process registrant data for a single webinar with aggressive timeout
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
    
    // Create timeout promise with reduced timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('API call timeout')), API_TIMEOUT_MS)
    );
    
    // Make API call with aggressive timeout protection
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
    
    // Retry logic for transient failures (reduced retries)
    if (retryCount < MAX_RETRIES && (error.message.includes('timeout') || error.message.includes('network'))) {
      console.log(`[zoom-api][processWebinarRegistrants] Retrying webinar ${webinar.id} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1))); // Reduced backoff
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
 * Efficiently store registrants using upsert operations with timeout
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
    // Timeout the database operation as well
    const dbTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timeout')), 5000)
    );
    
    const dbOperation = async () => {
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
        throw upsertError;
      }
      
      return count || registrantsData.length;
    };
    
    const storedCount = await Promise.race([dbOperation(), dbTimeout]) as number;
    console.log(`[zoom-api][storeRegistrantsEfficiently] Efficiently stored ${storedCount} registrants for webinar ${webinarId}`);
    return storedCount;
    
  } catch (dbError) {
    console.error(`[zoom-api][storeRegistrantsEfficiently] Database error for webinar ${webinarId}:`, dbError);
    return 0;
  }
}
