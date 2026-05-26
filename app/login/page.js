'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/supabase';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail]       = useState('');
  const [token, setToken]       = useState('');
  const [step, setStep]         = useState('email'); // 'email' | 'verify'
  const [sending, setSending]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError]       = useState('');
  const [modal, setModal]       = useState(null); // 'terms' | 'privacy' | null

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

          {step === 'email' && (
            <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label htmlFor="otp-email">이메일</label>
                <input
                  id="otp-email" type="email" placeholder="your@email.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required autoFocus
                />
              </div>
              <button type="submit" className="btn-primary btn-full" disabled={sending}>
                {sending ? '전송 중...' : '인증 코드 발송'}
              </button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="otp-hint">
                <i className="fas fa-envelope" style={{ marginRight: 6 }} />
                <strong>{email}</strong>으로 6자리 코드를 발송했습니다.
              </div>
              <div className="form-group">
                <label htmlFor="otp-token">인증 코드</label>
                <input
                  id="otp-token" type="text" placeholder="000000"
                  maxLength={6} value={token}
                  onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
                  required autoFocus
                />
              </div>
              <button type="submit" className="btn-primary btn-full" disabled={verifying}>
                {verifying ? '확인 중...' : '로그인'}
              </button>
              <button type="button" className="btn-ghost btn-full"
                onClick={() => { setStep('email'); setToken(''); setError(''); }}>
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
            계속 진행하면{' '}
            <button type="button" className="lp-terms-link" onClick={() => setModal('terms')}>서비스 이용약관</button>
            {' '}및{' '}
            <button type="button" className="lp-terms-link" onClick={() => setModal('privacy')}>개인정보 처리방침</button>
            에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>

      {/* ── 이용약관 / 개인정보 모달 ── */}
      {modal && (
        <div className="lp-modal-overlay" onClick={() => setModal(null)}>
          <div className="lp-modal" onClick={e => e.stopPropagation()}>
            <div className="lp-modal-head">
              <h3>{modal === 'terms' ? '서비스 이용약관' : '개인정보 처리방침'}</h3>
              <button className="lp-modal-close" onClick={() => setModal(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="lp-modal-body">
              {modal === 'terms' ? <TermsContent /> : <PrivacyContent />}
            </div>
            <div className="lp-modal-foot">
              <button className="btn-primary" onClick={() => setModal(null)}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TermsContent() {
  return (
    <div className="lp-legal-content">
      <p className="lp-legal-notice">※ 현재 준비 중인 약관입니다. 정식 서비스 출시 전 확정될 예정입니다.</p>

      <h4>제1조 (목적)</h4>
      <p>본 약관은 TeamScheduler(이하 "서비스")가 제공하는 일정 관리 및 팀 협업 서비스의 이용 조건과 절차, 이용자와 서비스 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.</p>

      <h4>제2조 (이용 자격)</h4>
      <p>만 14세 이상의 개인 또는 단체는 본 서비스를 이용할 수 있습니다. 이메일 인증 또는 소셜 로그인을 통해 계정을 생성하며, 하나의 이메일로 하나의 계정만 생성 가능합니다.</p>

      <h4>제3조 (서비스 제공)</h4>
      <p>서비스는 다음 기능을 제공합니다:</p>
      <ul>
        <li>개인 및 팀 일정 관리 (캘린더, 할 일)</li>
        <li>팀 생성 및 멤버 초대·채팅</li>
        <li>메모장, 타이머, 계산기 도구</li>
        <li>Google 캘린더 연동 (별도 동의 필요)</li>
        <li>AI 비서 기능 (ARIA)</li>
      </ul>

      <h4>제4조 (금지 행위)</h4>
      <p>이용자는 다음 행위를 해서는 안 됩니다: 타인의 계정 무단 사용, 서비스 시스템 해킹 또는 악성 코드 유포, 타인의 개인정보 수집·유출, 허위 정보 등록 및 스팸 발송.</p>

      <h4>제5조 (면책 조항)</h4>
      <p>서비스는 이용자의 귀책 사유로 발생한 손해에 대해 책임지지 않습니다. 천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해서도 면책됩니다.</p>

      <h4>제6조 (약관 변경)</h4>
      <p>본 약관은 서비스 정책에 따라 변경될 수 있으며, 변경 시 앱 내 공지 또는 이메일을 통해 7일 전 안내합니다.</p>

      <p className="lp-legal-date">최종 업데이트: 2025년 (정식 오픈 시 확정)</p>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="lp-legal-content">
      <p className="lp-legal-notice">※ 현재 준비 중인 방침입니다. 정식 서비스 출시 전 확정될 예정입니다.</p>

      <h4>1. 수집하는 개인정보</h4>
      <p>서비스는 다음 정보를 수집합니다:</p>
      <ul>
        <li><strong>필수:</strong> 이메일 주소, 이름(닉네임)</li>
        <li><strong>선택:</strong> Google 계정 정보 (캘린더 연동 동의 시)</li>
        <li><strong>자동 수집:</strong> 서비스 이용 기록, 접속 로그</li>
      </ul>

      <h4>2. 수집 목적</h4>
      <ul>
        <li>회원 가입 및 로그인 인증</li>
        <li>일정·할 일·메모 데이터 저장 및 동기화</li>
        <li>팀 기능 제공 (팀원 식별)</li>
        <li>서비스 개선 및 오류 진단</li>
      </ul>

      <h4>3. 보관 기간</h4>
      <p>회원 탈퇴 시 즉시 삭제됩니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관 후 삭제합니다.</p>

      <h4>4. 제3자 제공</h4>
      <p>수집된 개인정보는 원칙적으로 제3자에게 제공하지 않습니다. 단, 이용자 동의 시 또는 법령에 의한 경우 예외적으로 제공될 수 있습니다.</p>

      <h4>5. Google 캘린더 연동</h4>
      <p>Google 캘린더 연동 기능 사용 시 Google OAuth를 통해 캘린더 읽기 권한을 요청합니다. 수집된 Google 토큰은 서비스 서버에 암호화하여 저장되며, 연동 해제 시 즉시 삭제됩니다.</p>

      <h4>6. 쿠키 및 로컬 스토리지</h4>
      <p>서비스는 테마 설정, 메모 데이터 등을 브라우저 로컬 스토리지에 저장합니다. 이 데이터는 서버로 전송되지 않습니다.</p>

      <h4>7. 정보 보호 책임자</h4>
      <p>개인정보 관련 문의: support@teamscheduler.app (준비 중)</p>

      <p className="lp-legal-date">최종 업데이트: 2025년 (정식 오픈 시 확정)</p>
    </div>
  );
}
