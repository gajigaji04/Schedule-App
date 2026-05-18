// Controller — App (Router)
// Bootstraps the app, handles login/logout, and routes between views.
class AppController {
  static #currentView = 'dashboard';

  static init() {
    this.#bindLogin();

    const user = UserModel.getCurrent();
    if (user) {
      this.#showApp(user);
    }
  }

  static navigateTo(view) {
    this.#currentView = view;

    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');

    if (view !== 'calendar') {
      document.getElementById('day-panel').classList.add('hidden');
    }

    const controllers = {
      dashboard:  () => DashboardController.init(),
      calendar:   () => CalendarController.init(),
      tasks:      () => TaskController.initTasksView(),
      teams:      () => TeamController.init(),
      settings:   () => SettingsController.init(),
      calculator: () => CalculatorController.init(),
    };
    controllers[view]?.();
  }

  static refresh() {
    this.navigateTo(this.#currentView);
    HeaderView.updateNotifBadge();
  }

  // ---------- private ----------

  static #showApp(user) {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    HeaderView.render(user);
    TaskController.init();
    this.#bindSidebar();
    this.#bindHeader();
    this.#bindLogout();
    this.#bindSearch();
    NotificationService.init();

    this.navigateTo('dashboard');
  }

  static #bindLogin() {
    document.getElementById('login-form').addEventListener('submit', async e => {
      e.preventDefault();
      const name  = document.getElementById('login-name').value.trim();
      const email = document.getElementById('login-email').value.trim();
      const user  = await UserModel.login(name, email);
      this.#showApp(user);
    });
  }

  static #bindSidebar() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', () => this.navigateTo(item.dataset.view));
    });
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('app').classList.toggle('sidebar-collapsed');
    });
  }

  static #bindHeader() {
    document.getElementById('user-chip').addEventListener('click', () =>
      this.navigateTo('settings')
    );
    document.getElementById('notif-btn').addEventListener('click', e => {
      e.stopPropagation();
      HeaderView.toggleDropdown();
    });
    document.getElementById('notif-view-all').addEventListener('click', () => {
      HeaderView.closeDropdown();
      this.navigateTo('tasks');
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.notif-wrap')) HeaderView.closeDropdown();
    });
  }

  static #bindLogout() {
    document.getElementById('logout-btn').addEventListener('click', () => {
      if (!confirm('로그아웃 하시겠습니까?')) return;
      UserModel.logout();
      document.getElementById('app').classList.add('hidden');
      document.getElementById('login-modal').classList.remove('hidden');
      document.getElementById('login-form').reset();
      document.getElementById('day-panel').classList.add('hidden');
    });
  }

  static #bindSearch() {
    const input   = document.getElementById('search-input');
    const results = document.getElementById('search-results');

    input.addEventListener('input', async () => {
      const q = input.value.trim();
      if (!q) { results.classList.add('hidden'); return; }

      const tasks = await TaskModel.search(q);
      if (!tasks.length) {
        results.innerHTML = `<div class="search-result-item" style="color:var(--slate-400)">검색 결과 없음</div>`;
      } else {
        results.innerHTML = tasks.map(t => `
          <div class="search-result-item" data-id="${t.id}">
            <strong>${t.title}</strong>
            <span style="color:var(--slate-400);font-size:0.8rem;margin-left:8px">${t.date}</span>
          </div>`).join('');
        results.querySelectorAll('[data-id]').forEach(el => {
          el.addEventListener('click', () => {
            TaskController.openEditModal(el.dataset.id);
            results.classList.add('hidden');
            input.value = '';
          });
        });
      }
      results.classList.remove('hidden');
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.search-bar')) results.classList.add('hidden');
    });
  }
}
