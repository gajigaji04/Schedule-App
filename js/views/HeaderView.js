// View — Header
// Renders user info, team pill, and notification dropdown.
class HeaderView {
  static #dropdownOpen = false;

  static render(user) {
    document.getElementById('header-avatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('header-name').textContent   = user.name;
    document.getElementById('header-email').textContent  = user.email;
    this.updateTeamPill();    // fire-and-forget (async)
    this.updateNotifBadge(); // fire-and-forget (async)
  }

  static async updateTeamPill() {
    const teams = await TeamModel.getByUser();
    const label = teams.length === 0 ? '개인'
                : teams.length === 1 ? teams[0].name
                : `${teams.length}개 팀`;
    document.getElementById('team-pill-name').textContent = label;
  }

  static async updateNotifBadge() {
    const count = await NotificationService.getUrgentCount();
    const badge = document.getElementById('notif-badge');
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  static toggleDropdown() {
    this.#dropdownOpen = !this.#dropdownOpen;
    const dd = document.getElementById('notif-dropdown');
    if (this.#dropdownOpen) {
      this.#renderDropdown(); // fire-and-forget (async)
      dd.classList.remove('hidden');
    } else {
      dd.classList.add('hidden');
    }
  }

  static closeDropdown() {
    this.#dropdownOpen = false;
    document.getElementById('notif-dropdown').classList.add('hidden');
  }

  static async #renderDropdown() {
    const urgent = await NotificationService.getUrgentTasks();
    const list   = document.getElementById('notif-list');

    if (!urgent.length) {
      list.innerHTML = `
        <div class="notif-empty">
          <i class="fas fa-check-circle"></i>
          <p>임박한 일정이 없습니다</p>
        </div>`;
      return;
    }

    list.innerHTML = urgent.map(({ task, info }) => `
      <div class="notif-item" data-task-id="${task.id}">
        <span class="deadline-badge ${info.cls}">
          <i class="fas fa-clock"></i> ${info.label}
        </span>
        <div class="notif-task-title">${task.title}</div>
        <div class="notif-task-date">${task.date}</div>
      </div>`).join('');

    list.querySelectorAll('.notif-item').forEach(el => {
      el.addEventListener('click', () => {
        TaskController.openEditModal(el.dataset.taskId);
        this.closeDropdown();
      });
    });
  }
}
