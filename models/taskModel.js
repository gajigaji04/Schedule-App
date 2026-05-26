import { db } from '@/lib/supabase';

export async function getTasksByUser(userId) {
  const { data } = await db.from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('date');
  return data ?? [];
}

/** 마감 알림용 — 미완료 할일 중 7일 이내 마감인 것만 (AppHeader 전용) */
export async function getDeadlineTasks(userId) {
  const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const { data } = await db.from('tasks')
    .select('id, title, date, due_time, deadline, completed')
    .eq('user_id', userId)
    .eq('completed', false)
    .lte('date', in7)
    .order('date');
  return (data ?? []).filter(t => (t.deadline || t.date) <= in7);
}

export async function getTasksByDate(userId, date) {
  const { data } = await db.from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at');
  return data ?? [];
}

export async function getTasksByDateRange(userId, start, end) {
  const { data } = await db.from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date');
  return data ?? [];
}

export async function createTask(task) {
  const payload = { id: crypto.randomUUID(), ...task };
  const { data, error } = await db.from('tasks').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateTask(id, updates) {
  const { error } = await db.from('tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTask(id) {
  const { error } = await db.from('tasks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function toggleComplete(id, currentValue) {
  const { error } = await db.from('tasks')
    .update({ completed: !currentValue, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
