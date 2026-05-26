'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import './landing.css';

const CAL_DAYS = ['일','월','화','수','목','금','토'];

const FEATURES = [
  { icon: 'fa-calendar-alt',  color: '#6366f1', bg: '#eef2ff', title: '스마트 캘린더',      desc: '월·주·일 뷰로 일정을 한눈에. 한국 공휴일·명절 자동 표시.' },
  { icon: 'fa-robot',         color: '#7c3aed', bg: '#f5f3ff', title: 'AI 비서 ARIA',       desc: 'Claude 기반 일정 분석·미루기 탐지·최적 플랜 제안.' },
  { icon: 'fa-users',         color: '#0ea5e9', bg: '#f0f9ff', title: '팀 협업',             desc: '팀 생성·초대, 그룹 채팅, 팀 이벤트 RSVP 한곳에서.' },
  { icon: 'fa-list-check',    color: '#10b981', bg: '#f0fdf4', title: '할일 & 시간 알림',    desc: '마감 시간 설정 후 1시간·30분 전 브라우저 푸시 알림.' },
  { icon: 'fa-comment-dots',  color: '#f59e0b', bg: '#fffbeb', title: '실시간 DM',           desc: 'Supabase Realtime 기반 팀원 1:1 다이렉트 메시지.' },
  { icon: 'fa-note-sticky',   color: '#ec4899', bg: '#fdf2f8', title: '메모·타이머·계산기',  desc: 'Markdown 메모장, 뽀모도로 타이머, 공학용 계산기.' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  return (
    <div className="lnd">

      {/* ── NAV ── */}
      <header className="lnd-nav">
        <div className="lnd-nav-inner">
          <a href="#" className="lnd-nav-logo">
            <div className="lnd-logo-icon"><i className="fas fa-calendar-check" /></div>
            Team<strong>Scheduler</strong>
          </a>
          <Link href="/login" className="lnd-nav-login">로그인</Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lnd-hero">
        <div className="lnd-hero-eyebrow">
          <i className="fas fa-bolt" /> AI 비서 ARIA 탑재 · Claude 기반
        </div>
        <h1 className="lnd-hero-h1">
          복잡한 하루 일정을<br />
          <em>한 번에</em>
        </h1>
        <p className="lnd-hero-sub">
          일정·할일·팀 채팅·AI 비서를 하나의 앱에서.<br />
          복잡한 팀 스케줄을 단순하게 만들어 드립니다.
        </p>
        <div className="lnd-hero-btns">
          <Link href="/login" className="lnd-btn-main">
            무료로 시작하기 <i className="fas fa-arrow-right" />
          </Link>
          <a href="#s1" className="lnd-btn-outline-dark">
            <i className="fas fa-play-circle" /> 더 알아보기
          </a>
        </div>
        <p className="lnd-hero-note">
          <i className="fas fa-shield-halved" /> 신용카드 불필요 · 영원히 무료
        </p>
        <div className="lnd-chevron"><i className="fas fa-chevron-down" /></div>
      </section>

      {/* ── STORY 1 · 일정 통합 ── */}
      <section className="lnd-story" id="s1" style={{ background: '#fff' }}>
        <div className="lnd-story-split">

          {/* 텍스트 */}
          <div>
            <span className="lnd-story-kicker" style={{ background: '#eef2ff', color: '#4f46e5' }}>일정 관리</span>
            <h2 className="lnd-story-h2">
              정리하기 벅차던<br />일정을 하나로 보자
            </h2>
            <p className="lnd-story-p">
              여기저기 흩어진 메모·캘린더·메신저를 TeamScheduler 하나로 통합하세요.
              월·주·일 뷰로 오늘 해야 할 것을 한눈에 보고,
              마감 시간이 가까워지면 브라우저가 직접 알려줍니다.
            </p>
            <div className="lnd-checks">
              {[
                '월·주·일 뷰 자유롭게 전환',
                '한국 공휴일 & 명절 자동 표시',
                '마감 1시간·30분 전 브라우저 알림',
              ].map(t => (
                <div key={t} className="lnd-check"><i className="fas fa-circle-check" />{t}</div>
              ))}
            </div>
          </div>

          {/* 캘린더 목업 */}
          <div className="lnd-vis-card light">
            <div className="cal-head">
              <span className="cal-month">2025년 5월</span>
              <div className="cal-view-tabs">
                <span className="cal-view-tab on">월</span>
                <span className="cal-view-tab off">주</span>
                <span className="cal-view-tab off">일</span>
              </div>
            </div>
            <div className="cal-days-header">
              {CAL_DAYS.map(d => <div key={d} className="cal-day-lbl">{d}</div>)}
            </div>
            <div className="cal-grid">
              {/* 5월 1일 = 목요일 → 빈칸 4개 */}
              {[...Array(4)].map((_, i) => <div key={`e${i}`} />)}
              {[...Array(31)].map((_, i) => {
                const d = i + 1;
                const cls = d === 25 ? 'today' : [8,12,20,28].includes(d) ? 'marked' : '';
                return <div key={d} className={`cal-cell ${cls}`}>{d}</div>;
              })}
            </div>
            <div className="cal-events">
              {[
                { time: '09:00', title: '팀 주간 미팅', color: '#6366f1', chip: '오늘', chipBg: '#eef2ff', chipColor: '#4f46e5' },
                { time: '14:00', title: '보고서 마감',  color: '#f59e0b', chip: '마감', chipBg: '#fef3c7', chipColor: '#d97706' },
                { time: '16:30', title: '디자인 검토',  color: '#10b981', chip: '예정', chipBg: '#d1fae5', chipColor: '#059669' },
              ].map(e => (
                <div key={e.title} className="cal-event" style={{ borderLeftColor: e.color }}>
                  <span className="cal-event-time">{e.time}</span>
                  <span className="cal-event-title">{e.title}</span>
                  <span className="cal-event-chip" style={{ background: e.chipBg, color: e.chipColor }}>{e.chip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STORY 2 · 팀 협업 ── */}
      <section className="lnd-story" id="s2" style={{ background: '#f8fafc' }}>
        <div className="lnd-story-split">

          {/* 팀 목업 (먼저) */}
          <div className="lnd-vis-card dark">
            <div className="team-header">
              <div className="team-online-dot" />
              <span className="team-title">디자인팀 · 멤버 4명</span>
            </div>
            <div className="team-members">
              {[
                { name: '김지수', role: 'PM',      color: '#6366f1', online: true  },
                { name: '이민준', role: '개발',     color: '#0ea5e9', online: true  },
                { name: '박수연', role: '디자인',   color: '#10b981', online: false },
                { name: '최다은', role: '마케팅',   color: '#f59e0b', online: true  },
              ].map(m => (
                <div key={m.name} className="team-row">
                  <div className="team-av" style={{ background: m.color }}>{m.name[0]}</div>
                  <span className="team-name">{m.name}</span>
                  <span className="team-role">{m.role}</span>
                  <span className={`team-badge ${m.online ? 'online' : 'offline'}`}>
                    {m.online ? '온라인' : '오프라인'}
                  </span>
                </div>
              ))}
            </div>
            <div className="team-msg">
              <div className="team-msg-label">새 메시지</div>
              <div className="team-msg-text">이민준: 내일 오전 일정 확인해 주세요 👋</div>
            </div>
          </div>

          {/* 텍스트 */}
          <div>
            <span className="lnd-story-kicker" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>팀 협업</span>
            <h2 className="lnd-story-h2">
              팀원들의 일정을<br />같이 공유하고 보자
            </h2>
            <p className="lnd-story-p">
              팀을 만들고 동료를 초대하면 일정을 함께 관리할 수 있어요.
              그룹 채팅·RSVP·1:1 DM까지,
              협업에 필요한 모든 것이 하나의 화면에 있습니다.
            </p>
            <div className="lnd-checks">
              {[
                '팀 생성 & 이메일 초대',
                '그룹 채팅 & 1:1 DM (실시간)',
                '팀 이벤트 RSVP 관리',
              ].map(t => (
                <div key={t} className="lnd-check"><i className="fas fa-circle-check" />{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STORY 3 · AI 비서 ── */}
      <section className="lnd-story" id="s3" style={{ background: '#fff' }}>
        <div className="lnd-story-split">

          {/* 텍스트 */}
          <div>
            <span className="lnd-story-kicker" style={{ background: '#f5f3ff', color: '#7c3aed' }}>AI 비서 ARIA</span>
            <h2 className="lnd-story-h2">
              AI가 오늘 일정을<br />대신 분석해 드려요
            </h2>
            <p className="lnd-story-p">
              Claude 기반 AI 비서 ARIA가 오늘 할일을 파악하고,
              미루고 있는 작업을 탐지해 가장 작은 첫 단계를 제안합니다.
              결정이 어려울 때 AI에게 물어보세요.
            </p>
            <div className="lnd-checks">
              {[
                '오늘 일정 자동 분석 & 요약',
                '반복 미루기 패턴 탐지',
                '최적 할일 순서 제안',
              ].map(t => (
                <div key={t} className="lnd-check"><i className="fas fa-circle-check" />{t}</div>
              ))}
            </div>
          </div>

          {/* AI 채팅 목업 */}
          <div className="lnd-vis-card dark">
            <div className="ai-header">
              <div className="ai-avatar"><i className="fas fa-robot" /></div>
              <span className="ai-name">ARIA · AI 비서</span>
            </div>
            <div className="ai-messages">
              <div className="ai-msg user">
                <div className="ai-bubble user">오늘 뭐부터 해야 할까?</div>
              </div>
              <div className="ai-msg">
                <div className="ai-msg-label">ARIA</div>
                <div className="ai-bubble aria">
                  오늘 미완료 5개 중 <strong>2개가 기한 초과</strong>예요 📋<br /><br />
                  지금 당장: <strong>보고서 작성</strong>부터 시작하세요.<br />
                  30분이면 완료 가능한 분량이에요 💪
                </div>
              </div>
              <div className="ai-msg user">
                <div className="ai-bubble user">팀 미팅은 언제야?</div>
              </div>
              <div className="ai-msg">
                <div className="ai-msg-label">ARIA</div>
                <div className="ai-bubble aria">
                  <strong>오늘 오전 9시</strong>에 주간 팀 미팅이 있어요.<br />
                  지금부터 <strong>1시간 남았습니다</strong> ⏰
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 기능 그리드 ── */}
      <section className="lnd-features">
        <div className="lnd-inner">
          <div className="lnd-features-head">
            <div className="lnd-feat-kicker">전체 기능</div>
            <h2 className="lnd-features-h2">하나의 앱으로 충분해요</h2>
            <p className="lnd-features-sub">팀 생산성을 높이는 6가지 핵심 기능</p>
          </div>
          <div className="lnd-feat-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lnd-feat-card">
                <div className="lnd-feat-ico" style={{ background: f.bg, color: f.color }}>
                  <i className={`fas ${f.icon}`} />
                </div>
                <div className="lnd-feat-title">{f.title}</div>
                <p className="lnd-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lnd-cta">
        <h2 className="lnd-cta-h2">지금 바로 시작하세요</h2>
        <p className="lnd-cta-sub">이메일 하나로 가입 완료. 신용카드 불필요. 영원히 무료.</p>
        <div className="lnd-cta-btns">
          <Link href="/login" className="lnd-btn-main">
            무료로 시작하기 <i className="fas fa-arrow-right" />
          </Link>
        </div>
        <p className="lnd-cta-note">
          <i className="fas fa-shield-halved" /> Google · GitHub · Kakao 소셜 로그인 지원
        </p>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lnd-footer">
        <a href="#" className="lnd-footer-logo">
          <div className="lnd-logo-icon"><i className="fas fa-calendar-check" /></div>
          TeamScheduler
        </a>
        <div className="lnd-footer-links">
          <Link href="/login">로그인</Link>
          <a href="#">이용약관</a>
          <a href="#">개인정보처리방침</a>
        </div>
        <p className="lnd-footer-copy">© 2025 TeamScheduler. All rights reserved.</p>
      </footer>

    </div>
  );
}
