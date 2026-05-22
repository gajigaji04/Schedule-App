// Controller — Floating Chat
// FAB opens a panel with group (team) chats + 1:1 DM chats.
// Speed: optimistic rendering — own messages appear instantly; Realtime deduplicates.
class ChatController {
  static #tab          = 'group'; // 'group' | 'dm'
  static #activeRoomId = null;    // teamId  or  dm_<uid1>_<uid2>
  static #activeDmUser = null;    // { id, name, email } for current DM
  static #channel      = null;
  static #bound        = false;
  static #sentIds      = new Set(); // optimistic dedup

  static init() {
    if (this.#bound) return;
    this.#bound = true;
    this.#bindFab();
    this.#bindPanel();
  }

  static async openPanel() {
    document.getElementById('chat-panel').classList.remove('hidden');
    document.getElementById('chat-fab-icon').className = 'fas fa-times';
    await this.#loadRoomList();
  }

  static closePanel() {
    document.getElementById('chat-panel').classList.add('hidden');
    document.getElementById('chat-fab-icon').className = 'fas fa-comments';
    this.#hideMembersPopover();
    this.#unsubscribe();
  }

  // ── Room lists ─────────────────────────────────────────────────────────────

  static async #loadRoomList() {
    if (this.#tab === 'group') await this.#loadGroupList();
    else                       await this.#loadDmList();
  }

  static async #loadGroupList() {
    const teams  = await TeamModel.getByUser();
    const listEl = document.getElementById('chat-group-list');

    if (!teams.length) {
      listEl.innerHTML = `<div class="chat-room-empty">참여 중인 팀이 없습니다</div>`;
      this.#showMsgPlaceholder('팀을 먼저 만들어 주세요.');
      return;
    }

    listEl.innerHTML = teams.map(t => `
      <div class="chat-room-item${this.#activeRoomId === t.id ? ' active' : ''}"
           data-room-id="${t.id}" data-room-type="group" title="${t.name}">
        <div class="chat-room-avatar">${t.name.charAt(0).toUpperCase()}</div>
        <span class="chat-room-name">${t.name}</span>
      </div>`).join('');

    const targetId = this.#activeRoomId && teams.find(t => t.id === this.#activeRoomId)
      ? this.#activeRoomId : teams[0].id;
    await this.#selectGroup(targetId);
  }

  static async #loadDmList() {
    const me    = UserModel.getCurrent();
    const teams = await TeamModel.getByUser();
    const listEl = document.getElementById('chat-dm-list');

    // Collect unique members from all teams, excluding self
    const memberMap = {};
    for (const t of teams) {
      const users = await this.#fetchTeamUsers(t);
      for (const u of users) {
        if (u.id !== me.id) memberMap[u.id] = u;
      }
    }
    const members = Object.values(memberMap);

    if (!members.length) {
      listEl.innerHTML = `<div class="chat-room-empty">팀원이 없습니다</div>`;
      this.#showMsgPlaceholder('팀원을 초대해 보세요.');
      return;
    }

    listEl.innerHTML = members.map(u => `
      <div class="chat-room-item${this.#activeDmUser?.id === u.id ? ' active' : ''}"
           data-room-id="${DmModel.channelId(me.id, u.id)}" data-dm-user-id="${u.id}"
           data-dm-user-name="${u.name}" title="${u.name}">
        <div class="chat-room-avatar chat-room-avatar--dm">${u.name.charAt(0).toUpperCase()}</div>
        <div class="chat-room-info">
          <span class="chat-room-name">${u.name}</span>
          <span class="chat-room-sub">${u.email}</span>
        </div>
      </div>`).join('');

    // Auto-select first or previously active
    const target = this.#activeDmUser
      ? members.find(u => u.id === this.#activeDmUser.id) || members[0]
      : members[0];
    await this.#selectDm(target);
  }

  // ── Room selection ─────────────────────────────────────────────────────────

  static async #selectGroup(teamId) {
    this.#unsubscribe();
    this.#activeRoomId = teamId;
    this.#activeDmUser = null;

    // Highlight sidebar item
    document.querySelectorAll('[data-room-type="group"]').forEach(el =>
      el.classList.toggle('active', el.dataset.roomId === teamId)
    );

    // Show member management button
    document.getElementById('chat-members-btn').classList.remove('hidden');
    document.getElementById('chat-members-btn').dataset.teamId = teamId;

    const team   = await TeamModel.getById(teamId);
    document.getElementById('chat-active-name').textContent = team?.name ?? '';

    await this.#loadMessages(teamId);

    // Subscribe — skip own messages already rendered
    this.#channel = ChatModel.subscribe(teamId, msg => {
      if (this.#sentIds.has(msg.id)) { this.#sentIds.delete(msg.id); return; }
      this.#appendMsg(msg);
    });
  }

  static async #selectDm(user) {
    this.#unsubscribe();
    this.#activeDmUser = user;
    const me   = UserModel.getCurrent();
    const dmId = DmModel.channelId(me.id, user.id);
    this.#activeRoomId = dmId;

    document.querySelectorAll('[data-dm-user-id]').forEach(el =>
      el.classList.toggle('active', el.dataset.dmUserId === user.id)
    );
    document.getElementById('chat-members-btn').classList.add('hidden');
    this.#hideMembersPopover();
    document.getElementById('chat-active-name').textContent = `💬 ${user.name}`;

    // Load from direct_messages table
    const msgsEl = document.getElementById('chat-panel-msgs');
    msgsEl.innerHTML = `<div class="chat-loading"><i class="fas fa-spinner fa-spin"></i></div>`;
    const msgs = await DmModel.getMessages(dmId);
    msgsEl.innerHTML = '';
    if (!msgs.length) {
      msgsEl.innerHTML = `<div class="chat-empty">아직 메시지가 없습니다.<br>첫 메시지를 보내보세요!</div>`;
    } else {
      msgs.forEach(m => this.#appendDmMsg(m, false));
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }

    this.#channel = DmModel.subscribe(dmId, msg => {
      if (this.#sentIds.has(msg.id)) { this.#sentIds.delete(msg.id); return; }
      this.#appendDmMsg(msg);
    });
    document.getElementById('chat-panel-input')?.focus();
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  static async #loadMessages(roomId) {
    const msgsEl = document.getElementById('chat-panel-msgs');
    msgsEl.innerHTML = `<div class="chat-loading"><i class="fas fa-spinner fa-spin"></i></div>`;
    const msgs = await ChatModel.getMessages(roomId);
    msgsEl.innerHTML = '';
    if (!msgs.length) {
      msgsEl.innerHTML = `<div class="chat-empty">아직 메시지가 없습니다.<br>첫 메시지를 보내보세요!</div>`;
    } else {
      msgs.forEach(m => this.#appendMsg(m, false));
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
    document.getElementById('chat-panel-input')?.focus();
  }

  static #appendMsg(msg, scroll = true) {
    const msgsEl = document.getElementById('chat-panel-msgs');
    const placeholder = msgsEl.querySelector('.chat-empty, .chat-loading');
    if (placeholder) placeholder.remove();
    msgsEl.insertAdjacentHTML('beforeend', this.#msgHTML(msg));
    if (scroll) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  // direct_messages uses from_user_id / from_name instead of user_id / user_name
  static #appendDmMsg(msg, scroll = true) {
    this.#appendMsg({
      id:         msg.id,
      user_id:    msg.from_user_id,
      user_name:  msg.from_name,
      content:    msg.content,
      created_at: msg.created_at,
    }, scroll);
  }

  static async #sendMessage() {
    if (!this.#activeRoomId) return;
    const input   = document.getElementById('chat-panel-input');
    const content = input.value.trim();
    if (!content) return;
    input.value = '';

    // Optimistic: render immediately
    const me    = UserModel.getCurrent();
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    this.#sentIds.add(msgId);
    this.#appendMsg({
      id:         msgId,
      user_id:    me.id,
      user_name:  me.name,
      content,
      created_at: new Date().toISOString(),
    });

    try {
      if (this.#activeDmUser) {
        await DmModel.sendWithId(this.#activeRoomId, this.#activeDmUser.id, content, msgId);
      } else {
        await ChatModel.sendWithId(this.#activeRoomId, content, msgId);
      }
    } catch (err) {
      // Remove optimistic message on failure
      this.#sentIds.delete(msgId);
      document.querySelector(`[data-msg-id="${msgId}"]`)?.remove();
      document.getElementById('chat-panel-input').value = content;
      alert('메시지 전송 실패: ' + err.message);
    }
  }

  static #msgHTML(msg) {
    const me     = UserModel.getCurrent();
    const isMine = msg.user_id === me?.id;
    const time   = new Date(msg.created_at).toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit',
    });
    return `
      <div class="chat-msg${isMine ? ' chat-msg--mine' : ''}" data-msg-id="${msg.id}">
        ${!isMine ? `<div class="chat-msg-sender">${msg.user_name ?? ''}</div>` : ''}
        <div class="chat-msg-bubble">${this.#esc(msg.content)}</div>
        <div class="chat-msg-time">${time}</div>
      </div>`;
  }

  // ── Member management popover ──────────────────────────────────────────────

  static async #openMembersPopover(teamId) {
    const popover = document.getElementById('chat-members-popover');
    popover.classList.toggle('hidden');
    if (popover.classList.contains('hidden')) return;

    const team = await TeamModel.getById(teamId);
    const ul   = document.getElementById('cmp-member-list');
    ul.innerHTML = (team?.member_emails || []).map(email =>
      `<li class="cmp-member-item"><i class="fas fa-user"></i> ${email}</li>`
    ).join('');

    const inviteBtn = document.getElementById('cmp-invite-btn');
    inviteBtn.onclick = async () => {
      const email = document.getElementById('cmp-invite-input').value.trim();
      if (!email) return;
      inviteBtn.disabled    = true;
      inviteBtn.textContent = '...';
      try {
        await TeamModel.addMember(teamId, email);
        document.getElementById('cmp-invite-input').value = '';
        await this.#openMembersPopover(teamId); // refresh list
      } catch (err) {
        alert('초대 실패: ' + err.message);
      } finally {
        inviteBtn.disabled    = false;
        inviteBtn.textContent = '초대';
      }
    };
  }

  static #hideMembersPopover() {
    document.getElementById('chat-members-popover')?.classList.add('hidden');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  static async #fetchTeamUsers(team) {
    if (!team?.member_emails?.length) return [];
    const { data } = await db.from('users')
      .select('id, name, email')
      .in('email', team.member_emails);
    return data || [];
  }

  static #showMsgPlaceholder(text) {
    document.getElementById('chat-panel-msgs').innerHTML =
      `<div class="chat-empty">${text}</div>`;
  }

  static #esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  static #unsubscribe() {
    if (this.#activeDmUser) DmModel.unsubscribe(this.#channel);
    else                    ChatModel.unsubscribe(this.#channel);
    this.#channel = null;
  }

  // ── Event binding ──────────────────────────────────────────────────────────

  static #bindFab() {
    document.getElementById('chat-fab').addEventListener('click', () => {
      const panel = document.getElementById('chat-panel');
      if (panel.classList.contains('hidden')) this.openPanel();
      else this.closePanel();
    });
  }

  static #bindPanel() {
    // Close
    document.getElementById('close-chat-panel').addEventListener('click', () =>
      this.closePanel()
    );

    // Tab switching (group / DM)
    document.querySelectorAll('.chat-stab').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.#tab = btn.dataset.tab;
        document.querySelectorAll('.chat-stab').forEach(b =>
          b.classList.toggle('active', b.dataset.tab === this.#tab)
        );
        const groupList = document.getElementById('chat-group-list');
        const dmList    = document.getElementById('chat-dm-list');
        groupList.classList.toggle('hidden', this.#tab !== 'group');
        dmList.classList.toggle('hidden',    this.#tab !== 'dm');

        this.#unsubscribe();
        this.#activeRoomId = null;
        this.#activeDmUser = null;
        this.#hideMembersPopover();

        await this.#loadRoomList();
      });
    });

    // Room item click (delegated — covers both group and DM lists)
    const handleRoomClick = async e => {
      const item = e.target.closest('.chat-room-item');
      if (!item) return;
      if (item.dataset.roomType === 'group') {
        await this.#selectGroup(item.dataset.roomId);
      } else {
        const user = {
          id:    item.dataset.dmUserId,
          name:  item.dataset.dmUserName,
          email: '',
        };
        await this.#selectDm(user);
      }
    };
    document.getElementById('chat-group-list').addEventListener('click', handleRoomClick);
    document.getElementById('chat-dm-list').addEventListener('click', handleRoomClick);

    // Member management button
    document.getElementById('chat-members-btn').addEventListener('click', e => {
      const teamId = e.currentTarget.dataset.teamId;
      this.#openMembersPopover(teamId);
    });

    // Close popover on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#chat-members-popover') &&
          !e.target.closest('#chat-members-btn')) {
        this.#hideMembersPopover();
      }
    });

    // Send button / Enter
    document.getElementById('chat-panel-send').addEventListener('click', () =>
      this.#sendMessage()
    );
    document.getElementById('chat-panel-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.#sendMessage(); }
    });
  }
}
