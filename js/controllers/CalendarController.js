// Controller — Calendar
// Handles full calendar rendering and the sliding day panel.
class CalendarController {
  static year  = new Date().getFullYear();
  static month = new Date().getMonth();

  static init() {
    this.renderCalendar();
    this.#bindControls();
  }

  static async renderCalendar() {
    const start = CalendarView.toDateStr(new Date(this.year, this.month, 1));
    const end   = CalendarView.toDateStr(new Date(this.year, this.month + 1, 0));
    const tasks = await TaskModel.getByDateRange(start, end);

    document.getElementById('cal-label').textContent =
      `${this.year}년 ${CalendarView.MONTHS[this.month]}`;

    CalendarView.renderFull(
      document.getElementById('full-calendar'),
      this.year, this.month, tasks,
      date => this.openDayPanel(date)
    );
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
    const onEdit = id => TaskController.openEditModal(id);

    TaskView.renderList(
      document.getElementById('day-panel-tasks'),
      tasks, onToggle, onEdit, teamsMap
    );

    document.getElementById('day-add-btn').onclick = () => TaskController.openAddModal(dateStr);
    document.getElementById('close-day-panel').onclick = () =>
      document.getElementById('day-panel').classList.add('hidden');

    document.getElementById('day-panel').classList.remove('hidden');
  }

  // ---------- private ----------

  static #bindControls() {
    document.getElementById('cal-prev').onclick = () => {
      this.month--;
      if (this.month < 0) { this.month = 11; this.year--; }
      this.renderCalendar();
    };
    document.getElementById('cal-next').onclick = () => {
      this.month++;
      if (this.month > 11) { this.month = 0; this.year++; }
      this.renderCalendar();
    };
    document.getElementById('cal-today').onclick = () => {
      this.year  = new Date().getFullYear();
      this.month = new Date().getMonth();
      this.renderCalendar();
    };
  }
}
