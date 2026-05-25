import { db } from '@/lib/supabase';

export async function getTasksByUser(userId) {
  const { data } = await db.from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('date');
  return data ?? [];
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
