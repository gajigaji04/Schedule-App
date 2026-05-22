'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTeamsByUser, getTeamById, getTeamMembers, addMember } from '@/models/teamModel';
import * as Chat from '@/models/chatModel';
import * as Dm from '@/models/dmModel';
import { db } from '@/lib/supabase';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

export default function FloatingChatPanel() {
  const { user } = useAuth();
  const [open, setOpen]             = useState(false);
  const [tab, setTab]               = useState('group');
  const [teams, setTeams]           = useState([]);
  const [dmUsers, setDmUsers]       = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [input, setInput]           = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [memberList, setMemberList] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');

  const channelRef = useRef(null);
  const msgsEndRef = useRef(null);
  const sentIds    = useRef(new Set());

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      db.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => () => unsubscribe(), [unsubscribe]);

  useEffect(() => {
    if (!open || !user) return;
    if (tab === 'group') loadGroupList();
    else loadDmList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, user]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadGroupList() {
    const list = await getTeamsByUser(user.id);
    setTeams(list);
    if (list.length) await selectGroup(list[0]);
  }

  async function loadDmList() {
    const list = await getTeamsByUser(user.id);
    const memberMap = {};
    for (const team of list) {
      const members = await getTeamMembers(team);
      for (const m of members) {
        if (m.id !== user.id) memberMap[m.id] = m;
      }
    }
    const users = Object.values(memberMap);
    setDmUsers(users);
    if (users.length) await selectDm(users[0]);
  }

  async function selectGroup(team) {
    unsubscribe();
    setActiveRoom({ type: 'group', id: team.id, name: team.name });
    setMessages([]);
    setLoading(true);
    try {
      setMessages(await Chat.getMessages(team.id));
    } finally {
      setLoading(false);
    }
    channelRef.current = Chat.subscribeToRoom(team.id, msg => {
      if (sentIds.current.has(msg.id)) { sentIds.current.delete(msg.id); return; }
      setMessages(prev => [...prev, msg]);
    });
  }

  async function selectDm(dmUser) {
    unsubscribe();
    const chId = Dm.channelId(user.id, dmUser.id);
    setActiveRoom({ type: 'dm', id: chId, name: dmUser.name, dmUserId: dmUser.id });
    setMessages([]);
    setLoading(true);
    try {
      const raw = await Dm.getMessages(chId);
      setMessages(raw.map(m => ({
        id: m.id, user_id: m.from_user_id, user_name: m.from_name,
        content: m.content, created_at: m.created_at,
      })));
    } finally {
      setLoading(false);
    }
    channelRef.current = Dm.subscribe(chId, msg => {
      const norm = { id: msg.id, user_id: msg.from_user_id, user_name: msg.from_name, content: msg.content, created_at: msg.created_at };
      if (sentIds.current.has(msg.id)) { sentIds.current.delete(msg.id); return; }
      setMessages(prev => [...prev, norm]);
    });
  }

  async function sendMessage() {
    if (!input.trim() || !activeRoom) return;
    const content = input.trim();
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    setInput('');
    const optimistic = { id: msgId, user_id: user.id, user_name: user.name, content, created_at: new Date().toISOString() };
    sentIds.current.add(msgId);
    setMessages(prev => [...prev, optimistic]);
    try {
      if (activeRoom.type === 'dm') {
        await Dm.sendMessage(activeRoom.id, user.id, user.name, activeRoom.dmUserId, content, msgId);
      } else {
        await Chat.sendMessage(activeRoom.id, user.id, user.name, content, msgId);
      }
    } catch {
      sentIds.current.delete(msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      setInput(content);
    }
  }

  async function openMembers() {
    if (!activeRoom || activeRoom.type !== 'group') return;
    const team = await getTeamById(activeRoom.id);
    setMemberList(team?.member_emails ?? []);
    setShowMembers(true);
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    try {
      await addMember(activeRoom.id, inviteEmail.trim());
      const team = await getTeamById(activeRoom.id);
      setMemberList(team?.member_emails ?? []);
      setInviteEmail('');
    } catch (err) {
      alert('초대 실패: ' + err.message);
    }
  }

  if (!user) return null;

  return (
    <div className="floating-chat-wrap">
      {open && (
        <div className="float-panel chat-float-panel">
          {/* Header */}
          <div className="fp-header">
            <div className="fp-tabs">
              <button className={`fp-tab${tab === 'group' ? ' active' : ''}`} onClick={() => setTab('group')}>
                <i className="fas fa-users" /> 그룹
              </button>
              <button className={`fp-tab${tab === 'dm' ? ' active' : ''}`} onClick={() => setTab('dm')}>
                <i className="fas fa-comment" /> DM
              </button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              {activeRoom?.type === 'group' && (
                <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={openMembers} title="멤버 관리">
                  <i className="fas fa-user-plus" style={{ fontSize: '0.78rem' }} />
                </button>
              )}
              <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setOpen(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="fp-body">
            {/* Room list */}
            <div className="fp-rooms">
              {tab === 'group'
                ? teams.length === 0
                  ? <div className="fp-empty">팀 없음</div>
                  : teams.map(t => (
                    <div key={t.id}
                      className={`fp-room-item${activeRoom?.id === t.id ? ' active' : ''}`}
                      onClick={() => selectGroup(t)}>
                      <div className="fp-room-avatar">{t.name[0].toUpperCase()}</div>
                      <span>{t.name}</span>
                    </div>
                  ))
                : dmUsers.length === 0
                  ? <div className="fp-empty">팀원 없음</div>
                  : dmUsers.map(u => (
                    <div key={u.id}
                      className={`fp-room-item${activeRoom?.dmUserId === u.id ? ' active' : ''}`}
                      onClick={() => selectDm(u)}>
                      <div className="fp-room-avatar fp-room-avatar--dm">{u.name[0].toUpperCase()}</div>
                      <span>{u.name}</span>
                    </div>
                  ))
              }
            </div>

            {/* Messages */}
            <div className="fp-msgs-wrap">
              {activeRoom && (
                <div className="fp-msgs-name">
                  {activeRoom.type === 'dm' ? '💬 ' : ''}{activeRoom.name}
                </div>
              )}
              <div className="fp-msgs">
                {loading && (
                  <div className="fp-loading"><i className="fas fa-spinner fa-spin" /></div>
                )}
                {!loading && messages.length === 0 && (
                  <div className="fp-no-msgs">아직 메시지가 없습니다</div>
                )}
                {messages.map(m => {
                  const mine = m.user_id === user.id;
                  const time = new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={m.id} className={`fp-msg${mine ? ' fp-msg--mine' : ''}`}>
                      {!mine && <div className="fp-msg-sender">{m.user_name}</div>}
                      <div className="fp-msg-bubble" dangerouslySetInnerHTML={{ __html: esc(m.content) }} />
                      <div className="fp-msg-time">{time}</div>
                    </div>
                  );
                })}
                <div ref={msgsEndRef} />
              </div>
              <div className="fp-input-row">
                <input
                  type="text" className="fp-input" placeholder="메시지 입력..."
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                />
                <button className="fp-send-btn" onClick={sendMessage} disabled={!input.trim()}>
                  <i className="fas fa-paper-plane" />
                </button>
              </div>
            </div>
          </div>

          {/* Member management overlay */}
          {showMembers && (
            <div className="fp-members-overlay" onClick={() => setShowMembers(false)}>
              <div className="fp-members-card" onClick={e => e.stopPropagation()}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>멤버 관리</div>
                <ul style={{ listStyle: 'none', marginBottom: 12, maxHeight: 120, overflowY: 'auto' }}>
                  {memberList.map(email => (
                    <li key={email} style={{ padding: '4px 0', fontSize: '0.82rem', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                      <i className="fas fa-user" style={{ marginRight: 8, color: 'var(--text-sub)' }} />{email}
                    </li>
                  ))}
                </ul>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="email" placeholder="초대할 이메일" value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
                    style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontSize: '0.82rem' }}
                  />
                  <button className="btn-primary btn-sm" onClick={handleInvite}>초대</button>
                </div>
                <button className="btn-ghost btn-sm" style={{ marginTop: 8, width: '100%' }} onClick={() => setShowMembers(false)}>닫기</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button className={`fab fab-chat${open ? ' active' : ''}`} onClick={() => setOpen(p => !p)} aria-label="채팅">
        <i className={`fas fa-${open ? 'times' : 'comments'}`} />
      </button>
    </div>
  );
}
