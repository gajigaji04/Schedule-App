// View — Task
// Renders task list items and empty states into a container element.
// teamsMap: { [teamId]: teamObject } — pre-fetched by the caller to avoid async in render.
class TaskView {
  static #PRIORITY = { low: ['낮음', 'blue'], medium: ['보통', 'amber'], high: ['높음', 'red'] };

  static renderList(container, tasks, onToggle, onEdit, teamsMap = {}) {
    container.innerHTML = '';
    if (!tasks.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard-list"></i>
          <p>할일이 없습니다</p>
        </div>`;
      return;
    }
    tasks.forEach(task => container.appendChild(this.#renderItem(task, onToggle, onEdit, teamsMap)));
  }

  static #renderItem(task, onToggle, onEdit, teamsMap) {
    const [label, color] = this.#PRIORITY[task.priority] || ['보통', 'amber'];
    const team   = task.team_id ? (teamsMap[task.team_id] || null) : null;
    const dlInfo = NotificationService.getDeadlineInfo(task);

    const el = document.createElement('div');
    el.className = `task-item priority-${task.priority} ${task.completed ? 'completed' : ''} ${dlInfo ? dlInfo.cls + '-item' : ''}`;

    if (task.color) el.style.borderLeftColor = task.color;

    el.innerHTML = `
      <button class="check-btn ${task.completed ? 'checked' : ''}" data-id="${task.id}"
              ${task.color ? `style="border-color:${task.color}"` : ''}>
        <i class="fas fa-check"></i>
      </button>
      <div class="task-content" data-id="${task.id}">
        <div class="task-title-row">
          ${task.color ? `<span class="task-color-dot" style="background:${task.color}"></span>` : ''}
          <span class="task-title">${task.title}</span>
          ${dlInfo ? `<span class="deadline-badge ${dlInfo.cls}"><i class="fas fa-clock"></i> ${dlInfo.label}</span>` : ''}
        </div>
        ${task.description ? `<div class="task-desc-text">${task.description}</div>` : ''}
        <div class="task-meta">
          <span class="priority-tag ${color}">${label}</span>
          ${team ? `<span class="team-tag"><i class="fas fa-users"></i>${team.name}</span>` : ''}
          <span class="date-tag"><i class="fas fa-calendar"></i>${task.date}</span>
          ${task.deadline && task.deadline !== task.date
            ? `<span class="date-tag deadline-date-tag"><i class="fas fa-flag"></i>마감 ${task.deadline}</span>`
            : ''}
        </div>
      </div>`;

    el.querySelector('.check-btn').addEventListener('click', e => {
      e.stopPropagation();
      onToggle(task.id);
    });
    el.querySelector('.task-content').addEventListener('click', () => onEdit(task.id));
    return el;
  }
}
