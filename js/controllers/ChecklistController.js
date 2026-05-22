// Controller — To-do Checklist
// Simple personal checklist persisted in localStorage. No templates.
class ChecklistController {

  static #KEY   = 'ts_todo_v1';
  static #bound = false;
  static #state = null; // { items: [{id, text, done}], nextId: number }

  static init() {
    this.#loadState();
    this.#render();
    if (!this.#bound) { this.#bindEvents(); this.#bound = true; }
  }

  // ── State ──────────────────────────────────────────────────────────────────

  static #loadState() {
    try {
      const raw = localStorage.getItem(this.#KEY);
      if (raw) { this.#state = JSON.parse(raw); return; }
    } catch (_) { /* ignore */ }
    this.#state = { items: [], nextId: 1 };
  }

  static #save() {
    localStorage.setItem(this.#KEY, JSON.stringify(this.#state));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  static #render() {
    const { items } = this.#state;
    const done = items.filter(i => i.done).length;

    // Progress
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    document.getElementById('cl-progress-fill').style.width = pct + '%';
    document.getElementById('cl-progress-label').textContent =
      items.length ? `${done} / ${items.length} 완료` : '항목을 추가해보세요';

    // Items
    const ul = document.getElementById('cl-items');
    if (!items.length) {
      ul.innerHTML = `<li class="cl-empty">아직 항목이 없습니다</li>`;
      return;
    }
    ul.innerHTML = items.map(item => `
      <li class="cl-item${item.done ? ' cl-item--done' : ''}" data-id="${item.id}">
        <label class="cl-item-label">
          <input class="cl-checkbox" type="checkbox" ${item.done ? 'checked' : ''} />
          <span class="cl-item-text">${this.#esc(item.text)}</span>
        </label>
        <button class="cl-del-btn" data-id="${item.id}" title="삭제">
          <i class="fas fa-times"></i>
        </button>
      </li>`).join('');
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  static #bindEvents() {
    // Toggle done (delegated)
    document.getElementById('cl-items').addEventListener('change', e => {
      const cb = e.target.closest('.cl-checkbox');
      if (!cb) return;
      const id   = +cb.closest('.cl-item').dataset.id;
      const item = this.#state.items.find(i => i.id === id);
      if (item) { item.done = cb.checked; this.#save(); this.#render(); }
    });

    // Delete (delegated)
    document.getElementById('cl-items').addEventListener('click', e => {
      const btn = e.target.closest('.cl-del-btn');
      if (!btn) return;
      this.#state.items = this.#state.items.filter(i => i.id !== +btn.dataset.id);
      this.#save();
      this.#render();
    });

    // Add
    const addInput = document.getElementById('cl-add-input');
    const doAdd = () => {
      const text = addInput.value.trim();
      if (!text) return;
      this.#state.items.push({ id: this.#state.nextId++, text, done: false });
      addInput.value = '';
      this.#save();
      this.#render();
      document.getElementById('cl-items').lastElementChild
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    document.getElementById('cl-add-btn').addEventListener('click', doAdd);
    addInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });

    // Reset all
    document.getElementById('cl-reset-btn').addEventListener('click', () => {
      if (!this.#state.items.length) return;
      if (!confirm('체크리스트를 전체 초기화할까요?')) return;
      this.#state = { items: [], nextId: 1 };
      this.#save();
      this.#render();
    });
  }

  static #esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
