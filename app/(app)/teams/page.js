'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTeamsByUser, createTeam, addMember, deleteTeam, getTeamMembers } from '@/models/teamModel';
import { getTasksByUser } from '@/models/taskModel';

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams]         = useState([]);
  const [taskCounts, setTaskCounts] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(null); // teamId
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [saving, setSaving]       = useState(false);

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              taskCount={taskCounts[team.id] || 0}
              isOwner={team.created_by === user?.id}
              onInvite={() => setShowInvite(team.id)}
              onDelete={() => handleDelete(team.id)}
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
    </div>
  );
}

function TeamCard({ team, taskCount, isOwner, onInvite, onDelete }) {
  const initial = team.name.charAt(0).toUpperCase();
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'var(--indigo-600)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', fontWeight: 700,
        }}>{initial}</div>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>{team.name}</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginTop: 2 }}>
            {team.description || '설명 없음'}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: 12 }}>
        <span><i className="fas fa-tasks" style={{ marginRight: 4 }} />{taskCount}개 할일</span>
        <span><i className="fas fa-users" style={{ marginRight: 4 }} />{team.member_emails?.length || 0}명</span>
      </div>
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
      <div style={{ display: 'flex', gap: 8 }}>
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
