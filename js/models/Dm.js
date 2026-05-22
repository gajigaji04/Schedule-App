// Model — Direct Messages
// 1:1 DM stored in `direct_messages` table, separate from team messages.
// DB schema (run once in Supabase SQL editor):
//
//   CREATE TABLE IF NOT EXISTS direct_messages (
//     id          TEXT PRIMARY KEY,
//     channel_id  TEXT NOT NULL,        -- 'dm_' + sorted(uid1, uid2).join('_')
//     from_user_id TEXT NOT NULL,
//     from_name   TEXT NOT NULL,
//     to_user_id  TEXT NOT NULL,
//     content     TEXT NOT NULL,
//     created_at  TIMESTAMPTZ DEFAULT NOW()
//   );
//   CREATE INDEX ON direct_messages (channel_id, created_at);
//   ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "Read own DMs" ON direct_messages FOR SELECT
//     USING (from_user_id = auth.uid()::text OR to_user_id = auth.uid()::text);
//   CREATE POLICY "Send DMs" ON direct_messages FOR INSERT
//     WITH CHECK (from_user_id = auth.uid()::text);
//   ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

class DmModel {
  // Canonical channel ID for a pair of users (order-independent).
  static channelId(uidA, uidB) {
    return 'dm_' + [uidA, uidB].sort().join('_');
  }

  static async getMessages(channelId, limit = 60) {
    const { data } = await db.from('direct_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data || []).reverse();
  }

  static async sendWithId(channelId, toUserId, content, id) {
    const user = UserModel.getCurrent();
    const { error } = await db.from('direct_messages').insert({
      id,
      channel_id:   channelId,
      from_user_id: user.id,
      from_name:    user.name,
      to_user_id:   toUserId,
      content:      content.trim(),
    });
    if (error) throw new Error(error.message);
  }

  static subscribe(channelId, onMessage) {
    return db.channel(`dm-${channelId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'direct_messages',
        filter: `channel_id=eq.${channelId}`,
      }, payload => onMessage(payload.new))
      .subscribe();
  }

  static unsubscribe(channel) {
    if (channel) db.removeChannel(channel);
  }
}
