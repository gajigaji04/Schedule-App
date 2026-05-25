'use client';
import { Suspense } from 'react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { updateProfile } from '@/models/userModel';
import { PALETTES, applyColorPalette } from '@/lib/utils/themeColor';
import { db, getAuthToken } from '@/lib/supabase';

export default function SettingsPageWrapper() {
  return <Suspense><SettingsPage /></Suspense>;
}

function SettingsPage() {
  const { user, setUser } = useAuth();
  const [name, setName]         = useState(user?.name || '');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [mode, setMode]         = useState('auto');
  const [colorKey, setColorKey] = useState('indigo');
  const [customHex, setCustomHex] = useState('#4f46e5');
  const colorInputRef = useRef(null);
  const searchParams = useSearchParams();
  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalLoading, setGcalLoading]     = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    db.from('users')
      .select('google_access_token')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setGcalConnected(!!data?.google_access_token));

    const gcalParam = searchParams.get('gcal');
    if (gcalParam === 'connected') setGcalConnected(true);
    if (gcalParam === 'error') alert('Google 캘린더 연동 중 오류가 발생했습니다.');
  }, [user?.id]);

  useEffect(() => {
    setMode(localStorage.getItem('ts_theme') || 'auto');
    const uid = user?.id;
    setColorKey(
      (uid && localStorage.getItem(`ts_color_${uid}`))
        || localStorage.getItem('ts_color')
        || 'indigo'
    );
    setCustomHex(
      (uid && localStorage.getItem(`ts_color_custom_${uid}`))
        || localStorage.getItem('ts_color_custom')
        || '#4f46e5'
    );
  }, [user]);

  function applyMode(m) {
    localStorage.setItem('ts_theme', m);
    setMode(m);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = m === 'dark' || (m === 'auto' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
  }

  function handleColor(key) {
    setColorKey(key);
    applyColorPalette(key, key === 'custom' ? customHex : undefined, user?.id);
  }

  function handleCustomHex(hex) {
    setCustomHex(hex);
    setColorKey('custom');
    applyColorPalette('custom', hex, user?.id);
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
        <div className="settings-color-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
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

          {/* 커스텀 색상 */}
          <button
            onClick={() => colorInputRef.current?.click()}
            title="커스텀 색상"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '10px 6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              border: `2px solid ${colorKey === 'custom' ? customHex : 'var(--border)'}`,
              background: colorKey === 'custom' ? 'var(--indigo-50)' : 'var(--surface)',
              position: 'relative',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: `conic-gradient(red, orange, yellow, green, blue, indigo, violet, red)`,
              outline: colorKey === 'custom' ? `3px solid ${customHex}` : 'none',
              outlineOffset: 2,
            }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text)', fontWeight: colorKey === 'custom' ? 700 : 400 }}>
              커스텀
            </span>
            <input
              ref={colorInputRef}
              type="color"
              value={customHex}
              onChange={e => handleCustomHex(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            />
          </button>
        </div>

        {/* 현재 선택 색상 미리보기 */}
        {colorKey === 'custom' && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: 'var(--text-sub)' }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: customHex, flexShrink: 0 }} />
            <span>선택된 색상: <strong style={{ color: 'var(--text)' }}>{customHex}</strong></span>
          </div>
        )}
      </section>

      {/* 화면 모드 */}
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

      {/* Google 캘린더 연동 */}
      <section className="card">
        <SectionTitle icon="fab fa-google" label="Google 캘린더 연동" />
        {gcalConnected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', color: 'var(--green-600)' }}>
              <i className="fas fa-circle-check" />
              <span>Google 캘린더가 연동되어 있습니다</span>
            </div>
            <button
              className="btn-sm"
              disabled={gcalLoading}
              onClick={async () => {
                setGcalLoading(true);
                const token = await getAuthToken();
                await fetch('/api/google/disconnect', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({ userId: user.id }),
                });
                setGcalConnected(false);
                setGcalLoading(false);
              }}
              style={{
                alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text)', cursor: 'pointer', fontSize: '0.84rem',
              }}
            >
              <i className="fas fa-link-slash" style={{ marginRight: 6 }} />
              {gcalLoading ? '연동 해제 중...' : '연동 해제'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-sub)', margin: 0 }}>
              Google 캘린더를 연동하면 일정을 앱에서 함께 볼 수 있습니다.
            </p>
            <button
              className="btn-primary btn-sm"
              disabled={gcalLoading}
              onClick={() => {
                setGcalLoading(true);
                window.location.href = `/api/google/auth?userId=${user.id}`;
              }}
              style={{ alignSelf: 'flex-start' }}
            >
              <i className="fab fa-google" style={{ marginRight: 6 }} />
              {gcalLoading ? '연결 중...' : 'Google 캘린더 연결'}
            </button>
          </div>
        )}
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
