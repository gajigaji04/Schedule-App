import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyRequestUser } from '@/lib/serverAuth';

export async function POST(request) {
  const body = await request.json();
  const { userId } = body;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const authUser = await verifyRequestUser(request);
  if (!authUser || authUser.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { error } = await db.from('users').update({
    google_access_token:  null,
    google_refresh_token: null,
    google_token_expiry:  null,
  }).eq('id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
