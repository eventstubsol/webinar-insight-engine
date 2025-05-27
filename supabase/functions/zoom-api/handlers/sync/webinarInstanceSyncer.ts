
/**
 * Syncs webinar instances for a batch of webinars during the main sync process
 */
export async function syncWebinarInstancesForWebinars(webinars: any[], token: string, supabase: any, userId: string) {
  console.log(`[zoom-api][instance-syncer] 🔄 Starting instance sync for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][instance-syncer] No webinars to sync instances for`);
    return;
  }
  
  // Process webinars in smaller batches to avoid timeouts
  const BATCH_SIZE = 5; // Smaller batch size for instance syncing
  let totalInstancesSynced = 0;
  
  for (let i = 0; i < webinars.length; i += BATCH_SIZE) {
    const batch = webinars.slice(i, i + BATCH_SIZE);
    console.log(`[zoom-api][instance-syncer] Processing instance batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(webinars.length/BATCH_SIZE)} (${batch.length} webinars)`);
    
    const batchPromises = batch.map(async (webinar) => {
      try {
        console.log(`[zoom-api][instance-syncer] 🎯 Syncing instances for webinar: ${webinar.id} (${webinar.topic})`);
        
        // Only sync instances for completed webinars
        if (webinar.status !== 'ended' && webinar.status !== 'aborted') {
          console.log(`[zoom-api][instance-syncer] ⏭️ Skipping instances for non-completed webinar ${webinar.id} (status: ${webinar.status})`);
          return 0;
        }
        
        // Get webinar instances from Zoom API
        const response = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/instances`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.code === 3001) {
            // This is normal for webinars without multiple instances
            console.log(`[zoom-api][instance-syncer] 📭 Webinar ${webinar.id} has no instances or is not recurring`);
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
        
        // Process each instance
        for (const instance of instances) {
          try {
            console.log(`[zoom-api][instance-syncer] 🔍 Processing instance ${instance.uuid} for webinar ${webinar.id}`);
            
            // Get detailed instance data from past webinar API if completed
            let instanceDetails = { ...instance };
            let actualDuration = null;
            
            if (instance.uuid && (instance.status === 'ended' || instance.status === 'aborted')) {
              try {
                console.log(`[zoom-api][instance-syncer] 📡 Fetching past webinar details for instance ${instance.uuid}`);
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
                } else {
                  console.warn(`[zoom-api][instance-syncer] ⚠️ Could not fetch past webinar data for instance ${instance.uuid}`);
                }
              } catch (pastWebinarError) {
                console.warn(`[zoom-api][instance-syncer] ⚠️ Error fetching past webinar details for instance ${instance.uuid}:`, pastWebinarError);
              }
            }
            
            // Calculate final duration with proper priority
            const finalDuration = actualDuration || 
                                 instanceDetails.duration || 
                                 webinar.duration || 
                                 null;
            
            console.log(`[zoom-api][instance-syncer] 📊 Duration calculation for instance ${instance.uuid}:`);
            console.log(`[zoom-api][instance-syncer]   - Actual duration (past API): ${actualDuration}`);
            console.log(`[zoom-api][instance-syncer]   - Instance duration: ${instanceDetails.duration}`);
            console.log(`[zoom-api][instance-syncer]   - Webinar scheduled duration: ${webinar.duration}`);
            console.log(`[zoom-api][instance-syncer]   - Final duration used: ${finalDuration}`);
            
            // Prepare instance data for database insertion
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
              registrants_count: 0, // Will be updated separately if needed
              participants_count: 0, // Will be updated separately if needed
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
  
  console.log(`[zoom-api][instance-syncer] 🎉 Instance sync completed: ${totalInstancesSynced} total instances synced`);
  return totalInstancesSynced;
}
