'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';

// user-specific key so memos are never shared between accounts
function storageKey(userId) { return `ts_memo_v2_${userId}`; }
function load(userId) {
  try { return JSON.parse(localStorage.getItem(storageKey(userId)) || '[]'); } catch { return []; }
}
function save(userId, data) {
  localStorage.setItem(storageKey(userId), JSON.stringify(data));
}
function now() { return new Date().toISOString(); }
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const TOOLBAR = [
  { icon: 'fa-bold',         title: '굵게 (Ctrl+B)',   wrap: ['**', '**'] },
  { icon: 'fa-italic',       title: '기울기 (Ctrl+I)',  wrap: ['*', '*'] },
  { icon: 'fa-strikethrough',title: '취소선',            wrap: ['~~', '~~'] },
  { icon: 'fa-code',         title: '인라인 코드',       wrap: ['`', '`'] },
  null, // separator
  { label: 'H1', title: '제목 1', prefix: '# ' },
  { label: 'H2', title: '제목 2', prefix: '## ' },
  { label: 'H3', title: '제목 3', prefix: '### ' },
  null,
  { icon: 'fa-list-ul',      title: '목록',             prefix: '- ' },
  { icon: 'fa-list-ol',      title: '번호 목록',         prefix: '1. ' },
  { icon: 'fa-square-check', title: '체크박스',          prefix: '- [ ] ' },
  { icon: 'fa-quote-right',  title: '인용',             prefix: '> ' },
  null,
  { icon: 'fa-minus',        title: '구분선',            insert: '\n---\n' },
  { icon: 'fa-terminal',     title: '코드 블록',         insert: '\n```\n\n```\n' },
];

export default function MemoPage() {
  const { user } = useAuth();
  const [memos, setMemos]       = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [search, setSearch]     = useState('');
  const [viewMode, setViewMode] = useState('edit'); // 'edit' | 'split' | 'preview'
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'edit'
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef(null);
  const findRef     = useRef(null);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 769);
    }
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!user) return;
    const data = load(user.id);
    setMemos(data);
    if (data.length) openMemo(data[0], data);
  }, [user]);

  // Ctrl+F shortcut
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setFindOpen(p => { if (!p) setTimeout(() => findRef.current?.focus(), 50); return !p; });
      }
      if (e.key === 'Escape') setFindOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function openMemo(memo, list) {
    setActiveId(memo.id);
    setTitle(memo.title);
    setContent(memo.content);
    void list;
  }

  function autosave(nextTitle, nextContent) {
    if (!activeId || !user) return;
    setMemos(prev => {
      const next = prev.map(m =>
        m.id === activeId ? { ...m, title: nextTitle, content: nextContent, updatedAt: now() } : m
      );
      save(user.id, next);
      return next;
    });
  }

  function addMemo() {
    if (!user) return;
    const m = { id: Date.now(), title: '새 메모', content: '', createdAt: now(), updatedAt: now() };
    setMemos(prev => { const next = [m, ...prev]; save(user.id, next); return next; });
    setActiveId(m.id); setTitle(m.title); setContent(m.content);
    if (isMobile) setMobileView('edit');
  }

  function deleteMemo(id) {
    if (!user) return;
    setMemos(prev => {
      const next = prev.filter(m => m.id !== id);
      save(user.id, next);
      if (activeId === id) {
        if (next.length) { setActiveId(next[0].id); setTitle(next[0].title); setContent(next[0].content); }
        else { setActiveId(null); setTitle(''); setContent(''); }
      }
      return next;
    });
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
      const pos = s + tool.insert.length - (tool.insert.endsWith('\n') ? 1 : 0);
      setTimeout(() => { ta.focus(); ta.setSelectionRange(pos, pos); }, 0);
    }

    setContent(next);
    autosave(title, next);
  }

  function handleReplace() {
    if (!findText) return;
    const idx = content.indexOf(findText);
    if (idx === -1) return;
    const next = content.slice(0, idx) + replaceText + content.slice(idx + findText.length);
    setContent(next); autosave(title, next);
  }

  function handleReplaceAll() {
    if (!findText) return;
    const next = content.split(findText).join(replaceText);
    setContent(next); autosave(title, next);
  }

  const filtered = memos.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.content.toLowerCase().includes(search.toLowerCase())
  );
  const activeMemo = memos.find(m => m.id === activeId);

  // Determine panel visibility
  const showList   = !isMobile || mobileView === 'list';
  const showEditor = !isMobile || mobileView === 'edit';

  return (
    <div className="memo-root" style={{ overflow: 'hidden' }}>
      {/* List panel */}
      {showList && (
        <div
          className="memo-list-panel"
          style={{
            width: isMobile ? '100%' : '280px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: isMobile ? 'none' : '1px solid var(--border)',
            background: 'var(--surface)',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* List header */}
          <div
            className="memo-list-header"
            style={{
              padding: '16px 16px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>메모장</span>
            <button
              onClick={addMemo}
              title="새 메모"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'var(--primary, #4f46e5)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              <i className="fas fa-plus" style={{ fontSize: 11 }} />
              새 메모
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '0 16px 10px', flexShrink: 0 }}>
            <input
              type="text"
              placeholder="검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="memo-list-search"
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 13,
                background: 'var(--bg, #fff)',
                color: 'var(--text)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Card list */}
          <div
            className="memo-cards"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0 0 8px',
            }}
          >
            {filtered.length === 0 && (
              <div
                className="memo-empty-list"
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--text-sub, #888)',
                  fontSize: 13,
                }}
              >
                {search ? '검색 결과 없음' : '메모 없음'}
              </div>
            )}
            {filtered.map(m => (
              <MemoCard
                key={m.id}
                memo={m}
                isActive={activeId === m.id}
                onSelect={() => {
                  autosave(title, content);
                  openMemo(m, memos);
                  if (isMobile) setMobileView('edit');
                }}
                onDelete={e => { e.stopPropagation(); deleteMemo(m.id); }}
              />
            ))}
          </div>

          {/* Footer count */}
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--text-sub, #888)',
              flexShrink: 0,
            }}
          >
            {memos.length}개 메모
          </div>
        </div>
      )}

      {/* Editor panel */}
      {showEditor && (
        activeId ? (
          <div className="memo-editor" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {/* Title bar */}
            <div className="memo-titlebar">
              <div className="memo-titlebar-row">
                {/* Mobile back button */}
                {isMobile && (
                  <button
                    onClick={() => setMobileView('list')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--primary, #4f46e5)',
                      fontSize: 13,
                      fontWeight: 600,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ← 메모 목록
                  </button>
                )}
                <input
                  type="text" value={title}
                  onChange={e => { setTitle(e.target.value); autosave(e.target.value, content); }}
                  placeholder="제목"
                  className="memo-title-input"
                />
              </div>
              {activeMemo && (
                <div className="memo-title-sub">
                  수정: {fmtDate(activeMemo.updatedAt)}
                  {isMobile && (
                    <span style={{ marginLeft: 8, color: 'var(--text-sub, #888)' }}>
                      · {memos.length}개 메모
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div className="memo-toolbar">
              {TOOLBAR.map((tool, i) =>
                tool === null
                  ? <span key={i} className="memo-tb-sep" />
                  : (
                    <button key={i} title={tool.title} onClick={() => applyToolbar(tool)} className="memo-tb-btn">
                      {tool.icon
                        ? <i className={`fas ${tool.icon}`} />
                        : <span style={{ fontWeight: tool.label === 'H1' || tool.label === 'H2' || tool.label === 'H3' ? 700 : 400 }}>{tool.label}</span>
                      }
                    </button>
                  )
              )}
              <div className="memo-view-toggle">
                {[
                  { mode: 'edit',    icon: 'fa-pen',           label: '편집' },
                  { mode: 'split',   icon: 'fa-table-columns', label: '분할' },
                  { mode: 'preview', icon: 'fa-eye',           label: '보기' },
                ].map(({ mode, icon, label }) => (
                  <button key={mode} title={label}
                    className={`memo-view-btn${viewMode === mode ? ' active' : ''}${mode === 'split' ? ' memo-split-btn' : ''}`}
                    onClick={() => setViewMode(mode)}
                  >
                    <i className={`fas ${icon}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="memo-content">
              {viewMode !== 'preview' && (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={e => { setContent(e.target.value); autosave(title, e.target.value); }}
                  placeholder="내용을 입력하세요... (Markdown 지원)"
                  className="memo-textarea"
                  spellCheck={false}
                />
              )}
              {viewMode !== 'edit' && (
                <div
                  className="memo-preview-pane"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              )}
            </div>

            {/* Find / Replace bar */}
            {findOpen && (
              <div className="memo-findbar">
                <i className="fas fa-search memo-find-icon" />
                <input
                  ref={findRef}
                  placeholder="찾기..."
                  value={findText}
                  onChange={e => setFindText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReplace()}
                  className="memo-find-input"
                />
                <input
                  placeholder="바꾸기..."
                  value={replaceText}
                  onChange={e => setReplaceText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReplaceAll()}
                  className="memo-find-input"
                />
                <button className="memo-find-btn" onClick={handleReplace}>바꾸기</button>
                <button className="memo-find-btn" onClick={handleReplaceAll}>모두</button>
                <button className="memo-find-close" onClick={() => setFindOpen(false)}>
                  <i className="fas fa-times" />
                </button>
              </div>
            )}

            {/* Status bar */}
            <div className="memo-statusbar">
              <span>{content.length}자</span>
              <span>{wordCount(content)}단어</span>
              <span>{content.split('\n').length}줄</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Markdown</span>
                <button className="memo-status-btn" title="찾기/바꾸기 (Ctrl+F)" onClick={() => {
                  setFindOpen(p => { if (!p) setTimeout(() => findRef.current?.focus(), 50); return !p; });
                }}>
                  <i className="fas fa-search" /> 찾기
                </button>
              </span>
            </div>
          </div>
        ) : (
          <div className="memo-empty-state" style={{ flex: 1 }}>
            {isMobile && (
              <button
                onClick={() => setMobileView('list')}
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--primary, #4f46e5)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ← 메모 목록
              </button>
            )}
            <i className="fas fa-file-lines" />
            <p>메모를 선택하거나 새로 만드세요</p>
            <button className="btn-primary" onClick={addMemo}>새 메모 만들기</button>
          </div>
        )
      )}
    </div>
  );
}

// Memo card component
function MemoCard({ memo, isActive, onSelect, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const preview = memo.content.replace(/[#*`>\-~]/g, '').trim().slice(0, 120);

  return (
    <div
      className={`memo-card${isActive ? ' active' : ''}`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: isActive
          ? 'var(--indigo-50, #eef2ff)'
          : hovered
            ? 'var(--surface-hover, #f5f5f5)'
            : 'transparent',
        borderLeft: isActive ? '3px solid var(--primary, #4f46e5)' : '3px solid transparent',
        transition: 'background 0.12s',
      }}
    >
      <div
        className="memo-card-title"
        style={{
          fontWeight: 600,
          fontSize: 14,
          color: 'var(--text)',
          marginBottom: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {memo.title || '제목 없음'}
      </div>
      {preview && (
        <div
          className="memo-card-preview"
          style={{
            fontSize: 12,
            color: 'var(--text-sub, #888)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: 6,
          }}
        >
          {preview}
        </div>
      )}
      <div
        className="memo-card-footer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-sub, #aaa)' }}>
          {fmtDate(memo.updatedAt)}
        </span>
        <button
          onClick={onDelete}
          title="삭제"
          style={{
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.15s',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--danger, #ef4444)',
            padding: '2px 4px',
            borderRadius: 4,
            fontSize: 12,
            lineHeight: 1,
          }}
        >
          <i className="fas fa-trash" />
        </button>
      </div>
    </div>
  );
}

function renderMarkdown(md) {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="md-h1">$1</h1>')
    .replace(/```[\s\S]*?```/g, m => `<pre class="md-pre"><code>${m.slice(3, -3).trim()}</code></pre>`)
    .replace(/`(.+?)`/g, '<code class="md-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/~~(.+?)~~/g,     '<del>$1</del>')
    .replace(/^---$/gm, '<hr class="md-hr">')
    .replace(/^> (.+)$/gm, '<blockquote class="md-bq">$1</blockquote>')
    .replace(/^- \[x\] (.+)$/gm, '<div class="md-check done"><i class="fas fa-check-square"></i><span>$1</span></div>')
    .replace(/^- \[ \] (.+)$/gm, '<div class="md-check"><i class="far fa-square"></i><span>$1</span></div>')
    .replace(/^- (.+)$/gm, '<div class="md-li"><span class="md-bullet">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.+)$/gm, '<div class="md-li"><span class="md-bullet" style="color:var(--text-sub)">–</span><span>$1</span></div>')
    .replace(/\n/g, '<br>');
}
