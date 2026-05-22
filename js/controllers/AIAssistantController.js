// Controller — AI Assistant (ARIA)
// Floating AI panel: realistic schedule analysis, task rescheduling,
// procrastination detection, and decision support via Claude API.
class AIAssistantController {

  static #KEY_LOC  = 'ts_ai_key';
  static #MODEL    = 'claude-haiku-4-5-20251001';
  static #history  = [];   // { role, content }[]
  static #bound    = false;
  static #thinking = false;

  // Returns the active API key.
  // Priority: 1) App-level key from config.js (AI_API_KEY global)
  //           2) User's personal key from localStorage
  static #apiKey() {
    if (typeof AI_API_KEY !== 'undefined' && String(AI_API_KEY || '').startsWith('sk-ant-')) {
      return AI_API_KEY;
    }
    return localStorage.getItem(this.#KEY_LOC) || null;
  }

  // True when the developer has set a shared key in config.js.
  static #hasAppKey() {
    return typeof AI_API_KEY !== 'undefined' && String(AI_API_KEY || '').startsWith('sk-ant-');
  }

  static #SYSTEM = `당신은 TeamScheduler의 AI 비서 "ARIA"입니다. 사용자의 일정과 할 일을 분석하여 생산성을 극대화하도록 돕습니다.

핵심 역할:
• 현실 반영형 분석 — 오늘 실제로 완수 가능한 작업 수를 솔직하게 평가
• AI 재배치 — 지연·과부하 일정을 우선순위와 마감일 기반으로 재편
• 미루기 방지 — 반복 지연 패턴을 탐지하고 지금 당장 시작할 수 있는 가장 작은 첫 단계 제시
• 의사결정 지원 — 선택 상황에서 핵심 기준과 리스크를 명확히 제시

응답 규칙: 반드시 한국어로, 간결하고 실용적으로(400자 이내), 구체적인 행동 방안, 솔직하되 배려 있는 톤, 마크다운 사용 가능(볼드·리스트)`;

  // ── init ───────────────────────────────────────────────────────────────────

  static init() {
    if (this.#bound) return;
    this.#bound = true;
    this.#bindFab();
    this.#bindPanel();
  }

  // ── Panel open / close ─────────────────────────────────────────────────────

  static openPanel() {
    // Mutually exclusive with chat panel
    document.getElementById('chat-panel')?.classList.add('hidden');
    document.getElementById('chat-fab-icon').className = 'fas fa-comments';

    document.getElementById('ai-panel').classList.remove('hidden');
    document.getElementById('ai-fab-icon').className = 'fas fa-times';

    const key       = this.#apiKey();
    const appKey    = this.#hasAppKey();

    // Show/hide key setup vs chat area
    document.getElementById('ai-key-setup').classList.toggle('hidden', !!key);
    document.getElementById('ai-chat-area').classList.toggle('hidden', !key);

    // Show "앱 제공 AI" badge and hide personal-key button when using app key
    document.getElementById('ai-app-key-badge').classList.toggle('hidden', !appKey);
    document.getElementById('ai-key-change').classList.toggle('hidden', appKey);

    if (key && !this.#history.length) this.#showWelcome();
  }

  static closePanel() {
    document.getElementById('ai-panel').classList.add('hidden');
    document.getElementById('ai-fab-icon').className = 'fas fa-robot';
  }

  // ── Claude API ─────────────────────────────────────────────────────────────

  static async #call(messages) {
    const key = this.#apiKey();
    if (!key) throw new Error('API 키가 설정되지 않았습니다');

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      this.#MODEL,
        max_tokens: 1024,
        system:     this.#SYSTEM,
        messages,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return data.content[0].text;
  }

  // ── Task context ───────────────────────────────────────────────────────────

  static async #getContext() {
    const user = UserModel.getCurrent();
    if (!user) return '작업 데이터 없음';
    const today = new Date().toISOString().slice(0, 10);

    const { data: tasks } = await db.from('tasks')
      .select('title, date, deadline, status, priority')
      .eq('user_id', user.id)
      .order('date');

    if (!tasks?.length) return `오늘: ${today}\n등록된 할 일이 없습니다.`;

    const overdue   = tasks.filter(t => t.date < today && t.status !== 'done');
    const todayList = tasks.filter(t => t.date === today);
    const upcoming  = tasks.filter(t => t.date > today && t.status !== 'done').slice(0, 5);
    const doneCount = tasks.filter(t => t.status === 'done').length;

    return [
      `오늘 날짜: ${today}`,
      `전체 할 일: ${tasks.length}개 (완료: ${doneCount}개 / 미완료: ${tasks.length - doneCount}개)`,
      `오늘 예정: ${todayList.length ? todayList.map(t => `"${t.title}"(${t.status})`).join(', ') : '없음'}`,
      `기한 초과: ${overdue.length ? overdue.map(t => `"${t.title}"(${t.date} 미완료)`).join(', ') : '없음'}`,
      `예정 작업: ${upcoming.length ? upcoming.map(t => `"${t.title}"(${t.date})`).join(', ') : '없음'}`,
    ].join('\n');
  }

  // ── Quick actions ──────────────────────────────────────────────────────────

  static async runQuickAction(type) {
    if (this.#thinking) return;

    // Show loading on button
    const btn = document.querySelector(`.ai-qa-btn[data-action="${type}"]`);
    if (btn) { btn.disabled = true; btn.classList.add('ai-qa-btn--loading'); }

    let ctx;
    try { ctx = await this.#getContext(); }
    catch { ctx = '할 일 데이터를 불러올 수 없습니다.'; }
    finally {
      if (btn) { btn.disabled = false; btn.classList.remove('ai-qa-btn--loading'); }
    }

    const prompts = {
      analyze: `다음은 내 현재 할 일 현황입니다:\n${ctx}\n\n오늘 일정을 현실적으로 분석해주세요. 무엇에 집중해야 하고 무엇을 조정해야 하나요?`,
      reschedule: `다음은 내 현재 할 일 현황입니다:\n${ctx}\n\n기한 초과 및 미완료 작업을 우선순위에 따라 이번 주 현실적인 일정으로 재배치해 주세요.`,
      procrastination: `다음은 내 현재 할 일 현황입니다:\n${ctx}\n\n미루고 있는 작업을 파악하고, 지금 당장 시작할 수 있는 가장 작은 첫 단계를 각각 알려주세요.`,
      decide: `다음은 내 현재 할 일 현황입니다:\n${ctx}\n\n오늘 가장 먼저 집중해야 할 작업 한 가지를 골라주세요. 선택 이유와 나머지 작업 처리 방향도 간략히 알려주세요.`,
    };

    await this.#sendChat(prompts[type]);
  }

  // ── Chat send ──────────────────────────────────────────────────────────────

  static async #sendChat(userText) {
    const text = userText.trim();
    if (this.#thinking || !text) return;
    this.#thinking = true;

    document.getElementById('ai-input').value = '';
    this.#setSendDisabled(true);

    this.#history.push({ role: 'user', content: text });
    this.#appendMsg('user', text);

    const loadingId = 'ai-load-' + Date.now();
    this.#appendLoading(loadingId);

    try {
      const reply = await this.#call(this.#history);
      this.#history.push({ role: 'assistant', content: reply });
      document.getElementById(loadingId)?.remove();
      this.#appendMsg('assistant', reply);
    } catch (err) {
      document.getElementById(loadingId)?.remove();
      // API key error
      if (err.message.includes('401') || err.message.includes('API 키')) {
        if (!this.#hasAppKey()) {
          // Personal key invalid — clear it and show setup screen
          localStorage.removeItem(this.#KEY_LOC);
          this.#appendMsg('error', '⚠️ API 키가 유효하지 않습니다. 다시 설정해 주세요.');
        } else {
          this.#appendMsg('error', '⚠️ 앱 API 키 오류입니다. 관리자에게 문의해 주세요.');
        }
      } else {
        this.#appendMsg('error', `오류: ${err.message}`);
      }
    } finally {
      this.#thinking = false;
      this.#setSendDisabled(false);
      document.getElementById('ai-input').focus();
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  static #showWelcome() {
    this.#appendMsg('assistant',
      '안녕하세요! AI 비서 **ARIA**입니다.\n\n아래 버튼으로 빠르게 분석하거나,\n궁금한 점을 직접 입력해 보세요 ✦');
  }

  static #appendMsg(role, text) {
    const msgs = document.getElementById('ai-msgs');
    const div  = document.createElement('div');
    div.className = `ai-msg ai-msg--${role}`;
    div.innerHTML = `<div class="ai-bubble">${
      role === 'user' ? this.#esc(text) : this.#md(text)
    }</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  static #appendLoading(id) {
    const msgs = document.getElementById('ai-msgs');
    const div  = document.createElement('div');
    div.id = id;
    div.className = 'ai-msg ai-msg--assistant';
    div.innerHTML = `<div class="ai-bubble ai-bubble--loading">
      <span></span><span></span><span></span></div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  static #setSendDisabled(v) {
    const btn   = document.getElementById('ai-send');
    const input = document.getElementById('ai-input');
    if (btn)   btn.disabled   = v;
    if (input) input.disabled = v;
  }

  // Minimal markdown → safe HTML
  static #md(raw) {
    return this.#esc(raw)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^[•\-]\s/gm, '<span class="ai-li">•</span> ')
      .replace(/\n/g, '<br>');
  }

  static #esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Event binding ──────────────────────────────────────────────────────────

  static #bindFab() {
    document.getElementById('ai-fab').addEventListener('click', () => {
      const panel = document.getElementById('ai-panel');
      if (panel.classList.contains('hidden')) this.openPanel();
      else this.closePanel();
    });
  }

  static #bindPanel() {
    // Close button
    document.getElementById('close-ai-panel').addEventListener('click', () =>
      this.closePanel()
    );

    // API key save
    document.getElementById('ai-key-save').addEventListener('click', () => {
      const val = document.getElementById('ai-key-input').value.trim();
      if (!val.startsWith('sk-ant-')) {
        alert('올바른 Anthropic API 키를 입력해주세요.\n(sk-ant-로 시작해야 합니다)');
        return;
      }
      localStorage.setItem(this.#KEY_LOC, val);
      document.getElementById('ai-key-setup').classList.add('hidden');
      document.getElementById('ai-chat-area').classList.remove('hidden');
      if (!this.#history.length) this.#showWelcome();
    });

    // API key input: Enter key
    document.getElementById('ai-key-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('ai-key-save').click();
    });

    // Change API key button
    document.getElementById('ai-key-change').addEventListener('click', () => {
      document.getElementById('ai-key-setup').classList.remove('hidden');
      document.getElementById('ai-chat-area').classList.add('hidden');
      document.getElementById('ai-key-input').value = '';
    });

    // Clear history
    document.getElementById('ai-clear-btn').addEventListener('click', () => {
      if (this.#thinking) return;
      this.#history = [];
      document.getElementById('ai-msgs').innerHTML = '';
      this.#showWelcome();
    });

    // Quick action buttons
    document.querySelectorAll('.ai-qa-btn').forEach(btn =>
      btn.addEventListener('click', () => this.runQuickAction(btn.dataset.action))
    );

    // Send
    const input  = document.getElementById('ai-input');
    const sendFn = () => this.#sendChat(input.value);
    document.getElementById('ai-send').addEventListener('click', sendFn);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFn(); }
    });
  }
}
