'use client';
import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'ts_memo_v2';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function now() { return new Date().toISOString(); }
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const TOOLBAR = [
  { label: 'B',  title: '굵게',       wrap: ['**', '**'] },
  { label: 'I',  title: '기울기',     wrap: ['*', '*'] },
  { label: '~~', title: '취소선',     wrap: ['~~', '~~'] },
  { label: 'H1', title: '제목 1',     prefix: '# ' },
  { label: 'H2', title: '제목 2',     prefix: '## ' },
  { label: 'H3', title: '제목 3',     prefix: '### ' },
  { label: '—',  title: '구분선',     insert: '\n---\n' },
  { label: '[ ]',title: '체크박스',   prefix: '- [ ] ' },
  { label: '•',  title: '목록',       prefix: '- ' },
  { label: '1.', title: '번호 목록',  prefix: '1. ' },
];

export default function MemoPage() {
  const [memos, setMemos]     = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [title, setTitle]     = useState('');
  const [content, setContent] = useState('');
  const [search, setSearch]   = useState('');
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    const data = load();
    setMemos(data);
    if (data.length) openMemo(data[0], data);
  }, []);

  function openMemo(memo, list) {
    setActiveId(memo.id);
    setTitle(memo.title);
    setContent(memo.content);
    void list;
  }

  function autosave(nextTitle, nextContent) {
    if (!activeId) return;
    const next = memos.map(m =>
      m.id === activeId ? { ...m, title: nextTitle, content: nextContent, updatedAt: now() } : m
    );
    setMemos(next);
    save(next);
  }

  function addMemo() {
    const m = { id: Date.now(), title: '새 메모', content: '', createdAt: now(), updatedAt: now() };
    const next = [m, ...memos];
    setMemos(next);
    save(next);
    openMemo(m, next);
  }

  function deleteMemo(id) {
    const next = memos.filter(m => m.id !== id);
    setMemos(next);
    save(next);
    if (activeId === id) {
      if (next.length) openMemo(next[0], next);
      else { setActiveId(null); setTitle(''); setContent(''); }
    }
  }

  function applyToolbar(tool) {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = content.slice(s, e);
    let next = content;

    if (tool.wrap) {
      const [open, close] = tool.wrap;
      next = content.slice(0, s) + open + sel + close + content.slice(e);
      const pos = s + open.length + sel.length + close.length;
      setTimeout(() => { ta.focus(); ta.setSelectionRange(pos, pos); }, 0);
    } else if (tool.prefix) {
      const lineStart = content.lastIndexOf('\n', s - 1) + 1;
      next = content.slice(0, lineStart) + tool.prefix + content.slice(lineStart);
      setTimeout(() => { ta.focus(); }, 0);
    } else if (tool.insert) {
      next = content.slice(0, s) + tool.insert + content.slice(e);
      setTimeout(() => { ta.focus(); }, 0);
    }

    setContent(next);
    autosave(title, next);
  }

  const filtered = memos.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.content.toLowerCase().includes(search.toLowerCase())
  );

  const activeMemo = memos.find(m => m.id === activeId);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--header-h) - 48px)', margin: '-24px', overflow: 'hidden' }}>

      {/* ── 왼쪽: 파일 탐색기 ── */}
      <div style={{
        width: 220, flexShrink: 0, background: 'var(--indigo-950)',
        display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-sidebar)', fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              메모장
            </span>
            <button onClick={addMemo} title="새 메모"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sidebar)', fontSize: '1rem', lineHeight: 1 }}>
              +
            </button>
          </div>
          <input
            type="text" placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6,
              padding: '5px 9px', fontSize: '0.78rem', color: '#c7d2fe', outline: 'none',
            }}
          />
        </div>

        {/* 파일 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '16px 12px', fontSize: '0.78rem', color: 'var(--text-sidebar-sub)', textAlign: 'center' }}>
              메모 없음
            </div>
          )}
          {filtered.map(m => (
            <div key={m.id}
              onClick={() => { autosave(title, content); openMemo(m, memos); }}
              style={{
                padding: '7px 12px', cursor: 'pointer',
                background: activeId === m.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderLeft: activeId === m.id ? '3px solid var(--indigo-500)' : '3px solid transparent',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <i className="fas fa-file-lines" style={{ color: 'var(--text-sidebar-sub)', fontSize: '0.75rem', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.82rem', color: activeId === m.id ? '#fff' : 'var(--text-sidebar)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontWeight: activeId === m.id ? 600 : 400,
                }}>
                  {m.title || '제목 없음'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-sidebar-sub)', marginTop: 1 }}>
                  {fmtDate(m.updatedAt)}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deleteMemo(m.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'transparent', padding: 2, fontSize: '0.75rem' }}
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'transparent'}
              >
                <i className="fas fa-trash" />
              </button>
            </div>
          ))}
        </div>

        {/* 하단 정보 */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.72rem', color: 'var(--text-sidebar-sub)' }}>
          {memos.length}개 메모
        </div>
      </div>

      {/* ── 오른쪽: 에디터 ── */}
      {activeId ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* 제목 */}
          <div style={{ padding: '12px 20px 8px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <input
              type="text" value={title}
              onChange={e => { setTitle(e.target.value); autosave(e.target.value, content); }}
              placeholder="제목"
              style={{
                width: '100%', border: 'none', outline: 'none', fontSize: '1.15rem',
                fontWeight: 700, background: 'transparent', color: 'var(--text)',
              }}
            />
            {activeMemo && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: 2 }}>
                수정: {fmtDate(activeMemo.updatedAt)}
              </div>
            )}
          </div>

          {/* 툴바 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2, padding: '6px 12px',
            borderBottom: '1px solid var(--border)', background: 'var(--surface)',
            flexWrap: 'wrap',
          }}>
            {TOOLBAR.map(tool => (
              <button key={tool.label} title={tool.title} onClick={() => applyToolbar(tool)}
                style={{
                  padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)',
                  fontSize: '0.78rem', fontWeight: tool.label === 'B' ? 700 : 400,
                  fontStyle: tool.label === 'I' ? 'italic' : 'normal',
                  cursor: 'pointer', minWidth: 28, textAlign: 'center',
                }}
              >{tool.label}</button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button onClick={() => setPreview(p => !p)}
                style={{
                  padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem',
                  border: `1px solid ${preview ? 'var(--indigo-600)' : 'var(--border)'}`,
                  background: preview ? 'var(--indigo-50)' : 'var(--bg)',
                  color: preview ? 'var(--indigo-600)' : 'var(--text)',
                }}
              >
                <i className={`fas fa-${preview ? 'edit' : 'eye'}`} style={{ marginRight: 4 }} />
                {preview ? '편집' : '미리보기'}
              </button>
            </div>
          </div>

          {/* 에디터 / 미리보기 */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {!preview ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => { setContent(e.target.value); autosave(title, e.target.value); }}
                placeholder="내용을 입력하세요... (Markdown 지원)"
                style={{
                  flex: 1, border: 'none', outline: 'none', resize: 'none',
                  padding: '20px 24px', fontSize: '0.92rem', lineHeight: 1.8,
                  background: 'var(--surface)', color: 'var(--text)',
                  fontFamily: '"Segoe UI", system-ui, sans-serif',
                }}
              />
            ) : (
              <div
                style={{
                  flex: 1, padding: '20px 24px', overflow: 'auto',
                  background: 'var(--surface)', color: 'var(--text)',
                  fontSize: '0.92rem', lineHeight: 1.8,
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            )}
          </div>

          {/* 상태바 */}
          <div style={{
            padding: '4px 20px', borderTop: '1px solid var(--border)',
            background: 'var(--bg)', display: 'flex', gap: 20,
            fontSize: '0.72rem', color: 'var(--text-sub)',
          }}>
            <span>{content.length} 글자</span>
            <span>{wordCount(content)} 단어</span>
            <span>{content.split('\n').length} 줄</span>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sub)' }}>
          <div style={{ textAlign: 'center' }}>
            <i className="fas fa-file-lines" style={{ fontSize: '2.5rem', marginBottom: 12, display: 'block', opacity: 0.3 }} />
            <p style={{ marginBottom: 12 }}>메모를 선택하거나 새로 만드세요</p>
            <button className="btn-primary" onClick={addMemo}>새 메모 만들기</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* 간단한 Markdown → HTML 렌더러 */
function renderMarkdown(md) {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:1rem;font-weight:700;margin:12px 0 4px">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-size:1.15rem;font-weight:700;margin:14px 0 6px">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="font-size:1.4rem;font-weight:800;margin:16px 0 8px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/~~(.+?)~~/g,     '<del>$1</del>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0">')
    .replace(/^- \[x\] (.+)$/gm, '<div style="display:flex;gap:8px;align-items:center"><span style="color:var(--green-500)">✓</span><span style="text-decoration:line-through;opacity:0.6">$1</span></div>')
    .replace(/^- \[ \] (.+)$/gm, '<div style="display:flex;gap:8px;align-items:center"><span style="opacity:0.4">☐</span><span>$1</span></div>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;gap:8px"><span style="color:var(--indigo-500)">•</span><span>$1</span></div>')
    .replace(/\n/g, '<br>');
}
