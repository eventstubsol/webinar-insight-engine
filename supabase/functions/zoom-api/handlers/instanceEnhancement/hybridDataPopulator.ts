
/**
 * Hybrid Data Populator - Populates instance data from existing database tables
 * This addresses the immediate issue of 76 instances with missing actual data
 */

interface EnhancementResult {
  instancesProcessed: number;
  dataEnhanced: number;
  statusUpdated: number;
  participantCountsAdded: number;
  actualTimingCalculated: number;
  errors: string[];
}

export async function enhanceInstanceDataFromDatabase(
  supabase: any,
  userId: string
): Promise<EnhancementResult> {
  console.log(`[hybrid-enhancer] 🔄 Starting hybrid data enhancement for user ${userId}`);
  
  const result: EnhancementResult = {
    instancesProcessed: 0,
    dataEnhanced: 0,
    statusUpdated: 0,
    participantCountsAdded: 0,
    actualTimingCalculated: 0,
    errors: []
  };
  
  try {
    // Get all instances that need enhancement
    const { data: instances, error: instancesError } = await supabase
      .from('zoom_webinar_instances')
      .select('*')
      .eq('user_id', userId);
    
    if (instancesError) {
      result.errors.push(`Failed to fetch instances: ${instancesError.message}`);
      return result;
    }
    
    console.log(`[hybrid-enhancer] Found ${instances?.length || 0} instances to enhance`);
    
    if (!instances || instances.length === 0) {
      return result;
    }
    
    // Get corresponding webinar data
    const webinarIds = instances.map(i => i.webinar_id);
    const { data: webinars, error: webinarsError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('user_id', userId)
      .in('webinar_id', webinarIds);
    
    if (webinarsError) {
      result.errors.push(`Failed to fetch webinars: ${webinarsError.message}`);
      return result;
    }
    
    // Get participant counts
    const { data: participants, error: participantsError } = await supabase
      .from('zoom_webinar_participants')
      .select('webinar_id, participant_type')
      .eq('user_id', userId)
      .in('webinar_id', webinarIds);
    
    if (participantsError) {
      console.warn(`[hybrid-enhancer] Failed to fetch participants: ${participantsError.message}`);
    }
    
    // Create webinar lookup maps
    const webinarMap = new Map(webinars?.map(w => [w.webinar_id, w]) || []);
    const participantCounts = new Map<string, { registrants: number; attendees: number }>();
    
    // Calculate participant counts per webinar
    if (participants) {
      for (const p of participants) {
        const current = participantCounts.get(p.webinar_id) || { registrants: 0, attendees: 0 };
        if (p.participant_type === 'registrant') {
          current.registrants++;
        } else if (p.participant_type === 'attendee') {
          current.attendees++;
        }
        participantCounts.set(p.webinar_id, current);
      }
    }
    
    // Process each instance
    for (const instance of instances) {
      result.instancesProcessed++;
      
      try {
        const webinar = webinarMap.get(instance.webinar_id);
        if (!webinar) {
          result.errors.push(`No webinar found for instance ${instance.id}`);
          continue;
        }
        
        const participantData = participantCounts.get(instance.webinar_id) || { registrants: 0, attendees: 0 };
        const updateData: any = {};
        let enhanced = false;
        
        // 1. Calculate proper status
        const status = calculateWebinarStatus(webinar);
        if (status !== instance.status) {
          updateData.status = status;
          result.statusUpdated++;
          enhanced = true;
        }
        
        // 2. Add participant counts if missing
        if (!instance.participants_count && participantData.attendees > 0) {
          updateData.participants_count = participantData.attendees;
          result.participantCountsAdded++;
          enhanced = true;
        }
        
        if (!instance.registrants_count && participantData.registrants > 0) {
          updateData.registrants_count = participantData.registrants;
          enhanced = true;
        }
        
        // 3. Calculate actual timing data
        const actualTiming = calculateActualTiming(webinar);
        if (actualTiming.actualStartTime && !instance.actual_start_time) {
          updateData.actual_start_time = actualTiming.actualStartTime;
          result.actualTimingCalculated++;
          enhanced = true;
        }
        
        if (actualTiming.actualDuration && !instance.actual_duration) {
          updateData.actual_duration = actualTiming.actualDuration;
          enhanced = true;
        }
        
        if (actualTiming.actualEndTime && !instance.end_time) {
          updateData.end_time = actualTiming.actualEndTime;
          enhanced = true;
        }
        
        // 4. Mark as historical if completed
        if (status === 'ended' && !instance.is_historical) {
          updateData.is_historical = true;
          enhanced = true;
        }
        
        // 5. Update data source to indicate hybrid enhancement
        if (enhanced) {
          updateData.data_source = 'hybrid_enhanced';
          updateData.updated_at = new Date().toISOString();
          
          // Update raw_data to include enhancement metadata
          const rawData = instance.raw_data || {};
          updateData.raw_data = {
            ...rawData,
            hybrid_enhancement: {
              enhanced_at: new Date().toISOString(),
              webinar_data_used: true,
              participant_counts_added: participantData.attendees > 0 || participantData.registrants > 0,
              status_calculated: status !== instance.status,
              timing_calculated: !!actualTiming.actualStartTime,
              enhancement_version: '1.0'
            }
          };
          
          // Perform the update
          const { error: updateError } = await supabase
            .from('zoom_webinar_instances')
            .update(updateData)
            .eq('id', instance.id);
          
          if (updateError) {
            result.errors.push(`Failed to update instance ${instance.id}: ${updateError.message}`);
          } else {
            result.dataEnhanced++;
            console.log(`[hybrid-enhancer] ✅ Enhanced instance ${instance.id} for webinar ${instance.webinar_id}`);
          }
        }
        
      } catch (error) {
        result.errors.push(`Error processing instance ${instance.id}: ${error.message}`);
      }
    }
    
    console.log(`[hybrid-enhancer] 🎉 Enhancement complete:`);
    console.log(`[hybrid-enhancer]   - Instances processed: ${result.instancesProcessed}`);
    console.log(`[hybrid-enhancer]   - Data enhanced: ${result.dataEnhanced}`);
    console.log(`[hybrid-enhancer]   - Status updated: ${result.statusUpdated}`);
    console.log(`[hybrid-enhancer]   - Participant counts added: ${result.participantCountsAdded}`);
    console.log(`[hybrid-enhancer]   - Actual timing calculated: ${result.actualTimingCalculated}`);
    console.log(`[hybrid-enhancer]   - Errors: ${result.errors.length}`);
    
    return result;
    
  } catch (error) {
    console.error('[hybrid-enhancer] ❌ Fatal error in enhancement:', error);
    result.errors.push(`Fatal error: ${error.message}`);
    return result;
  }
}

function calculateWebinarStatus(webinar: any): string {
  const now = new Date();
  
  // Use actual timing if available
  if (webinar.actual_start_time) {
    if (webinar.actual_end_time) {
      return new Date(webinar.actual_end_time) < now ? 'ended' : 'started';
    }
    return 'started';
  }
  
  // Fall back to scheduled timing
  if (webinar.start_time) {
    const startTime = new Date(webinar.start_time);
    if (now < startTime) {
      return 'waiting';
    }
    
    // Calculate expected end time
    if (webinar.duration) {
      const endTime = new Date(startTime.getTime() + (webinar.duration * 60000));
      return now > endTime ? 'ended' : 'started';
    }
    
    return 'started';
  }
  
  return 'unknown';
}

function calculateActualTiming(webinar: any): {
  actualStartTime: string | null;
  actualDuration: number | null;
  actualEndTime: string | null;
} {
  // If we have actual timing data, use it
  if (webinar.actual_start_time) {
    return {
      actualStartTime: webinar.actual_start_time,
      actualDuration: webinar.actual_duration,
      actualEndTime: webinar.actual_end_time
    };
  }
  
  // If webinar is completed, use scheduled data as actual
  const status = calculateWebinarStatus(webinar);
  if (status === 'ended' && webinar.start_time) {
    let endTime = null;
    if (webinar.duration) {
      const startDate = new Date(webinar.start_time);
      endTime = new Date(startDate.getTime() + (webinar.duration * 60000)).toISOString();
    }
    
    return {
      actualStartTime: webinar.start_time,
      actualDuration: webinar.duration,
      actualEndTime: endTime
    };
  }
  
  return {
    actualStartTime: null,
    actualDuration: null,
    actualEndTime: null
  };
}
