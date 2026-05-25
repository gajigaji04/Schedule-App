import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;

export const db = createClient(url, key);

/** Returns the current session's access_token for server API calls, or null. */
export async function getAuthToken() {
  const { data: { session } } = await db.auth.getSession();
  return session?.access_token ?? null;
}
