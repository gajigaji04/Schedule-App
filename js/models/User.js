// Model — User
// Handles user accounts via Supabase. Current session stored in localStorage.
class UserModel {
  static #CUR = 'ts_current_user';

  // Sync — reads localStorage session only.
  static getCurrent() {
    return JSON.parse(localStorage.getItem(this.#CUR) || 'null');
  }

  static #setCurrent(user) {
    localStorage.setItem(this.#CUR, JSON.stringify(user));
  }

  static async login(name, email) {
    const { data: existing } = await db
      .from('users').select('*').eq('email', email).maybeSingle();

    if (existing) {
      if (existing.name !== name) {
        const { data } = await db
          .from('users').update({ name }).eq('id', existing.id).select().single();
        this.#setCurrent(data);
        return data;
      }
      this.#setCurrent(existing);
      return existing;
    }

    const { data } = await db.from('users').insert({
      id:       'u_' + Date.now(),
      name,
      email,
      team_ids: [],
    }).select().single();
    this.#setCurrent(data);
    return data;
  }

  static logout() {
    localStorage.removeItem(this.#CUR);
  }

  static async update(patch) {
    const current = this.getCurrent();
    const { data } = await db
      .from('users').update(patch).eq('id', current.id).select().single();
    this.#setCurrent(data);
    return data;
  }

  static async joinTeam(teamId) {
    const user = this.getCurrent();
    if (!user) return;
    const ids = user.team_ids || [];
    if (ids.includes(teamId)) return;
    await this.update({ team_ids: [...ids, teamId] });
  }

  static async leaveTeam(teamId) {
    const user = this.getCurrent();
    if (!user) return;
    await this.update({ team_ids: (user.team_ids || []).filter(id => id !== teamId) });
  }
}
