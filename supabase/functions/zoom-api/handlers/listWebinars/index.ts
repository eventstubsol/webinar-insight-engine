

import { handleListWebinarsFixed } from '../fixedListWebinars/index.ts';

// Use the fixed handler that implements correct Zoom API endpoints
export async function handleListWebinars(req: Request, supabase: any, user: any, credentials: any, force_sync: boolean) {
  return await handleListWebinarsFixed(req, supabase, user, credentials, force_sync);
}

