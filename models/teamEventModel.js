import { db } from '@/lib/supabase';

export async function getTeamEvents(teamId) {
  const { data } = await db.from('team_events')
    .select('*')
    .eq('team_id', teamId)
    .order('date');
  return data ?? [];
}

export async function createTeamEvent(event) {
  const { data, error } = await db.from('team_events').insert(event).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTeamEvent(id) {
  const { error } = await db.from('team_events').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getEventRsvps(eventId) {
  const { data } = await db.from('team_event_rsvp')
    .select('*')
    .eq('event_id', eventId);
  return data ?? [];
}

export async function upsertRsvp(eventId, userId, userName, response) {
  const { error } = await db.from('team_event_rsvp')
    .upsert(
      { event_id: eventId, user_id: userId, user_name: userName, response, responded_at: new Date().toISOString() },
      { onConflict: 'event_id,user_id' }
    );
  if (error) throw new Error(error.message);
}
