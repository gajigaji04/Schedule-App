// Controller — Task
// Manages the task modal (add / edit / delete) and task list rendering.
class TaskController {
  static #editingId  = null;
  static #bound      = false;
  static #dpDate     = null;
  static #dpDeadline = null;

  static init() {
    if (this.#bound) return;
    this.#bindModal();
    this.#bindColorSwatches();
    this.#dpDate     = new DatePicker({ wrapperId: 'dp-wrap-date',     inputId: 'task-date',     placeholder: '날짜를 선택하세요' });
    this.#dpDeadline = new DatePicker({ wrapperId: 'dp-wrap-deadline', inputId: 'task-deadline', placeholder: '선택 안함', clearable: true });
    this.#bound = true;
  }

  // ---------- public openers ----------

  static openAddModal(date = null) {
    this.#editingId = null;
    document.getElementById('task-modal-title').textContent = '할일 추가';
    document.getElementById('task-form').reset();
    document.getElementById('task-id').value = '';
    this.#dpDate.setValue(date || CalendarView.toDateStr(new Date()));
    this.#dpDeadline.setValue('');
    document.getElementById('delete-task-btn').classList.add('hidden');
    this.#setActiveColor('');
    this.#populateTeamSelect('');
    this.#openModal();
  }

  static async openEditModal(taskId) {
    const task = await TaskModel.getById(taskId);
    if (!task) return;
    this.#editingId = taskId;
    document.getElementById('task-modal-title').textContent = '할일 수정';
    document.getElementById('task-id').value    = taskId;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value  = task.description || '';
    this.#dpDate.setValue(task.date);
    this.#dpDeadline.setValue(task.deadline || '');
    document.getElementById('task-priority').value  = task.priority;
    document.getElementById('task-done').checked    = task.completed;
    document.getElementById('delete-task-btn').classList.remove('hidden');
    this.#setActiveColor(task.color || '');
    this.#populateTeamSelect(task.team_id || '');
    this.#openModal();
  }

  // ---------- tasks view ----------

  static async initTasksView() {
    const [allTasks, teams] = await Promise.all([
      TaskModel.getByUser(),
      TeamModel.getByUser(),
    ]);
    allTasks.sort((a, b) => b.date.localeCompare(a.date));

    const teamsMap  = Object.fromEntries(teams.map(t => [t.id, t]));
    const container = document.getElementById('all-task-list');
    const onToggle  = async id => {
      await TaskModel.toggleComplete(id);
      await this.initTasksView();
      HeaderView.updateNotifBadge();
    };
    const onEdit = id => this.openEditModal(id);

    TaskView.renderList(container, allTasks, onToggle, onEdit, teamsMap);

    document.getElementById('tasks-add-btn').onclick = () => this.openAddModal();

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const today = CalendarView.toDateStr(new Date());
        const map = {
          all:     allTasks,
          today:   allTasks.filter(t => t.date === today),
          pending: allTasks.filter(t => !t.completed),
          done:    allTasks.filter(t => t.completed),
          shared:  allTasks.filter(t => t.team_id),
        };
        TaskView.renderList(container, map[btn.dataset.filter] || allTasks, onToggle, onEdit, teamsMap);
      };
    });
  }

  // ---------- private ----------

  static #openModal() {
    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-title').focus();
  }

  static #closeModal() {
    document.getElementById('task-modal').classList.add('hidden');
    this.#editingId = null;
  }

  static #setActiveColor(color) {
    document.querySelectorAll('.task-color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tcolor === color);
    });
    document.getElementById('task-color').value = color;
  }

  static #bindColorSwatches() {
    document.getElementById('task-color-row').addEventListener('click', e => {
      const btn = e.target.closest('.task-color-btn');
      if (!btn) return;
      this.#setActiveColor(btn.dataset.tcolor);
    });
  }

  static async #populateTeamSelect(selectedTeamId) {
    const teams  = await TeamModel.getByUser();
    const select = document.getElementById('task-team');
    select.innerHTML = `<option value="">개인 (공유 안함)</option>`;
    teams.forEach(team => {
      const opt = document.createElement('option');
      opt.value       = team.id;
      opt.textContent = team.name;
      if (team.id === selectedTeamId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  static #bindModal() {
    // title 입력칸에서 Enter → 실수로 저장되지 않도록 막음 (명시적 버튼 클릭으로만 저장)
    document.getElementById('task-title').addEventListener('keydown', e => {
      if (e.key === 'Enter') e.preventDefault();
    });

    document.getElementById('task-form').addEventListener('submit', async e => {
      e.preventDefault();
      if (!document.getElementById('task-date').value) {
        alert('일정 날짜를 선택해주세요.');
        return;
      }
      const user = UserModel.getCurrent();
      const data = {
        title:       document.getElementById('task-title').value.trim(),
        description: document.getElementById('task-desc').value.trim(),
        date:        document.getElementById('task-date').value,
        deadline:    document.getElementById('task-deadline').value || null,
        color:       document.getElementById('task-color').value    || null,
        priority:    document.getElementById('task-priority').value,
        team_id:     document.getElementById('task-team').value     || null,
        completed:   document.getElementById('task-done').checked,
        user_id:     user.id,
      };
      if (this.#editingId) {
        await TaskModel.update(this.#editingId, data);
      } else {
        await TaskModel.create(data);
      }
      this.#closeModal();
      AppController.refresh();
    });

    document.getElementById('close-task-modal').onclick = () => this.#closeModal();
    document.getElementById('cancel-task').onclick      = () => this.#closeModal();

    document.getElementById('delete-task-btn').onclick = async () => {
      if (!this.#editingId) return;
      if (!confirm('할일을 삭제하시겠습니까?')) return;
      await TaskModel.delete(this.#editingId);
      this.#closeModal();
      AppController.refresh();
    };

    document.getElementById('task-modal').addEventListener('click', e => {
      if (e.target.id === 'task-modal') this.#closeModal();
    });
  }
}
