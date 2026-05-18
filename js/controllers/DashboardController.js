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
    await Promise.all([
      this.#renderStats(todayStr),
      this.#renderTodayTasks(todayStr),
      this.#renderMiniCalendar(),
    ]);
    this.#bindMiniNav();

    document.getElementById('today-chip').textContent =
      `${now.getMonth() + 1}/${now.getDate()}`;

    document.getElementById('dash-add-btn').onclick =
      () => TaskController.openAddModal(todayStr);
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
