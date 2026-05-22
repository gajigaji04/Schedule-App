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

  // ---- Supabase Auth helpers ----

  // OAuth redirect (Google / Kakao / Apple) — shared redirect handler.
  static async #oauthRedirect(provider) {
    const { error } = await db.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw new Error(error.message);
  }

  static async loginWithGoogle() { return this.#oauthRedirect('google'); }
  static async loginWithKakao()  { return this.#oauthRedirect('kakao');  }
  static async loginWithGithub() { return this.#oauthRedirect('github'); }

  // Email OTP — Step 1: send 6-digit code to inbox.
  static async sendEmailOTP(email) {
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw new Error(error.message);
  }

  // Email OTP — Step 2: verify the code the user typed.
  static async verifyEmailOTP(email, token) {
    const { data, error } = await db.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw new Error(error.message);
    return this.handleOAuthCallback(data.user);
  }

  // Called after any Supabase Auth session (OAuth redirect or OTP verify).
  // Syncs the auth user into our custom users table; preserves data when emails match.
  static async handleOAuthCallback(authUser) {
    const email = authUser.email;
    const name  = authUser.user_metadata?.full_name
               || authUser.user_metadata?.name
               || email.split('@')[0];
    return this.login(name, email);
  }

  static async update(patch) {
    const current = this.getCurrent();
    const { data, error } = await db
      .from('users').update(patch).eq('id', current.id).select().single();
    if (error) throw new Error(error.message);
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
