
/**
 * Syncs webinar instances for a batch of webinars during the main sync process
 * FIXED: Now properly fetches actual completion data for completed webinars
 */
export async function syncWebinarInstancesForWebinars(webinars: any[], token: string, supabase: any, userId: string) {
  console.log(`[zoom-api][instance-syncer] 🔄 Starting FIXED instance sync for ${webinars.length} webinars`);
  console.log(`[zoom-api][instance-syncer] 🎯 CRITICAL FIX: Will properly fetch actual completion data for completed webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][instance-syncer] No webinars to sync instances for`);
    return;
  }
  
  // Process webinars in smaller batches to avoid timeouts
  const BATCH_SIZE = 5;
  let totalInstancesSynced = 0;
  
  for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
    const batch = webinars.slice(i, i + BATCH_SIZE);
    console.log(`[zoom-api][instance-syncer] Processing instance batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
    
    const batchPromises = batch.map(async (webinar) => {
      try {
        console.log(`[zoom-api][instance-syncer] 🎯 Processing webinar: ${webinar.id} (${webinar.topic}) - Status: ${webinar.status}`);
        
        // For completed webinars, try to fetch actual completion data first
        if (webinar.status === 'ended' || webinar.status === 'aborted') {
          console.log(`[zoom-api][instance-syncer] 🔥 COMPLETED WEBINAR DETECTED: ${webinar.id} - Fetching actual completion data`);
          
          try {
            // Try to get past webinar data using the webinar UUID or ID
            const webinarUuid = webinar.uuid || webinar.id;
            console.log(`[zoom-api][instance-syncer] 📡 Fetching past webinar data for UUID: ${webinarUuid}`);
            
            const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${webinarUuid}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (pastWebinarResponse.ok) {
              const pastWebinarData = await pastWebinarResponse.json();
              console.log(`[zoom-api][instance-syncer] ✅ Got past webinar data for ${webinar.id}:`);
              console.log(`[zoom-api][instance-syncer]   - Duration: ${pastWebinarData.duration} minutes`);
              console.log(`[zoom-api][instance-syncer]   - Start time: ${pastWebinarData.start_time}`);
              console.log(`[zoom-api][instance-syncer]   - End time: ${pastWebinarData.end_time}`);
              
              // Create instance entry with actual completion data
              const actualInstanceToInsert = {
                user_id: userId,
                webinar_id: webinar.id,
                webinar_uuid: webinar.uuid || '',
                instance_id: webinarUuid,
                start_time: pastWebinarData.start_time || webinar.start_time,
                end_time: pastWebinarData.end_time || null,
                duration: pastWebinarData.duration || webinar.duration,
                topic: webinar.topic || pastWebinarData.topic || 'Untitled Webinar',
                status: 'ended', // Set proper status for completed webinars
                registrants_count: 0, // Will be updated separately if needed
                participants_count: pastWebinarData.participants_count || 0,
                raw_data: {
                  ...pastWebinarData,
                  _duration_source: 'past_webinar_api',
                  _actual_duration: pastWebinarData.duration,
                  _scheduled_duration: webinar.duration,
                  _is_completed_instance: true,
                  _source_webinar: webinar
                }
              };
              
              // Check if this instance already exists
              const { data: existingInstance } = await supabase
                .from('zoom_webinar_instances')
                .select('id')
                .eq('webinar_id', webinar.id)
                .eq('instance_id', webinarUuid)
                .maybeSingle();
              
              if (existingInstance) {
                // Update existing instance with actual data
                const { error: updateError } = await supabase
                  .from('zoom_webinar_instances')
                  .update(actualInstanceToInsert)
                  .eq('id', existingInstance.id);
                  
                if (updateError) {
                  console.error(`[zoom-api][instance-syncer] ❌ Error updating completed instance:`, updateError);
                } else {
                  console.log(`[zoom-api][instance-syncer] ✅ Updated completed instance for ${webinar.id} with actual duration: ${pastWebinarData.duration}`);
                  return 1;
                }
              } else {
                // Insert new instance with actual data
                const { error: insertError } = await supabase
                  .from('zoom_webinar_instances')
                  .insert(actualInstanceToInsert);
                  
                if (insertError) {
                  console.error(`[zoom-api][instance-syncer] ❌ Error inserting completed instance:`, insertError);
                } else {
                  console.log(`[zoom-api][instance-syncer] ✅ Inserted completed instance for ${webinar.id} with actual duration: ${pastWebinarData.duration}`);
                  return 1;
                }
              }
              
              return 0;
            } else {
              console.warn(`[zoom-api][instance-syncer] ⚠️ Could not fetch past webinar data for ${webinar.id}: ${pastWebinarResponse.status}`);
              // Fall through to try instances API
            }
          } catch (pastWebinarError) {
            console.warn(`[zoom-api][instance-syncer] ⚠️ Error fetching past webinar data for ${webinar.id}:`, pastWebinarError);
            // Fall through to try instances API
          }
        }
        
        // Try to get webinar instances from Zoom API (for recurring webinars or as fallback)
        console.log(`[zoom-api][instance-syncer] 📡 Trying instances API for webinar ${webinar.id}`);
        const response = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/instances`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.code === 3001) {
            // This is normal for single-occurrence webinars - create a proper instance entry
            console.log(`[zoom-api][instance-syncer] 📭 Single-occurrence webinar ${webinar.id} - creating instance entry`);
            
            // Determine proper duration and status values
            const instanceDuration = webinar.duration || null;
            const instanceStatus = webinar.status || 'waiting';
            const instanceEndTime = (webinar.status === 'ended' || webinar.status === 'aborted') ? 
              (webinar.actual_start_time ? 
                new Date(new Date(webinar.actual_start_time).getTime() + (instanceDuration * 60000)).toISOString() : 
                null) : 
              null;
            
            console.log(`[zoom-api][instance-syncer] 📊 Instance data for ${webinar.id}:`);
            console.log(`[zoom-api][instance-syncer]   - Duration: ${instanceDuration} (from webinar.duration)`);
            console.log(`[zoom-api][instance-syncer]   - Status: ${instanceStatus} (from webinar.status)`);
            console.log(`[zoom-api][instance-syncer]   - Start time: ${webinar.start_time || webinar.actual_start_time}`);
            console.log(`[zoom-api][instance-syncer]   - End time: ${instanceEndTime}`);
            
            const singleInstanceToInsert = {
              user_id: userId,
              webinar_id: webinar.id,
              webinar_uuid: webinar.uuid || '',
              instance_id: webinar.uuid || webinar.id,
              start_time: webinar.actual_start_time || webinar.start_time || null,
              end_time: instanceEndTime,
              duration: instanceDuration,
              topic: webinar.topic || 'Untitled Webinar',
              status: instanceStatus,
              registrants_count: 0,
              participants_count: 0,
              raw_data: {
                ...webinar,
                _duration_source: 'webinar_scheduled',
                _scheduled_duration: webinar.duration,
                _actual_duration: webinar.actual_duration,
                _is_single_occurrence: true,
                _webinar_status: webinar.status
              }
            };
            
            // Check if this instance already exists
            const { data: existingInstance } = await supabase
              .from('zoom_webinar_instances')
              .select('id')
              .eq('webinar_id', webinar.id)
              .eq('instance_id', webinar.uuid || webinar.id)
              .maybeSingle();
            
            if (existingInstance) {
              // Update existing instance
              const { error: updateError } = await supabase
                .from('zoom_webinar_instances')
                .update(singleInstanceToInsert)
                .eq('id', existingInstance.id);
                
              if (updateError) {
                console.error(`[zoom-api][instance-syncer] ❌ Error updating single instance:`, updateError);
              } else {
                console.log(`[zoom-api][instance-syncer] ✅ Updated single instance for ${webinar.id} with duration: ${instanceDuration}, status: ${instanceStatus}`);
                return 1;
              }
            } else {
              // Insert new instance
              const { error: insertError } = await supabase
                .from('zoom_webinar_instances')
                .insert(singleInstanceToInsert);
                
              if (insertError) {
                console.error(`[zoom-api][instance-syncer] ❌ Error inserting single instance:`, insertError);
              } else {
                console.log(`[zoom-api][instance-syncer] ✅ Inserted single instance for ${webinar.id} with duration: ${instanceDuration}, status: ${instanceStatus}`);
                return 1;
              }
            }
            
            return 0;
          }
          console.warn(`[zoom-api][instance-syncer] ⚠️ Failed to fetch instances for webinar ${webinar.id}: ${errorData.message}`);
          return 0;
        }
        
        const data = await response.json();
        const instances = data.instances || [];
        
        if (instances.length === 0) {
          console.log(`[zoom-api][instance-syncer] 📭 No instances found for webinar ${webinar.id}`);
          return 0;
        }
        
        console.log(`[zoom-api][instance-syncer] 📊 Found ${instances.length} instances for webinar ${webinar.id}`);
        
        let instancesProcessed = 0;
        
        // Process each instance with proper data fetching
        for (const instance of instances) {
          try {
            console.log(`[zoom-api][instance-syncer] 🔍 Processing instance ${instance.uuid} - Status: ${instance.status}`);
            
            let instanceDetails = { ...instance };
            let actualDuration = null;
            
            // For completed instances, fetch detailed past webinar data
            if (instance.uuid && (instance.status === 'ended' || instance.status === 'aborted')) {
              try {
                console.log(`[zoom-api][instance-syncer] 📡 Fetching past webinar details for completed instance ${instance.uuid}`);
                const pastWebinarResponse = await fetch(`https://api.zoom.us/v2/past_webinars/${instance.uuid}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (pastWebinarResponse.ok) {
                  const pastWebinarData = await pastWebinarResponse.json();
                  instanceDetails = { ...instanceDetails, ...pastWebinarData };
                  actualDuration = pastWebinarData.duration || null;
                  console.log(`[zoom-api][instance-syncer] ✅ Got actual duration for instance ${instance.uuid}: ${actualDuration} minutes`);
                }
              } catch (pastWebinarError) {
                console.warn(`[zoom-api][instance-syncer] ⚠️ Error fetching past webinar details for instance ${instance.uuid}:`, pastWebinarError);
              }
            }
            
            const finalDuration = actualDuration || 
                                 instanceDetails.duration || 
                                 webinar.duration || 
                                 null;
            
            console.log(`[zoom-api][instance-syncer] 📊 Final duration for instance ${instance.uuid}: ${finalDuration}`);
            
            const instanceToInsert = {
              user_id: userId,
              webinar_id: webinar.id,
              webinar_uuid: webinar.uuid || '',
              instance_id: instance.uuid || '',
              start_time: instance.start_time || null,
              end_time: instanceDetails.end_time || null,
              duration: finalDuration,
              topic: webinar.topic || instanceDetails.topic || 'Untitled Webinar',
              status: instance.status || null,
              registrants_count: 0,
              participants_count: instanceDetails.participants_count || 0,
              raw_data: {
                ...instanceDetails,
                _duration_source: actualDuration ? 'past_api' : (instanceDetails.duration ? 'instance_api' : 'scheduled'),
                _actual_duration: actualDuration,
                _instance_duration: instanceDetails.duration,
                _scheduled_duration: webinar.duration
              }
            };
            
            // Check if this instance already exists
            const { data: existingInstance } = await supabase
              .from('zoom_webinar_instances')
              .select('id')
              .eq('webinar_id', webinar.id)
              .eq('instance_id', instance.uuid || '')
              .maybeSingle();
            
            if (existingInstance) {
              // Update existing instance
              const { error: updateError } = await supabase
                .from('zoom_webinar_instances')
                .update(instanceToInsert)
                .eq('id', existingInstance.id);
                
              if (updateError) {
                console.error(`[zoom-api][instance-syncer] ❌ Error updating instance:`, updateError);
              } else {
                console.log(`[zoom-api][instance-syncer] ✅ Updated instance ${instance.uuid} with duration: ${finalDuration}`);
                instancesProcessed++;
              }
            } else {
              // Insert new instance
              const { error: insertError } = await supabase
                .from('zoom_webinar_instances')
                .insert(instanceToInsert);
                
              if (insertError) {
                console.error(`[zoom-api][instance-syncer] ❌ Error inserting instance:`, insertError);
              } else {
                console.log(`[zoom-api][instance-syncer] ✅ Inserted instance ${instance.uuid} with duration: ${finalDuration}`);
                instancesProcessed++;
              }
            }
          } catch (instanceError) {
            console.error(`[zoom-api][instance-syncer] ❌ Error processing instance ${instance.uuid}:`, instanceError);
          }
        }
        
        console.log(`[zoom-api][instance-syncer] ✅ Processed ${instancesProcessed}/${instances.length} instances for webinar ${webinar.id}`);
        return instancesProcessed;
        
      } catch (error) {
        console.error(`[zoom-api][instance-syncer] ❌ Error syncing instances for webinar ${webinar.id}:`, error);
        return 0;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const batchTotal = batchResults.reduce((sum, count) => sum + count, 0);
    totalInstancesSynced += batchTotal;
    
    console.log(`[zoom-api][instance-syncer] 📊 Batch ${Math.floor(i/BATCH_SIZE) + 1} completed: ${batchTotal} instances synced`);
  }
  
  console.log(`[zoom-api][instance-syncer] 🎉 FIXED SYNC COMPLETE: ${totalInstancesSynced} total instances synced with proper duration data`);
  return totalInstancesSynced;
}
