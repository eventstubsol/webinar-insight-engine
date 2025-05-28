
import { handleEnhancedListWebinars } from './enhancedIndex.ts';

// Use the enhanced handler for better end_time calculation
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  return await handleEnhancedListWebinars(req, supabase, user, credentials, force_sync);
}
