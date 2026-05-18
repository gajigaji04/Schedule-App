# TeamScheduler

팀과 함께 사용하는 웹 기반 일정·할일 관리 앱입니다.  
Vanilla JS + Supabase(PostgreSQL) 기반으로 빌드 도구 없이 실행됩니다.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| **대시보드** | 오늘 할일 현황, 완료/미완료 통계, 미니 캘린더 |
| **캘린더** | 월간 뷰, 날짜 클릭 시 일별 할일 패널 |
| **내 할일** | CRUD, 우선순위·색상·마감일 설정, 필터(전체/오늘/미완료/완료/공유) |
| **팀 관리** | 팀 생성·삭제, 이메일로 팀원 초대, 팀 공유 할일 |
| **계산기** | 부가세·급여 실수령액·대출 이자 시뮬레이터 + 공학용 계산기 |
| **설정** | 프로필 수정, 테마 색상 선택, 라이트/다크 모드 |
| **알림** | 마감 임박 브라우저 푸시 알림 + 헤더 배지 |
| **검색** | 제목·내용 실시간 검색 |
| **마감 잔여 바** | 할일 항목에 마감까지 남은 일수를 색상 바로 시각화 |

---

## 기술 스택

- **Frontend** : Vanilla JS (ES2022 클래스 기반 MVC), CSS Custom Properties
- **Backend** : [Supabase](https://supabase.com) (PostgreSQL + PostgREST API)
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

Supabase 대시보드 → **SQL Editor** → `supabase-schema.sql` 전체 내용 붙여넣기 → **Run**

> 테이블 생성 후 RLS(Row Level Security) 비활성화까지 포함됩니다.

---

### 4. 환경 설정

```bash
cp js/config.example.js js/config.js
```

`js/config.js` 를 열어 실제 값으로 교체:

```js
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_KEY = 'your-anon-public-key';
```

> `js/config.js` 는 `.gitignore` 에 등록되어 있습니다. 절대 커밋하지 마세요.

---

### 5. 실행

VS Code에서 `index.html` 우클릭 → **Open with Live Server**

> `file://` 로 직접 열면 Supabase API 호출이 정상 동작하지 않을 수 있습니다.

---

## 파일 구조

```
scheduler-app/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js                    # 진입점 (DOMContentLoaded)
│   ├── config.js                 # 환경변수 (gitignored)
│   ├── config.example.js         # 환경변수 템플릿
│   ├── models/
│   │   ├── User.js               # 사용자 CRUD (Supabase)
│   │   ├── Task.js               # 할일 CRUD (Supabase)
│   │   └── Team.js               # 팀 CRUD (Supabase)
│   ├── views/
│   │   ├── HeaderView.js         # 헤더·알림 드롭다운
│   │   ├── TaskView.js           # 할일 목록 렌더링
│   │   └── CalendarView.js       # 캘린더 렌더링
│   ├── controllers/
│   │   ├── AppController.js      # 라우터·로그인·로그아웃
│   │   ├── DashboardController.js
│   │   ├── CalendarController.js
│   │   ├── TaskController.js
│   │   ├── TeamController.js
│   │   ├── SettingsController.js
│   │   └── CalculatorController.js
│   └── services/
│       ├── ThemeService.js       # 테마·색상 관리
│       └── NotificationService.js # 마감 알림·배지
├── supabase-schema.sql           # DB 스키마 (gitignored)
├── .gitignore
└── README.md
```

---

## 아키텍처

```
[index.html]
    └─ app.js ──► AppController.init()
                      ├─ UserModel         (Supabase users 테이블)
                      ├─ TaskModel         (Supabase tasks 테이블)
                      ├─ TeamModel         (Supabase teams 테이블)
                      ├─ Views             (DOM 렌더링, 순수 함수)
                      ├─ Controllers       (유저 인터랙션 처리)
                      └─ Services          (테마, 알림)
```

- **Model** : Supabase API 호출, 모두 `async/await`
- **View** : DOM 렌더링만 담당, 데이터를 직접 fetch하지 않음
- **Controller** : 데이터 fetch → View 전달, 이벤트 처리
- **`static #bound`** 패턴으로 뷰 재진입 시 이벤트 중복 등록 방지

---

## 데이터베이스 스키마

```
users       id, name, email, team_ids[], created_at
tasks       id, user_id, team_id, title, description,
            date, deadline, priority, color, completed,
            created_at, updated_at
teams       id, name, description, member_emails[],
            created_by, created_at
```

---

## 주의 사항

- 현재 RLS(Row Level Security)가 비활성화된 상태입니다.  
  실서비스 배포 시 Supabase Auth와 RLS 정책을 반드시 추가하세요.
- Anon Key는 클라이언트에 노출됩니다. 민감한 데이터는 RLS로 보호해야 합니다.
