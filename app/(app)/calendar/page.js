'use client';
import { Suspense } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTasksByDateRange, getTasksByDate, toggleComplete } from '@/models/taskModel';
import { getAuthToken } from '@/lib/supabase';
import TaskModal from '@/components/task/TaskModal';

const DAYS = ['일','월','화','수','목','금','토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function CalendarPageWrapper() {
  return <Suspense><CalendarPage /></Suspense>;
}

function CalendarPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const now = new Date();

  const [mode, setMode]         = useState('month');
  const [year, setYear]         = useState(now.getFullYear());
  const [month, setMonth]       = useState(now.getMonth());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(now);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [tasks, setTasks]         = useState([]);
  const [gcalEvents, setGcalEvents] = useState([]);
  const [dayPanel, setDayPanel]   = useState(null); // dateStr | null
  const [dayTasks, setDayTasks]   = useState([]);
  const [modal, setModal]         = useState(null);

  const todayStr = toDateStr(now);

  // Load tasks for current view
  const loadTasks = useCallback(async () => {
    if (!user) return;
    let start, end;
    if (mode === 'year') { start = `${year}-01-01`; end = `${year}-12-31`; }
    else if (mode === 'week') {
      const ws = weekStart;
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      start = toDateStr(ws); end = toDateStr(we);
    } else {
      start = toDateStr(new Date(year, month, 1));
      end   = toDateStr(new Date(year, month + 1, 0));
    }
    const data = await getTasksByDateRange(user.id, start, end);
    setTasks(data);
  }, [user, mode, year, month, weekStart]);

  const loadGcalEvents = useCallback(async () => {
    if (!user?.id) return;
    let timeMin, timeMax;
    if (mode === 'year') {
      timeMin = new Date(year, 0, 1).toISOString();
      timeMax = new Date(year, 11, 31, 23, 59, 59).toISOString();
    } else if (mode === 'week') {
      const we = new Date(weekStart); we.setDate(we.getDate() + 6); we.setHours(23,59,59);
      timeMin = new Date(weekStart).toISOString();
      timeMax = we.toISOString();
    } else {
      timeMin = new Date(year, month, 1).toISOString();
      timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    }
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `/api/google/events?userId=${user.id}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.ok) {
        const { events } = await res.json();
        setGcalEvents(events || []);
      }
    } catch {}
  }, [user, mode, year, month, weekStart]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { loadGcalEvents(); }, [loadGcalEvents]);

  // Open day panel from query param
  useEffect(() => {
    const date = searchParams.get('date');
    if (date) openDayPanel(date);
  }, []);

  async function openDayPanel(dateStr) {
    setDayPanel(dateStr);
    if (!user) return;
    const data = await getTasksByDate(user.id, dateStr);
    setDayTasks(data);
  }

  async function handleToggle(id, cur) {
    await toggleComplete(id, cur);
    loadTasks();
    if (dayPanel) {
      const data = await getTasksByDate(user.id, dayPanel);
      setDayTasks(data);
    }
  }

  function navigate(dir) {
    if (mode === 'year') setYear(y => y + dir);
    else if (mode === 'week') {
      setWeekStart(ws => {
        const d = new Date(ws);
        d.setDate(d.getDate() + dir * 7);
        return d;
      });
    } else {
      let m = month + dir, y = year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      setMonth(m); setYear(y);
    }
  }

  function goToday() {
    setYear(now.getFullYear()); setMonth(now.getMonth());
    const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay());
    setWeekStart(d);
  }

  // Build label
  let label = '';
  if (mode === 'year') label = `${year}년`;
  else if (mode === 'week') {
    const we = new Date(weekStart); we.setDate(we.getDate() + 6);
    label = weekStart.getMonth() === we.getMonth()
      ? `${weekStart.getFullYear()}년 ${weekStart.getMonth()+1}월`
      : `${weekStart.getMonth()+1}월 ${weekStart.getDate()}일 — ${we.getMonth()+1}월 ${we.getDate()}일`;
  } else {
    label = `${year}년 ${MONTHS[month]}`;
  }

  return (
    <div className="cal-layout" style={{ display: 'flex', height: '100%', minHeight: 0, position: 'relative' }}>
      {/* 메인 캘린더 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div className="view-header" style={{ marginBottom: 16 }}>
          <div>
            <h2>캘린더</h2>
            <p className="view-sub">일정을 한눈에 확인하세요</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* 뷰 전환 */}
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {['year','month','week'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: '5px 12px', fontSize: '0.82rem', cursor: 'pointer', border: 'none',
                    background: mode === m ? 'var(--indigo-600)' : 'var(--surface)',
                    color: mode === m ? '#fff' : 'var(--text)',
                  }}
                >{m === 'year' ? '연도' : m === 'month' ? '월' : '주'}</button>
              ))}
            </div>
            {/* 네비게이션 */}
            <button className="icon-btn" onClick={() => navigate(-1)}><i className="fas fa-chevron-left" /></button>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', minWidth: 160, textAlign: 'center' }}>{label}</span>
            <button className="icon-btn" onClick={() => navigate(1)}><i className="fas fa-chevron-right" /></button>
            <button className="btn-secondary btn-sm" onClick={goToday}>오늘</button>
          </div>
        </div>

        <div className="card" style={{ flex: 1, padding: 0, overflow: 'auto' }}>
          {mode === 'month' && (
            <MonthView year={year} month={month} tasks={tasks} gcalEvents={gcalEvents} todayStr={todayStr} onDayClick={openDayPanel} />
          )}
          {mode === 'week' && (
            <WeekView weekStart={weekStart} tasks={tasks} gcalEvents={gcalEvents} todayStr={todayStr} onDayClick={openDayPanel} />
          )}
          {mode === 'year' && (
            <YearView year={year} tasks={tasks} todayStr={todayStr} onMonthClick={m => { setMode('month'); setMonth(m); }} />
          )}
        </div>
      </div>

      {/* 날짜 패널 */}
      {dayPanel && (
        <div className="card cal-day-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
              {dayPanel}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-primary btn-sm" onClick={() => setModal({ _date: dayPanel })}>
                <i className="fas fa-plus" />
              </button>
              <button className="icon-btn" onClick={() => setDayPanel(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
          </div>
          {/* Google 캘린더 이벤트 */}
          {gcalEvents.filter(e => e.date === dayPanel).map(e => (
            <a
              key={e.id}
              href={e.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg)', textDecoration: 'none',
                borderLeft: `3px solid ${e.color || '#4285f4'}`,
              }}
            >
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                background: '#4285f4', borderRadius: 3, padding: '1px 4px', flexShrink: 0,
              }}>G</span>
              <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.title}
              </span>
            </a>
          ))}
          {dayTasks.length === 0 && gcalEvents.filter(e => e.date === dayPanel).length === 0 ? (
            <p style={{ color: 'var(--text-sub)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
              할일이 없습니다
            </p>
          ) : dayTasks.map(t => (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg)', cursor: 'pointer',
                borderLeft: t.color ? `3px solid ${t.color}` : '3px solid var(--indigo-500)',
              }}
              onClick={() => setModal(t)}
            >
              <button
                onClick={e => { e.stopPropagation(); handleToggle(t.id, t.completed); }}
                style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${t.completed ? 'var(--indigo-600)' : 'var(--border)'}`,
                  background: t.completed ? 'var(--indigo-600)' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '0.6rem',
                }}
              >
                {t.completed && <i className="fas fa-check" />}
              </button>
              <span style={{
                flex: 1, fontSize: '0.85rem', color: 'var(--text)',
                textDecoration: t.completed ? 'line-through' : 'none', opacity: t.completed ? 0.5 : 1,
              }}>
                {t.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <TaskModal
          task={'_date' in modal ? null : modal}
          defaultDate={modal._date || dayPanel || todayStr}
          onClose={() => setModal(null)}
          onSave={async () => {
            setModal(null);
            await loadTasks();
            if (dayPanel) {
              const data = await getTasksByDate(user.id, dayPanel);
              setDayTasks(data);
            }
          }}
        />
      )}
    </div>
  );
}

/* ── 월 뷰 ── */
function MonthView({ year, month, tasks, gcalEvents, todayStr, onDayClick }) {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();

  // spanning tasks (deadline > start date) — shown as bars only
  const spanTasks = tasks.filter(t => t.deadline && t.deadline > t.date);
  const spanIds   = new Set(spanTasks.map(t => t.id));

  // taskMap: non-spanning tasks by start date
  const taskMap = {};
  tasks.forEach(t => {
    if (spanIds.has(t.id)) return;
    if (!taskMap[t.date]) taskMap[t.date] = [];
    taskMap[t.date].push(t);
  });

  const gcalMap = {};
  (gcalEvents || []).forEach(e => {
    if (!gcalMap[e.date]) gcalMap[e.date] = [];
    gcalMap[e.date].push(e);
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ d: prevDays - firstDay + 1 + i, other: true, ds: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ d, other: false, ds });
  }
  const rem = (7 - cells.length % 7) % 7;
  for (let d = 1; d <= rem; d++) cells.push({ d, other: true, ds: null });

  // Split cells into week rows
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {DAYS.map((d, di) => (
          <div key={d} style={{
            padding: '8px 0', textAlign: 'center', fontSize: '0.78rem', fontWeight: 600,
            color: di === 0 ? 'var(--red-500)' : di === 6 ? 'var(--indigo-600)' : 'var(--text-sub)',
            borderRight: di < 6 ? '1px solid var(--border)' : 'none',
            borderBottom: '1px solid var(--border)', background: 'var(--surface)',
          }}>{d}</div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, wi) => {
        // Find the date range for this week row
        const weekDs = week.map(c => c.ds).filter(Boolean);
        const weekStart = weekDs[0];
        const weekEnd   = weekDs[weekDs.length - 1];

        // Spans that overlap this week
        const weekSpans = weekStart && weekEnd
          ? spanTasks.filter(t => t.date <= weekEnd && t.deadline >= weekStart)
          : [];

        return (
          <div key={wi} style={{ position: 'relative' }}>
            {/* Span bars rendered as absolute overlay — start at 30px (below date circle) */}
            {weekSpans.map((span, si) => {
              const startIdx = Math.max(0, week.findIndex(c => c.ds && c.ds >= span.date));
              const endIdx   = Math.min(6, [...week].reverse().findIndex(c => c.ds && c.ds <= span.deadline));
              const realEnd  = 6 - endIdx;
              if (startIdx > realEnd) return null;
              const left  = `${(startIdx / 7) * 100}%`;
              const width = `${((realEnd - startIdx + 1) / 7) * 100}%`;
              const isStart = week[startIdx]?.ds === span.date;
              const isEnd   = week[realEnd]?.ds === span.deadline;
              return (
                <div key={span.id} style={{
                  position: 'absolute',
                  top: `${30 + si * 18}px`,
                  left, width, zIndex: 2, pointerEvents: 'none',
                  height: 16,
                  background: span.color || 'var(--indigo-500)',
                  borderRadius: `${isStart ? 4 : 0}px ${isEnd ? 4 : 0}px ${isEnd ? 4 : 0}px ${isStart ? 4 : 0}px`,
                  opacity: span.completed ? 0.4 : 0.85,
                  display: 'flex', alignItems: 'center', overflow: 'hidden',
                }}>
                  {isStart && (
                    <span style={{ fontSize: '0.65rem', color: '#fff', padding: '0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {span.title}
                    </span>
                  )}
                  {!isStart && isEnd && (
                    <span style={{ fontSize: '0.65rem', color: '#fff', padding: '0 5px' }}>🏁</span>
                  )}
                </div>
              );
            })}

            {/* Date cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {week.map((cell, ci) => {
                const globalIdx  = wi * 7 + ci;
                const cellTasks  = cell.ds ? (taskMap[cell.ds] || []) : [];
                const cellGcal   = cell.ds ? (gcalMap[cell.ds] || []) : [];
                const isToday    = cell.ds === todayStr;
                const spanCount = weekSpans.length;
                // date circle margin pushes task chips below span bars
                const dateMarginBottom = spanCount > 0 ? `${spanCount * 18 + 4}px` : '4px';

                return (
                  <div
                    key={globalIdx}
                    onClick={() => cell.ds && onDayClick(cell.ds)}
                    style={{
                      minHeight: 90,
                      paddingTop: 6, paddingLeft: 8, paddingRight: 8, paddingBottom: 6,
                      cursor: cell.ds ? 'pointer' : 'default',
                      borderRight: (globalIdx + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                      borderBottom: '1px solid var(--border)',
                      background: cell.other ? 'rgba(0,0,0,0.02)' : 'var(--surface)',
                      transition: 'background 150ms',
                    }}
                    onMouseEnter={e => { if (cell.ds) e.currentTarget.style.background = 'var(--indigo-50)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = cell.other ? 'rgba(0,0,0,0.02)' : 'var(--surface)'; }}
                  >
                    {/* Date number — always at the top of the cell */}
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.78rem', fontWeight: isToday ? 700 : 400,
                      background: isToday ? 'var(--indigo-600)' : 'transparent',
                      color: isToday ? '#fff' : cell.other ? 'var(--text-sub)' : 'var(--text)',
                      marginBottom: dateMarginBottom,
                    }}>{cell.d}</div>

                    {cellTasks.slice(0, 2).map(t => (
                      <div key={t.id} style={{
                        fontSize: '0.68rem', padding: '1px 4px', borderRadius: 2, marginBottom: 2,
                        borderLeft: `3px solid ${t.color || 'var(--indigo-500)'}`,
                        background: 'transparent',
                        color: 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        textDecoration: t.completed ? 'line-through' : 'none',
                        opacity: t.completed ? 0.55 : 1,
                        lineHeight: '1.5',
                      }}>
                        {t.title}
                      </div>
                    ))}
                    {cellTasks.length > 2 && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>+{cellTasks.length - 2}</div>
                    )}
                    {cellGcal.slice(0, 2).map(e => (
                      <div key={e.id} style={{
                        fontSize: '0.68rem', padding: '1px 4px', borderRadius: 2, marginBottom: 2,
                        borderLeft: `3px solid ${e.color || '#4285f4'}`,
                        color: 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        lineHeight: '1.5', display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#4285f4', flexShrink: 0 }}>G</span>
                        {e.title}
                      </div>
                    ))}
                    {cellGcal.length > 2 && (
                      <div style={{ fontSize: '0.68rem', color: '#4285f4' }}>+{cellGcal.length - 2} G</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 주 뷰 ── */
function WeekView({ weekStart, tasks, gcalEvents, todayStr, onDayClick }) {
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    return { d, ds: toDateStr(d) };
  });
  const taskMap = {};
  tasks.forEach(t => { if (!taskMap[t.date]) taskMap[t.date] = []; taskMap[t.date].push(t); });
  const gcalMap = {};
  (gcalEvents || []).forEach(e => { if (!gcalMap[e.date]) gcalMap[e.date] = []; gcalMap[e.date].push(e); });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', minHeight: 400 }}>
      {weekDays.map(({ d, ds }, idx) => {
        const isToday = ds === todayStr;
        const dayTasks = taskMap[ds] || [];
        return (
          <div key={ds} onClick={() => onDayClick(ds)}
            style={{
              borderRight: idx < 6 ? '1px solid var(--border)' : 'none', cursor: 'pointer',
              background: isToday ? 'rgba(99,102,241,0.04)' : 'var(--surface)',
            }}
          >
            <div style={{
              padding: '10px 8px 8px', borderBottom: '1px solid var(--border)',
              textAlign: 'center',
              background: isToday ? 'rgba(99,102,241,0.08)' : 'transparent',
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginBottom: 4 }}>{DAYS[d.getDay()]}</div>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: 700,
                background: isToday ? 'var(--indigo-600)' : 'transparent',
                color: isToday ? '#fff' : 'var(--text)',
              }}>{d.getDate()}</div>
            </div>
            <div style={{ padding: '8px', minHeight: 200 }}>
              {dayTasks.map(t => (
                <div key={t.id} style={{
                  fontSize: '0.75rem', padding: '3px 6px', borderRadius: 4, marginBottom: 3,
                  background: t.color || 'var(--indigo-500)', color: '#fff',
                  textDecoration: t.completed ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{t.title}</div>
              ))}
              {(gcalMap[ds] || []).map(e => (
                <div key={e.id} style={{
                  fontSize: '0.75rem', padding: '3px 6px', borderRadius: 4, marginBottom: 3,
                  background: e.color || '#4285f4', color: '#fff',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.85 }}>G</span>
                  {e.title}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 연도 뷰 ── */
function YearView({ year, tasks, todayStr, onMonthClick }) {
  const taskDates = new Set(tasks.map(t => t.date));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, padding: 20 }}>
      {Array.from({ length: 12 }, (_, m) => {
        const firstDay = new Date(year, m, 1).getDay();
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
          const ds = `${year}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          cells.push({ d, ds });
        }
        return (
          <div key={m} style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: 12, cursor: 'pointer' }}
            onClick={() => onMonthClick(m)}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)', marginBottom: 8 }}>{MONTHS[m]}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
              {DAYS.map(d => (
                <div key={d} style={{ fontSize: '0.6rem', color: 'var(--text-sub)', textAlign: 'center' }}>{d}</div>
              ))}
              {cells.map((cell, i) => cell ? (
                <div key={i} style={{
                  textAlign: 'center', fontSize: '0.65rem', padding: '1px',
                  borderRadius: 3,
                  background: cell.ds === todayStr ? 'var(--indigo-600)' : taskDates.has(cell.ds) ? 'var(--indigo-100)' : 'transparent',
                  color: cell.ds === todayStr ? '#fff' : 'var(--text)',
                  fontWeight: cell.ds === todayStr ? 700 : 400,
                }}>{cell.d}</div>
              ) : <div key={i} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
