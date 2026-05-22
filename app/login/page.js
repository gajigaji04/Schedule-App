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
            <i className="fab fa-google" /> Google로 계속하기
          </button>
          <button className="btn-social btn-kakao" onClick={() => handleOAuth('kakao')}>
            <i className="fas fa-comment" /> 카카오로 계속하기
          </button>
          <button className="btn-social btn-github" onClick={() => handleOAuth('github')}>
            <i className="fab fa-github" /> GitHub로 계속하기
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
