// DatePicker — custom calendar popup for date inputs
// Usage: new DatePicker({ wrapperId, inputId, placeholder, clearable })
class DatePicker {
  static #registry = [];

  #wrap; #input; #trigger; #display; #popup;
  #prevBtn; #nextBtn; #label; #daysGrid; #clearBtn;
  #viewing; #selected; #placeholder;

  constructor({ wrapperId, inputId, placeholder = '날짜 선택', clearable = false }) {
    this.#wrap     = document.getElementById(wrapperId);
    this.#input    = document.getElementById(inputId);
    this.#trigger  = this.#wrap.querySelector('.dp-trigger');
    this.#display  = this.#wrap.querySelector('.dp-display');
    this.#popup    = this.#wrap.querySelector('.dp-popup');
    this.#prevBtn  = this.#wrap.querySelector('.dp-prev');
    this.#nextBtn  = this.#wrap.querySelector('.dp-next');
    this.#label    = this.#wrap.querySelector('.dp-label');
    this.#daysGrid = this.#wrap.querySelector('.dp-days');
    this.#clearBtn = clearable ? this.#wrap.querySelector('.dp-clear-btn') : null;
    this.#placeholder = placeholder;
    this.#viewing  = new Date();
    this.#selected = null;

    this.#renderGrid();
    this.#bind();
    DatePicker.#registry.push(this);
  }

  get inputId() { return this.#input.id; }

  getValue() { return this.#input.value; }

  setValue(ymd) {
    if (ymd) {
      this.#selected    = new Date(ymd + 'T00:00:00');
      this.#viewing     = new Date(ymd + 'T00:00:00');
      this.#input.value = ymd;
      this.#display.textContent = this.#fmt(this.#selected);
      this.#display.classList.remove('dp-placeholder');
    } else {
      this.#selected    = null;
      this.#input.value = '';
      this.#display.textContent = this.#placeholder;
      this.#display.classList.add('dp-placeholder');
    }
    this.#renderGrid();
  }

  // ---------- private ----------

  #fmt(d) {
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  #toYMD(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  #renderGrid() {
    const y = this.#viewing.getFullYear();
    const m = this.#viewing.getMonth();
    const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    this.#label.textContent = `${y}년 ${MONTHS[m]}`;

    const firstDay    = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays    = new Date(y, m, 0).getDate();
    const todayStr    = this.#toYMD(new Date());
    const selStr      = this.#selected ? this.#toYMD(this.#selected) : '';

    let html = '';

    // Leading days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i;
      html += `<button type="button" class="dp-day dp-other" data-ymd="${this.#toYMD(new Date(y, m - 1, d))}">${d}</button>`;
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = this.#toYMD(new Date(y, m, d));
      let cls = 'dp-day';
      if (ymd === todayStr) cls += ' dp-today';
      if (ymd === selStr)   cls += ' dp-sel';
      html += `<button type="button" class="${cls}" data-ymd="${ymd}">${d}</button>`;
    }
    // Trailing days from next month
    const total     = firstDay + daysInMonth;
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= remaining; d++) {
      html += `<button type="button" class="dp-day dp-other" data-ymd="${this.#toYMD(new Date(y, m + 1, d))}">${d}</button>`;
    }

    this.#daysGrid.innerHTML = html;

    this.#daysGrid.querySelectorAll('.dp-day').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const ymd = btn.dataset.ymd;
        this.#selected    = new Date(ymd + 'T00:00:00');
        this.#viewing     = new Date(this.#selected);
        this.#input.value = ymd;
        this.#display.textContent = this.#fmt(this.#selected);
        this.#display.classList.remove('dp-placeholder');
        this.#renderGrid();
        this.#close();
      });
    });
  }

  #open() {
    DatePicker.closeAll();
    this.#popup.classList.remove('hidden');
    this.#trigger.classList.add('dp-open');
  }

  #close() {
    this.#popup.classList.add('hidden');
    this.#trigger.classList.remove('dp-open');
  }

  #bind() {
    this.#trigger.addEventListener('click', e => {
      e.stopPropagation();
      this.#popup.classList.contains('hidden') ? this.#open() : this.#close();
    });
    this.#prevBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.#viewing = new Date(this.#viewing.getFullYear(), this.#viewing.getMonth() - 1, 1);
      this.#renderGrid();
    });
    this.#nextBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.#viewing = new Date(this.#viewing.getFullYear(), this.#viewing.getMonth() + 1, 1);
      this.#renderGrid();
    });
    this.#popup.addEventListener('click', e => e.stopPropagation());
    if (this.#clearBtn) {
      this.#clearBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.setValue('');
      });
    }
  }

  // ---------- static ----------

  static closeAll() {
    DatePicker.#registry.forEach(dp => {
      dp.#popup.classList.add('hidden');
      dp.#trigger.classList.remove('dp-open');
    });
  }

  static getByInputId(inputId) {
    return DatePicker.#registry.find(dp => dp.inputId === inputId) || null;
  }

  static clearRegistry() { DatePicker.#registry = []; }
}

document.addEventListener('click', () => DatePicker.closeAll());
