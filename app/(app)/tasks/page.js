'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTasksByUser, toggleComplete } from '@/models/taskModel';
import { getTeamsByUser } from '@/models/teamModel';
import TaskModal from '@/components/task/TaskModal';

const FILTERS = [
  { key: 'all',     label: '전체' },
  { key: 'today',   label: '오늘' },
  { key: 'pending', label: '미완료' },
  { key: 'done',    label: '완료' },
  { key: 'shared',  label: '팀 공유' },
];

const PRIORITY_LABEL = { high: '높음', medium: '보통', low: '낮음' };
const PRIORITY_COLOR = { high: 'var(--red-500)', medium: 'var(--amber-500)', low: 'var(--green-500)' };

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function TasksPage() {
  const { user } = useAuth();
  const today = toDateStr(new Date());

  const [allTasks, setAllTasks] = useState([]);
  const [teams, setTeams]       = useState([]);
  const [filter, setFilter]     = useState('all');
  const [modal, setModal]       = useState(null); // null | 'add' | task object

  const load = useCallback(async () => {
    if (!user) return;
    const [tasks, teamList] = await Promise.all([
      getTasksByUser(user.id),
      getTeamsByUser(user.id),
    ]);
    tasks.sort((a, b) => b.date.localeCompare(a.date));
    setAllTasks(tasks);
    setTeams(teamList);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const teamsMap = Object.fromEntries(teams.map(t => [t.id, t]));

  const filtered = allTasks.filter(t => {
    if (filter === 'today')   return t.date === today;
    if (filter === 'pending') return !t.completed;
    if (filter === 'done')    return t.completed;
    if (filter === 'shared')  return Boolean(t.team_id);
    return true;
  });

  async function handleToggle(id, cur) {
    await toggleComplete(id, cur);
    load();
  }

  return (
    <div>
      <div className="view-header">
        <div>
          <h2>내 할일</h2>
          <p className="view-sub">할일을 관리하고 완료 상태를 추적하세요</p>
        </div>
        <button className="btn-primary" onClick={() => setModal('add')}>
          <i className="fas fa-plus" /> 할일 추가
        </button>
      </div>

      {/* 필터 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 500, border: '1px solid var(--border)',
              background: filter === f.key ? 'var(--indigo-600)' : 'var(--surface)',
              color: filter === f.key ? '#fff' : 'var(--text)',
              transition: 'background 150ms',
            }}
          >
            {f.label}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>
              ({filter === f.key ? filtered.length : allTasks.filter(t => {
                if (f.key === 'today')   return t.date === today;
                if (f.key === 'pending') return !t.completed;
                if (f.key === 'done')    return t.completed;
                if (f.key === 'shared')  return Boolean(t.team_id);
                return true;
              }).length})
            </span>
          </button>
        ))}
      </div>

      {/* 할일 목록 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-sub)' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '2rem', marginBottom: 12, display: 'block', color: 'var(--border)' }} />
            할일이 없습니다
          </div>
        ) : filtered.map((t, i) => (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 20px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              borderLeft: t.color ? `4px solid ${t.color}` : '4px solid transparent',
            }}
          >
            <button
              onClick={() => handleToggle(t.id, t.completed)}
              style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${t.completed ? 'var(--indigo-600)' : 'var(--border)'}`,
                background: t.completed ? 'var(--indigo-600)' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.65rem',
              }}
            >
              {t.completed && <i className="fas fa-check" />}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.92rem', color: 'var(--text)', fontWeight: 500,
                textDecoration: t.completed ? 'line-through' : 'none',
                opacity: t.completed ? 0.5 : 1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {t.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: 2, display: 'flex', gap: 8 }}>
                <span><i className="fas fa-calendar" style={{ marginRight: 4 }} />{t.date}</span>
                {t.team_id && teamsMap[t.team_id] && (
                  <span><i className="fas fa-users" style={{ marginRight: 4 }} />{teamsMap[t.team_id].name}</span>
                )}
                {t.deadline && (
                  <span style={{ color: 'var(--amber-500)' }}>
                    <i className="fas fa-flag" style={{ marginRight: 4 }} />마감: {t.deadline}
                  </span>
                )}
              </div>
            </div>

            <span style={{ fontSize: '0.75rem', color: PRIORITY_COLOR[t.priority], fontWeight: 600, flexShrink: 0 }}>
              {PRIORITY_LABEL[t.priority]}
            </span>

            <button
              className="icon-btn"
              onClick={() => setModal(t)}
              style={{ flexShrink: 0 }}
            >
              <i className="fas fa-ellipsis-v" />
            </button>
          </div>
        ))}
      </div>

      {modal && (
        <TaskModal
          task={modal === 'add' ? null : modal}
          defaultDate={today}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
