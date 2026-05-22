'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTasksByUser } from '@/models/taskModel';

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function AppHeader({ onToggleSidebar }) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showUser, setShowUser]   = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [deadlines, setDeadlines] = useState([]);

  const searchRef = useRef(null);
  const userRef   = useRef(null);
  const notifRef  = useRef(null);

  // 마감 알림 로드 (7일 이내 마감 + 기한 초과 미완료)
  const loadDeadlines = useCallback(async () => {
    if (!user) return;
    const tasks = await getTasksByUser(user.id);
    const in7 = toDateStr(new Date(Date.now() + 7 * 86400000));
    const urgent = tasks.filter(t => {
      if (t.completed) return false;
      // deadline 필드가 있으면 deadline 기준, 없으면 date 기준
      const refDate = t.deadline || t.date;
      return refDate && refDate <= in7;
    }).sort((a, b) => {
      const da = a.deadline || a.date || '';
      const db = b.deadline || b.date || '';
      return da.localeCompare(db);
    });
    setDeadlines(urgent);
  }, [user]);

  useEffect(() => { loadDeadlines(); }, [loadDeadlines]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
      if (userRef.current   && !userRef.current.contains(e.target))   setShowUser(false);
      if (notifRef.current  && !notifRef.current.contains(e.target))  setShowNotif(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleSearch(e) {
    const q = e.target.value;
    setQuery(q);
    if (!q.trim() || !user) { setResults([]); setShowResults(false); return; }
    const tasks = await getTasksByUser(user.id);
    const filtered = tasks
      .filter(t => t.title?.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 8);
    setResults(filtered);
    setShowResults(true);
  }

  const avatar = user?.name?.[0]?.toUpperCase() || 'U';

  const deadlineLabel = (ds) => {
    const now = new Date();
    const today    = toDateStr(now);
    const tomorrow = toDateStr(new Date(now.getTime() + 86400000));
    if (ds < today)    return { text: '기한 초과', color: 'var(--red-600)' };
    if (ds === today)  return { text: '오늘 마감', color: 'var(--red-500)' };
    if (ds === tomorrow) return { text: '내일 마감', color: 'var(--amber-500)' };
    return { text: ds, color: 'var(--text-sub)' };
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="icon-btn" onClick={onToggleSidebar} aria-label="사이드바 토글">
          <i className="fas fa-bars" />
        </button>
        <div className="app-brand">
          <i className="fas fa-calendar-check" />
          <span>TeamScheduler</span>
        </div>
      </div>

      {/* 검색 */}
      <div className="header-center">
        <div className="search-bar" ref={searchRef}>
          <i className="fas fa-search" />
          <input
            type="text" placeholder="할일 검색..."
            value={query} onChange={handleSearch}
            onFocus={() => results.length && setShowResults(true)}
          />
          {showResults && (
            <div className="search-results">
              {results.length === 0 ? (
                <div style={{ padding: '12px 16px', color: 'var(--text-sub)', fontSize: '0.85rem' }}>결과 없음</div>
              ) : results.map(t => (
                <div
                  key={t.id}
                  onMouseDown={() => { setQuery(t.title); setShowResults(false); }}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: '0.88rem',
                    color: 'var(--text)', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <i className="fas fa-check-circle"
                    style={{ color: t.completed ? 'var(--green-500)' : 'var(--border)' }} />
                  <span style={{ textDecoration: t.completed ? 'line-through' : 'none', opacity: t.completed ? 0.6 : 1 }}>
                    {t.title}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-sub)' }}>{t.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* 마감 알림 벨 */}
        <div className="notif-wrap" ref={notifRef}>
          <button className="icon-btn notif-btn" onClick={() => setShowNotif(p => !p)}>
            <i className="fas fa-bell" />
            {deadlines.length > 0 && (
              <span className="notif-badge">{deadlines.length}</span>
            )}
          </button>
          {showNotif && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-head">
                <span><i className="fas fa-bell" /> 마감 알림</span>
                <button className="btn-ghost btn-sm" onClick={() => { setShowNotif(false); router.push('/tasks'); }}>
                  전체 보기
                </button>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {deadlines.length === 0 ? (
                  <div style={{ padding: '20px 16px', color: 'var(--text-sub)', fontSize: '0.85rem', textAlign: 'center' }}>
                    임박한 마감이 없습니다 🎉
                  </div>
                ) : deadlines.map(t => {
                  const lbl = deadlineLabel(t.deadline);
                  return (
                    <div
                      key={t.id}
                      style={{
                        padding: '12px 16px', borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                      onClick={() => { setShowNotif(false); router.push('/tasks'); }}
                    >
                      <div style={{ fontSize: '0.88rem', color: 'var(--text)', fontWeight: 500, marginBottom: 3 }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: lbl.color, fontWeight: 600 }}>
                        <i className="fas fa-flag" style={{ marginRight: 4 }} />
                        {lbl.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 유저 칩 */}
        <div className="user-chip" ref={userRef} style={{ position: 'relative' }}
          onClick={() => setShowUser(p => !p)}>
          <div className="avatar">{avatar}</div>
          <div className="user-text">
            <span>{user?.name || '사용자'}</span>
            <span>{user?.email || ''}</span>
          </div>
          <i className="fas fa-chevron-down" style={{ color: 'var(--text-sub)', fontSize: '0.75rem' }} />

          {showUser && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
              minWidth: 180, zIndex: 50, overflow: 'hidden',
            }}>
              {/* 유저 정보 */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{user?.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: 2 }}>{user?.email}</div>
              </div>
              {/* 설정 */}
              <Link
                href="/settings"
                onMouseDown={() => setShowUser(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', color: 'var(--text)', fontSize: '0.88rem',
                  textDecoration: 'none', borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <i className="fas fa-cog" style={{ color: 'var(--text-sub)' }} /> 설정
              </Link>
              {/* 로그아웃 */}
              <button
                className="btn-ghost btn-full"
                style={{ justifyContent: 'flex-start', gap: 10, padding: '10px 16px', borderRadius: 0, color: 'var(--red-500)' }}
                onMouseDown={e => { e.stopPropagation(); signOut(); }}
              >
                <i className="fas fa-sign-out-alt" /> 로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
