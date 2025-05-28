
import { handleFixedListWebinars } from '../listWebinars/fixedIndex.ts';

// Use the comprehensive handler that includes ALL sync operations
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  return await handleFixedListWebinars(req, supabase, user, credentials, force_sync);
}
