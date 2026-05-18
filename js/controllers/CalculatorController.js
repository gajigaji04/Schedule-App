// Controller — Calculator
// 공학용 / 부가세 / 연봉 실수령액 / 대출 이자 계산기
class CalculatorController {
  static #bound = false;

  static #sci = {
    display: '0',
    operator: null,
    operand: null,
    replace: true,
    expr: '',
    is2nd: false,
    angleMode: 'deg',
    memory: 0,
    lastOp: null,   // 연속 = 지원
    lastB: null,
  };

  static #LABELS = {
    sin:  { n: 'sin',  s: 'sin⁻¹' },
    cos:  { n: 'cos',  s: 'cos⁻¹' },
    tan:  { n: 'tan',  s: 'tan⁻¹' },
    ln:   { n: 'ln',   s: 'eˣ'    },
    log:  { n: 'log',  s: '10ˣ'   },
    sq:   { n: 'x²',   s: '√x'    },
    sqrt: { n: '√x',   s: '∛x'    },
    pow:  { n: 'xʸ',   s: 'ʸ√x'   },
  };

  // 삼각함수 세트
  static #TRIG_FWD  = new Set(['sin', 'cos', 'tan']);
  static #TRIG_INV  = new Set(['asin', 'acos', 'atan']);

  static init() {
    if (!this.#bound) {
      this.#bindTabs();
      this.#bindSci();
      this.#bindVat();
      this.#bindSalary();
      this.#bindLoan();
      this.#bound = true;
    }
  }

  // ──────────── 탭 ────────────

  static #bindTabs() {
    document.querySelectorAll('.calc-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.calc-panel').forEach(p => p.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(`calc-${tab.dataset.calc}`).classList.remove('hidden');
      });
    });
  }

  // ──────────── 공학용 계산기 ────────────

  static #bindSci() {
    document.querySelector('.sci-calc-btns').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      this.#sciInput(btn.dataset);
    });

    // 결과 클릭 → 클립보드 복사
    document.getElementById('gen-display').addEventListener('click', () => {
      const g = this.#sci;
      const num = parseFloat(g.display);
      if (!isFinite(num) || isNaN(num)) return;
      const text = num.toLocaleString('ko-KR');
      navigator.clipboard?.writeText(text)
        .then(() => this.#showCopyToast())
        .catch(() => this.#showCopyToast()); // 실패해도 동일하게 피드백
    });

    document.addEventListener('keydown', e => {
      if (document.getElementById('calc-general').classList.contains('hidden')) return;
      const keyMap = {
        '0':'num','1':'num','2':'num','3':'num','4':'num',
        '5':'num','6':'num','7':'num','8':'num','9':'num',
        '.':'dot', 'Enter':'equals', '=':'equals',
        'Escape':'clear', 'Backspace':'backspace', '%':'percent',
        '+':'op', '-':'op', '*':'op', '/':'op',
      };
      const action = keyMap[e.key];
      if (!action) return;
      e.preventDefault();
      const opMap = { '+':'+', '-':'-', '*':'*', '/':'/' };
      this.#sciInput({ action, val: e.key, op: opMap[e.key] });
    });
  }

  static #sciInput(ds) {
    const g = this.#sci;

    switch (ds.action) {
      case 'num':
        if (g.replace) {
          g.display = ds.val === '0' ? '0' : ds.val;
          g.replace = false;
        } else {
          if (g.display === '0' && ds.val !== '.') g.display = ds.val;
          else if (g.display.replace(/[^0-9]/g, '').length < 15) g.display += ds.val;
        }
        break;

      case 'dot':
        if (g.replace) { g.display = '0.'; g.replace = false; break; }
        if (!g.display.includes('.')) g.display += '.';
        break;

      case 'backspace':
        if (!g.replace) {
          g.display = g.display.length > 1 ? g.display.slice(0, -1) : '0';
          if (g.display === '-') g.display = '0';
        }
        break;

      case 'clear':
        Object.assign(g, {
          display:'0', operator:null, operand:null,
          replace:true, expr:'', lastOp:null, lastB:null,
        });
        g.is2nd = false;
        this.#syncLabels();
        break;

      case 'sign':
        if (g.display !== '0')
          g.display = g.display.startsWith('-') ? g.display.slice(1) : '-' + g.display;
        break;

      case 'percent':
        g.display = this.#numStr(parseFloat(g.display) / 100);
        g.replace = true;
        break;

      case 'op': {
        if (g.operator && !g.replace)
          g.display = this.#numStr(this.#compute(parseFloat(g.operand), g.operator, parseFloat(g.display)));
        g.operand  = g.display;
        g.operator = ds.op;
        g.expr     = `${this.#exprFmt(g.display)} ${this.#opSym(ds.op)}`;
        g.replace  = true;
        g.lastOp   = null; // 새 연산 시작 → 반복 = 초기화
        g.lastB    = null;
        break;
      }

      case 'equals': {
        let op, a, b;
        if (g.operator) {
          // 첫 번째 = : 현재 연산자/피연산자로 계산 후 저장
          op = g.operator;
          a  = parseFloat(g.operand);
          b  = parseFloat(g.display);
          g.lastOp   = op;
          g.lastB    = g.display;
          g.operator = null;
          g.operand  = null;
        } else if (g.lastOp !== null) {
          // 연속 = : 저장된 마지막 연산 반복
          op = g.lastOp;
          a  = parseFloat(g.display);
          b  = parseFloat(g.lastB);
        } else {
          break;
        }
        const res = this.#compute(a, op, b);
        g.expr    = `${this.#exprFmt(String(a))} ${this.#opSym(op)} ${this.#exprFmt(g.lastB)} =`;
        g.display = this.#numStr(res);
        g.replace = true;
        break;
      }

      case 'sci': {
        const fn = g.is2nd && ds.fn2 ? ds.fn2 : ds.fn;

        if (fn === 'pow' || fn === 'root') {
          // 이항 연산자로 처리
          if (g.operator && !g.replace)
            g.display = this.#numStr(this.#compute(parseFloat(g.operand), g.operator, parseFloat(g.display)));
          g.operand  = g.display;
          g.operator = fn;
          g.expr     = fn === 'pow'
            ? `${this.#exprFmt(g.display)} ^`
            : `ʸ√(${this.#exprFmt(g.display)})`;
          g.replace  = true;
          g.lastOp   = null;
          g.lastB    = null;
        } else {
          // 단항 함수 즉시 적용
          const x   = parseFloat(g.display);
          const res = this.#applyFn(fn, x);
          const lbl = this.#LABELS[ds.fn]
            ? (g.is2nd ? this.#LABELS[ds.fn].s : this.#LABELS[ds.fn].n)
            : fn;

          // 삼각함수에 각도 단위 표시
          const angleUnit = this.#TRIG_FWD.has(fn)
            ? (g.angleMode === 'deg' ? '°' : ' rad')
            : '';
          g.expr    = `${lbl}(${this.#exprFmt(g.display)}${angleUnit})`;
          g.display = this.#numStr(res);
          g.replace = true;
        }
        g.is2nd = false;
        this.#syncLabels();
        break;
      }

      case 'const': {
        const MAP = { PI: Math.PI, E: Math.E };
        g.display = this.#numStr(MAP[ds.val]);
        g.replace = true;
        break;
      }

      case 'toggle2nd':
        g.is2nd = !g.is2nd;
        this.#syncLabels();
        break;

      case 'toggle-angle':
        g.angleMode = g.angleMode === 'deg' ? 'rad' : 'deg';
        document.querySelector('[data-action="toggle-angle"]').textContent = g.angleMode.toUpperCase();
        document.getElementById('sci-mode-badge').textContent = g.angleMode.toUpperCase();
        break;

      case 'mem': {
        const mv = parseFloat(g.display);
        if      (ds.m === 'mc')     g.memory = 0;
        else if (ds.m === 'mr')   { g.display = this.#numStr(g.memory); g.replace = true; }
        else if (ds.m === 'ms')     g.memory += mv;
        else if (ds.m === 'mminus') g.memory -= mv;
        document.getElementById('sci-memory-badge')?.classList.toggle('hidden', g.memory === 0);
        break;
      }
    }

    document.querySelectorAll('.scb-op').forEach(b =>
      b.classList.toggle('active-op', b.dataset.op === g.operator && g.replace));
    document.querySelector('.scb-2nd')?.classList.toggle('active-2nd', g.is2nd);

    this.#sciRender();
  }

  static #applyFn(fn, x) {
    const g = this.#sci;
    const toRad   = v => g.angleMode === 'deg' ? v * Math.PI / 180 : v;
    const fromRad = v => g.angleMode === 'deg' ? v * 180 / Math.PI : v;
    switch (fn) {
      case 'sin':   return Math.sin(toRad(x));
      case 'cos':   return Math.cos(toRad(x));
      case 'tan':   return Math.tan(toRad(x));
      case 'asin':  return fromRad(Math.asin(x));
      case 'acos':  return fromRad(Math.acos(x));
      case 'atan':  return fromRad(Math.atan(x));
      case 'ln':    return Math.log(x);
      case 'log':   return Math.log10(x);
      case 'exp':   return Math.exp(x);
      case 'pow10': return Math.pow(10, x);
      case 'sq':    return x * x;
      case 'sqrt':  return Math.sqrt(x);
      case 'cbrt':  return Math.cbrt(x);
      case 'fact':  return this.#fact(x);
      case 'inv':   return x === 0 ? Infinity : 1 / x;
      case 'abs':   return Math.abs(x);
      default:      return x;
    }
  }

  static #fact(n) {
    n = Math.round(n);
    if (n < 0 || n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  static #syncLabels() {
    const g = this.#sci;
    document.querySelectorAll('[data-fn]').forEach(btn => {
      const entry = this.#LABELS[btn.dataset.fn];
      if (entry) btn.textContent = g.is2nd ? entry.s : entry.n;
    });
    document.querySelector('.scb-2nd')?.classList.toggle('active-2nd', g.is2nd);
  }

  static #sciRender() {
    const g   = this.#sci;
    const el  = document.getElementById('gen-display');
    const exEl= document.getElementById('gen-expr');
    const num = parseFloat(g.display);

    if (!isFinite(num) || isNaN(num)) {
      el.textContent = '오류';
      el.style.fontSize = '2rem';
      exEl.textContent = g.expr;
      return;
    }

    let text;
    if (Math.abs(num) >= 1e15 || (Math.abs(num) < 1e-9 && num !== 0)) {
      text = num.toExponential(8);
    } else if (g.display.endsWith('.')) {
      text = num.toLocaleString('ko-KR') + '.';
    } else if (g.display.includes('.')) {
      const dec = g.display.split('.')[1].length;
      text = num.toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    } else {
      text = num.toLocaleString('ko-KR');
    }

    el.textContent   = text;
    exEl.textContent = g.expr;

    const len = text.replace(/[^0-9]/g, '').length;
    el.style.fontSize = len > 13 ? '1rem' : len > 10 ? '1.4rem' : len > 7 ? '1.9rem' : '2.4rem';
  }

  static #showCopyToast() {
    let toast = document.getElementById('sci-copy-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'sci-copy-toast';
      toast.className = 'sci-copy-toast';
      toast.innerHTML = '<i class="fas fa-copy"></i> 복사됨';
      document.body.appendChild(toast);
    }
    toast.classList.remove('sci-toast-out');
    toast.classList.add('sci-toast-in');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.replace('sci-toast-in', 'sci-toast-out');
    }, 1400);
  }

  static #compute(a, op, b) {
    switch (op) {
      case '+':    return a + b;
      case '-':    return a - b;
      case '*':    return a * b;
      case '/':    return b === 0 ? Infinity : a / b;
      case 'pow':  return Math.pow(a, b);
      case 'root': return Math.pow(a, 1 / b);
      default:     return b;
    }
  }

  static #numStr(num) {
    if (isNaN(num)) return 'NaN';
    if (!isFinite(num)) return 'Infinity';
    const r = Math.round(num * 1e10) / 1e10;
    const s = String(r);
    return s.length > 16 ? num.toPrecision(10) : s;
  }

  static #exprFmt(s) {
    const n = parseFloat(s);
    if (!isFinite(n) || isNaN(n)) return s;
    return n.toLocaleString('ko-KR', { maximumFractionDigits: 8 });
  }

  static #opSym(op) {
    return { '+':'+', '-':'−', '*':'×', '/':'÷', 'pow':'^', 'root':'ʸ√' }[op] ?? op;
  }

  // ──────────── 부가세 ────────────

  static #bindVat() {
    let mode = 'add';

    document.getElementById('vat-mode-add').addEventListener('click', () => {
      mode = 'add';
      document.getElementById('vat-mode-add').classList.add('active');
      document.getElementById('vat-mode-extract').classList.remove('active');
      document.getElementById('vat-input-label').textContent = '공급가액 (원)';
    });

    document.getElementById('vat-mode-extract').addEventListener('click', () => {
      mode = 'extract';
      document.getElementById('vat-mode-extract').classList.add('active');
      document.getElementById('vat-mode-add').classList.remove('active');
      document.getElementById('vat-input-label').textContent = '공급대가 (원, 부가세 포함)';
    });

    document.getElementById('vat-calc-btn').addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('vat-amount').value);
      const rate   = parseFloat(document.getElementById('vat-rate').value);
      const el     = document.getElementById('vat-result');

      if (!amount || amount <= 0) {
        el.innerHTML = `<p style="color:var(--red-500)">유효한 금액을 입력하세요.</p>`;
        return;
      }

      let supplyAmt, vatAmt, totalAmt;
      if (mode === 'add') {
        supplyAmt = Math.round(amount);
        vatAmt    = Math.round(amount * rate);
        totalAmt  = supplyAmt + vatAmt;
      } else {
        totalAmt  = Math.round(amount);
        supplyAmt = Math.round(amount / (1 + rate));
        vatAmt    = totalAmt - supplyAmt;
      }

      el.innerHTML = `
        <div class="calc-result-rows">
          <div class="calc-row">
            <span class="calc-row-label">공급가액</span>
            <span class="calc-row-value">${this.#fmt(supplyAmt)} 원</span>
          </div>
          <div class="calc-row highlight">
            <span class="calc-row-label">부가세 (${rate * 100}%)</span>
            <span class="calc-row-value accent">${this.#fmt(vatAmt)} 원</span>
          </div>
          <div class="calc-row total">
            <span class="calc-row-label">공급대가 (합계)</span>
            <span class="calc-row-value">${this.#fmt(totalAmt)} 원</span>
          </div>
        </div>`;
    });
  }

  // ──────────── 연봉 실수령액 ────────────

  static #bindSalary() {
    let mealIncluded = true;

    document.getElementById('meal-yes').addEventListener('click', () => {
      mealIncluded = true;
      document.getElementById('meal-yes').classList.add('active');
      document.getElementById('meal-no').classList.remove('active');
    });
    document.getElementById('meal-no').addEventListener('click', () => {
      mealIncluded = false;
      document.getElementById('meal-no').classList.add('active');
      document.getElementById('meal-yes').classList.remove('active');
    });

    document.getElementById('salary-calc-btn').addEventListener('click', () => {
      const annual     = parseFloat(document.getElementById('salary-annual').value);
      const dependents = parseInt(document.getElementById('salary-dependents').value);
      const mealAmt    = mealIncluded ? 200000 : 0;
      const el         = document.getElementById('salary-result');

      if (!annual || annual <= 0) {
        el.innerHTML = `<p style="color:var(--red-500)">유효한 연봉을 입력하세요.</p>`;
        return;
      }

      const r = this.#calcSalary(annual, dependents, mealAmt);
      el.innerHTML = `
        <div class="calc-result-rows">
          <div class="calc-row">
            <span class="calc-row-label">월 세전 급여</span>
            <span class="calc-row-value">${this.#fmt(Math.round(annual / 12))} 원</span>
          </div>
          <div class="calc-row sub">
            <span class="calc-row-label">국민연금 (4.5%)</span>
            <span class="calc-row-value minus">−${this.#fmt(r.pension)} 원</span>
          </div>
          <div class="calc-row sub">
            <span class="calc-row-label">건강보험 (3.545%)</span>
            <span class="calc-row-value minus">−${this.#fmt(r.health)} 원</span>
          </div>
          <div class="calc-row sub">
            <span class="calc-row-label">장기요양 (건보×12.95%)</span>
            <span class="calc-row-value minus">−${this.#fmt(r.ltcare)} 원</span>
          </div>
          <div class="calc-row sub">
            <span class="calc-row-label">고용보험 (0.9%)</span>
            <span class="calc-row-value minus">−${this.#fmt(r.employment)} 원</span>
          </div>
          <div class="calc-row sub">
            <span class="calc-row-label">소득세 (근사치)</span>
            <span class="calc-row-value minus">−${this.#fmt(r.incomeTax)} 원</span>
          </div>
          <div class="calc-row sub">
            <span class="calc-row-label">지방소득세 (소득세×10%)</span>
            <span class="calc-row-value minus">−${this.#fmt(r.localTax)} 원</span>
          </div>
          <div class="calc-row total">
            <span class="calc-row-label">월 실수령액</span>
            <span class="calc-row-value accent">${this.#fmt(r.takeHome)} 원</span>
          </div>
          <div class="calc-row highlight">
            <span class="calc-row-label">월 총 공제액</span>
            <span class="calc-row-value minus">−${this.#fmt(r.totalDeduction)} 원</span>
          </div>
          <div class="calc-row">
            <span class="calc-row-label">연간 실수령액</span>
            <span class="calc-row-value">${this.#fmt(r.takeHome * 12)} 원</span>
          </div>
          <div class="calc-row">
            <span class="calc-row-label">실효 세율 (소득·지방세)</span>
            <span class="calc-row-value">${((r.incomeTax + r.localTax) / Math.round(annual / 12) * 100).toFixed(2)}%</span>
          </div>
        </div>`;
    });
  }

  static #calcSalary(annual, dependents, mealAllowance) {
    const monthly        = Math.round(annual / 12);
    const monthlyTaxBase = monthly - mealAllowance;

    const pension    = Math.min(Math.round(monthly * 0.045), 265500);
    const health     = Math.round(monthly * 0.03545);
    const ltcare     = Math.round(health * 0.1295);
    const employment = Math.round(monthly * 0.009);

    const annualGross = monthlyTaxBase * 12;
    let earnedDed;
    if      (annualGross <= 5_000_000)   earnedDed = annualGross * 0.70;
    else if (annualGross <= 15_000_000)  earnedDed = 3_500_000 + (annualGross - 5_000_000) * 0.40;
    else if (annualGross <= 45_000_000)  earnedDed = 7_500_000 + (annualGross - 15_000_000) * 0.15;
    else if (annualGross <= 100_000_000) earnedDed = 12_000_000 + (annualGross - 45_000_000) * 0.05;
    else earnedDed = Math.min(14_250_000 + (annualGross - 100_000_000) * 0.02, 20_000_000);

    const taxBase = Math.max(0, annualGross - earnedDed - 1_500_000 * dependents);
    let annualTax;
    if      (taxBase <= 14_000_000)  annualTax = taxBase * 0.06;
    else if (taxBase <= 50_000_000)  annualTax = 840_000    + (taxBase - 14_000_000) * 0.15;
    else if (taxBase <= 88_000_000)  annualTax = 6_240_000  + (taxBase - 50_000_000) * 0.24;
    else if (taxBase <= 150_000_000) annualTax = 15_360_000 + (taxBase - 88_000_000) * 0.35;
    else if (taxBase <= 300_000_000) annualTax = 37_060_000 + (taxBase - 150_000_000) * 0.38;
    else if (taxBase <= 500_000_000) annualTax = 94_060_000 + (taxBase - 300_000_000) * 0.40;
    else                             annualTax = 174_060_000 + (taxBase - 500_000_000) * 0.42;

    let credit = annualTax <= 1_300_000 ? annualTax * 0.55 : 715_000 + (annualTax - 1_300_000) * 0.30;
    const creditLimit = annual <= 33_000_000 ? 740_000
      : annual <= 70_000_000 ? Math.max(660_000, 740_000 - (annual - 33_000_000) * 0.008)
      : 500_000;
    credit = Math.min(credit, creditLimit);

    const incomeTax      = Math.round(Math.max(0, annualTax - credit) / 12 / 10) * 10;
    const localTax       = Math.round(incomeTax * 0.1 / 10) * 10;
    const totalDeduction = pension + health + ltcare + employment + incomeTax + localTax;
    const takeHome       = monthly - totalDeduction;

    return { pension, health, ltcare, employment, incomeTax, localTax, totalDeduction, takeHome };
  }

  // ──────────── 대출 이자 ────────────

  static #bindLoan() {
    document.getElementById('loan-calc-btn').addEventListener('click', () => {
      const principal  = parseFloat(document.getElementById('loan-amount').value);
      const annualRate = parseFloat(document.getElementById('loan-rate').value);
      const months     = parseInt(document.getElementById('loan-months').value);
      const type       = document.getElementById('loan-type').value;
      const el         = document.getElementById('loan-result');

      if (!principal || principal <= 0 || isNaN(annualRate) || !months || months <= 0) {
        el.innerHTML = `<p style="color:var(--red-500)">모든 항목을 올바르게 입력하세요.</p>`;
        return;
      }
      el.innerHTML = this.#calcLoan(principal, annualRate, months, type);
    });
  }

  static #calcLoan(principal, annualRate, months, type) {
    const r = annualRate / 100 / 12;
    const periodLabel = `${months}개월 (${Math.floor(months / 12)}년 ${months % 12}개월)`;

    if (type === 'equal-payment') {
      const monthly = r === 0
        ? Math.round(principal / months)
        : Math.round(principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1));
      const total         = monthly * months;
      const totalInterest = total - principal;
      const preview       = this.#loanPreview(principal, r, monthly, 'equal-payment');

      return `<div class="calc-result-rows">
        <div class="calc-row"><span class="calc-row-label">대출 원금</span><span class="calc-row-value">${this.#fmt(principal)} 원</span></div>
        <div class="calc-row total"><span class="calc-row-label">월 상환액 (원리금균등)</span><span class="calc-row-value accent">${this.#fmt(monthly)} 원</span></div>
        <div class="calc-row highlight"><span class="calc-row-label">총 이자</span><span class="calc-row-value minus">${this.#fmt(totalInterest)} 원</span></div>
        <div class="calc-row"><span class="calc-row-label">총 상환액</span><span class="calc-row-value">${this.#fmt(total)} 원</span></div>
        <div class="calc-row"><span class="calc-row-label">대출 기간</span><span class="calc-row-value">${periodLabel}</span></div>
      </div>${preview}`;
    }

    if (type === 'equal-principal') {
      const monthlyPrincipal = Math.round(principal / months);
      let totalInterest = 0, remaining = principal;
      for (let i = 0; i < months; i++) { totalInterest += remaining * r; remaining -= monthlyPrincipal; }
      totalInterest = Math.round(totalInterest);
      const firstPayment = monthlyPrincipal + Math.round(principal * r);
      const lastPayment  = monthlyPrincipal + Math.round(monthlyPrincipal * r);
      const preview      = this.#loanPreview(principal, r, monthlyPrincipal, 'equal-principal');

      return `<div class="calc-result-rows">
        <div class="calc-row"><span class="calc-row-label">대출 원금</span><span class="calc-row-value">${this.#fmt(principal)} 원</span></div>
        <div class="calc-row"><span class="calc-row-label">월 상환 원금 (고정)</span><span class="calc-row-value">${this.#fmt(monthlyPrincipal)} 원</span></div>
        <div class="calc-row total"><span class="calc-row-label">첫 달 납부액</span><span class="calc-row-value accent">${this.#fmt(firstPayment)} 원</span></div>
        <div class="calc-row"><span class="calc-row-label">마지막 달 납부액</span><span class="calc-row-value">${this.#fmt(lastPayment)} 원</span></div>
        <div class="calc-row highlight"><span class="calc-row-label">총 이자</span><span class="calc-row-value minus">${this.#fmt(totalInterest)} 원</span></div>
        <div class="calc-row"><span class="calc-row-label">총 상환액</span><span class="calc-row-value">${this.#fmt(principal + totalInterest)} 원</span></div>
      </div>${preview}`;
    }

    // 만기일시상환
    const monthlyInterest = Math.round(principal * r);
    const totalInterest   = monthlyInterest * months;

    return `<div class="calc-result-rows">
      <div class="calc-row"><span class="calc-row-label">대출 원금</span><span class="calc-row-value">${this.#fmt(principal)} 원</span></div>
      <div class="calc-row total"><span class="calc-row-label">월 이자 납부액</span><span class="calc-row-value accent">${this.#fmt(monthlyInterest)} 원</span></div>
      <div class="calc-row"><span class="calc-row-label">만기 원금 상환</span><span class="calc-row-value">${this.#fmt(principal)} 원</span></div>
      <div class="calc-row highlight"><span class="calc-row-label">총 이자</span><span class="calc-row-value minus">${this.#fmt(totalInterest)} 원</span></div>
      <div class="calc-row"><span class="calc-row-label">총 지출액</span><span class="calc-row-value">${this.#fmt(principal + totalInterest)} 원</span></div>
    </div>`;
  }

  // 첫 3개월 납부 내역 미리보기
  static #loanPreview(principal, r, basePayment, type) {
    const rows = [];
    let remaining = principal;
    for (let i = 1; i <= 3 && remaining > 0; i++) {
      const interest = Math.round(remaining * r);
      let payment, principal_part;
      if (type === 'equal-payment') {
        payment = basePayment;
        principal_part = payment - interest;
      } else {
        principal_part = basePayment;
        payment = principal_part + interest;
      }
      remaining = Math.max(0, remaining - principal_part);
      rows.push(`
        <tr>
          <td>${i}회차</td>
          <td>${this.#fmt(payment)}</td>
          <td>${this.#fmt(principal_part)}</td>
          <td>${this.#fmt(interest)}</td>
          <td>${this.#fmt(remaining)}</td>
        </tr>`);
    }
    return `
      <div class="loan-preview">
        <p class="loan-preview-title">첫 3개월 납부 내역</p>
        <table class="loan-table">
          <thead><tr><th>회차</th><th>납부액</th><th>원금</th><th>이자</th><th>잔액</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>`;
  }

  // ──────────── 유틸 ────────────

  static #fmt(num) {
    return Math.round(num).toLocaleString('ko-KR');
  }
}
