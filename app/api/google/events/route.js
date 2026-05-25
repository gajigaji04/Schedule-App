import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { createOAuthClient, normalizeEvents } from '@/lib/googleCalendar';
import { verifyRequestUser } from '@/lib/serverAuth';

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId  = searchParams.get('userId');
  const timeMin = searchParams.get('timeMin');
  const timeMax = searchParams.get('timeMax');

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const authUser = await verifyRequestUser(request);
  if (!authUser || authUser.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = adminDb();
  const { data: user } = await db.from('users')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', userId).single();

  if (!user?.google_access_token) {
    return NextResponse.json({ events: [], connected: false });
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token:  user.google_access_token,
    refresh_token: user.google_refresh_token,
    expiry_date:   user.google_token_expiry,
  });

  // 토큰 자동 갱신 시 DB 업데이트
  oauth2Client.on('tokens', async newTokens => {
    if (newTokens.access_token) {
      await db.from('users').update({
        google_access_token: newTokens.access_token,
        google_token_expiry: newTokens.expiry_date,
      }).eq('id', userId);
    }
  });

  try {
    const cal = google.calendar({ version: 'v3', auth: oauth2Client });
    const res = await cal.events.list({
      calendarId: 'primary',
      timeMin:    timeMin || new Date().toISOString(),
      timeMax:    timeMax || new Date(Date.now() + 90 * 86400000).toISOString(),
      maxResults: 250,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return NextResponse.json({
      events: normalizeEvents(res.data.items),
      connected: true,
    });
  } catch (err) {
    // 토큰 만료/취소된 경우
    if (err.code === 401) {
      await db.from('users').update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
      }).eq('id', userId);
      return NextResponse.json({ events: [], connected: false });
    }
    console.error('[gcal events]', err.message);
    return NextResponse.json({ events: [], connected: false });
  }
}
