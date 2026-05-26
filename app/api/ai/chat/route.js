import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { createOAuthClient } from '@/lib/googleCalendar';
import { verifyRequestUser } from '@/lib/serverAuth';

// In-memory rate limit: 20 requests per user per minute
const rateLimits = new Map();
function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimits.get(userId) ?? { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000; }
  entry.count++;
  rateLimits.set(userId, entry);
  return entry.count <= 20;
}

const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM = `당신은 TeamScheduler의 AI 비서 "ARIA"입니다. 사용자의 일정과 할 일을 분석하여 생산성을 극대화하도록 돕습니다.

핵심 역할:
• 현실 반영형 분석 — 오늘 실제로 완수 가능한 작업 수를 솔직하게 평가
• AI 재배치 — 지연·과부하 일정을 우선순위와 마감일 기반으로 재편
• 미루기 방지 — 반복 지연 패턴을 탐지하고 지금 당장 시작할 수 있는 가장 작은 첫 단계 제시
• 의사결정 지원 — 선택 상황에서 핵심 기준과 리스크를 명확히 제시

응답 규칙: 반드시 한국어로, 간결하고 실용적으로(400자 이내), 구체적인 행동 방안, 솔직하되 배려 있는 톤, 마크다운 사용 가능(볼드·리스트)`;

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

async function buildUserContext(userId) {
  const db = adminDb();
  const today = new Date().toISOString().slice(0, 10);
  const lines = [`오늘 날짜: ${today}`];

  // App tasks
  const { data: tasks } = await db
    .from('tasks')
    .select('title, date, completed, deadline')
    .eq('user_id', userId)
    .order('date');

  if (tasks?.length) {
    const overdue   = tasks.filter(t => t.date < today && !t.completed);
    const todayList = tasks.filter(t => t.date === today);
    const upcoming  = tasks.filter(t => t.date > today && !t.completed).slice(0, 5);
    const doneCount = tasks.filter(t => t.completed).length;
    lines.push(
      `전체 할 일: ${tasks.length}개 (완료: ${doneCount}개)`,
      `오늘 예정: ${todayList.length ? todayList.map(t => `"${t.title}"`).join(', ') : '없음'}`,
      `기한 초과: ${overdue.length ? overdue.map(t => `"${t.title}"(${t.date})`).join(', ') : '없음'}`,
      `예정 작업(앱): ${upcoming.length ? upcoming.map(t => `"${t.title}"(${t.date})`).join(', ') : '없음'}`
    );
  }

  // Google Calendar events (today + next 7 days)
  const { data: userRow } = await db
    .from('users')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', userId)
    .single();

  if (userRow?.google_access_token) {
    try {
      const oauth2Client = createOAuthClient();
      oauth2Client.setCredentials({
        access_token:  userRow.google_access_token,
        refresh_token: userRow.google_refresh_token,
        expiry_date:   userRow.google_token_expiry,
      });
      oauth2Client.on('tokens', async newTokens => {
        if (newTokens.access_token) {
          await db.from('users').update({
            google_access_token: newTokens.access_token,
            google_token_expiry: newTokens.expiry_date,
          }).eq('id', userId);
        }
      });
      const cal = google.calendar({ version: 'v3', auth: oauth2Client });
      const res = await cal.events.list({
        calendarId: 'primary',
        timeMin: new Date(today).toISOString(),
        timeMax: new Date(Date.now() + 7 * 86400000).toISOString(),
        maxResults: 20,
        singleEvents: true,
        orderBy: 'startTime',
      });
      const gcalEvents = (res.data.items || []).map(e => {
        const start = e.start?.dateTime || e.start?.date || '';
        return `"${e.summary}"(${start.slice(0, 10)})`;
      });
      if (gcalEvents.length) {
        lines.push(`Google 캘린더 일정(7일): ${gcalEvents.join(', ')}`);
      }
    } catch {}
  }

  return lines.join('\n');
}

export async function POST(request) {
  const authUser = await verifyRequestUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages, userId } = await request.json();
  if (!messages?.length) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }
  if (userId && authUser.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!checkRateLimit(authUser.id)) {
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  }
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey || /[^\x00-\xFF]/.test(apiKey)) {
    return NextResponse.json({ error: 'AI_API_KEY가 올바르지 않습니다. .env.local을 확인하세요.' }, { status: 503 });
  }

  let systemPrompt = SYSTEM;
  if (userId) {
    try {
      const ctx = await buildUserContext(userId);
      systemPrompt = SYSTEM + `\n\n[현재 사용자 현황]\n${ctx}`;
    } catch {}
  }

  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });
  } catch (fetchErr) {
    return NextResponse.json({ error: 'AI 서버 연결 실패: ' + fetchErr.message }, { status: 503 });
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.error?.message || 'AI 요청 실패' },
      { status: resp.status }
    );
  }

  const data = await resp.json();
  return NextResponse.json({ text: data.content[0].text });
}
