// Service — Notification
// Browser push notifications + deadline proximity calculation.
class NotificationService {
  static #NOTIFIED_KEY = 'ts_notified';
  static #INTERVAL_MS  = 30 * 60 * 1000;

  static async init() {
    await this.#requestPermission();
    this.#checkAndNotify();
    setInterval(() => this.#checkAndNotify(), this.#INTERVAL_MS);
  }

  // ---------- deadline helpers (used by Views — intentionally sync) ----------

  static getDaysUntil(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    return Math.round((target - today) / 86400000);
  }

  static #effectiveDeadline(task) {
    return task.deadline || task.date;
  }

  static getDeadlineInfo(task) {
    if (task.completed) return null;
    const d = this.getDaysUntil(this.#effectiveDeadline(task));
    if (d < 0)   return { label: `D+${Math.abs(d)} 초과`, cls: 'dl-overdue' };
    if (d === 0) return { label: '오늘 마감',              cls: 'dl-today'   };
    if (d === 1) return { label: '내일 마감',              cls: 'dl-soon'    };
    if (d <= 3)  return { label: `D-${d}`,                cls: 'dl-near'    };
    if (d <= 7)  return { label: `D-${d}`,                cls: 'dl-week'    };
    return null;
  }

  // ---------- async helpers (called from HeaderView / CalendarController) ----------

  static async getUrgentTasks() {
    const user = UserModel.getCurrent();
    if (!user) return [];
    const tasks = await TaskModel.getByUser();
    return tasks
      .filter(t => !t.completed)
      .map(t => ({ task: t, info: this.getDeadlineInfo(t) }))
      .filter(({ info }) => info !== null)
      .sort((a, b) => a.task.date.localeCompare(b.task.date));
  }

  static async getUrgentCount() {
    const user = UserModel.getCurrent();
    if (!user) return 0;
    const tomorrow = CalendarView.toDateStr(new Date(Date.now() + 86400000));
    const tasks    = await TaskModel.getByUser();
    return tasks.filter(t => !t.completed && t.date <= tomorrow).length;
  }

  // ---------- private ----------

  static async #requestPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  static async #checkAndNotify() {
    const user = UserModel.getCurrent();
    if (!user) return;

    const today    = CalendarView.toDateStr(new Date());
    const tomorrow = CalendarView.toDateStr(new Date(Date.now() + 86400000));
    const tasks    = (await TaskModel.getByUser()).filter(t => !t.completed);

    tasks.forEach(task => {
      const dl = task.deadline || task.date;
      if      (dl < today)     this.#fire(task, '기한 초과', `"${task.title}" 마감일을 놓쳤습니다!`, 'overdue');
      else if (dl === today)   this.#fire(task, '오늘 마감', `"${task.title}" 오늘까지 완료해야 합니다.`, 'today');
      else if (dl === tomorrow) this.#fire(task, '내일 마감', `"${task.title}" 내일이 마감입니다.`, 'tomorrow');
    });

    HeaderView.updateNotifBadge();
  }

  static #fire(task, title, body, type) {
    const todayStr = CalendarView.toDateStr(new Date());
    const key      = `${task.id}_${type}_${todayStr}`;
    const notified = JSON.parse(localStorage.getItem(this.#NOTIFIED_KEY) || '{}');
    if (notified[key]) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(`📅 ${title}`, { body, tag: key });
      n.onclick = () => { window.focus(); TaskController.openEditModal(task.id); };
    }

    notified[key] = true;
    Object.keys(notified).forEach(k => { if (!k.endsWith(todayStr)) delete notified[k]; });
    localStorage.setItem(this.#NOTIFIED_KEY, JSON.stringify(notified));
  }
}
