'use client';
import { useState } from 'react';

/* ══════════════════════════════════════════
   공학 계산기
══════════════════════════════════════════ */
function ScientificCalc() {
  const [expr, setExpr]       = useState('');
  const [result, setResult]   = useState('');
  const [history, setHistory] = useState([]);
  const [deg, setDeg]         = useState(true);
  const [mem, setMem]         = useState(0);

  function evaluate() {
    try {
      const toRad = deg ? (x) => x * Math.PI / 180 : (x) => x;
      const safe = expr
        .replace(/sin\(/g,  'Math.sin(toRad(')
        .replace(/cos\(/g,  'Math.cos(toRad(')
        .replace(/tan\(/g,  'Math.tan(toRad(')
        .replace(/asin\(/g, '(180/Math.PI)*Math.asin(')
        .replace(/acos\(/g, '(180/Math.PI)*Math.acos(')
        .replace(/atan\(/g, '(180/Math.PI)*Math.atan(')
        .replace(/log\(/g,  'Math.log10(')
        .replace(/ln\(/g,   'Math.log(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/abs\(/g,  'Math.abs(')
        .replace(/\^/g,     '**')
        .replace(/π/g,      'Math.PI')
        .replace(/e(?!\d)/g,'Math.E');
      // eslint-disable-next-line no-new-func
      const fn = new Function('toRad', `"use strict"; return (${safe})`);
      const r  = fn(toRad);
      const rs = parseFloat(r.toFixed(10)).toString();
      setHistory(h => [`${expr} = ${rs}`, ...h].slice(0, 15));
      setResult(rs);
      setExpr(rs);
    } catch {
      setResult('오류');
    }
  }

  function press(val) {
    if (val === 'C')    { setExpr(''); setResult(''); return; }
    if (val === 'CE')   { setExpr(e => e.slice(0, -1)); return; }
    if (val === '=')    { evaluate(); return; }
    if (val === 'M+')   { try { const v = parseFloat(expr); if (!isNaN(v)) setMem(m => m + v); } catch {} return; }
    if (val === 'M-')   { try { const v = parseFloat(expr); if (!isNaN(v)) setMem(m => m - v); } catch {} return; }
    if (val === 'MR')   { setExpr(e => e + mem.toString()); return; }
    if (val === 'MC')   { setMem(0); return; }
    if (val === 'x²')   { setExpr(e => e + '**2'); return; }
    if (val === 'x³')   { setExpr(e => e + '**3'); return; }
    if (val === '1/x')  { setExpr(e => `1/(${e})`); return; }
    if (val === '%')    { setExpr(e => e + '/100'); return; }
    if (val === '÷')    { setExpr(e => e + '/'); return; }
    if (val === '×')    { setExpr(e => e + '*'); return; }
    if (val === '−')    { setExpr(e => e + '-'); return; }
    if (val === '+/-')  { setExpr(e => e ? (e.startsWith('-') ? e.slice(1) : '-' + e) : ''); return; }
    setExpr(e => e + val);
  }

  // Layout: 4 rows of memory/scientific, then main numpad
  const SCI_ROWS = [
    ['sin(', 'cos(', 'tan(', 'asin(', 'acos(', 'atan('],
    ['log(', 'ln(', 'sqrt(', 'abs(', 'x²', 'x³'],
    ['π', 'e', '^', '(', ')', '1/x'],
    ['M+', 'M-', 'MR', 'MC', '%', '+/-'],
  ];
  const NUM_ROWS = [
    ['7', '8', '9', '÷', 'C'],
    ['4', '5', '6', '×', 'CE'],
    ['1', '2', '3', '−', ''],
    ['0', '.', '00', '+', '='],
  ];

  const isOp = (v) => ['÷', '×', '−', '+', '=', 'C', 'CE', 'M+', 'M-', 'MR', 'MC', '%', '+/-'].includes(v);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16, alignItems: 'start' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* 디스플레이 */}
        <div style={{ background: 'var(--indigo-950)', padding: '16px 16px 12px', textAlign: 'right' }}>
          <div style={{ fontSize: '0.78rem', color: '#818cf8', minHeight: 16, marginBottom: 2 }}>
            {result ? `= ${result}` : ' '}{mem !== 0 && <span style={{ marginLeft: 8, opacity: 0.7 }}>M: {mem}</span>}
          </div>
          <div style={{
            fontSize: expr.length > 24 ? '1rem' : '1.5rem',
            fontWeight: 700, color: '#fff', wordBreak: 'break-all',
            minHeight: 36, fontFamily: 'monospace',
          }}>{expr || '0'}</div>
          <div style={{ marginTop: 6, textAlign: 'right' }}>
            <button onClick={() => setDeg(d => !d)} style={{
              fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
              background: deg ? 'var(--indigo-600)' : 'rgba(255,255,255,0.15)',
              color: '#fff', border: 'none',
            }}>{deg ? 'DEG' : 'RAD'}</button>
          </div>
        </div>

        {/* 공학 함수 버튼 */}
        {SCI_ROWS.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 1, background: 'var(--border)' }}>
            {row.map((btn, bi) => (
              <button key={bi} onClick={() => press(btn)} style={{
                padding: '10px 4px', fontSize: '0.75rem', border: 'none', cursor: 'pointer',
                background: ['M+','M-','MR','MC'].includes(btn) ? '#1e3a5f'
                  : ri < 3 ? 'var(--bg)' : 'var(--indigo-50)',
                color: ['M+','M-','MR','MC'].includes(btn) ? '#60a5fa'
                  : ri >= 3 ? 'var(--indigo-700)' : 'var(--text)',
                fontFamily: 'monospace',
              }}>{btn}</button>
            ))}
          </div>
        ))}

        {/* 숫자 버튼 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 1, background: 'var(--border)' }}>
          {NUM_ROWS.flat().map((btn, i) => (
            <button key={i} onClick={() => btn && press(btn)} style={{
              padding: '14px 4px', fontSize: btn === '=' ? '1.1rem' : '0.9rem',
              border: 'none', cursor: btn ? 'pointer' : 'default',
              fontWeight: ['='].includes(btn) ? 700 : 400,
              background: btn === '=' ? 'var(--indigo-600)'
                : isOp(btn) ? 'var(--indigo-100)'
                : 'var(--surface)',
              color: btn === '=' ? '#fff'
                : isOp(btn) ? 'var(--indigo-700)'
                : 'var(--text)',
            }}>{btn}</button>
          ))}
        </div>
      </div>

      {/* 계산 기록 */}
      <div className="card">
        <h3 style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 10 }}>계산 기록</h3>
        {history.length === 0
          ? <p style={{ color: 'var(--text-sub)', fontSize: '0.82rem' }}>기록 없음</p>
          : history.map((h, i) => (
            <div key={i}
              onClick={() => { const r = h.split(' = ')[1]; if (r) { setExpr(r); setResult(''); } }}
              style={{
                padding: '5px 8px', borderRadius: 5, marginBottom: 5,
                background: 'var(--bg)', fontSize: '0.78rem',
                color: 'var(--text)', fontFamily: 'monospace', cursor: 'pointer',
                wordBreak: 'break-all',
              }}>{h}</div>
          ))
        }
        {history.length > 0 && (
          <button className="btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setHistory([])}>
            기록 지우기
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   연봉 계산기 (2024 한국 기준)
══════════════════════════════════════════ */
function SalaryCalc() {
  const [salary, setSalary]   = useState('');
  const [family, setFamily]   = useState('1');   // 부양가족 수 (본인 포함)
  const [meal, setMeal]       = useState(true);  // 식대 비과세 20만원
  const [car, setCar]         = useState(false); // 자가운전보조금 비과세 20만원
  const [result, setResult]   = useState(null);

  function calc() {
    const ann = parseFloat(salary.replace(/,/g, '')) * 10000;
    if (!ann || ann <= 0) return;
    const fam = Math.max(1, parseInt(family) || 1);

    const monthlyGross = ann / 12;

    // 비과세 공제
    const nonTaxMeal = meal ? 200000 : 0;
    const nonTaxCar  = car  ? 200000 : 0;
    const nonTax = nonTaxMeal + nonTaxCar;

    // 4대보험 기준 소득 (국민연금: 월 상한 590만원)
    const npBase  = Math.min(monthlyGross, 5900000);  // 국민연금 기준
    const health  = monthlyGross;                      // 건강보험 기준 (상한없음)

    // 4대보험 월 공제 (근로자 부담, 2024년 기준)
    const monthly_np     = Math.floor(npBase * 0.045);         // 국민연금 4.5%
    const monthly_hi     = Math.floor(health * 0.03545);        // 건강보험 3.545%
    const monthly_ltc    = Math.floor(monthly_hi * 0.1281);     // 장기요양 12.81%
    const monthly_emp    = Math.floor(monthlyGross * 0.009);    // 고용보험 0.9%
    const monthly_ins    = monthly_np + monthly_hi + monthly_ltc + monthly_emp;

    // 과세 표준 (= 월급 - 비과세)
    const taxBase = Math.max(0, monthlyGross - nonTax);

    // 근로소득세 간이세액표 (부양가족 1명 기준, 추가 공제 적용)
    const famDeduct = (fam - 1) * 15000; // 부양가족 1인당 15,000원 추가 공제
    let tax = 0;
    if (taxBase <= 1060000)       tax = 0;
    else if (taxBase <= 1500000)  tax = Math.floor((taxBase - 1060000) * 0.06);
    else if (taxBase <= 3000000)  tax = Math.floor(26400 + (taxBase - 1500000) * 0.15);
    else if (taxBase <= 4500000)  tax = Math.floor(251400 + (taxBase - 3000000) * 0.24);
    else if (taxBase <= 8000000)  tax = Math.floor(611400 + (taxBase - 4500000) * 0.35);
    else                          tax = Math.floor(1836400 + (taxBase - 8000000) * 0.38);
    const monthly_it = Math.max(0, tax - famDeduct);
    const monthly_lt = Math.floor(monthly_it * 0.1);  // 지방소득세 10%

    const monthly_total_deduct = monthly_ins + monthly_it + monthly_lt;
    const monthly_net = Math.round(monthlyGross - monthly_total_deduct);

    setResult({
      annGross: ann,
      monthGross: Math.round(monthlyGross),
      nonTax, nonTaxMeal, nonTaxCar,
      np: monthly_np * 12, hi: monthly_hi * 12, ltc: monthly_ltc * 12, emp: monthly_emp * 12,
      ins: monthly_ins * 12,
      it: monthly_it * 12, lt: monthly_lt * 12,
      totalDeduct: monthly_total_deduct * 12,
      netAnn: monthly_net * 12, netMonthly: monthly_net,
      monthly_np, monthly_hi, monthly_ltc, monthly_emp, monthly_it, monthly_lt,
    });
  }

  const fmt  = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
  const fmtM = (n) => '월 ' + Math.round(n).toLocaleString('ko-KR') + '원';

  return (
    <div className="calc-two-col">
      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
          <i className="fas fa-won-sign" style={{ marginRight: 8, color: 'var(--indigo-600)' }} />연봉 계산기
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 14 }}>2024년 4대보험·근로소득세 기준</p>

        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>연봉 (만원)</label>
          <input type="number" placeholder="예: 4000" value={salary} onChange={e => setSalary(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && calc()} />
        </div>
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>부양가족 수 (본인 포함)</label>
          <select value={family} onChange={e => setFamily(e.target.value)}>
            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}명</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }}>
            <input type="checkbox" checked={meal} onChange={e => setMeal(e.target.checked)} />
            식대 비과세 (20만원/월)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text)' }}>
            <input type="checkbox" checked={car} onChange={e => setCar(e.target.checked)} />
            자가운전보조금 비과세 (20만원/월)
          </label>
        </div>
        <button className="btn-primary btn-full" onClick={calc}>계산하기</button>

        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-sub)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text)' }}>2024년 요율</strong><br />
          국민연금 4.5% · 건강보험 3.545% · 장기요양 12.81%(건강보험료 기준) · 고용보험 0.9%<br />
          국민연금 기준소득 상한: 월 590만원
        </div>
      </div>

      {result && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 14, color: 'var(--text)' }}>세후 실수령액</h3>

          <Row label="세전 연봉"       val={fmt(result.annGross)}    bold />
          <Row label="세전 월급"       val={fmt(result.monthGross)} />
          {result.nonTax > 0 && (
            <Row label={`비과세 (월 ${(result.nonTax/10000).toFixed(0)}만원)`}
              val={`-${fmt(result.nonTax)}/월`} green />
          )}

          <Divider label="4대보험 (연간)" />
          <Row label="국민연금 4.5%"     val={`-${fmt(result.np)}`}  sub={fmtM(result.monthly_np)}  red />
          <Row label="건강보험 3.545%"   val={`-${fmt(result.hi)}`}  sub={fmtM(result.monthly_hi)}  red />
          <Row label="장기요양 12.81%"   val={`-${fmt(result.ltc)}`} sub={fmtM(result.monthly_ltc)} red />
          <Row label="고용보험 0.9%"     val={`-${fmt(result.emp)}`} sub={fmtM(result.monthly_emp)} red />

          <Divider label="세금 (연간)" />
          <Row label="근로소득세"        val={`-${fmt(result.it)}`}  sub={fmtM(result.monthly_it)}  red />
          <Row label="지방소득세 10%"    val={`-${fmt(result.lt)}`}  sub={fmtM(result.monthly_lt)}  red />

          <Divider />
          <Row label="총 공제액"         val={`-${fmt(result.totalDeduct)}`} red bold />

          <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--indigo-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--indigo-100)' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: 4 }}>실수령 연봉</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--indigo-600)' }}>
              {fmt(result.netAnn)}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginTop: 4, fontWeight: 600 }}>
              월 {fmt(result.netMonthly)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   대출이자 계산기 (한국은행 기준)
══════════════════════════════════════════ */
function LoanCalc() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate]           = useState('');
  const [years, setYears]         = useState('');
  const [loanType, setLoanType]   = useState('equal_payment'); // equal_payment | equal_principal | balloon
  const [result, setResult]       = useState(null);

  function calc() {
    const P = parseFloat(principal.replace(/,/g,'')) * 10000;
    const annRate = parseFloat(rate) / 100;
    const n = parseInt(years) * 12;
    if (!P || !annRate || !n) return;

    const r = annRate / 12;

    if (loanType === 'equal_payment') {
      // 원리금균등상환
      const monthly = P * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1);
      const total   = monthly * n;
      const interest= total - P;

      const schedule = [];
      let balance = P;
      for (let i = 1; i <= Math.min(n, 6); i++) {
        const int  = balance * r;
        const prin = monthly - int;
        balance   -= prin;
        schedule.push({ i, monthly: Math.round(monthly), int: Math.round(int), prin: Math.round(prin), balance: Math.max(0, Math.round(balance)) });
      }
      setResult({ type: 'equal_payment', monthly: Math.round(monthly), total: Math.round(total), interest: Math.round(interest), schedule, n, P });
    } else if (loanType === 'equal_principal') {
      // 원금균등상환
      const monthlyPrin = P / n;
      const firstMonth  = monthlyPrin + P * r;
      const lastMonth   = monthlyPrin + monthlyPrin * r;
      const total       = monthlyPrin * n + P * r * (n + 1) / 2;
      const interest    = total - P;

      const schedule = [];
      let balance = P;
      for (let i = 1; i <= Math.min(n, 6); i++) {
        const int  = balance * r;
        const prin = monthlyPrin;
        balance   -= prin;
        schedule.push({ i, monthly: Math.round(prin + int), int: Math.round(int), prin: Math.round(prin), balance: Math.max(0, Math.round(balance)) });
      }
      setResult({ type: 'equal_principal', monthly: Math.round(firstMonth), lastMonthly: Math.round(lastMonth), total: Math.round(total), interest: Math.round(interest), schedule, n, P });
    } else {
      // 만기일시상환
      const monthly = Math.round(P * r);
      const total   = monthly * n + P;
      const interest= monthly * n;

      setResult({ type: 'balloon', monthly, total: Math.round(total), interest: Math.round(interest), schedule: [], n, P });
    }
  }

  const fmt = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
  const TYPES = [
    { key: 'equal_payment',   label: '원리금균등',   desc: '매월 동일한 금액 납부' },
    { key: 'equal_principal', label: '원금균등',      desc: '원금 동일, 이자 감소' },
    { key: 'balloon',         label: '만기일시',      desc: '매월 이자만, 원금은 만기에' },
  ];

  return (
    <div className="calc-two-col">
      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
          <i className="fas fa-landmark" style={{ marginRight: 8, color: 'var(--indigo-600)' }} />대출이자 계산기
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 14 }}>
          원리금균등 · 원금균등 · 만기일시 상환
        </p>

        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>대출금액 (만원)</label>
          <input type="number" placeholder="예: 30000" value={principal} onChange={e => setPrincipal(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>연이자율 (%)</label>
          <input type="number" step="0.01" placeholder="예: 4.50" value={rate} onChange={e => setRate(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>대출 기간 (년)</label>
          <select value={years} onChange={e => setYears(e.target.value)}>
            <option value="">선택</option>
            {[1,2,3,5,7,10,15,20,25,30].map(y => <option key={y} value={y}>{y}년 ({y*12}개월)</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>상환 방식</div>
          {TYPES.map(t => (
            <label key={t.key} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: 4,
              border: `1px solid ${loanType === t.key ? 'var(--indigo-600)' : 'var(--border)'}`,
              background: loanType === t.key ? 'var(--indigo-50)' : 'var(--surface)',
            }}>
              <input type="radio" name="loanType" value={t.key} checked={loanType === t.key} onChange={e => setLoanType(e.target.value)} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: loanType === t.key ? 'var(--indigo-600)' : 'var(--text)' }}>{t.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{t.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <button className="btn-primary btn-full" onClick={calc}>계산하기</button>
      </div>

      {result && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 14, color: 'var(--text)' }}>상환 정보</h3>
          <Row label="대출원금"   val={fmt(result.P)} />
          {result.type === 'equal_payment' && <Row label="월 납입금 (고정)" val={fmt(result.monthly)} bold />}
          {result.type === 'equal_principal' && (
            <>
              <Row label="첫 달 납입금" val={fmt(result.monthly)} bold />
              <Row label="마지막 달 납입금" val={fmt(result.lastMonthly)} />
            </>
          )}
          {result.type === 'balloon' && (
            <>
              <Row label="월 이자 (고정)"  val={fmt(result.monthly)} bold />
              <Row label="만기 원금 상환"   val={fmt(result.P)} red />
            </>
          )}
          <Row label="총 상환금"  val={fmt(result.total)} />
          <Row label="총 이자"    val={fmt(result.interest)} red />
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-sub)' }}>
            이자율 부담: {((result.interest / result.P) * 100).toFixed(1)}% (원금 대비)
          </div>

          {result.schedule.length > 0 && (
            <>
              <div style={{ margin: '12px 0 8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-sub)' }}>
                상환 내역 (처음 {result.schedule.length}회차)
              </div>
              <div style={{ fontSize: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0 }}>
                {['회차','원금','이자','잔금'].map(h => (
                  <div key={h} style={{ padding: '4px 6px', background: 'var(--bg)', fontWeight: 600, color: 'var(--text-sub)', borderBottom: '1px solid var(--border)' }}>{h}</div>
                ))}
                {result.schedule.map(s => [
                  s.i + '회',
                  s.prin.toLocaleString(),
                  <span key="int" style={{ color: 'var(--red-500)' }}>{s.int.toLocaleString()}</span>,
                  s.balance.toLocaleString(),
                ].map((v, ci) => (
                  <div key={ci} style={{ padding: '4px 6px', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>{v}</div>
                )))}
              </div>
              {result.n > 6 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: 4 }}>... {result.n}회차까지 총 {result.n}회 납부</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   부가세 계산기
══════════════════════════════════════════ */
function VatCalc() {
  const [amount, setAmount]     = useState('');
  const [mode, setMode]         = useState('add');
  const [vatType, setVatType]   = useState('general'); // general | simplified | zero
  const [result, setResult]     = useState(null);

  const VAT_RATES = {
    general:    { label: '일반과세 (10%)',          rate: 0.10 },
    simplified: { label: '간이과세 업종별 (4%)',    rate: 0.04 },
    simplified2:{ label: '간이과세 업종별 (2%)',    rate: 0.02 },
    zero:       { label: '영세율 (0%)',             rate: 0.00 },
  };

  function calc() {
    const v = parseFloat(amount.replace(/,/g,''));
    if (!v || isNaN(v)) return;
    const r = VAT_RATES[vatType].rate;

    if (mode === 'add') {
      const vat   = Math.round(v * r);
      setResult({ supply: Math.round(v), vat, total: Math.round(v) + vat, rate: r });
    } else {
      const supply = r > 0 ? Math.round(v / (1 + r)) : Math.round(v);
      const vat    = v - supply;
      setResult({ supply, vat: Math.round(vat), total: Math.round(v), rate: r });
    }
  }

  const fmt = (n) => Math.round(n).toLocaleString('ko-KR') + '원';

  return (
    <div className="calc-two-col">
      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
          <i className="fas fa-percent" style={{ marginRight: 8, color: 'var(--indigo-600)' }} />부가세 계산기
        </h3>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[
            { key: 'add',     label: '부가세 추가', desc: '공급가 → 합계' },
            { key: 'extract', label: '부가세 제거', desc: '합계 → 공급가' },
          ].map(m => (
            <button key={m.key} onClick={() => setMode(m.key)} style={{
              flex: 1, padding: '8px 6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              border: `1px solid ${mode === m.key ? 'var(--indigo-600)' : 'var(--border)'}`,
              background: mode === m.key ? 'var(--indigo-50)' : 'var(--surface)',
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: mode === m.key ? 'var(--indigo-600)' : 'var(--text)' }}>{m.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>{m.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>세율 선택</div>
          {Object.entries(VAT_RATES).map(([key, v]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text)' }}>
              <input type="radio" name="vatType" value={key} checked={vatType === key} onChange={() => setVatType(key)} />
              {v.label}
            </label>
          ))}
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label>{mode === 'add' ? '공급가액 (원)' : '부가세 포함 금액 (원)'}</label>
          <input type="number" placeholder="금액 입력" value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && calc()} />
        </div>
        <button className="btn-primary btn-full" onClick={calc}>계산하기</button>

        <div style={{ marginTop: 12, padding: 10, background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-sub)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text)' }}>간이과세자 안내</strong><br />
          직전 연 매출 8,000만원 미만 사업자 적용.<br />
          업종별 부가가치율 적용 (1.5%~4.0%)
        </div>
      </div>

      {result && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 14, color: 'var(--text)' }}>계산 결과</h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginBottom: 12 }}>
            적용 세율: {VAT_RATES[vatType].label}
          </div>
          <Row label="공급가액 (VAT 제외)"  val={fmt(result.supply)} />
          <Row label={`부가세 (${(result.rate * 100).toFixed(0)}%)`} val={fmt(result.vat)} red />
          <div style={{ margin: '10px 0', borderTop: '1px solid var(--border)' }} />
          <Row label="합계 (VAT 포함)"      val={fmt(result.total)} bold />

          {result.rate > 0 && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--indigo-50)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>역산 확인</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginTop: 4 }}>
                공급가 × (1 + {(result.rate * 100).toFixed(0)}%) = 합계: {fmt(result.supply)} × {(1 + result.rate).toFixed(2)} = {fmt(result.total)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 공통 행 컴포넌트 ── */
function Row({ label, val, bold, red, green, sub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', fontSize: '0.84rem' }}>
      <span style={{ color: 'var(--text-sub)' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontWeight: bold ? 700 : 400, color: red ? 'var(--red-500)' : green ? 'var(--green-600)' : 'var(--text)' }}>{val}</span>
        {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>{sub}</div>}
      </div>
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ margin: '10px 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {label && <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

/* ══════════════════════════════════════════
   메인 페이지
══════════════════════════════════════════ */
const TABS = [
  { key: 'sci',    label: '공학 계산기',  icon: 'fas fa-square-root-variable' },
  { key: 'salary', label: '연봉 계산기',  icon: 'fas fa-won-sign' },
  { key: 'loan',   label: '대출이자',     icon: 'fas fa-landmark' },
  { key: 'vat',    label: '부가세',       icon: 'fas fa-percent' },
];

export default function CalculatorPage() {
  const [tab, setTab] = useState('sci');

  return (
    <div>
      <div className="view-header">
        <div>
          <h2>계산기</h2>
          <p className="view-sub">공학 계산기 · 연봉 · 대출 · 부가세</p>
        </div>
      </div>

      <div className="calc-tabs">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`calc-tab${tab === t.key ? ' active' : ''}`}>
            <i className={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'sci'    && <ScientificCalc />}
      {tab === 'salary' && <SalaryCalc />}
      {tab === 'loan'   && <LoanCalc />}
      {tab === 'vat'    && <VatCalc />}
    </div>
  );
}
