'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTasksByUser } from '@/models/taskModel';

const MODEL   = 'claude-haiku-4-5-20251001';
const KEY_LOC = 'ts_ai_key';
const SYSTEM  = `당신은 TeamScheduler의 AI 비서 "ARIA"입니다. 사용자의 일정과 할 일을 분석하여 생산성을 극대화하도록 돕습니다.

핵심 역할:
• 현실 반영형 분석 — 오늘 실제로 완수 가능한 작업 수를 솔직하게 평가
• AI 재배치 — 지연·과부하 일정을 우선순위와 마감일 기반으로 재편
• 미루기 방지 — 반복 지연 패턴을 탐지하고 지금 당장 시작할 수 있는 가장 작은 첫 단계 제시
• 의사결정 지원 — 선택 상황에서 핵심 기준과 리스크를 명확히 제시

응답 규칙: 반드시 한국어로, 간결하고 실용적으로(400자 이내), 구체적인 행동 방안, 솔직하되 배려 있는 톤, 마크다운 사용 가능(볼드·리스트)`;

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
  { key: 'analyze',        label: '📊 오늘 분석' },
  { key: 'reschedule',     label: '🔄 일정 재배치' },
  { key: 'procrastination', label: '🚀 미루기 탐지' },
  { key: 'decide',         label: '🎯 의사결정' },
];

export default function FloatingAIPanel() {
  const { user } = useAuth();
  const [open, setOpen]             = useState(false);
  const [apiKey, setApiKey]         = useState('');
  const [keyInput, setKeyInput]     = useState('');
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [thinking, setThinking]     = useState(false);
  const historyRef = useRef([]);
  const msgsEndRef = useRef(null);

  useEffect(() => {
    const k = typeof window !== 'undefined' ? localStorage.getItem(KEY_LOC) || '' : '';
    setApiKey(k);
    setShowKeySetup(!k);
  }, []);

  useEffect(() => {
    if (open && apiKey && messages.length === 0) {
      appendMsg('assistant', '안녕하세요! AI 비서 **ARIA**입니다.\n\n아래 버튼으로 빠르게 분석하거나, 궁금한 점을 직접 입력해 보세요 ✦');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, apiKey]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function appendMsg(role, content, loading = false) {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, content, loading }]);
  }

  function removeLastLoading() {
    setMessages(prev => prev.filter(m => !m.loading));
  }

  async function getContext() {
    if (!user) return '작업 데이터 없음';
    const today = new Date().toISOString().slice(0, 10);
    try {
      const tasks = await getTasksByUser(user.id);
      if (!tasks?.length) return `오늘: ${today}\n등록된 할 일이 없습니다.`;
      const overdue   = tasks.filter(t => t.date < today && !t.completed);
      const todayList = tasks.filter(t => t.date === today);
      const upcoming  = tasks.filter(t => t.date > today && !t.completed).slice(0, 5);
      const doneCount = tasks.filter(t => t.completed).length;
      return [
        `오늘 날짜: ${today}`,
        `전체 할 일: ${tasks.length}개 (완료: ${doneCount}개)`,
        `오늘 예정: ${todayList.length ? todayList.map(t => `"${t.title}"`).join(', ') : '없음'}`,
        `기한 초과: ${overdue.length ? overdue.map(t => `"${t.title}"(${t.date})`).join(', ') : '없음'}`,
        `예정 작업: ${upcoming.length ? upcoming.map(t => `"${t.title}"(${t.date})`).join(', ') : '없음'}`,
      ].join('\n');
    } catch {
      return `오늘: ${today}`;
    }
  }

  async function callClaude(msgs) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, system: SYSTEM, messages: msgs }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return data.content[0].text;
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
      const reply = await callClaude(historyRef.current);
      historyRef.current.push({ role: 'assistant', content: reply });
      removeLastLoading();
      appendMsg('assistant', reply);
    } catch (err) {
      removeLastLoading();
      if (err.message.includes('401') || err.message.includes('API 키')) {
        localStorage.removeItem(KEY_LOC);
        setApiKey('');
        setShowKeySetup(true);
        appendMsg('error', '⚠️ API 키가 유효하지 않습니다. 다시 설정해 주세요.');
      } else {
        appendMsg('error', `오류: ${err.message}`);
      }
    } finally {
      setThinking(false);
    }
  }

  async function runQuickAction(type) {
    if (thinking) return;
    const ctx = await getContext();
    const prompts = {
      analyze:         `다음은 내 현재 할 일 현황입니다:\n${ctx}\n\n오늘 일정을 현실적으로 분석해주세요. 무엇에 집중해야 하고 무엇을 조정해야 하나요?`,
      reschedule:      `다음은 내 현재 할 일 현황입니다:\n${ctx}\n\n기한 초과 및 미완료 작업을 우선순위에 따라 이번 주 현실적인 일정으로 재배치해 주세요.`,
      procrastination: `다음은 내 현재 할 일 현황입니다:\n${ctx}\n\n미루고 있는 작업을 파악하고, 지금 당장 시작할 수 있는 가장 작은 첫 단계를 각각 알려주세요.`,
      decide:          `다음은 내 현재 할 일 현황입니다:\n${ctx}\n\n오늘 가장 먼저 집중해야 할 작업 한 가지를 골라주세요. 선택 이유와 나머지 작업 처리 방향도 간략히 알려주세요.`,
    };
    await sendChat(prompts[type]);
  }

  function saveKey() {
    if (!keyInput.startsWith('sk-ant-')) {
      alert('올바른 Anthropic API 키를 입력해주세요.\n(sk-ant-로 시작해야 합니다)');
      return;
    }
    localStorage.setItem(KEY_LOC, keyInput);
    setApiKey(keyInput);
    setShowKeySetup(false);
    setKeyInput('');
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
              {apiKey && (
                <>
                  <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={clearHistory} title="대화 초기화">
                    <i className="fas fa-trash" style={{ fontSize: '0.75rem' }} />
                  </button>
                  <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setShowKeySetup(s => !s)} title="API 키 변경">
                    <i className="fas fa-key" style={{ fontSize: '0.75rem' }} />
                  </button>
                </>
              )}
              <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setOpen(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
          </div>

          {/* Key setup */}
          {(!apiKey || showKeySetup) && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)', marginBottom: 8 }}>
                Anthropic API 키를 입력해 ARIA를 사용하세요
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="password" placeholder="sk-ant-..." value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveKey(); }}
                  style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 10px', background: 'var(--bg)', color: 'var(--text)', outline: 'none', fontSize: '0.85rem' }}
                />
                <button className="btn-primary btn-sm" onClick={saveKey}>저장</button>
              </div>
            </div>
          )}

          {/* Chat area */}
          {apiKey && !showKeySetup && (
            <>
              {/* Quick action buttons */}
              <div style={{ display: 'flex', gap: 4, padding: '8px 12px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
                {QUICK_ACTIONS.map(a => (
                  <button key={a.key}
                    className="btn-secondary btn-sm"
                    disabled={thinking}
                    onClick={() => runQuickAction(a.key)}
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
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
                  type="text" className="fp-input" placeholder="AI에게 물어보세요..."
                  value={input} onChange={e => setInput(e.target.value)} disabled={thinking}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(input); } }}
                />
                <button className="fp-send-btn" onClick={() => sendChat(input)} disabled={thinking || !input.trim()}>
                  {thinking
                    ? <i className="fas fa-spinner fa-spin" />
                    : <i className="fas fa-paper-plane" />
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button className={`fab fab-ai${open ? ' active' : ''}`} onClick={() => setOpen(p => !p)} aria-label="AI 비서">
        <i className={`fas fa-${open ? 'times' : 'robot'}`} />
      </button>
    </div>
  );
}
