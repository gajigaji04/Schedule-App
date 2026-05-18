// Model — Team
// Manages team records via Supabase.
// DB columns: id, name, description, member_emails (text[]), created_by, created_at
class TeamModel {
  static async getById(id) {
    const { data } = await db.from('teams').select('*').eq('id', id).maybeSingle();
    return data;
  }

  // Teams where the current user is creator or listed in member_emails.
  static async getByUser() {
    const user = UserModel.getCurrent();
    if (!user) return [];
    const { data } = await db.from('teams').select('*')
      .or(`created_by.eq.${user.id},member_emails.cs.{${user.email}}`)
      .order('created_at');
    return data || [];
  }

  static async create({ name, description = '', memberEmails = [] }) {
    const user   = UserModel.getCurrent();
    const emails = [...new Set([user.email, ...memberEmails.filter(Boolean)])];
    const { data } = await db.from('teams').insert({
      id:            'team_' + Date.now(),
      name,
      description,
      member_emails: emails,
      created_by:    user.id,
    }).select().single();
    await UserModel.joinTeam(data.id);
    return data;
  }

  static async update(id, patch) {
    const { data } = await db.from('teams').update(patch).eq('id', id).select().single();
    return data;
  }

  static async delete(id) {
    await db.from('teams').delete().eq('id', id);
    await UserModel.leaveTeam(id);
  }

  static async addMember(teamId, email) {
    const team = await this.getById(teamId);
    if (!team || team.member_emails.includes(email)) return;
    await this.update(teamId, { member_emails: [...team.member_emails, email] });
  }
}
