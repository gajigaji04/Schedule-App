// Tracks which alerts have already fired this browser session
const notified = new Set();

export function requestNotifPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}

/**
 * Call this every ~60 s. Fires browser notifications when a task's
 * due_time is exactly 1 h or 30 min away (±30 s window).
 */
export function checkUpcoming(tasks, todayStr) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const nowMs = Date.now();

  tasks.forEach(task => {
    if (task.completed || !task.due_time || task.date !== todayStr) return;

    const dueMs = new Date(`${task.date}T${task.due_time}:00`).getTime();
    const diff  = dueMs - nowMs; // ms until due

    // 1-hour window: fire when 59:30 ~ 60:30 remain
    const k1h = `${task.id}-1h`;
    if (diff > 3570000 && diff <= 3630000 && !notified.has(k1h)) {
      notified.add(k1h);
      new Notification('⏰ 1시간 전 마감', {
        body: `"${task.title}" — ${task.due_time}까지 완료해야 해요`,
        icon: '/favicon.ico',
        tag: k1h,
      });
    }

    // 30-minute window: fire when 29:30 ~ 30:30 remain
    const k30 = `${task.id}-30m`;
    if (diff > 1770000 && diff <= 1830000 && !notified.has(k30)) {
      notified.add(k30);
      new Notification('⚠️ 30분 전 마감', {
        body: `"${task.title}" — ${task.due_time}까지 완료해야 해요`,
        icon: '/favicon.ico',
        tag: k30,
      });
    }
  });
}

/** Returns a human-readable countdown label + CSS color for a task's due_time. */
export function dueTimeLabel(task, todayStr, nowMs) {
  if (!task.due_time) return null;
  if (task.completed) return null;

  const dueMs = new Date(`${task.date}T${task.due_time}:00`).getTime();
  const diff  = dueMs - nowMs;
  const mins  = Math.round(diff / 60000);

  if (task.date !== todayStr) {
    // Non-today task: just show the time
    return { text: `${task.due_time}까지`, color: 'var(--text-sub)' };
  }

  if (diff < 0)        return { text: `${task.due_time} · 마감 초과`, color: 'var(--red-500)' };
  if (mins < 30)       return { text: `${task.due_time} · ${mins}분 남음!`, color: 'var(--red-500)' };
  if (mins < 60)       return { text: `${task.due_time} · ${mins}분 남음`, color: '#f97316' };
  if (mins < 120)      return { text: `${task.due_time} · ${Math.floor(mins / 60)}시간 남음`, color: '#f59e0b' };
  return { text: `${task.due_time}까지`, color: 'var(--text-sub)' };
}
