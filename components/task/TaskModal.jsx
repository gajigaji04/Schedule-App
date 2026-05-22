'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { createTask, updateTask, deleteTask } from '@/models/taskModel';
import { getTeamsByUser } from '@/models/teamModel';

const COLORS = ['', '#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#6366f1','#a855f7','#ec4899','#64748b','#000000'];
const COLOR_LABELS = ['없음','빨강','주황','노랑','초록','하늘','보라','핑크','분홍','슬레이트','검정'];

export default function TaskModal({ task, defaultDate, onClose, onSave }) {
  const { user } = useAuth();
  const isEdit = Boolean(task?.id);

  const [title, setTitle]       = useState(task?.title || '');
  const [desc, setDesc]         = useState(task?.description || '');
  const [date, setDate]         = useState(task?.date || defaultDate || '');
  const [deadline, setDeadline] = useState(task?.deadline || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [color, setColor]       = useState(task?.color || '');
  const [teamId, setTeamId]     = useState(task?.team_id || '');
  const [completed, setCompleted] = useState(task?.completed || false);
  const [teams, setTeams]       = useState([]);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (user) getTeamsByUser(user.id).then(setTeams);
  }, [user]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!date) { alert('날짜를 선택해주세요.'); return; }
    setSaving(true);
    const data = {
      title: title.trim(), description: desc.trim() || null,
      date, deadline: deadline || null, priority,
      color: color || null, team_id: teamId || null,
      completed, user_id: user.id,
    };
    try {
      if (isEdit) await updateTask(task.id, data);
      else await createTask(data);
      onSave();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('할일을 삭제하시겠습니까?')) return;
    await deleteTask(task.id);
    onSave();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>
            {isEdit ? '할일 수정' : '할일 추가'}
          </h3>
          <button className="icon-btn" onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>제목 *</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="할일 제목을 입력하세요" required
              onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
            />
          </div>

          <div className="form-group">
            <label>메모</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              rows={2} placeholder="추가 메모 (선택)"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>날짜 *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>마감일</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>우선순위</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
            <div className="form-group">
              <label>팀 공유</label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)}>
                <option value="">개인 (공유 안함)</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* 색상 선택 */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
              색상 레이블
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {COLORS.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  title={COLOR_LABELS[i]}
                  onClick={() => setColor(c)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                    background: c || 'var(--border)',
                    border: `2px solid ${color === c ? 'var(--indigo-600)' : 'transparent'}`,
                    outline: color === c ? '2px solid var(--indigo-300)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* 완료 체크 (수정 시만) */}
          {isEdit && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--indigo-600)' }}
              />
              완료로 표시
            </label>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            {isEdit && (
              <button type="button" onClick={handleDelete} className="btn-secondary" style={{ marginRight: 'auto', color: 'var(--red-500)', borderColor: 'var(--red-500)' }}>
                <i className="fas fa-trash" /> 삭제
              </button>
            )}
            <button type="button" onClick={onClose} className="btn-secondary">취소</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? '저장 중...' : (isEdit ? '수정' : '추가')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
