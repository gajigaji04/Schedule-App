import { db } from '@/lib/supabase';

export function channelId(uidA, uidB) {
  return 'dm_' + [uidA, uidB].sort().join('_');
}

export async function getMessages(chId, limit = 60) {
  const { data } = await db.from('direct_messages')
    .select('*')
    .eq('channel_id', chId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).reverse();
}

export async function sendMessage(chId, fromUserId, fromName, toUserId, content, id) {
  const { error } = await db.from('direct_messages').insert({
    id,
    channel_id: chId,
    from_user_id: fromUserId,
    from_name: fromName,
    to_user_id: toUserId,
    content: content.trim(),
  });
  if (error) throw new Error(error.message);
}

export function subscribe(chId, onMessage) {
  return db.channel(`dm-${chId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'direct_messages',
      filter: `channel_id=eq.${chId}`,
    }, payload => onMessage(payload.new))
    .subscribe();
}

export function unsubscribe(channel) {
  if (channel) db.removeChannel(channel);
}
