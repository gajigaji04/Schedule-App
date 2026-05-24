'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'verify'
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  async function handleSendOTP(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true); setError('');
    try {
      const { error: err } = await db.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (err) throw err;
      setStep('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (!token.trim()) return;
    setVerifying(true); setError('');
    try {
      const { error: err } = await db.auth.verifyOtp({
        email: email.trim(), token: token.trim(), type: 'email',
      });
      if (err) throw err;
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleOAuth(provider) {
    setError('');
    const { error: err } = await db.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (err) setError(err.message);
  }

  if (loading) return null;

  return (
    <div className="login-page">
      {/* ── 왼쪽 브랜드 패널 ── */}
      <div className="lp-left">
        <div className="lp-brand">
          <div className="lp-logo"><i className="fas fa-calendar-check" /></div>
          <div className="lp-logo-name">Team<span>Scheduler</span></div>
        </div>
        <h2 className="lp-slogan">한 번에 관리하는<br /><em>팀 스케줄러</em></h2>
        <p className="lp-desc">일정, 할일, 팀 협업을 하나의 앱에서 관리하세요.</p>
        <ul className="lp-features">
          <li className="lp-feat-item">
            <div className="lp-feat-icon"><i className="fas fa-calendar-alt" /></div>
            <span>스마트 일정 관리 및 캘린더</span>
          </li>
          <li className="lp-feat-item">
            <div className="lp-feat-icon"><i className="fas fa-users" /></div>
            <span>팀 초대 및 실시간 채팅</span>
          </li>
          <li className="lp-feat-item">
            <div className="lp-feat-icon"><i className="fas fa-bell" /></div>
            <span>푸시 알림 및 일정 리마인더</span>
          </li>
        </ul>
      </div>

      {/* ── 오른쪽 폼 패널 ── */}
      <div className="lp-right">
        <div className="lp-form-wrap">
          <div className="lp-form-logo">
            <i className="fas fa-calendar-check" />
            <span>TeamScheduler</span>
          </div>
          <h2 className="lp-form-title">시작하기</h2>
          <p className="lp-form-sub">이메일 또는 소셜 계정으로 로그인하세요</p>

          {error && <p className="login-error">{error}</p>}

          {/* OTP 이메일 입력 단계 */}
          {step === 'email' && (
            <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label htmlFor="otp-email">이메일</label>
                <input
                  id="otp-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary btn-full" disabled={sending}>
                {sending ? '전송 중...' : '인증 코드 발송'}
              </button>
            </form>
          )}

          {/* OTP 코드 확인 단계 */}
          {step === 'verify' && (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="otp-hint">
                <i className="fas fa-envelope" style={{ marginRight: 6 }} />
                <strong>{email}</strong>으로 6자리 코드를 발송했습니다.
              </div>
              <div className="form-group">
                <label htmlFor="otp-token">인증 코드</label>
                <input
                  id="otp-token"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={token}
                  onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary btn-full" disabled={verifying}>
                {verifying ? '확인 중...' : '로그인'}
              </button>
              <button
                type="button"
                className="btn-ghost btn-full"
                onClick={() => { setStep('email'); setToken(''); setError(''); }}
              >
                ← 이메일 다시 입력
              </button>
            </form>
          )}

          <div className="login-divider">또는</div>

          <button className="btn-social btn-google" onClick={() => handleOAuth('google')}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 계속하기
          </button>
          <button className="btn-social btn-kakao" onClick={() => handleOAuth('kakao')}>
            <i className="fas fa-comment" /> 카카오로 계속하기
          </button>
          <button className="btn-social btn-github" onClick={() => handleOAuth('github')}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="github-icon">
              <path fill="currentColor" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub로 계속하기
          </button>

          <p className="lp-terms">
            계속 진행하면 <a href="#">서비스 이용약관</a> 및{' '}
            <a href="#">개인정보 처리방침</a>에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
