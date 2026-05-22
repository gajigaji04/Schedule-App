// Controller — Dashboard
// Renders the greeting, stat cards, today's tasks, and mini calendar.
class DashboardController {
  static #miniYear  = new Date().getFullYear();
  static #miniMonth = new Date().getMonth();

  static async init() {
    const now      = new Date();
    const user     = UserModel.getCurrent();
    const todayStr = CalendarView.toDateStr(now);

    this.#renderGreeting(now, user);

    // 버튼/칩은 DB 결과를 기다리지 않고 즉시 바인딩
    document.getElementById('today-chip').textContent =
      `${now.getMonth() + 1}/${now.getDate()}`;
    document.getElementById('dash-add-btn').onclick =
      () => TaskController.openAddModal(todayStr);

    await Promise.all([
      this.#renderStats(todayStr),
      this.#renderProductivity(todayStr),
      this.#renderTodayTasks(todayStr),
      this.#renderMiniCalendar(),
    ]);
    this.#bindMiniNav();
  }

  // ---------- private ----------

  static #renderGreeting(now, user) {
    const h = now.getHours();
    const greeting = h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후에요' : '좋은 저녁이에요';
    const days = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
    document.getElementById('dash-greeting').textContent = `${greeting}, ${user.name}님!`;
    document.getElementById('dash-date').textContent =
      `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}`;
  }

  static async #renderStats(todayStr) {
    const allTasks   = await TaskModel.getByUser();
    const todayTasks = allTasks.filter(t => t.date === todayStr);
    document.getElementById('stat-total').textContent   = todayTasks.length;
    document.getElementById('stat-done').textContent    = todayTasks.filter(t => t.completed).length;
    document.getElementById('stat-pending').textContent = todayTasks.filter(t => !t.completed).length;
    document.getElementById('stat-shared').textContent  = allTasks.filter(t => t.team_id).length;
  }

  static async #renderProductivity(todayStr) {
    const allTasks = await TaskModel.getByUser();

    // Weekly completion rate — Mon to today
    const now       = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const monday    = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const mondayStr = CalendarView.toDateStr(monday);

    const weekTasks = allTasks.filter(t => t.date >= mondayStr && t.date <= todayStr);
    const weekRate  = weekTasks.length
      ? Math.round((weekTasks.filter(t => t.completed).length / weekTasks.length) * 100)
      : null;

    const rateEl = document.getElementById('stat-weekly-rate');
    const barEl  = document.getElementById('stat-weekly-bar');
    if (rateEl) rateEl.textContent = weekRate !== null ? `${weekRate}%` : '-';
    if (barEl)  barEl.style.width  = weekRate !== null ? `${weekRate}%` : '0%';

    // Streak — consecutive days ending today where at least 1 task completed
    let streak = 0;
    const check = new Date(now);
    check.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const ds = CalendarView.toDateStr(check);
      const dayTasks = allTasks.filter(t => t.date === ds);
      if (dayTasks.length && dayTasks.some(t => t.completed)) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else if (i === 0) {
        // Today has no completions yet — start counting from yesterday
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    const streakEl = document.getElementById('stat-streak');
    if (streakEl) streakEl.textContent = streak;

    // Best day of week — which weekday has the highest avg completion count
    const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0]; // completed per weekday
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // days seen per weekday
    allTasks.filter(t => t.completed).forEach(t => {
      const d = new Date(t.date + 'T00:00:00').getDay();
      dayTotals[d]++;
    });
    allTasks.forEach(t => {
      const d = new Date(t.date + 'T00:00:00').getDay();
      dayCounts[d]++;
    });
    let bestDay = null, bestAvg = -1;
    for (let d = 0; d < 7; d++) {
      if (!dayCounts[d]) continue;
      const avg = dayTotals[d] / dayCounts[d];
      if (avg > bestAvg) { bestAvg = avg; bestDay = d; }
    }
    const bestEl = document.getElementById('stat-best-day');
    if (bestEl) bestEl.textContent = bestDay !== null ? DAY_NAMES[bestDay] + '요일' : '-';
  }

  static async #renderTodayTasks(todayStr) {
    const [tasks, teams] = await Promise.all([
      TaskModel.getByDate(todayStr),
      TeamModel.getByUser(),
    ]);
    const teamsMap = Object.fromEntries(teams.map(t => [t.id, t]));

    TaskView.renderList(
      document.getElementById('today-task-list'),
      tasks,
      async id => {
        await TaskModel.toggleComplete(id);
        await this.init();
        HeaderView.updateNotifBadge();
      },
      id => TaskController.openEditModal(id),
      teamsMap
    );
  }

  static async #renderMiniCalendar() {
    const year  = this.#miniYear;
    const month = this.#miniMonth;
    document.getElementById('mini-label').textContent =
      `${year}년 ${CalendarView.MONTHS[month]}`;

    const start = CalendarView.toDateStr(new Date(year, month, 1));
    const end   = CalendarView.toDateStr(new Date(year, month + 1, 0));
    const tasks = await TaskModel.getByDateRange(start, end);

    CalendarView.renderMini(
      document.getElementById('mini-calendar'),
      year, month, tasks,
      date => {
        AppController.navigateTo('calendar');
        CalendarController.year  = new Date(date + 'T00:00:00').getFullYear();
        CalendarController.month = new Date(date + 'T00:00:00').getMonth();
        CalendarController.renderCalendar();
        CalendarController.openDayPanel(date);
      }
    );
  }

  static #bindMiniNav() {
    document.getElementById('mini-prev').onclick = async () => {
      this.#miniMonth--;
      if (this.#miniMonth < 0) { this.#miniMonth = 11; this.#miniYear--; }
      await this.#renderMiniCalendar();
    };
    document.getElementById('mini-next').onclick = async () => {
      this.#miniMonth++;
      if (this.#miniMonth > 11) { this.#miniMonth = 0; this.#miniYear++; }
      await this.#renderMiniCalendar();
    };
  }
}
