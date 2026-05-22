// Controller — App (Router)
// Bootstraps the app, handles login/logout, and routes between views.
class AppController {
  static #currentView = 'dashboard';

  static async init() {
    this.#bindLogin();

    // Check Supabase Auth session first — handles Google OAuth redirect.
    try {
      const { data: { session } } = await db.auth.getSession();
      if (session?.user) {
        const user = await UserModel.handleOAuthCallback(session.user);
        this.#showApp(user);
        return;
      }
    } catch (err) {
      console.error('Session check failed:', err);
    }

    // Fall back to email/name session stored in localStorage.
    const user = UserModel.getCurrent();
    if (user) this.#showApp(user);
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
      tasks:      () => { TaskController.initTasksView(); ChecklistController.init(); },
      teams:      () => TeamController.init(),
      settings:   () => SettingsController.init(),
      calculator: () => CalculatorController.init(),
      memo:       () => MemoController.init(),
      timer:      () => TimerController.init(),
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
    ChatController.init();
    AIAssistantController.init();
    this.#bindSidebar();
    this.#bindHeader();
    this.#bindLogout();
    this.#bindSearch();
    NotificationService.init();

    this.navigateTo('dashboard');
  }

  static #bindLogin() {
    const errEl = document.getElementById('login-error');
    this.#bindEmailOTP(errEl);
    this.#bindSocialBtn('google-login-btn', () => UserModel.loginWithGoogle(), errEl);
    this.#bindSocialBtn('kakao-login-btn',  () => UserModel.loginWithKakao(),  errEl);
    this.#bindSocialBtn('github-login-btn', () => UserModel.loginWithGithub(), errEl);
  }

  static #bindEmailOTP(errEl) {
    const emailInput = document.getElementById('otp-email');
    const sendBtn    = document.getElementById('otp-send-btn');
    const verifyBtn  = document.getElementById('otp-verify-btn');
    const backBtn    = document.getElementById('otp-back-btn');
    const tokenInput = document.getElementById('otp-token');
    const stepEmail  = document.getElementById('otp-step-email');
    const stepVerify = document.getElementById('otp-step-verify');
    const hintSpan   = document.getElementById('otp-hint-email');

    sendBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) return;
      sendBtn.disabled    = true;
      sendBtn.textContent = '발송 중...';
      errEl.classList.add('hidden');
      try {
        await UserModel.sendEmailOTP(email);
        hintSpan.textContent = email;
        stepEmail.classList.add('hidden');
        stepVerify.classList.remove('hidden');
        tokenInput.focus();
      } catch (err) {
        errEl.textContent = `코드 발송 실패: ${err.message}`;
        errEl.classList.remove('hidden');
      } finally {
        sendBtn.disabled    = false;
        sendBtn.textContent = '인증 코드 받기';
      }
    });

    backBtn.addEventListener('click', () => {
      stepVerify.classList.add('hidden');
      stepEmail.classList.remove('hidden');
      tokenInput.value = '';
      errEl.classList.add('hidden');
    });

    verifyBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const token = tokenInput.value.trim();
      if (!token) return;
      verifyBtn.disabled    = true;
      verifyBtn.textContent = '확인 중...';
      errEl.classList.add('hidden');
      try {
        const user = await UserModel.verifyEmailOTP(email, token);
        this.#showApp(user);
      } catch (err) {
        errEl.textContent = `인증 실패: ${err.message}`;
        errEl.classList.remove('hidden');
      } finally {
        verifyBtn.disabled    = false;
        verifyBtn.textContent = '확인';
      }
    });
  }

  static #bindSocialBtn(btnId, loginFn, errEl) {
    const btn = document.getElementById(btnId);
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      errEl.classList.add('hidden');
      try {
        await loginFn();
        // OAuth providers redirect — nothing below runs for them.
      } catch (err) {
        errEl.textContent = `로그인 실패: ${err.message}`;
        errEl.classList.remove('hidden');
        btn.disabled = false;
      }
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
    document.getElementById('logout-btn').addEventListener('click', async () => {
      if (!confirm('로그아웃 하시겠습니까?')) return;
      await db.auth.signOut(); // clear Supabase Auth session (Google OAuth)
      UserModel.logout();      // clear localStorage session (email login)
      document.getElementById('app').classList.add('hidden');
      document.getElementById('login-modal').classList.remove('hidden');
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
