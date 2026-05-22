import { db } from '@/lib/supabase';

export async function getCurrentUser() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from('users').select('*').eq('id', user.id).single();
  return data ?? null;
}

export async function upsertUser(id, name, email) {
  const { data, error } = await db.from('users')
    .upsert({ id, name, email }, { onConflict: 'id' })
    .select()
    .single();

  if (!error) return data;

  // 같은 이메일이 다른 id로 이미 존재할 때 (다른 OAuth 방식으로 재로그인)
  if (error.code === '23505') {
    const { data: existing } = await db.from('users')
      .select('*').eq('email', email).single();
    return existing ?? null;
  }

  throw new Error(error.message);
}

export async function updateProfile(id, name) {
  const { error } = await db.from('users').update({ name }).eq('id', id);
  if (error) throw new Error(error.message);
}
