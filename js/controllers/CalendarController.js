// Controller — Calendar
// Handles year / month / week view rendering and the sliding day panel.
class CalendarController {
  static year  = new Date().getFullYear();
  static month = new Date().getMonth();
  static #mode = 'month'; // 'year' | 'month' | 'week'
  static #weekStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // go to Sunday of current week
    return d;
  })();

  static init() {
    this.renderCalendar();
    this.#bindControls();
    this.#syncModeButtons();
  }

  static async renderCalendar() {
    const container = document.getElementById('full-calendar');
    // Year view uses standalone month cards; month/week use the card wrapper.
    container.className = this.#mode === 'year' ? 'year-cal-wrap' : 'full-cal';

    if (this.#mode === 'year') return this.#renderYear(container);
    if (this.#mode === 'week') return this.#renderWeek(container);
    return this.#renderMonth(container);
  }

  static async openDayPanel(dateStr) {
    const [tasks, teams] = await Promise.all([
      TaskModel.getByDate(dateStr),
      TeamModel.getByUser(),
    ]);
    const teamsMap = Object.fromEntries(teams.map(t => [t.id, t]));

    document.getElementById('day-panel-date').textContent = CalendarView.dateLabel(dateStr);

    const onToggle = async id => {
      await TaskModel.toggleComplete(id);
      await this.openDayPanel(dateStr);
      await this.renderCalendar();
      HeaderView.updateNotifBadge();
    };

    TaskView.renderList(
      document.getElementById('day-panel-tasks'),
      tasks, onToggle, id => TaskController.openEditModal(id), teamsMap
    );

    document.getElementById('day-add-btn').onclick   = () => TaskController.openAddModal(dateStr);
    document.getElementById('close-day-panel').onclick = () =>
      document.getElementById('day-panel').classList.add('hidden');

    document.getElementById('day-panel').classList.remove('hidden');
  }

  // ---------- private render ----------

  static async #renderMonth(container) {
    const start = CalendarView.toDateStr(new Date(this.year, this.month, 1));
    const end   = CalendarView.toDateStr(new Date(this.year, this.month + 1, 0));
    const tasks = await TaskModel.getByDateRange(start, end);

    document.getElementById('cal-label').textContent =
      `${this.year}년 ${CalendarView.MONTHS[this.month]}`;

    CalendarView.renderFull(container, this.year, this.month, tasks,
      date => this.openDayPanel(date));
  }

  static async #renderYear(container) {
    const tasks = await TaskModel.getByDateRange(
      `${this.year}-01-01`, `${this.year}-12-31`
    );
    document.getElementById('cal-label').textContent = `${this.year}년`;

    CalendarView.renderYear(container, this.year, tasks, month => {
      this.month = month;
      this.#setMode('month');
      this.renderCalendar();
    });
  }

  static async #renderWeek(container) {
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.#weekStart);
      d.setDate(d.getDate() + i);
      return CalendarView.toDateStr(d);
    });

    const tasks = await TaskModel.getOverlapping(weekDays[0], weekDays[6]);

    const s     = new Date(weekDays[0] + 'T00:00:00');
    const e     = new Date(weekDays[6] + 'T00:00:00');
    const label = s.getMonth() === e.getMonth()
      ? `${s.getFullYear()}년 ${s.getMonth() + 1}월 ${this.#weekNum(s)}주차`
      : `${s.getFullYear()}년 ${s.getMonth() + 1}월 ${s.getDate()}일 — ${e.getMonth() + 1}월 ${e.getDate()}일`;
    document.getElementById('cal-label').textContent = label;

    CalendarView.renderWeek(container, weekDays, tasks,
      date => this.openDayPanel(date));
  }

  static #weekNum(date) {
    const firstDow = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return Math.ceil((date.getDate() + firstDow) / 7);
  }

  // ---------- private controls ----------

  static #setMode(mode) {
    this.#mode = mode;
    this.#syncModeButtons();
  }

  static #syncModeButtons() {
    document.querySelectorAll('.cal-vt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.#mode);
    });
  }

  static #bindControls() {
    document.getElementById('cal-prev').onclick = () => {
      if      (this.#mode === 'year') { this.year--; }
      else if (this.#mode === 'week') {
        this.#weekStart = new Date(this.#weekStart);
        this.#weekStart.setDate(this.#weekStart.getDate() - 7);
      } else {
        this.month--;
        if (this.month < 0) { this.month = 11; this.year--; }
      }
      this.renderCalendar();
    };

    document.getElementById('cal-next').onclick = () => {
      if      (this.#mode === 'year') { this.year++; }
      else if (this.#mode === 'week') {
        this.#weekStart = new Date(this.#weekStart);
        this.#weekStart.setDate(this.#weekStart.getDate() + 7);
      } else {
        this.month++;
        if (this.month > 11) { this.month = 0; this.year++; }
      }
      this.renderCalendar();
    };

    document.getElementById('cal-today').onclick = () => {
      const now = new Date();
      this.year  = now.getFullYear();
      this.month = now.getMonth();
      const ws   = new Date(now);
      ws.setHours(0, 0, 0, 0);
      ws.setDate(ws.getDate() - ws.getDay());
      this.#weekStart = ws;
      this.renderCalendar();
    };

    document.querySelectorAll('.cal-vt-btn').forEach(btn => {
      btn.onclick = () => {
        this.#setMode(btn.dataset.mode);
        this.renderCalendar();
      };
    });
  }
}
