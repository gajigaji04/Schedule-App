import { google } from 'googleapis';

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
  );
}

export function getAuthUrl(userId) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    state: userId,
    prompt: 'consent', // refresh_token을 항상 받기 위해
  });
}

export const GOOGLE_EVENT_COLORS = {
  '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c',
  '5': '#fbd75b', '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1',
  '9': '#5484ed', '10': '#51b749', '11': '#dc2626',
};

export function normalizeEvents(items = []) {
  return items.map(e => ({
    id:      `gcal_${e.id}`,
    title:   e.summary || '(제목 없음)',
    date:    (e.start.date || e.start.dateTime || '').slice(0, 10),
    allDay:  Boolean(e.start.date),
    start:   e.start.dateTime || e.start.date,
    end:     e.end.dateTime   || e.end.date,
    color:   e.colorId ? GOOGLE_EVENT_COLORS[e.colorId] : '#4285f4',
    link:    e.htmlLink,
    source:  'google',
  }));
}
