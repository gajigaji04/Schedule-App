# TeamScheduler

팀 일정, 할일, 메모, 타이머를 하나의 앱에서 관리하는 올인원 스케줄러입니다.

## 주요 기능

- **대시보드** — 오늘의 할일, 팀 현황, 마감 임박 항목 한눈에 확인
- **캘린더** — 월간/주간/연간 뷰, 마감일 스팬 바, 날짜별 할일 표시
- **내 할일** — 우선순위·태그·마감일 관리, 팀 공유
- **팀 관리** — 팀 생성, 멤버 초대, 팀 할일 공유
- **메모장** — Markdown 에디터, 분할 뷰(편집·미리보기), 찾기/바꾸기
- **타이머** — 알람, 카운트다운, 뽀모도로(커스텀 커리큘럼)
- **계산기** — 기본 및 공학용 계산기
- **테마** — 빨/주/노/초/파/남/보 7가지 색상 + 커스텀 컬러, 라이트/다크/자동 모드

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 스타일 | Tailwind CSS v4 |
| 백엔드/인증 | Supabase (OTP 이메일 · Google · GitHub · Kakao OAuth) |
| 아이콘 | Font Awesome 6.5 |

## 시작하기

### 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 값을 채워 넣으세요.

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 개발 서버 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 열면 앱을 확인할 수 있습니다.

### 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
app/
  (app)/          # 인증된 사용자 영역 (AppShell 레이아웃)
    dashboard/
    calendar/
    tasks/
    teams/
    memo/
    timer/
    calculator/
    settings/
  login/          # 로그인 페이지
  globals.css     # 전역 스타일 (디자인 토큰, 컴포넌트)
components/
  layout/         # AppShell, AppHeader, AppSidebar, BottomNav
  ui/             # FloatingAIPanel, FloatingChatPanel 등
lib/
  supabase.js     # Supabase 클라이언트
  contexts/       # AuthContext
  utils/          # themeColor, 기타 유틸
models/           # DB 쿼리 함수 (task, team, user)
```

## 라이선스

MIT 라이선스에 따라 사용 가능합니다.
