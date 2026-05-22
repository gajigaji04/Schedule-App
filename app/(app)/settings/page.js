'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { updateProfile } from '@/models/userModel';
import { PALETTES, applyColorPalette } from '@/lib/utils/themeColor';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [name, setName]       = useState(user?.name || '');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [mode, setMode]       = useState('auto');
  const [colorKey, setColorKey] = useState('indigo');

  useEffect(() => {
    setMode(localStorage.getItem('ts_theme') || 'auto');
    setColorKey(localStorage.getItem('ts_color') || 'indigo');
  }, []);

  function applyMode(m) {
    localStorage.setItem('ts_theme', m);
    setMode(m);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = m === 'dark' || (m === 'auto' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
  }

  function handleColor(key) {
    setColorKey(key);
    applyColorPalette(key);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setSaving(true);
    await updateProfile(user.id, name.trim());
    setUser(u => ({ ...u, name: name.trim() }));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="view-header">
        <div>
          <h2>설정</h2>
          <p className="view-sub">앱 환경설정을 관리하세요</p>
        </div>
      </div>

      {/* 프로필 */}
      <section className="card" style={{ marginBottom: 20 }}>
        <SectionTitle icon="fas fa-user" label="프로필" />
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>이름</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="표시 이름" />
          </div>
          <div className="form-group">
            <label>이메일</label>
            <input type="email" value={user?.email || ''} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="submit" className="btn-primary btn-sm" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
            {saved && (
              <span style={{ fontSize: '0.82rem', color: 'var(--green-600)' }}>
                <i className="fas fa-check" style={{ marginRight: 4 }} />저장되었습니다
              </span>
            )}
          </div>
        </form>
      </section>

      {/* 테마 색상 */}
      <section className="card" style={{ marginBottom: 20 }}>
        <SectionTitle icon="fas fa-palette" label="테마 색상" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
          {Object.entries(PALETTES).map(([key, p]) => (
            <button
              key={key}
              onClick={() => handleColor(key)}
              title={p.label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '10px 6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                border: `2px solid ${colorKey === key ? p.swatch : 'var(--border)'}`,
                background: colorKey === key ? 'var(--indigo-50)' : 'var(--surface)',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: p.swatch,
                outline: colorKey === key ? `3px solid ${p.swatch}` : 'none',
                outlineOffset: 2,
              }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text)', fontWeight: colorKey === key ? 700 : 400 }}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 다크 모드 */}
      <section className="card" style={{ marginBottom: 20 }}>
        <SectionTitle icon="fas fa-moon" label="화면 모드" />
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { key: 'light', label: '라이트', icon: 'fas fa-sun' },
            { key: 'dark',  label: '다크',   icon: 'fas fa-moon' },
            { key: 'auto',  label: '자동',   icon: 'fas fa-circle-half-stroke' },
          ].map(m => (
            <button key={m.key} onClick={() => applyMode(m.key)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                border: `2px solid ${mode === m.key ? 'var(--indigo-600)' : 'var(--border)'}`,
                background: mode === m.key ? 'var(--indigo-50)' : 'var(--surface)',
                color: mode === m.key ? 'var(--indigo-600)' : 'var(--text)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                fontSize: '0.82rem', fontWeight: mode === m.key ? 700 : 400,
              }}
            >
              <i className={m.icon} style={{ fontSize: '1.1rem' }} />
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* 앱 정보 */}
      <section className="card">
        <SectionTitle icon="fas fa-info-circle" label="앱 정보" />
        <InfoRow label="앱 이름" val="TeamScheduler" />
        <InfoRow label="버전"   val="2.0.0 (Next.js)" />
        <InfoRow label="스택"   val="Next.js 16 + Tailwind v4 + Supabase" />
      </section>
    </div>
  );
}

function SectionTitle({ icon, label }) {
  return (
    <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
      <i className={icon} style={{ color: 'var(--indigo-600)' }} /> {label}
    </h3>
  );
}

function InfoRow({ label, val }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '0.88rem' }}>
      <span style={{ color: 'var(--text-sub)' }}>{label}</span>
      <span style={{ color: 'var(--text)' }}>{val}</span>
    </div>
  );
}
