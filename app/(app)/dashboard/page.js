'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTasksByDate, getTasksByUser, getTasksByDateRange, toggleComplete, createTask } from '@/models/taskModel';

const DAYS = ['일','월','화','수','목','금','토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getGreeting(h) {
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '좋은 오후에요';
  return '좋은 저녁이에요';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const now = new Date();
  const todayStr = toDateStr(now);

  const [todayTasks, setTodayTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, done: 0, pending: 0, shared: 0 });
  const [productivity, setProductivity] = useState({ rate: null, streak: 0, bestDay: null });
  const [miniYear, setMiniYear] = useState(now.getFullYear());
  const [miniMonth, setMiniMonth] = useState(now.getMonth());
  const [miniTasks, setMiniTasks] = useState([]);
  const [addTitle, setAddTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [today, all] = await Promise.all([
      getTasksByDate(user.id, todayStr),
      getTasksByUser(user.id),
    ]);
    setTodayTasks(today);
    setStats({
      total:   today.length,
      done:    today.filter(t => t.completed).length,
      pending: today.filter(t => !t.completed).length,
      shared:  all.filter(t => t.team_id).length,
    });
    calcProductivity(all);
  }, [user, todayStr]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const start = toDateStr(new Date(miniYear, miniMonth, 1));
    const end   = toDateStr(new Date(miniYear, miniMonth + 1, 0));
    getTasksByDateRange(user.id, start, end).then(setMiniTasks);
  }, [user, miniYear, miniMonth]);

  function calcProductivity(all) {
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const mondayStr = toDateStr(monday);
    const weekTasks = all.filter(t => t.date >= mondayStr && t.date <= todayStr);
    const rate = weekTasks.length
      ? Math.round((weekTasks.filter(t => t.completed).length / weekTasks.length) * 100)
      : null;

    let streak = 0;
    const check = new Date(now);
    check.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const ds = toDateStr(check);
      const dayT = all.filter(t => t.date === ds);
      if (dayT.length && dayT.some(t => t.completed)) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else if (i === 0) {
        check.setDate(check.getDate() - 1);
      } else break;
    }

    const dayTotals = [0,0,0,0,0,0,0];
    const dayCounts = [0,0,0,0,0,0,0];
    all.filter(t => t.completed).forEach(t => { dayTotals[new Date(t.date + 'T00:00:00').getDay()]++; });
    all.forEach(t => { dayCounts[new Date(t.date + 'T00:00:00').getDay()]++; });
    let bestDay = null, bestAvg = -1;
    for (let d = 0; d < 7; d++) {
      if (!dayCounts[d]) continue;
      const avg = dayTotals[d] / dayCounts[d];
      if (avg > bestAvg) { bestAvg = avg; bestDay = d; }
    }
    setProductivity({ rate, streak, bestDay });
  }

  async function handleToggle(id, cur) {
    await toggleComplete(id, cur);
    load();
  }

  async function handleAddTask(e) {
    e.preventDefault();
    if (!addTitle.trim() || !user) return;
    setAdding(true);
    await createTask({
      user_id: user.id, title: addTitle.trim(), date: todayStr,
      completed: false, priority: 'medium',
    });
    setAddTitle('');
    setAdding(false);
    load();
  }

  // Mini calendar helpers
  const firstDay = new Date(miniYear, miniMonth, 1).getDay();
  const daysInMonth = new Date(miniYear, miniMonth + 1, 0).getDate();
  const taskDates = new Set(miniTasks.map(t => t.date));

  return (
    <div>
      {/* 헤더 */}
      <div className="view-header">
        <div>
          <h2 id="dash-greeting">
            {getGreeting(now.getHours())}, {user?.name || '사용자'}님!
          </h2>
          <p className="view-sub">
            {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일 {DAYS[now.getDay()]}요일
          </p>
        </div>
      </div>

      {/* 통계 카드 4개 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard icon="fas fa-list-check" iconColor="indigo" num={stats.total}   label="오늘 할일" />
        <StatCard icon="fas fa-circle-check" iconColor="green" num={stats.done}   label="완료" />
        <StatCard icon="fas fa-clock"        iconColor="amber" num={stats.pending} label="미완료" />
        <StatCard icon="fas fa-users"        iconColor="purple" num={stats.shared} label="팀 공유" />
      </div>

      {/* 생산성 카드 3개 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        <ProdCard
          icon="fas fa-chart-line" iconColor="var(--indigo-600)"
          num={productivity.rate !== null ? `${productivity.rate}%` : '-'}
          label="이번 주 완료율"
          bar={productivity.rate}
        />
        <ProdCard
          icon="fas fa-fire" iconColor="#f97316"
          num={productivity.streak}
          label="연속 달성일"
        />
        <ProdCard
          icon="fas fa-star" iconColor="#eab308"
          num={productivity.bestDay !== null ? DAYS[productivity.bestDay] + '요일' : '-'}
          label="최고 생산성 요일"
        />
      </div>

      {/* 오늘 할일 + 미니 캘린더 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* 오늘 할일 */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
              오늘 할일
              <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-sub)' }}>
                {now.getMonth() + 1}/{now.getDate()}
              </span>
            </h3>
          </div>

          {/* 빠른 추가 */}
          <form onSubmit={handleAddTask} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="할일 추가..."
              value={addTitle}
              onChange={e => setAddTitle(e.target.value)}
              style={{
                flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '7px 12px', fontSize: '0.88rem', background: 'var(--bg)', color: 'var(--text)',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn-primary btn-sm" disabled={adding}>
              <i className="fas fa-plus" />
            </button>
          </form>

          {todayTasks.length === 0 ? (
            <p style={{ color: 'var(--text-sub)', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>
              오늘 등록된 할일이 없어요
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayTasks.map(t => (
                <TaskItem key={t.id} task={t} onToggle={() => handleToggle(t.id, t.completed)} />
              ))}
            </div>
          )}
        </div>

        {/* 미니 캘린더 */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              onClick={() => {
                if (miniMonth === 0) { setMiniMonth(11); setMiniYear(y => y - 1); }
                else setMiniMonth(m => m - 1);
              }}
              className="icon-btn"
            ><i className="fas fa-chevron-left" /></button>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
              {miniYear}년 {MONTHS[miniMonth]}
            </span>
            <button
              onClick={() => {
                if (miniMonth === 11) { setMiniMonth(0); setMiniYear(y => y + 1); }
                else setMiniMonth(m => m + 1);
              }}
              className="icon-btn"
            ><i className="fas fa-chevron-right" /></button>
          </div>
          <MiniCalendar
            year={miniYear} month={miniMonth}
            firstDay={firstDay} daysInMonth={daysInMonth}
            taskDates={taskDates} todayStr={todayStr}
            onDateClick={date => router.push(`/calendar?date=${date}`)}
          />
        </div>
      </div>
    </div>
  );
}

/* ── 하위 컴포넌트 ── */

function StatCard({ icon, iconColor, num, label }) {
  const colors = {
    indigo: { bg: 'var(--indigo-50)', color: 'var(--indigo-600)' },
    green:  { bg: 'var(--green-50)',  color: 'var(--green-600)' },
    amber:  { bg: '#fffbeb',          color: 'var(--amber-600)' },
    purple: { bg: '#faf5ff',          color: 'var(--purple-500)' },
  };
  const c = colors[iconColor] || colors.indigo;
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: c.bg, color: c.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
        }}>
          <i className={icon} />
        </div>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{num}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function ProdCard({ icon, iconColor, num, label, bar }) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: bar != null ? 10 : 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: 'var(--indigo-50)', color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
        }}>
          <i className={icon} />
        </div>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{num}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: 2 }}>{label}</div>
        </div>
      </div>
      {bar != null && (
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${bar}%`, background: 'var(--indigo-500)', borderRadius: 999, transition: 'width 0.4s ease' }} />
        </div>
      )}
    </div>
  );
}

function TaskItem({ task, onToggle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 'var(--radius-sm)',
      background: 'var(--bg)', border: '1px solid var(--border)',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${task.completed ? 'var(--indigo-600)' : 'var(--border)'}`,
          background: task.completed ? 'var(--indigo-600)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '0.65rem',
        }}
      >
        {task.completed && <i className="fas fa-check" />}
      </button>
      <span style={{
        flex: 1, fontSize: '0.88rem', color: 'var(--text)',
        textDecoration: task.completed ? 'line-through' : 'none',
        opacity: task.completed ? 0.5 : 1,
      }}>
        {task.title}
      </span>
      {task.priority === 'high' && (
        <span style={{ fontSize: '0.72rem', color: 'var(--red-500)', fontWeight: 600 }}>높음</span>
      )}
    </div>
  );
}

function MiniCalendar({ year, month, firstDay, daysInMonth, taskDates, todayStr, onDateClick }) {
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ d, ds });
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-sub)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} />;
          const isToday = cell.ds === todayStr;
          const hasTasks = taskDates.has(cell.ds);
          return (
            <div
              key={cell.ds}
              onClick={() => onDateClick(cell.ds)}
              style={{
                textAlign: 'center', padding: '4px 2px', borderRadius: 6, cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: isToday ? 700 : 400,
                background: isToday ? 'var(--indigo-600)' : 'transparent',
                color: isToday ? '#fff' : 'var(--text)',
                position: 'relative',
              }}
            >
              {cell.d}
              {hasTasks && !isToday && (
                <div style={{
                  position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: '50%', background: 'var(--indigo-500)',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
