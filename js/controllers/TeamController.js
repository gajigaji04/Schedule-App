// Controller — Team
// Renders team cards and manages team schedule modal.
// Chat is handled separately by ChatController (floating FAB).
class TeamController {
  static #bound = false;

  static init() {
    if (!this.#bound) {
      this.#bindCreateModal();
      this.#bindScheduleModal();
      this.#bindTeamGrid();
      this.#bound = true;
    }
    this.renderTeams();
  }

  static async renderTeams() {

    const user  = UserModel.getCurrent();
    const [teams, tasks] = await Promise.all([
      TeamModel.getByUser(),
      TaskModel.getByUser(),
    ]);

    const taskCountByTeam = {};
    tasks.forEach(t => {
      if (t.team_id) taskCountByTeam[t.team_id] = (taskCountByTeam[t.team_id] || 0) + 1;
    });

    const container = document.getElementById('teams-grid');

    if (!teams.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fas fa-users"></i>
          <p>참여 중인 팀이 없습니다</p>
          <button class="btn-primary" id="empty-create-team">팀 만들기</button>
        </div>`;
      document.getElementById('empty-create-team').onclick = () =>
        document.getElementById('team-modal').classList.remove('hidden');
      return;
    }

    container.innerHTML = teams.map(team => {
      const taskCount = taskCountByTeam[team.id] || 0;
      const isOwner   = team.created_by === user.id;
      return `
        <div class="card team-card" data-team-id="${team.id}">
          <div class="team-card-head">
            <div class="team-avatar">${team.name.charAt(0).toUpperCase()}</div>
            <div>
              <h3>${team.name}</h3>
              <p>${team.description || '설명 없음'}</p>
            </div>
          </div>
          <div class="team-stats">
            <span><i class="fas fa-tasks"></i> ${taskCount}개 할일</span>
            <span><i class="fas fa-users"></i> ${team.member_emails.length}명</span>
          </div>
          <div class="member-list">
            ${team.member_emails.map(e => `<span class="member-chip">${e}</span>`).join('')}
          </div>
          <div class="team-actions">
            <button class="btn-secondary btn-sm team-schedule-btn" data-team-id="${team.id}">
              <i class="fas fa-calendar-check"></i> 팀 스케줄
            </button>
            <button class="btn-secondary btn-sm team-invite-btn" data-team-id="${team.id}">
              <i class="fas fa-share-alt"></i> 초대
            </button>
            ${isOwner ? `
              <button class="btn-danger btn-sm team-delete-btn" data-team-id="${team.id}">
                <i class="fas fa-trash"></i>
              </button>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  // ── Team Schedule Modal ──────────────────────────────────────────────────

  static async openSchedule(teamId) {
    const modal   = document.getElementById('team-schedule-modal');
    const titleEl = document.getElementById('team-schedule-title');
    const bodyEl  = document.getElementById('team-schedule-body');

    const team = await TeamModel.getById(teamId);
    titleEl.textContent = `${team.name} — 팀 스케줄`;
    bodyEl.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</div>`;
    modal.classList.remove('hidden');

    const groups = await TeamModel.getSchedule(teamId);

    if (!groups.length) {
      bodyEl.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-calendar"></i>
          <p>팀에 공유된 할일이 없습니다</p>
        </div>`;
      return;
    }

    const today      = new Date().toISOString().split('T')[0];
    const prioLabel  = { high: '높음', medium: '보통', low: '낮음' };
    const prioBadge  = { high: 'sched-badge--red', medium: 'sched-badge--amber', low: 'sched-badge--slate' };

    bodyEl.innerHTML = groups.map(({ user, tasks }) => `
      <div class="schedule-member-section">
        <div class="schedule-member-head">
          <div class="schedule-avatar">${user.name.charAt(0).toUpperCase()}</div>
          <div class="schedule-member-info">
            <strong>${user.name}</strong>
            <span class="schedule-email">${user.email}</span>
          </div>
          <span class="schedule-task-count">${tasks.length}개</span>
        </div>
        <div class="schedule-task-list">
          ${tasks.map(t => {
            const overdue = !t.completed && t.date && t.date < today;
            return `
            <div class="schedule-task-item${t.completed ? ' done' : ''}${overdue ? ' overdue' : ''}">
              <i class="fas fa-${t.completed ? 'check-circle' : 'circle'} schedule-task-icon"></i>
              <div class="schedule-task-info">
                <span class="schedule-task-title">${t.title}</span>
                <span class="schedule-task-date">
                  ${t.date || '날짜 없음'}${t.deadline ? ` → ${t.deadline}` : ''}
                </span>
              </div>
              <span class="sched-badge ${prioBadge[t.priority] || 'sched-badge--slate'}">
                ${prioLabel[t.priority] || t.priority}
              </span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `).join('');
  }

  // ── Invite / Delete ───────────────────────────────────────────────────────

  static async copyInvite(teamId) {
    const team = await TeamModel.getById(teamId);
    const msg  = `[TeamScheduler 팀 초대]\n팀명: ${team.name}\n팀 ID: ${teamId}\n팀원 목록: ${team.member_emails.join(', ')}\n\n이 앱에서 같은 이메일로 로그인하면 팀 할일을 함께 볼 수 있습니다.`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg).then(() => alert('초대 정보가 클립보드에 복사되었습니다!'));
    } else {
      prompt('아래 내용을 복사하여 공유하세요:', msg);
    }
  }

  static async deleteTeam(teamId) {
    if (!confirm('팀을 삭제하시겠습니까?\n팀에 공유된 할일은 그대로 유지됩니다.')) return;
    await TeamModel.delete(teamId);
    await this.renderTeams();
    HeaderView.updateTeamPill();
  }

  // ── Private: event binding ────────────────────────────────────────────────

  static #bindTeamGrid() {
    const grid = document.getElementById('teams-grid');

    grid.addEventListener('click', async e => {
      const scheduleBtn = e.target.closest('.team-schedule-btn');
      const inviteBtn   = e.target.closest('.team-invite-btn');
      const deleteBtn   = e.target.closest('.team-delete-btn');

      if      (scheduleBtn) await this.openSchedule(scheduleBtn.dataset.teamId);
      else if (inviteBtn)   await this.copyInvite(inviteBtn.dataset.teamId);
      else if (deleteBtn)   await this.deleteTeam(deleteBtn.dataset.teamId);
    });
  }

  static #bindCreateModal() {
    const openModal  = () => document.getElementById('team-modal').classList.remove('hidden');
    const closeModal = () => {
      document.getElementById('team-modal').classList.add('hidden');
      document.getElementById('team-form').reset();
    };

    document.getElementById('create-team-btn').onclick = openModal;
    document.getElementById('close-team-modal').onclick = closeModal;
    document.getElementById('cancel-team').onclick = closeModal;
    document.getElementById('team-modal').addEventListener('click', e => {
      if (e.target.id === 'team-modal') closeModal();
    });

    document.getElementById('team-form').addEventListener('submit', async e => {
      e.preventDefault();
      const name         = document.getElementById('team-name').value.trim();
      const description  = document.getElementById('team-desc').value.trim();
      const rawEmails    = document.getElementById('team-members').value;
      const memberEmails = rawEmails.split(',').map(s => s.trim()).filter(Boolean);
      await TeamModel.create({ name, description, memberEmails });
      closeModal();
      await this.renderTeams();
      HeaderView.updateTeamPill();
    });
  }

  static #bindScheduleModal() {
    const close = () => document.getElementById('team-schedule-modal').classList.add('hidden');
    document.getElementById('close-team-schedule-modal').onclick = close;
    document.getElementById('team-schedule-modal').addEventListener('click', e => {
      if (e.target.id === 'team-schedule-modal') close();
    });
  }
}
