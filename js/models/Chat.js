// Model — Chat
// Real-time team messages stored in Supabase `messages` table.
// DB columns: id, team_id, user_id, user_name, content, created_at
class ChatModel {
  static async getMessages(teamId, limit = 60) {
    const { data } = await db.from('messages')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data || []).reverse();
  }

  static async send(roomId, content) {
    const id = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    return this.sendWithId(roomId, content, id);
  }

  // Used by ChatController for optimistic rendering (caller provides the ID).
  static async sendWithId(roomId, content, id) {
    const user = UserModel.getCurrent();
    const { error } = await db.from('messages').insert({
      id,
      team_id:   roomId,
      user_id:   user.id,
      user_name: user.name,
      content:   content.trim(),
    });
    if (error) throw new Error(error.message);
  }

  // roomId can be a real team_id or a DM channel string like "dm_uid1_uid2"
  static subscribe(roomId, onMessage) {
    return db.channel(`chat-${roomId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `team_id=eq.${roomId}`,
      }, payload => onMessage(payload.new))
      .subscribe();
  }

  static unsubscribe(channel) {
    if (channel) db.removeChannel(channel);
  }
}
