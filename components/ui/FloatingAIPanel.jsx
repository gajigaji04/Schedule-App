'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getAuthToken } from '@/lib/supabase';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMd(raw) {
  return esc(raw)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[•\-]\s/gm, '<span style="display:inline-block;width:14px">•</span> ')
    .replace(/\n/g, '<br>');
}

const QUICK_ACTIONS = [
  { key: 'analyze',         label: '📊 오늘 분석' },
  { key: 'reschedule',      label: '🔄 일정 재배치' },
  { key: 'procrastination', label: '🚀 미루기 탐지' },
  { key: 'decide',          label: '🎯 의사결정' },
];

const QUICK_PROMPTS = {
  analyze:         '오늘 내 일정을 현실적으로 분석해주세요. 무엇에 집중해야 하고 무엇을 조정해야 하나요?',
  reschedule:      '기한 초과 및 미완료 작업을 우선순위에 따라 이번 주 현실적인 일정으로 재배치해 주세요.',
  procrastination: '미루고 있는 작업을 파악하고, 지금 당장 시작할 수 있는 가장 작은 첫 단계를 각각 알려주세요.',
  decide:          '오늘 가장 먼저 집중해야 할 작업 한 가지를 골라주세요. 선택 이유와 나머지 작업 처리 방향도 알려주세요.',
};

export default function FloatingAIPanel() {
  const { user } = useAuth();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [thinking, setThinking] = useState(false);
  const historyRef = useRef([]);
  const msgsEndRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      appendMsg('assistant', '안녕하세요! AI 비서 **ARIA**입니다.\n\n아래 버튼으로 빠르게 분석하거나, 궁금한 점을 직접 입력해 보세요 ✦');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function appendMsg(role, content, loading = false) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, content, loading }]);
  }

  function removeLastLoading() {
    setMessages(prev => prev.filter(m => !m.loading));
  }

  async function sendChat(text) {
    const trimmed = text.trim();
    if (thinking || !trimmed) return;
    setThinking(true);
    setInput('');
    historyRef.current.push({ role: 'user', content: trimmed });
    appendMsg('user', trimmed);
    appendMsg('assistant', '', true);
    try {
      const token = await getAuthToken();
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: historyRef.current, userId: user?.id }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const { text: reply } = await resp.json();
      historyRef.current.push({ role: 'assistant', content: reply });
      removeLastLoading();
      appendMsg('assistant', reply);
    } catch (err) {
      removeLastLoading();
      appendMsg('error', `오류: ${err.message}`);
    } finally {
      setThinking(false);
    }
  }

  function clearHistory() {
    if (thinking) return;
    historyRef.current = [];
    setMessages([]);
    appendMsg('assistant', '대화가 초기화되었습니다. 무엇을 도와드릴까요? ✦');
  }

  if (!user) return null;

  return (
    <div className="floating-ai-wrap">
      {open && (
        <div className="float-panel ai-float-panel">
          {/* Header */}
          <div className="fp-header">
            <i className="fas fa-robot" style={{ color: 'var(--indigo-600)', fontSize: '1rem' }} />
            <span style={{ fontWeight: 700, fontSize: '0.92rem', marginLeft: 6 }}>ARIA 비서</span>
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={clearHistory} title="대화 초기화" disabled={thinking}>
                <i className="fas fa-trash" style={{ fontSize: '0.75rem' }} />
              </button>
              <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setOpen(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
          </div>

          {/* Quick action buttons */}
          <div style={{ display: 'flex', gap: 4, padding: '8px 12px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.key}
                className="btn-secondary btn-sm"
                disabled={thinking}
                onClick={() => sendChat(QUICK_PROMPTS[a.key])}
                style={{ fontSize: '0.75rem', padding: '3px 8px' }}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="ai-msgs">
            {messages.map(m => (
              <div key={m.id} className={`ai-msg ai-msg--${m.role}`}>
                {m.loading ? (
                  <div className="ai-bubble ai-bubble--loading">
                    <span /><span /><span />
                  </div>
                ) : (
                  <div
                    className="ai-bubble"
                    dangerouslySetInnerHTML={{ __html: m.role === 'user' ? esc(m.content) : renderMd(m.content) }}
                  />
                )}
              </div>
            ))}
            <div ref={msgsEndRef} />
          </div>

          {/* Input */}
          <div className="fp-input-row">
            <input
              type="text"
              className="fp-input"
              placeholder="AI에게 물어보세요..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={thinking}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(input); } }}
            />
            <button className="fp-send-btn" onClick={() => sendChat(input)} disabled={thinking || !input.trim()}>
              {thinking
                ? <i className="fas fa-spinner fa-spin" />
                : <i className="fas fa-paper-plane" />
              }
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        className={`fab fab-ai${open ? ' active' : ''}`}
        onClick={() => setOpen(p => !p)}
        aria-label="AI 비서"
      >
        <i className={`fas fa-${open ? 'times' : 'robot'}`} />
      </button>
    </div>
  );
}
