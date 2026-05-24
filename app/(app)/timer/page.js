'use client';
import { useState, useEffect, useRef } from 'react';

const PAD    = n => String(n).padStart(2, '0');
const FMT_HMS = s => `${PAD(Math.floor(s/3600))}:${PAD(Math.floor(s/60)%60)}:${PAD(s%60)}`;
const FMT_MS  = ms => `${PAD(Math.floor(ms/60000))}:${PAD(Math.floor(ms/1000)%60)}.${PAD(Math.floor(ms/10)%100)}`;
const CLAMP   = (v, min, max, def) => { const n = parseInt(v); return isNaN(n) ? def : Math.max(min, Math.min(max, n)); };

function notify(msg) {
  if (typeof window === 'undefined') return;
  if (Notification.permission === 'granted') new Notification('TeamScheduler', { body: msg, icon: '/favicon.ico' });
  else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => { if (p === 'granted') new Notification('TeamScheduler', { body: msg }); });
}

function calcRemain(alarmTime) {
  const now = new Date();
  const [ah, am] = alarmTime.split(':').map(Number);
  let diff = ah * 60 + am - (now.getHours() * 60 + now.getMinutes());
  if (diff < 0) diff += 24 * 60;
  if (diff === 0) return '지금';
  const h = Math.floor(diff / 60), m = diff % 60;
  return h > 0 ? `${h}시간 ${m}분 후` : `${m}분 후`;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/* ── 알람 ── */
function AlarmTimer() {
  const [alarms,   setAlarms]   = useState([]);
  const [timeVal,  setTimeVal]  = useState('');
  const [label,    setLabel]    = useState('');
  const [selDays,  setSelDays]  = useState([]);
  const [remain,   setRemain]   = useState({});
  const firedRef = useRef(new Set());

  useEffect(() => {
    function upd() {
      setRemain(prev => {
        const next = { ...prev };
        alarms.forEach(a => { next[a.id] = calcRemain(a.time); });
        return next;
      });
    }
    upd();
    const id = setInterval(upd, 60000);
    return () => clearInterval(id);
  }, [alarms]);

  useEffect(() => {
    function check() {
      const now = new Date();
      const cur = `${PAD(now.getHours())}:${PAD(now.getMinutes())}`;
      const today = now.getDay();
      setAlarms(list => {
        list.forEach(a => {
          const key = `${a.id}-${cur}`;
          const dayMatch = a.days.length === 0 || a.days.includes(today);
          if (a.active && a.time === cur && dayMatch && !firedRef.current.has(key)) {
            firedRef.current.add(key);
            notify(`⏰ ${a.label}`);
          }
        });
        return list;
      });
    }
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, []);

  function toggleDay(d) { setSelDays(ds => ds.includes(d) ? ds.filter(x => x !== d) : [...ds, d].sort()); }

  function addAlarm(e) {
    e.preventDefault();
    if (!timeVal) return;
    const alarm = { id: Date.now(), time: timeVal, label: label.trim() || '알람', active: true, days: selDays };
    setAlarms(a => [...a, alarm].sort((x, y) => x.time.localeCompare(y.time)));
    setTimeVal(''); setLabel(''); setSelDays([]);
  }

  function toggle(id) { setAlarms(a => a.map(x => x.id === id ? { ...x, active: !x.active } : x)); }
  function del(id)    { setAlarms(a => a.filter(x => x.id !== id)); }

  const dayHint = selDays.length === 0 ? '한 번만' : selDays.length === 7 ? '매일' : selDays.map(d => DAY_LABELS[d]).join(' ');

  return (
    <div className="tv-section">
      <div className="alarm-add-card card">
        <form onSubmit={addAlarm}>
          <div className="alarm-add-row">
            <input type="time" value={timeVal} onChange={e => setTimeVal(e.target.value)} required className="alarm-time-input" />
            <input type="text" placeholder="알람 이름 (선택)" value={label} onChange={e => setLabel(e.target.value)} className="alarm-label-input" />
            <button type="submit" className="btn-primary"><i className="fas fa-plus" /> 추가</button>
          </div>
          <div className="alarm-days-row">
            {DAY_LABELS.map((d, i) => (
              <button key={i} type="button" className={`alarm-day-btn${selDays.includes(i) ? ' active' : ''}`} onClick={() => toggleDay(i)}>{d}</button>
            ))}
            <span className="alarm-day-hint">{dayHint}</span>
          </div>
        </form>
      </div>

      <div className="alarm-list">
        {alarms.length === 0 ? (
          <div className="alarm-empty"><i className="fas fa-bell-slash" /><p>등록된 알람이 없습니다</p></div>
        ) : alarms.map(a => (
          <div key={a.id} className={`alarm-item${a.active ? '' : ' alarm-off'}`}>
            <div className="alarm-item-time">{a.time}</div>
            <div className="alarm-item-info">
              <div className="alarm-item-label">{a.label}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {a.days.length > 0 && (
                  <div className="alarm-item-days">{a.days.map(d => <span key={d}>{DAY_LABELS[d]}</span>)}</div>
                )}
                {a.active && <div className="alarm-item-remain"><i className="fas fa-clock" style={{ marginRight: 4 }} />{remain[a.id] || calcRemain(a.time)}</div>}
              </div>
            </div>
            <label className="alarm-toggle">
              <input type="checkbox" checked={a.active} onChange={() => toggle(a.id)} />
              <span className="alarm-slider" />
            </label>
            <button className="alarm-del-btn" onClick={() => del(a.id)} title="삭제"><i className="fas fa-trash" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 스톱워치 ── */
function Stopwatch() {
  const [ms, setMs]           = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps]       = useState([]);
  const ref = useRef(null); const startRef = useRef(0);

  useEffect(() => {
    if (!running) { clearInterval(ref.current); return; }
    startRef.current = Date.now() - ms;
    ref.current = setInterval(() => setMs(Date.now() - startRef.current), 10);
    return () => clearInterval(ref.current);
  }, [running]);

  function reset() { clearInterval(ref.current); setRunning(false); setMs(0); setLaps([]); }

  return (
    <div className="tv-section">
      <div style={{ fontSize: '3.6rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)', letterSpacing: '-.04em', fontVariantNumeric: 'tabular-nums' }}>
        {FMT_MS(ms)}
      </div>
      <div className="tv-ctrl">
        <button className="tv-btn tv-btn-main" onClick={() => setRunning(r => !r)}>
          <i className={`fas fa-${running ? 'pause' : 'play'}`} />{running ? '정지' : ms > 0 ? '재개' : '시작'}
        </button>
        <button className="tv-btn" onClick={() => running && setLaps(l => [...l, ms])}><i className="fas fa-flag" />랩</button>
        <button className="tv-btn" onClick={reset}><i className="fas fa-undo" />리셋</button>
      </div>
      {laps.length > 0 && (
        <div className="sw-laps">
          {laps.map((t, i) => (
            <div key={i} className="sw-lap-row">
              <span className="sw-lap-num">랩 {i + 1}</span>
              <span className="sw-lap-diff">+{FMT_MS(i > 0 ? t - laps[i-1] : t)}</span>
              <span className="sw-lap-total">{FMT_MS(t)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 카운트다운 타이머 ── */
function CountdownTimer() {
  const [hours,   setHours]   = useState('0');
  const [minutes, setMinutes] = useState('25');
  const [secs,    setSecs]    = useState('0');
  const [total,   setTotal]   = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(false);
  const ref = useRef(null);

  const PRESETS = [
    { label: '5분',  h:0, m:5,  s:0 }, { label: '10분', h:0, m:10, s:0 },
    { label: '15분', h:0, m:15, s:0 }, { label: '30분', h:0, m:30, s:0 },
    { label: '1시간',h:1, m:0,  s:0 },
  ];

  useEffect(() => {
    if (!running) { clearInterval(ref.current); return; }
    ref.current = setInterval(() => {
      setRemaining(s => {
        if (s <= 1) { clearInterval(ref.current); setRunning(false); setDone(true); notify('⏰ 타이머 종료!'); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  function start() {
    const t = parseInt(hours||0)*3600 + parseInt(minutes||0)*60 + parseInt(secs||0);
    if (!t) return;
    setTotal(t); setRemaining(t); setRunning(true); setDone(false);
  }
  function reset() { clearInterval(ref.current); setRunning(false); setRemaining(0); setTotal(0); setDone(false); }
  function applyPreset(p) { setHours(String(p.h)); setMinutes(String(p.m)); setSecs(String(p.s)); reset(); }

  const pct = total > 0 ? ((total - remaining) / total) * 100 : 0;
  const R = 96, C = 2 * Math.PI * R;
  const isIdle = !running && remaining === 0;

  return (
    <div className="tv-section">
      {isIdle && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {PRESETS.map(p => <button key={p.label} className="btn-secondary btn-sm" onClick={() => applyPreset(p)}>{p.label}</button>)}
        </div>
      )}

      <div className="tv-layout">
        <div className="tv-ring-col">
          <div className="tv-ring-wrap">
            <svg className="tv-ring-svg" viewBox="0 0 220 220">
              <circle className="tv-ring-track" cx="110" cy="110" r={R} />
              <circle className="tv-ring-prog" cx="110" cy="110" r={R}
                stroke={done ? 'var(--green-500)' : 'var(--indigo-500)'}
                strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
                style={{ transition: running ? 'stroke-dashoffset 0.9s linear' : 'none' }}
              />
            </svg>
            <div className="tv-ring-center">
              <div className="tv-time" style={{ color: done ? 'var(--green-500)' : 'var(--text)' }}>{FMT_HMS(remaining)}</div>
              {total > 0 && <div className="tv-label">/ {FMT_HMS(total)}</div>}
              {done && <div style={{ fontSize: '0.85rem', color: 'var(--green-500)', fontWeight: 700 }}>완료!</div>}
            </div>
          </div>
        </div>

        <div className="tv-info-col">
          {isIdle && (
            <div className="ct-set-row">
              {[{ val: hours, set: setHours, label: '시', max: 99 },
                { val: minutes, set: setMinutes, label: '분', max: 59 },
                { val: secs, set: setSecs, label: '초', max: 59 }
              ].map(({ val, set, label, max }, idx) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {idx > 0 && <span style={{ fontSize: '1.8rem', color: 'var(--text-sub)', lineHeight: 1 }}>:</span>}
                  <div className="ct-spin">
                    <button type="button" className="ct-spin-btn" onClick={() => set(s => String(Math.min(max, parseInt(s||0)+1)))}>▲</button>
                    <input type="number" min="0" max={max} value={val} onChange={e => set(e.target.value)} className="ct-input" />
                    <button type="button" className="ct-spin-btn" onClick={() => set(s => String(Math.max(0, parseInt(s||0)-1)))}>▼</button>
                    <span className="ct-unit">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="tv-ctrl">
            {isIdle && <button className="tv-btn tv-btn-main" onClick={start}><i className="fas fa-play" />시작</button>}
            {running && <button className="tv-btn tv-btn-main" onClick={() => setRunning(false)}><i className="fas fa-pause" />일시정지</button>}
            {!running && remaining > 0 && <button className="tv-btn tv-btn-main" onClick={() => { setDone(false); setRunning(true); }}><i className="fas fa-play" />재개</button>}
            {(running || remaining > 0) && <button className="tv-btn" onClick={reset}><i className="fas fa-undo" />초기화</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 포모도로 (전체 커리큘럼) ── */
function PomodoroTimer() {
  const [workMins,  setWorkMins]  = useState(25);
  const [shortMins, setShortMins] = useState(5);
  const [longMins,  setLongMins]  = useState(15);
  const [interval,  setInterval_] = useState(4);

  const [cfgOpen,     setCfgOpen]     = useState(false);
  const [cfgWork,     setCfgWork]     = useState('25');
  const [cfgShort,    setCfgShort]    = useState('5');
  const [cfgLong,     setCfgLong]     = useState('15');
  const [cfgInterval, setCfgInterval] = useState('4');

  const [mode,         setMode]         = useState('work');
  const [sessionCount, setSessionCount] = useState(0);
  const [totalWork,    setTotalWork]    = useState(0);
  const [seconds,      setSeconds]      = useState(25 * 60);
  const [running,      setRunning]      = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!running) { clearInterval(ref.current); return; }
    ref.current = setInterval(() => {
      setSeconds(s => {
        if (s > 1) return s - 1;
        clearInterval(ref.current); setRunning(false);
        if (mode === 'work') {
          const next = sessionCount + 1;
          setSessionCount(next); setTotalWork(t => t + 1);
          if (next % interval === 0) {
            notify('🎉 긴 휴식 시간! 잘 하셨습니다'); setMode('long'); return longMins * 60;
          } else {
            notify('☕ 짧은 휴식 시간입니다'); setMode('short'); return shortMins * 60;
          }
        } else {
          notify('🍅 집중 시간 시작!');
          if (mode === 'long') setSessionCount(0);
          setMode('work'); return workMins * 60;
        }
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running, mode, sessionCount, interval, workMins, shortMins, longMins]);

  function reset() {
    clearInterval(ref.current); setRunning(false);
    setMode('work'); setSessionCount(0); setSeconds(workMins * 60);
  }

  function applyConfig() {
    const w = CLAMP(cfgWork, 1, 99, 25), s = CLAMP(cfgShort, 1, 99, 5);
    const l = CLAMP(cfgLong, 1, 99, 15), i = CLAMP(cfgInterval, 1, 12, 4);
    setWorkMins(w); setShortMins(s); setLongMins(l); setInterval_(i);
    setCfgOpen(false); clearInterval(ref.current); setRunning(false);
    setMode('work'); setSessionCount(0); setSeconds(w * 60);
  }

  const curDur = mode === 'work' ? workMins*60 : mode === 'short' ? shortMins*60 : longMins*60;
  const pct = (1 - seconds / curDur) * 100;
  const R = 96, C = 2 * Math.PI * R;
  const ringColor = mode === 'work' ? 'var(--indigo-500)' : mode === 'short' ? 'var(--green-500)' : 'var(--amber-500)';
  const modeLabel = mode === 'work' ? `🍅 집중 ${workMins}분` : mode === 'short' ? `☕ 짧은 휴식 ${shortMins}분` : `🎉 긴 휴식 ${longMins}분`;
  const cycleSess = sessionCount % interval;
  const dots = Array.from({ length: interval }, (_, i) => ({ done: i < cycleSess, current: i === cycleSess && mode === 'work' }));

  return (
    <div className="tv-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className="pm-mode-badge" style={{
          background: mode==='work' ? 'var(--indigo-50)' : mode==='short' ? 'var(--green-50)' : '#fffbeb',
          color:      mode==='work' ? 'var(--indigo-600)' : mode==='short' ? 'var(--green-600)' : 'var(--amber-600)',
        }}>{modeLabel}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>총 {totalWork}회 집중</span>
        {!running && (
          <button className="btn-ghost btn-sm" onClick={() => setCfgOpen(o => !o)} title="커리큘럼 설정">
            <i className="fas fa-sliders-h" />
          </button>
        )}
      </div>

      <div className="pm-session-dots" title={`${cycleSess}/${interval} 세션`}>
        {dots.map((d, i) => (
          <div key={i} className={`pm-dot${d.done ? ' done' : d.current ? ' current' : ''}`}
            style={d.done ? { background: ringColor, borderColor: ringColor } : d.current ? { borderColor: ringColor } : {}} />
        ))}
        <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginLeft: 4 }}>{cycleSess}/{interval}</span>
      </div>

      {cfgOpen && !running && (
        <div className="card pm-cfg">
          <h4><i className="fas fa-sliders-h" /> 커리큘럼 설정</h4>
          <div className="pm-cfg-grid">
            {[
              { label: '🍅 집중 시간 (분)',       val: cfgWork,     set: setCfgWork,     min:1, max:99 },
              { label: '☕ 짧은 휴식 (분)',        val: cfgShort,    set: setCfgShort,    min:1, max:99 },
              { label: '🎉 긴 휴식 (분)',          val: cfgLong,     set: setCfgLong,     min:1, max:99 },
              { label: '🔄 긴 휴식까지 집중 횟수', val: cfgInterval, set: setCfgInterval, min:1, max:12 },
            ].map(({ label, val, set, min, max }) => (
              <div key={label} className="pm-cfg-item">
                <label>{label}</label>
                <input type="number" min={min} max={max} value={val} onChange={e => set(e.target.value)} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn-primary btn-sm" onClick={applyConfig}><i className="fas fa-check" /> 적용</button>
            <button className="btn-secondary btn-sm" onClick={() => setCfgOpen(false)}>취소</button>
          </div>
        </div>
      )}

      <div className="tv-layout">
        <div className="tv-ring-col">
          <div className="tv-ring-wrap">
            <svg className="tv-ring-svg" viewBox="0 0 220 220">
              <circle className="tv-ring-track" cx="110" cy="110" r={R} />
              <circle className="tv-ring-prog" cx="110" cy="110" r={R}
                stroke={ringColor} strokeDasharray={C} strokeDashoffset={C*(1-pct/100)}
                style={{ transition: 'stroke-dashoffset 0.9s linear' }}
              />
            </svg>
            <div className="tv-ring-center">
              <div className="tv-time">{FMT_HMS(seconds)}</div>
              <div className="tv-label">{mode==='work' ? `집중 ${workMins}분` : mode==='short' ? `짧은 휴식 ${shortMins}분` : `긴 휴식 ${longMins}분`}</div>
            </div>
          </div>
        </div>

        <div className="tv-info-col">
          <div className="tv-ctrl">
            <button className="tv-btn tv-btn-main" onClick={() => setRunning(r => !r)}>
              <i className={`fas fa-${running ? 'pause' : 'play'}`} />{running ? '일시정지' : '시작'}
            </button>
            <button className="tv-btn" onClick={reset}><i className="fas fa-undo" />리셋</button>
          </div>
          {mode !== 'work' && !running && (
            <button className="btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}
              onClick={() => { setMode('work'); setSeconds(workMins * 60); }}>
              <i className="fas fa-forward" /> 집중으로 건너뛰기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'alarm',     label: '알람',     icon: 'fas fa-bell' },
  { key: 'stopwatch', label: '스톱워치', icon: 'fas fa-clock' },
  { key: 'timer',     label: '타이머',   icon: 'fas fa-hourglass-half' },
  { key: 'pomodoro',  label: '포모도로', icon: 'fas fa-stopwatch' },
];

export default function TimerPage() {
  const [tab, setTab] = useState('alarm');

  useEffect(() => {
    if (typeof window !== 'undefined' && Notification.permission === 'default') Notification.requestPermission();
  }, []);

  return (
    <div>
      <div className="view-header">
        <div>
          <h2>타이머</h2>
          <p className="view-sub">알람 · 스톱워치 · 카운트다운 · 포모도로</p>
        </div>
      </div>

      <div className="tv-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tv-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            <i className={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      <div className="timer-wrap" style={{ maxWidth: 560, margin: '0 auto' }}>
        {tab === 'alarm'     && <AlarmTimer />}
        {tab === 'stopwatch' && <Stopwatch />}
        {tab === 'timer'     && <CountdownTimer />}
        {tab === 'pomodoro'  && <PomodoroTimer />}
      </div>
    </div>
  );
}
