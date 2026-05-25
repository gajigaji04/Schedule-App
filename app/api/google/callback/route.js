import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createOAuthClient } from '@/lib/googleCalendar';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code   = searchParams.get('code');
  const userId = searchParams.get('state');

  if (!code || !userId) {
    return NextResponse.redirect(`${APP_URL}/settings?gcal=error`);
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);

    const update = {
      google_access_token:  tokens.access_token,
      google_token_expiry:  tokens.expiry_date,
    };
    if (tokens.refresh_token) update.google_refresh_token = tokens.refresh_token;

    const { error } = await adminDb().from('users').update(update).eq('id', userId);
    if (error) throw error;

    return NextResponse.redirect(`${APP_URL}/settings?gcal=connected`);
  } catch (err) {
    console.error('[gcal callback]', err.message);
    return NextResponse.redirect(`${APP_URL}/settings?gcal=error`);
  }
}
