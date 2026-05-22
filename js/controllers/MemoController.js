// Controller — Memo
// Post-it style notes stored in localStorage. No DB dependency.
class MemoController {
  static #KEY = 'ts_memos';
  static #COLORS = [
    { id: 'yellow', bg: '#fef9c3', border: '#fde047' },
    { id: 'pink',   bg: '#fce7f3', border: '#f9a8d4' },
    { id: 'green',  bg: '#dcfce7', border: '#86efac' },
    { id: 'blue',   bg: '#dbeafe', border: '#93c5fd' },
    { id: 'purple', bg: '#ede9fe', border: '#c4b5fd' },
    { id: 'orange', bg: '#ffedd5', border: '#fdba74' },
    { id: 'white',  bg: '#f8fafc', border: '#cbd5e1' },
  ];
  static #dragSrcId = null;
  static #bound = false;

  static init() {
    if (!this.#bound) {
      document.getElementById('memo-add-btn')
        .addEventListener('click', () => this.#addMemo());
      this.#bound = true;
    }
    this.#render();
  }

  // ---------- storage ----------

  static #load() {
    try { return JSON.parse(localStorage.getItem(this.#KEY)) || []; }
    catch { return []; }
  }

  static #save(list) {
    localStorage.setItem(this.#KEY, JSON.stringify(list));
  }

  // ---------- actions ----------

  static #addMemo() {
    const list = this.#load();
    const id = Date.now().toString();
    list.unshift({ id, text: '', color: 'yellow', createdAt: new Date().toISOString() });
    this.#save(list);
    this.#render();
    setTimeout(() => {
      document.querySelector(`[data-memo-id="${id}"] .memo-textarea`)?.focus();
    }, 30);
  }

  // ---------- render ----------

  static #render() {
    const board = document.getElementById('memo-board');
    const list  = this.#load();
    board.innerHTML = '';

    if (!list.length) {
      board.innerHTML = `
        <div class="memo-empty">
          <i class="fas fa-sticky-note"></i>
          <p>메모가 없습니다</p>
          <p class="memo-empty-sub">위 버튼으로 새 포스트잇을 추가해보세요</p>
        </div>`;
      return;
    }

    list.forEach(memo => board.appendChild(this.#buildNote(memo)));
  }

  static #buildNote(memo) {
    const col = this.#COLORS.find(c => c.id === memo.color) || this.#COLORS[0];
    const el  = document.createElement('div');
    el.className = 'memo-note';
    // draggable은 핸들에만 — 전체에 두면 textarea 입력/선택이 방해됨
    el.dataset.memoId = memo.id;
    el.style.setProperty('--note-bg',     col.bg);
    el.style.setProperty('--note-border', col.border);
    el.style.height = (memo.height || 200) + 'px';

    el.innerHTML = `
      <div class="memo-note-top">
        <span class="memo-drag-handle" draggable="true" title="드래그로 순서 변경">
          <i class="fas fa-grip-vertical"></i>
        </span>
        <button class="memo-pin-btn" title="맨 위로 이동">
          <i class="fas fa-thumbtack"></i>
        </button>
        <button class="memo-del-btn" title="삭제">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <textarea class="memo-textarea" placeholder="메모를 입력하세요..."></textarea>
      <div class="memo-note-footer">
        <div class="memo-colors">
          ${this.#COLORS.map(c =>
            `<button class="memo-color-dot${memo.color === c.id ? ' active' : ''}"
                     data-color="${c.id}"
                     style="--dot-bg:${c.bg};--dot-border:${c.border}"
                     title="${c.id}"></button>`
          ).join('')}
        </div>
        <span class="memo-date">${this.#fmtDate(memo.createdAt)}</span>
      </div>
      <div class="memo-resize-handle" title="드래그로 크기 조절"></div>`;

    // Set text safely (avoids HTML entity issues in textarea)
    el.querySelector('.memo-textarea').value = memo.text;

    // Auto-save on input
    el.querySelector('.memo-textarea').addEventListener('input', e => {
      const list = this.#load();
      const m = list.find(m => m.id === memo.id);
      if (m) { m.text = e.target.value; this.#save(list); }
    });

    // Color change
    el.querySelectorAll('.memo-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const list = this.#load();
        const m = list.find(m => m.id === memo.id);
        if (m) { m.color = dot.dataset.color; this.#save(list); this.#render(); }
      });
    });

    // Pin to top
    el.querySelector('.memo-pin-btn').addEventListener('click', () => {
      const list = this.#load();
      const idx = list.findIndex(m => m.id === memo.id);
      if (idx > 0) {
        const [item] = list.splice(idx, 1);
        list.unshift(item);
        this.#save(list);
        this.#render();
      }
    });

    // Delete
    el.querySelector('.memo-del-btn').addEventListener('click', () => {
      if (!confirm('이 메모를 삭제하시겠습니까?')) return;
      const list = this.#load().filter(m => m.id !== memo.id);
      this.#save(list);
      this.#render();
    });

    // Resize
    this.#bindResize(el, memo);

    // ---------- drag & drop ----------
    // dragstart/dragend는 핸들에만 → textarea 입력이 방해받지 않음

    const handle   = el.querySelector('.memo-drag-handle');
    const textarea = el.querySelector('.memo-textarea');

    // 텍스트 선택/입력 시 부모 drag 이벤트가 간섭하지 않도록 차단
    textarea.addEventListener('mousedown', e => e.stopPropagation());
    textarea.addEventListener('keydown',   e => e.stopPropagation());

    handle.addEventListener('dragstart', e => {
      this.#dragSrcId = memo.id;
      el.classList.add('memo-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', memo.id); // Firefox 필수
    });

    handle.addEventListener('dragend', () => {
      el.classList.remove('memo-dragging');
      document.querySelectorAll('.memo-note')
        .forEach(n => n.classList.remove('memo-drag-over'));
    });

    // 드롭 대상 이벤트는 노트 전체에 유지
    el.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (memo.id !== this.#dragSrcId) el.classList.add('memo-drag-over');
    });

    el.addEventListener('dragleave', e => {
      if (!el.contains(e.relatedTarget)) el.classList.remove('memo-drag-over');
    });

    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('memo-drag-over');
      if (!this.#dragSrcId || this.#dragSrcId === memo.id) return;

      const list = this.#load();
      const si = list.findIndex(m => m.id === this.#dragSrcId);
      const di = list.findIndex(m => m.id === memo.id);
      if (si === -1 || di === -1) return;
      const [item] = list.splice(si, 1);
      list.splice(di, 0, item);
      this.#save(list);
      this.#render();
    });

    return el;
  }

  static #bindResize(el, memo) {
    const handle = el.querySelector('.memo-resize-handle');

    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation(); // prevent note drag-to-reorder

      const startY = e.clientY;
      const startH = el.offsetHeight;

      el.classList.add('memo-resizing');
      document.body.style.cursor = 'ns-resize';

      const onMove = e => {
        const newH = Math.max(140, startH + e.clientY - startY);
        el.style.height = newH + 'px';
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        el.classList.remove('memo-resizing');
        document.body.style.cursor = '';

        const list = this.#load();
        const m = list.find(m => m.id === memo.id);
        if (m) { m.height = el.offsetHeight; this.#save(list); }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });
  }

  static #fmtDate(iso) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}
