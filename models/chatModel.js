import { db } from '@/lib/supabase';

export async function getMessages(roomId, limit = 60) {
  const { data } = await db.from('messages')
    .select('*')
    .eq('team_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).reverse();
}

export async function sendMessage(roomId, userId, userName, content, id) {
  const { error } = await db.from('messages').insert({
    id,
    team_id: roomId,
    user_id: userId,
    user_name: userName,
    content: content.trim(),
  });
  if (error) throw new Error(error.message);
}

export function subscribeToRoom(roomId, onMessage) {
  return db.channel(`room-${roomId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `team_id=eq.${roomId}`,
    }, payload => onMessage(payload.new))
    .subscribe();
}

export function unsubscribe(channel) {
  if (channel) db.removeChannel(channel);
}
