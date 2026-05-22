import { db } from '@/lib/supabase';

export async function getTeamsByUser(userId) {
  const { data } = await db.from('teams')
    .select('*')
    .contains('member_emails', [])
    .order('created_at');
  // Filter client-side: teams where user is creator or member
  const { data: user } = await db.from('users').select('email').eq('id', userId).single();
  if (!user) return [];
  return (data ?? []).filter(t =>
    t.created_by === userId || (t.member_emails ?? []).includes(user.email)
  );
}

export async function getTeamById(id) {
  const { data } = await db.from('teams').select('*').eq('id', id).single();
  return data ?? null;
}

export async function createTeam(name, description, userId, userEmail) {
  const { data, error } = await db.from('teams')
    .insert({ name, description, created_by: userId, member_emails: [userEmail] })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addMember(teamId, email) {
  const team = await getTeamById(teamId);
  if (!team) throw new Error('팀을 찾을 수 없습니다');
  const emails = [...new Set([...(team.member_emails ?? []), email])];
  const { error } = await db.from('teams').update({ member_emails: emails }).eq('id', teamId);
  if (error) throw new Error(error.message);
}

export async function deleteTeam(id) {
  const { error } = await db.from('teams').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getTeamMembers(team) {
  if (!team?.member_emails?.length) return [];
  const { data } = await db.from('users').select('id, name, email').in('email', team.member_emails);
  return data ?? [];
}
