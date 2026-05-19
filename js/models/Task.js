// Model — Task
// CRUD + query helpers for tasks stored in Supabase.
// DB columns use snake_case (user_id, team_id, created_at, updated_at).
class TaskModel {
  // Builds an OR filter string for PostgREST that covers tasks visible to the current user:
  // own tasks OR tasks shared via any of the user's teams.
  static #visibleFilter(user) {
    const ids = user.team_ids || [];
    return ids.length
      ? `user_id.eq.${user.id},team_id.in.(${ids.join(',')})`
      : `user_id.eq.${user.id}`;
  }

  static async getById(id) {
    const { data } = await db.from('tasks').select('*').eq('id', id).maybeSingle();
    return data;
  }

  static async getByUser() {
    const user = UserModel.getCurrent();
    if (!user) return [];
    const { data } = await db.from('tasks').select('*')
      .or(this.#visibleFilter(user))
      .order('date');
    return data || [];
  }

  static async getByDate(dateStr) {
    const user = UserModel.getCurrent();
    if (!user) return [];
    const { data } = await db.from('tasks').select('*')
      .eq('date', dateStr)
      .or(this.#visibleFilter(user))
      .order('created_at');
    return data || [];
  }

  static async getByDateRange(start, end) {
    const user = UserModel.getCurrent();
    if (!user) return [];
    const { data } = await db.from('tasks').select('*')
      .gte('date', start)
      .lte('date', end)
      .or(this.#visibleFilter(user))
      .order('date');
    return data || [];
  }

  // Fetches tasks that overlap [start, end] — includes span tasks that start before the range.
  static async getOverlapping(start, end) {
    const user = UserModel.getCurrent();
    if (!user) return [];
    // Fetch all tasks with date <= end, then filter client-side for overlap.
    const { data } = await db.from('tasks').select('*')
      .lte('date', end)
      .or(this.#visibleFilter(user))
      .order('date');
    return (data || []).filter(t =>
      t.date >= start || (t.deadline && t.deadline >= start)
    );
  }

  static async create(data) {
    const task = {
      id:          't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title:       '',
      description: '',
      date:        '',
      priority:    'medium',
      team_id:     null,
      completed:   false,
      ...data,
    };
    const { data: created } = await db.from('tasks').insert(task).select().single();
    return created;
  }

  static async update(id, patch) {
    const { data } = await db.from('tasks')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    return data;
  }

  static async delete(id) {
    await db.from('tasks').delete().eq('id', id);
  }

  static async toggleComplete(id) {
    const task = await this.getById(id);
    if (!task) return null;
    return this.update(id, { completed: !task.completed });
  }

  // Fetches all visible tasks then filters client-side (avoids complex nested OR).
  static async search(query) {
    const tasks = await this.getByUser();
    const q = query.toLowerCase();
    return tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }
}
