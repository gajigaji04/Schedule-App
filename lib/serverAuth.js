import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

/**
 * Verifies the Bearer token from the request header and returns the
 * authenticated user. Returns null if missing, invalid, or expired.
 */
export async function verifyRequestUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim();
  if (!token) return null;
  const { data: { user }, error } = await adminClient().auth.getUser(token);
  if (error || !user) return null;
  return user;
}
