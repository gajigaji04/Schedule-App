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
    const { data: existing, error: findErr } = await db
      .from('users').select('*').eq('email', email).maybeSingle();
    if (findErr) throw new Error(findErr.message);

    if (existing) {
      if (existing.name !== name) {
        const { data, error: updErr } = await db
          .from('users').update({ name }).eq('id', existing.id).select().single();
        if (updErr) throw new Error(updErr.message);
        this.#setCurrent(data);
        return data;
      }
      this.#setCurrent(existing);
      return existing;
    }

    const { data, error: insErr } = await db.from('users').insert({
      id:       'u_' + Date.now(),
      name,
      email,
      team_ids: [],
    }).select().single();
    if (insErr) throw new Error(insErr.message);
    this.#setCurrent(data);
    return data;
  }

  static logout() {
    localStorage.removeItem(this.#CUR);
  }

  // ---- Google OAuth ----

  static async loginWithGoogle() {
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) throw new Error(error.message);
    // Page redirects — nothing after this runs.
  }

  // Called after OAuth redirect. authUser comes from db.auth.getSession().
  // Syncs the Google account into our custom users table using the same
  // login() path so existing data is preserved when emails match.
  static async handleOAuthCallback(authUser) {
    const email = authUser.email;
    const name  = authUser.user_metadata?.full_name
               || authUser.user_metadata?.name
               || email.split('@')[0];
    return this.login(name, email);
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
