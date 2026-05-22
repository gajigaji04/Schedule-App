# TeamScheduler

팀과 함께 사용하는 웹 기반 일정·할일 관리 앱입니다.  
Vanilla JS + Supabase(PostgreSQL) 기반으로 빌드 도구 없이 실행됩니다.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| **대시보드** | 오늘 할일 현황, 이번 주 완료율·연속 달성일·최고 생산성 요일, 미니 캘린더 |
| **캘린더** | 월간 뷰, 날짜 클릭 시 일별 할일 패널, 공휴일 표시 |
| **내 할일** | CRUD, 우선순위·색상·마감일 설정, 필터(전체/오늘/미완료/완료/공유) |
| **팀 관리** | 팀 생성·삭제, 이메일로 팀원 초대, 팀 공유 할일 |
| **채팅** | 팀 그룹 채팅 + 1:1 DM, 낙관적 렌더링(즉시 표시), Supabase Realtime 실시간 동기화 |
| **AI 비서 ARIA** | Claude API 기반 일정 분석·AI 재배치·미루기 방지·의사결정 지원 |
| **계산기** | 부가세·급여 실수령액·대출 이자 시뮬레이터 + 공학용 계산기 |
| **설정** | 프로필 수정, 테마 색상 선택, 라이트/다크/자동(시스템) 모드 |
| **알림** | 마감 임박 브라우저 푸시 알림 + 헤더 배지 |
| **검색** | 제목·내용 실시간 검색 |
| **PWA** | 홈 화면 추가, 오프라인 폴백, Service Worker 캐싱 |

---

## 기술 스택

- **Frontend** : Vanilla JS (ES2022 클래스 기반 MVC), CSS Custom Properties
- **Backend** : [Supabase](https://supabase.com) (PostgreSQL + PostgREST API + Realtime)
- **AI** : [Anthropic Claude API](https://console.anthropic.com) (claude-haiku-4-5)
- **아이콘** : Font Awesome 6
- **빌드 도구** : 없음 (CDN + Live Server)

---

## 시작하기

### 사전 준비

- 브라우저 (Chrome 권장)
- VS Code + [Live Server 확장](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
- [Supabase](https://supabase.com) 계정

---

### 1. 저장소 클론

```bash
git clone <repo-url>
cd scheduler-app
```

---

### 2. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) → **New Project** 생성
2. **Project Settings → API** 에서 복사:
   - `Project URL` (예: `https://xxxx.supabase.co`)
   - `anon public` 키

---

### 3. 데이터베이스 스키마 적용

Supabase 대시보드 → **SQL Editor** 에서 아래 두 파일을 순서대로 실행합니다.

**① 기본 스키마**

`supabase-schema.sql` 전체 내용 붙여넣기 → **Run**

**② DM 테이블** (`js/models/Dm.js` 상단 주석 참고)

```sql
CREATE TABLE IF NOT EXISTS direct_messages (
  id           TEXT PRIMARY KEY,
  channel_id   TEXT NOT NULL,
  from_user_id TEXT NOT NULL,
  from_name    TEXT NOT NULL,
  to_user_id   TEXT NOT NULL,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON direct_messages (channel_id, created_at);
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own DMs" ON direct_messages FOR SELECT
  USING (from_user_id = auth.uid()::text OR to_user_id = auth.uid()::text);
CREATE POLICY "Send DMs" ON direct_messages FOR INSERT
  WITH CHECK (from_user_id = auth.uid()::text);
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
```

---

### 4. 환경 설정

```bash
cp js/config.example.js js/config.js
```

`js/config.js` 를 열어 실제 값으로 교체:

```js
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_KEY = 'your-anon-public-key';

// AI 비서를 모든 사용자가 바로 쓸 수 있게 하려면 Anthropic API 키 입력 (선택)
const AI_API_KEY = ''; // 예: 'sk-ant-api03-...'
```

> `js/config.js` 는 `.gitignore` 에 등록되어 있습니다. 절대 커밋하지 마세요.  
> `AI_API_KEY` 를 비워두면 각 사용자가 자신의 키를 직접 입력해야 합니다.

---

### 5. 실행

VS Code에서 `index.html` 우클릭 → **Open with Live Server**

> `file://` 로 직접 열면 Supabase API 호출이 정상 동작하지 않을 수 있습니다.

---

## 파일 구조

```
scheduler-app/
├── index.html
├── manifest.json             # PWA 매니페스트
├── sw.js                     # Service Worker (캐싱·오프라인)
├── offline.html              # 오프라인 안내 페이지
├── icons/
│   ├── icon-192.svg          # PWA 아이콘 (192×192)
│   └── icon-512.svg          # PWA 아이콘 (512×512)
├── css/
│   └── style.css
├── js/
│   ├── app.js                # 진입점 — 테마 복원 + SW 등록
│   ├── config.js             # 환경변수 (gitignored)
│   ├── config.example.js     # 환경변수 템플릿
│   ├── models/
│   │   ├── User.js           # 사용자 CRUD
│   │   ├── Task.js           # 할일 CRUD
│   │   ├── Team.js           # 팀 CRUD
│   │   ├── Chat.js           # 팀 채팅 (messages 테이블)
│   │   └── Dm.js             # 1:1 DM (direct_messages 테이블)
│   ├── views/
│   │   ├── HeaderView.js     # 헤더·알림 드롭다운
│   │   ├── TaskView.js       # 할일 목록 렌더링
│   │   └── CalendarView.js   # 캘린더 렌더링
│   ├── controllers/
│   │   ├── AppController.js          # 라우터·로그인·로그아웃
│   │   ├── DashboardController.js    # 대시보드 + 생산성 통계
│   │   ├── CalendarController.js
│   │   ├── TaskController.js
│   │   ├── TeamController.js
│   │   ├── ChatController.js         # 그룹 채팅 + 1:1 DM 패널
│   │   ├── ChecklistController.js    # 개인 To-do 체크리스트
│   │   ├── AIAssistantController.js  # AI 비서 ARIA 패널
│   │   ├── SettingsController.js
│   │   ├── CalculatorController.js
│   │   ├── MemoController.js
│   │   ├── TimerController.js
│   │   └── DatePicker.js
│   └── services/
│       ├── ThemeService.js       # 테마·색상 관리
│       ├── NotificationService.js # 마감 알림·배지
│       └── KoreanHolidays.js     # 공휴일 데이터
├── supabase-schema.sql       # DB 스키마 (gitignored)
├── .gitignore
└── README.md
```

---

## 아키텍처

```
[index.html]
    └─ app.js ──► ThemeService.load()   (테마 복원 — 첫 페인트 전)
                  AppController.init()
                      ├─ Models          (Supabase API, async/await)
                      │   ├─ UserModel
                      │   ├─ TaskModel
                      │   ├─ TeamModel
                      │   ├─ ChatModel   (Realtime 구독)
                      │   └─ DmModel     (Realtime 구독, RLS 적용)
                      ├─ Views           (DOM 렌더링 전용, 순수 함수)
                      ├─ Controllers     (이벤트 처리 + 데이터 fetch)
                      └─ Services
                          ├─ ThemeService       (색상 프리셋·커스텀)
                          ├─ NotificationService (Push 알림·배지)
                          └─ KoreanHolidays      (공휴일 조회)
```

- **Model** : Supabase API 호출만 담당
- **View** : DOM 렌더링만 담당, 데이터를 직접 fetch하지 않음
- **Controller** : 데이터 fetch → View 전달, 이벤트 처리
- **`static #bound`** 패턴으로 뷰 재진입 시 이벤트 중복 등록 방지
- **낙관적 렌더링** : 채팅 메시지를 즉시 UI에 표시 후 Realtime으로 중복 제거

---

## 데이터베이스 스키마

```
users           id, name, email, team_ids[], created_at
tasks           id, user_id, team_id, title, description,
                date, deadline, priority, color, completed,
                created_at, updated_at
teams           id, name, description, member_emails[],
                created_by, created_at
messages        id, team_id, user_id, user_name, content, created_at
direct_messages id, channel_id, from_user_id, from_name,
                to_user_id, content, created_at
```

---

## AI 비서 ARIA

우측 하단 보라색 로봇 버튼(🤖)으로 열 수 있습니다.

| 버튼 | 동작 |
|---|---|
| **오늘 일정 분석** | 오늘 할일을 현실적으로 평가하고 집중 포인트 제안 |
| **AI 재배치** | 기한 초과·미완료 작업을 이번 주 일정으로 재편 |
| **미루기 방지** | 반복 지연 패턴 탐지 + 지금 당장 시작할 첫 단계 제시 |
| **의사결정** | 오늘 가장 먼저 집중할 작업 1개 선정 |

API 키 설정 방법:
- **앱 공유 키** : `js/config.js`의 `AI_API_KEY` 설정 → 모든 사용자 즉시 사용 가능
- **개인 키** : 패널 내 입력창에 `sk-ant-` 로 시작하는 키 직접 입력

---

## PWA 설치

Chrome/Edge에서 주소창 우측 **설치** 버튼(⊕)을 누르면 데스크톱/모바일 앱으로 설치됩니다.  
오프라인 상태에서는 캐시된 UI가 표시되며, Supabase 요청은 온라인 복귀 후 정상 동작합니다.

---

## 주의 사항

- `direct_messages` 테이블은 RLS가 활성화되어 있습니다. 나머지 테이블은 실서비스 배포 시 RLS 정책을 추가하세요.
- Anon Key는 클라이언트에 노출됩니다. 민감한 데이터는 RLS로 보호해야 합니다.
- AI 비서는 브라우저에서 Anthropic API를 직접 호출합니다. `AI_API_KEY`를 공개 저장소에 커밋하지 마세요.
- Service Worker는 `https://` 또는 `localhost` 환경에서만 동작합니다.
