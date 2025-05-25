
import { enhanceWebinarsWithHostInfo } from './hostInfoProcessor.ts';
import { enhanceWebinarsWithPanelistData } from './panellistDataProcessor.ts';
import { enhanceWebinarsWithParticipantData } from './participantDataProcessor.ts';

/**
 * Orchestrates the enhancement of webinar data with host, panelist, and participant information
 */
export async function enhanceWebinarsWithAllData(webinars: any[], token: string) {
  console.log(`[zoom-api][enhancement-orchestrator] Starting enhancement process for ${webinars.length} webinars`);
  
  if (!webinars || webinars.length === 0) {
    console.log(`[zoom-api][enhancement-orchestrator] No webinars to enhance`);
    return [];
  }
  
  try {
    // Step 1: Enhance with host information
    console.log(`[zoom-api][enhancement-orchestrator] Step 1: Enhancing with host information`);
    const webinarsWithHostInfo = await enhanceWebinarsWithHostInfo(webinars, token);
    
    // Step 2: Enhance with panelist data
    console.log(`[zoom-api][enhancement-orchestrator] Step 2: Enhancing with panelist data`);
    const webinarsWithPanelistInfo = await enhanceWebinarsWithPanelistData(webinarsWithHostInfo, token);
    
    // Step 3: Enhance with participant data for completed webinars
    console.log(`[zoom-api][enhancement-orchestrator] Step 3: Enhancing with participant data`);
    const enhancedWebinars = await enhanceWebinarsWithParticipantData(webinarsWithPanelistInfo, token);
    
    console.log(`[zoom-api][enhancement-orchestrator] Enhancement completed successfully for ${enhancedWebinars.length} webinars`);
    return enhancedWebinars;
    
  } catch (error) {
    console.error(`[zoom-api][enhancement-orchestrator] Error during enhancement process:`, error);
    throw error;
  }
}
