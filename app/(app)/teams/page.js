'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTeamsByUser, createTeam, addMember, deleteTeam } from '@/models/teamModel';
import { getTasksByUser } from '@/models/taskModel';
import { getTeamEvents, createTeamEvent, deleteTeamEvent, getEventRsvps, upsertRsvp } from '@/models/teamEventModel';

const RSVP_OPTIONS = [
  { value: 'yes',   label: '참석',  icon: 'fa-check',        color: 'var(--green-600)' },
  { value: 'no',    label: '불참',  icon: 'fa-times',        color: 'var(--red-500)'   },
  { value: 'maybe', label: '미정',  icon: 'fa-question',     color: 'var(--text-sub)'  },
];

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams]             = useState([]);
  const [taskCounts, setTaskCounts]   = useState({});
  const [teamEvents, setTeamEvents]   = useState({});   // { teamId: events[] }
  const [eventRsvps, setEventRsvps]   = useState({});   // { eventId: rsvp[] }
  const [showCreate, setShowCreate]   = useState(false);
  const [showInvite, setShowInvite]   = useState(null);
  const [showNewEvent, setShowNewEvent] = useState(null); // teamId
  const [createForm, setCreateForm]   = useState({ name: '', description: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [eventForm, setEventForm]     = useState({ title: '', date: '', description: '' });
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [teamList, tasks] = await Promise.all([
      getTeamsByUser(user.id),
      getTasksByUser(user.id),
    ]);
    const counts = {};
    tasks.forEach(t => { if (t.team_id) counts[t.team_id] = (counts[t.team_id] || 0) + 1; });
    setTeams(teamList);
    setTaskCounts(counts);

    // Load events for each team
    const eventsMap = {};
    await Promise.all(teamList.map(async t => {
      eventsMap[t.id] = await getTeamEvents(t.id);
    }));
    setTeamEvents(eventsMap);

    // Load RSVPs for all events
    const allEvents = Object.values(eventsMap).flat();
    const rsvpMap = {};
    await Promise.all(allEvents.map(async ev => {
      rsvpMap[ev.id] = await getEventRsvps(ev.id);
    }));
    setEventRsvps(rsvpMap);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setSaving(true);
    await createTeam(createForm.name.trim(), createForm.description.trim(), user.id, user.email);
    setCreateForm({ name: '', description: '' });
    setShowCreate(false);
    setSaving(false);
    load();
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim() || !showInvite) return;
    setSaving(true);
    await addMember(showInvite, inviteEmail.trim());
    setInviteEmail('');
    setShowInvite(null);
    setSaving(false);
    load();
  }

  async function handleDelete(teamId) {
    if (!confirm('팀을 삭제하면 팀에 공유된 할일도 팀 연결이 해제됩니다. 삭제하시겠습니까?')) return;
    await deleteTeam(teamId);
    load();
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    if (!eventForm.title.trim() || !eventForm.date || !showNewEvent) return;
    setSaving(true);
    await createTeamEvent({
      team_id: showNewEvent,
      created_by: user.id,
      title: eventForm.title.trim(),
      description: eventForm.description.trim(),
      date: eventForm.date,
    });
    setEventForm({ title: '', date: '', description: '' });
    setShowNewEvent(null);
    setSaving(false);
    load();
  }

  async function handleDeleteEvent(eventId) {
    await deleteTeamEvent(eventId);
    load();
  }

  async function handleRsvp(eventId, response) {
    await upsertRsvp(eventId, user.id, user.name || user.email, response);
    const updated = await getEventRsvps(eventId);
    setEventRsvps(prev => ({ ...prev, [eventId]: updated }));
  }

  return (
    <div>
      <div className="view-header">
        <div>
          <h2>팀 관리</h2>
          <p className="view-sub">팀을 만들고 멤버를 초대해 일정을 공유하세요</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <i className="fas fa-plus" /> 팀 만들기
        </button>
      </div>

      {teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-sub)' }}>
          <i className="fas fa-users" style={{ fontSize: '2.5rem', marginBottom: 16, display: 'block', color: 'var(--border)' }} />
          <p style={{ marginBottom: 16 }}>참여 중인 팀이 없습니다</p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>팀 만들기</button>
        </div>
      ) : (
        <div className="teams-grid">
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              taskCount={taskCounts[team.id] || 0}
              isOwner={team.created_by === user?.id}
              events={teamEvents[team.id] || []}
              eventRsvps={eventRsvps}
              userId={user?.id}
              onInvite={() => setShowInvite(team.id)}
              onDelete={() => handleDelete(team.id)}
              onCreateEvent={() => { setShowNewEvent(team.id); setEventForm({ title: '', date: '', description: '' }); }}
              onDeleteEvent={handleDeleteEvent}
              onRsvp={handleRsvp}
            />
          ))}
        </div>
      )}

      {/* 팀 만들기 모달 */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text)' }}>팀 만들기</h3>
              <button className="icon-btn" onClick={() => setShowCreate(false)}><i className="fas fa-times" /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label>팀 이름 *</label>
                <input
                  type="text" placeholder="팀 이름을 입력하세요" required
                  value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>설명</label>
                <input
                  type="text" placeholder="팀 설명 (선택)"
                  value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>취소</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '생성 중...' : '팀 만들기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 멤버 초대 모달 */}
      {showInvite && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInvite(null)}>
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text)' }}>멤버 초대</h3>
              <button className="icon-btn" onClick={() => setShowInvite(null)}><i className="fas fa-times" /></button>
            </div>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label>이메일 주소</label>
                <input
                  type="email" placeholder="초대할 멤버의 이메일"
                  value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowInvite(null)}>취소</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '초대 중...' : '초대'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 팀 일정 만들기 모달 */}
      {showNewEvent && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNewEvent(null)}>
          <div className="modal-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text)' }}>팀 일정 만들기</h3>
              <button className="icon-btn" onClick={() => setShowNewEvent(null)}><i className="fas fa-times" /></button>
            </div>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label>일정 제목 *</label>
                <input
                  type="text" placeholder="일정 제목" required
                  value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>날짜 *</label>
                <input
                  type="date" required
                  value={eventForm.date} onChange={e => setEventForm(p => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>설명</label>
                <input
                  type="text" placeholder="일정 설명 (선택)"
                  value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewEvent(null)}>취소</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '저장 중...' : '일정 만들기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, taskCount, isOwner, events, eventRsvps, userId, onInvite, onDelete, onCreateEvent, onDeleteEvent, onRsvp }) {
  const initial = team.name.charAt(0).toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = events.filter(e => e.date >= today).slice(0, 5);
  const pastEvents = events.filter(e => e.date < today).length;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* 팀 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'var(--indigo-600)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', fontWeight: 700,
        }}>{initial}</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{team.name}</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginTop: 2 }}>
            {team.description || '설명 없음'}
          </p>
        </div>
      </div>

      {/* 통계 */}
      <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: 12 }}>
        <span><i className="fas fa-tasks" style={{ marginRight: 4 }} />{taskCount}개 할일</span>
        <span><i className="fas fa-users" style={{ marginRight: 4 }} />{team.member_emails?.length || 0}명</span>
        <span><i className="fas fa-calendar-alt" style={{ marginRight: 4 }} />{events.length}개 일정</span>
      </div>

      {/* 멤버 이메일 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {(team.member_emails || []).slice(0, 5).map(email => (
          <span key={email} style={{
            fontSize: '0.75rem', padding: '2px 8px', borderRadius: 999,
            background: 'var(--indigo-50)', color: 'var(--indigo-600)',
          }}>{email}</span>
        ))}
        {(team.member_emails?.length || 0) > 5 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
            +{team.member_emails.length - 5} more
          </span>
        )}
      </div>

      {/* 팀 일정 섹션 */}
      <div style={{
        borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>
            <i className="fas fa-calendar-check" style={{ marginRight: 6, color: 'var(--indigo-600)' }} />
            팀 일정
          </span>
          {isOwner && (
            <button
              className="btn-secondary btn-sm"
              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              onClick={onCreateEvent}
            >
              <i className="fas fa-plus" style={{ marginRight: 4 }} />일정 추가
            </button>
          )}
        </div>

        {upcomingEvents.length === 0 ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-sub)', padding: '8px 0', textAlign: 'center' }}>
            {pastEvents > 0 ? `지난 일정 ${pastEvents}개` : '예정된 일정이 없습니다'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcomingEvents.map(ev => {
              const rsvps = eventRsvps[ev.id] || [];
              const myRsvp = rsvps.find(r => r.user_id === userId);
              const yesCnt   = rsvps.filter(r => r.response === 'yes').length;
              const noCnt    = rsvps.filter(r => r.response === 'no').length;
              const maybeCnt = rsvps.filter(r => r.response === 'maybe').length;
              const isCreator = ev.created_by === userId;
              return (
                <div key={ev.id} style={{
                  background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 2 }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--indigo-600)', marginBottom: ev.description ? 4 : 6 }}>
                        <i className="fas fa-calendar" style={{ marginRight: 4 }} />{fmtDate(ev.date)}
                      </div>
                      {ev.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginBottom: 6 }}>
                          {ev.description}
                        </div>
                      )}
                      {/* RSVP 집계 */}
                      <div style={{ display: 'flex', gap: 8, fontSize: '0.72rem', color: 'var(--text-sub)', marginBottom: 8 }}>
                        <span style={{ color: 'var(--green-600)' }}>
                          <i className="fas fa-check" style={{ marginRight: 2 }} />{yesCnt}
                        </span>
                        <span style={{ color: 'var(--red-500)' }}>
                          <i className="fas fa-times" style={{ marginRight: 2 }} />{noCnt}
                        </span>
                        <span>
                          <i className="fas fa-question" style={{ marginRight: 2 }} />{maybeCnt}
                        </span>
                        {rsvps.length > 0 && (
                          <span style={{ marginLeft: 4 }}>
                            {rsvps.map(r => (
                              <span key={r.user_id} title={`${r.user_name}: ${r.response === 'yes' ? '참석' : r.response === 'no' ? '불참' : '미정'}`}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  width: 18, height: 18, borderRadius: '50%', fontSize: '0.6rem',
                                  background: r.response === 'yes' ? 'var(--green-600)' : r.response === 'no' ? 'var(--red-500)' : 'var(--border)',
                                  color: '#fff', marginRight: 2, fontWeight: 700,
                                }}>
                                {r.user_name?.[0]?.toUpperCase() || '?'}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                      {/* RSVP 버튼 */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {RSVP_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => onRsvp(ev.id, opt.value)}
                            title={opt.label}
                            style={{
                              padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', cursor: 'pointer',
                              border: `1.5px solid ${myRsvp?.response === opt.value ? opt.color : 'var(--border)'}`,
                              background: myRsvp?.response === opt.value ? opt.color : 'transparent',
                              color: myRsvp?.response === opt.value ? '#fff' : opt.color,
                              fontWeight: myRsvp?.response === opt.value ? 700 : 400,
                              transition: 'all 120ms',
                            }}
                          >
                            <i className={`fas ${opt.icon}`} style={{ marginRight: 4 }} />{opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {isCreator && (
                      <button
                        className="icon-btn"
                        style={{ width: 22, height: 22, flexShrink: 0, color: 'var(--text-sub)', fontSize: '0.72rem' }}
                        onClick={() => onDeleteEvent(ev.id)}
                        title="일정 삭제"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button className="btn-secondary btn-sm" onClick={onInvite}>
          <i className="fas fa-share-alt" /> 초대
        </button>
        {isOwner && (
          <button
            className="btn-secondary btn-sm"
            style={{ marginLeft: 'auto', color: 'var(--red-500)', borderColor: 'var(--red-500)' }}
            onClick={onDelete}
          >
            <i className="fas fa-trash" />
          </button>
        )}
      </div>
    </div>
  );
}
