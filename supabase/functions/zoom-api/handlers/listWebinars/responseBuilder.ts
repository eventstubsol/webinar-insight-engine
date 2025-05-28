
import { formatListWebinarsResponse } from '../sync/responseFormatter.ts';
import { getFinalWebinarsList } from '../sync/finalWebinarsListFetcher.ts';

export async function buildFinalResponse(
  supabase: any,
  userId: string,
  allWebinars: any[],
  syncResults: any,
  statsResult: any,
  scopeValidation: any
) {
  // Get final webinar list to return
  const finalWebinarsList = await getFinalWebinarsList(supabase, userId);
  
  // Add scope validation info to response
  const response = formatListWebinarsResponse(finalWebinarsList, allWebinars, syncResults, statsResult);
  response.scopeValidation = scopeValidation;
  
  return response;
}
