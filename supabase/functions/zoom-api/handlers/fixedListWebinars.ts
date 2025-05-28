import { corsHeaders } from '../cors.ts';
import { getZoomJwtToken } from '../auth.ts';
import { processWebinarData, WebinarFieldMapping } from '../utils/enhancedFieldMapper.ts';

export async function handleListWebinarsFixed(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  console.log(`🚀 FIXED webinar sync starting for user: ${user.id}, force_sync: ${force_sync}`);
  
  try {
    // Get token and user info
    const token = await getZoomJwtToken(credentials.account_id, credentials.client_id, credentials.client_secret);
    
    const meResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meResponse.json();
    console.log(`👤 User info: ${meData.email}, ID: ${meData.id}`);
    
    const allWebinars: WebinarFieldMapping[] = [];
    
    // Strategy 1: Get recent/upcoming webinars
    console.log('📋 Fetching upcoming webinars...');
    try {
      const upcomingUrl = `https://api.zoom.us/v2/users/${meData.id}/webinars?page_size=300`;
      const upcomingResponse = await fetch(upcomingUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json();
        console.log(`📊 Upcoming API returned ${upcomingData.webinars?.length || 0} webinars`);
        
        if (upcomingData.webinars?.length > 0) {
          const processedUpcoming = await processWebinarData(upcomingData.webinars, 'regular');
          allWebinars.push(...processedUpcoming);
        }
      } else {
        console.error('❌ Upcoming webinars API error:', upcomingResponse.status, await upcomingResponse.text());
      }
    } catch (error) {
      console.error('❌ Error fetching upcoming webinars:', error);
    }
    
    // Strategy 2: Get historical webinars using reporting API
    console.log('📊 Fetching historical webinars...');
    try {
      const fromDate = '2023-01-01';
      const toDate = new Date().toISOString().split('T')[0];
      const historicalUrl = `https://api.zoom.us/v2/report/users/${meData.id}/webinars?from=${fromDate}&to=${toDate}&page_size=300`;
      
      const historicalResponse = await fetch(historicalUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (historicalResponse.ok) {
        const historicalData = await historicalResponse.json();
        console.log(`📊 Historical API returned ${historicalData.webinars?.length || 0} webinars`);
        
        if (historicalData.webinars?.length > 0) {
          const processedHistorical = await processWebinarData(historicalData.webinars, 'reporting');
          allWebinars.push(...processedHistorical);
        }
      } else {
        console.error('❌ Historical webinars API error:', historicalResponse.status, await historicalResponse.text());
      }
    } catch (error) {
      console.error('❌ Error fetching historical webinars:', error);
    }
    
    // Strategy 3: Try account-level webinars
    console.log('🏢 Fetching account webinars...');
    try {
      const accountUrl = `https://api.zoom.us/v2/accounts/me/webinars?page_size=300`;
      const accountResponse = await fetch(accountUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        console.log(`📊 Account API returned ${accountData.webinars?.length || 0} webinars`);
        
        if (accountData.webinars?.length > 0) {
          const processedAccount = await processWebinarData(accountData.webinars, 'account');
          allWebinars.push(...processedAccount);
        }
      } else {
        console.error('❌ Account webinars API error:', accountResponse.status, await accountResponse.text());
      }
    } catch (error) {
      console.error('❌ Error fetching account webinars:', error);
    }
    
    console.log(`📊 Total webinars collected: ${allWebinars.length}`);
    
    // Remove duplicates based on ID
    const uniqueWebinars = allWebinars.reduce((acc, current) => {
      const existing = acc.find(w => w.id === current.id);
      if (!existing) {
        acc.push(current);
      } else {
        // Keep the one with more complete data
        if (current.topic !== 'Untitled Webinar' && existing.topic === 'Untitled Webinar') {
          const index = acc.findIndex(w => w.id === current.id);
          acc[index] = current;
        }
      }
      return acc;
    }, [] as WebinarFieldMapping[]);
    
    console.log(`📊 Unique webinars after deduplication: ${uniqueWebinars.length}`);
    
    // Upsert to database
    let successCount = 0;
    let errorCount = 0;
    
    for (const webinar of uniqueWebinars) {
      try {
        const webinarData = {
          user_id: user.id,
          webinar_id: webinar.id,
          webinar_uuid: webinar.uuid,
          topic: webinar.topic,
          start_time: webinar.start_time,
          end_time: webinar.end_time,
          duration: webinar.duration,
          actual_duration: webinar.actual_duration,
          status: webinar.status,
          host_email: webinar.host_email,
          host_id: webinar.host_id,
          timezone: webinar.timezone,
          agenda: webinar.agenda,
          join_url: webinar.join_url,
          registration_url: webinar.registration_url,
          data_source: webinar.data_source,
          is_historical: webinar.is_historical,
          raw_data: null, // We'll store the processed data instead
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error: upsertError } = await supabase
          .from('zoom_webinars')
          .upsert(webinarData, {
            onConflict: 'user_id,webinar_id',
            ignoreDuplicates: false
          });
        
        if (upsertError) {
          console.error(`❌ Error upserting webinar ${webinar.id}:`, upsertError);
          errorCount++;
        } else {
          console.log(`✅ Successfully upserted webinar: ${webinar.id} - "${webinar.topic}"`);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing webinar ${webinar.id}:`, error);
        errorCount++;
      }
    }
    
    // Summary stats
    const summary = {
      totalCollected: allWebinars.length,
      uniqueWebinars: uniqueWebinars.length,
      successfulUpserts: successCount,
      errors: errorCount,
      webinarsBySource: {
        regular: allWebinars.filter(w => w.data_source === 'regular').length,
        reporting: allWebinars.filter(w => w.data_source === 'reporting').length,
        account: allWebinars.filter(w => w.data_source === 'account').length
      },
      historicalWebinars: uniqueWebinars.filter(w => w.is_historical).length,
      upcomingWebinars: uniqueWebinars.filter(w => !w.is_historical).length,
      webinarsWithProperTopics: uniqueWebinars.filter(w => w.topic !== 'Untitled Webinar').length
    };
    
    console.log('📊 SYNC SUMMARY:', summary);
    
    // Record sync history
    await supabase
      .from('zoom_sync_history')
      .insert({
        user_id: user.id,
        sync_type: 'webinars',
        status: 'success',
        items_synced: successCount,
        message: `Enhanced sync: ${successCount} successful, ${errorCount} errors. Sources: ${JSON.stringify(summary.webinarsBySource)}`
      });
    
    return new Response(JSON.stringify({
      webinars: uniqueWebinars,
      summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Enhanced sync error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Check server logs for detailed error information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
