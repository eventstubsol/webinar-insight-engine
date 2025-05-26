
/**
 * Enhanced webinar detail processor to fetch complete settings and configuration data
 * This processor fetches individual webinar details to get settings not available in list APIs
 */

/**
 * Enhance webinars with detailed settings by fetching individual webinar details
 */
export async function enhanceWebinarsWithDetailedSettings(
  webinars: any[], 
  token: string
): Promise<any[]> {
  console.log(`[zoom-api][enhanceWebinarsWithDetailedSettings] Processing detailed settings for ${webinars.length} webinars`);
  
  const enhancedWebinars = [];
  let successfulEnhancements = 0;
  let failedEnhancements = 0;
  
  for (const webinar of webinars) {
    try {
      // Rate limiting - add small delay between requests
      if (enhancedWebinars.length > 0 && enhancedWebinars.length % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay every 10 requests
      }
      
      // Fetch complete webinar details
      console.log(`[zoom-api][enhanceWebinarsWithDetailedSettings] Fetching details for webinar: ${webinar.id}`);
      const detailResponse = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        
        // Merge basic data with detailed settings
        const enhancedWebinar = {
          ...webinar,
          // Merge settings object
          settings: {
            ...webinar.settings,
            ...detailData.settings
          },
          // Extract key settings fields to root level for easier access
          approval_type: detailData.settings?.approval_type,
          registration_type: detailData.settings?.registration_type,
          auto_recording: detailData.settings?.auto_recording,
          enforce_login: detailData.settings?.enforce_login,
          on_demand: detailData.settings?.on_demand,
          practice_session: detailData.settings?.practice_session,
          hd_video: detailData.settings?.hd_video,
          host_video: detailData.settings?.host_video,
          panelists_video: detailData.settings?.panelists_video,
          audio: detailData.settings?.audio,
          contact_name: detailData.settings?.contact_name,
          contact_email: detailData.settings?.contact_email,
          
          // Additional detail fields that might not be in list API
          password: detailData.password || webinar.password,
          start_url: detailData.start_url || webinar.start_url,
          registration_url: detailData.registration_url || webinar.registration_url,
          
          // Tracking fields and questions
          tracking_fields: detailData.tracking_fields,
          questions: detailData.questions,
          
          // Occurrence info for recurring webinars
          occurrences: detailData.occurrences,
          
          // Enhanced flag to track that this webinar has been enhanced with details
          _enhanced_with_details: true,
          _detail_fetch_timestamp: new Date().toISOString()
        };
        
        enhancedWebinars.push(enhancedWebinar);
        successfulEnhancements++;
        
        console.log(`[zoom-api][enhanceWebinarsWithDetailedSettings] ✅ Enhanced webinar ${webinar.id} with detailed settings`);
      } else {
        const errorText = await detailResponse.text();
        console.warn(`[zoom-api][enhanceWebinarsWithDetailedSettings] ⚠️ Failed to fetch details for webinar ${webinar.id}: ${detailResponse.status} - ${errorText}`);
        
        // Continue with original webinar data if detail fetch fails
        enhancedWebinars.push({
          ...webinar,
          _enhanced_with_details: false,
          _detail_fetch_error: `${detailResponse.status}: ${errorText}`,
          _detail_fetch_timestamp: new Date().toISOString()
        });
        failedEnhancements++;
      }
    } catch (error) {
      console.error(`[zoom-api][enhanceWebinarsWithDetailedSettings] ❌ Error fetching details for webinar ${webinar.id}:`, error);
      
      // Continue with original webinar data if there's an error
      enhancedWebinars.push({
        ...webinar,
        _enhanced_with_details: false,
        _detail_fetch_error: error.message,
        _detail_fetch_timestamp: new Date().toISOString()
      });
      failedEnhancements++;
    }
  }
  
  console.log(`[zoom-api][enhanceWebinarsWithDetailedSettings] 🎉 Enhancement completed: ${successfulEnhancements} successful, ${failedEnhancements} failed`);
  
  return enhancedWebinars;
}

/**
 * Batch enhance webinars with detailed settings in smaller groups to avoid rate limits
 */
export async function batchEnhanceWebinarsWithDetailedSettings(
  webinars: any[], 
  token: string,
  batchSize: number = 5
): Promise<any[]> {
  console.log(`[zoom-api][batchEnhanceWebinarsWithDetailedSettings] Processing ${webinars.length} webinars in batches of ${batchSize}`);
  
  const allEnhancedWebinars = [];
  
  // Process webinars in batches
  for (let i = 0; i < webinars.length; i += batchSize) {
    const batch = webinars.slice(i, i + batchSize);
    console.log(`[zoom-api][batchEnhanceWebinarsWithDetailedSettings] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(webinars.length / batchSize)} (${batch.length} webinars)`);
    
    try {
      const enhancedBatch = await enhanceWebinarsWithDetailedSettings(batch, token);
      allEnhancedWebinars.push(...enhancedBatch);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < webinars.length) {
        console.log(`[zoom-api][batchEnhanceWebinarsWithDetailedSettings] Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`[zoom-api][batchEnhanceWebinarsWithDetailedSettings] Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
      
      // Continue with original batch data if enhancement fails
      allEnhancedWebinars.push(...batch.map(webinar => ({
        ...webinar,
        _enhanced_with_details: false,
        _batch_enhancement_error: error.message,
        _detail_fetch_timestamp: new Date().toISOString()
      })));
    }
  }
  
  console.log(`[zoom-api][batchEnhanceWebinarsWithDetailedSettings] 🎉 Batch enhancement completed for ${allEnhancedWebinars.length} webinars`);
  
  return allEnhancedWebinars;
}
