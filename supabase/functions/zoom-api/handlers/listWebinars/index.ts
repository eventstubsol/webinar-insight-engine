
import { handleFixedListWebinars } from './fixedIndex.ts';

// Use the fixed handler for proper actual end_time data collection
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  return await handleFixedListWebinars(req, supabase, user, credentials, force_sync);
}
