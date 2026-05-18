// Controller — Team
// Renders team cards and manages team creation modal.
class TeamController {
  static #bound = false;

  static init() {
    if (!this.#bound) {
      this.#bindModal();
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

    // Count tasks per team without an extra N queries.
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
        <div class="card team-card">
          <div class="team-card-head">
            <div class="team-avatar">${team.name.charAt(0).toUpperCase()}</div>
            <div>
              <h3>${team.name}</h3>
              <p>${team.description || '설명 없음'}</p>
            </div>
          </div>
          <div class="team-stats">
            <span><i class="fas fa-tasks"></i>${taskCount}개 할일</span>
            <span><i class="fas fa-users"></i>${team.member_emails.length}명</span>
          </div>
          <div class="member-list">
            ${team.member_emails.map(e => `<span class="member-chip">${e}</span>`).join('')}
          </div>
          <div class="team-actions">
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

  // ---------- private ----------

  static #bindTeamGrid() {
    document.getElementById('teams-grid').addEventListener('click', async e => {
      const inviteBtn = e.target.closest('.team-invite-btn');
      const deleteBtn = e.target.closest('.team-delete-btn');
      if (inviteBtn) await this.copyInvite(inviteBtn.dataset.teamId);
      else if (deleteBtn) await this.deleteTeam(deleteBtn.dataset.teamId);
    });
  }

  static #bindModal() {
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
}
