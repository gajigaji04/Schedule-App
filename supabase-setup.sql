-- ============================================================
-- TeamScheduler — Supabase SQL 전체 셋업
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- 이미 테이블이 있어도 IF NOT EXISTS로 안전하게 실행됩니다.
-- ============================================================


-- ── 1. users (프로필) ────────────────────────────────────────
create table if not exists users (
  id         uuid        primary key references auth.users(id) on delete cascade,
  name       text        not null default '',
  email      text        not null unique,
  created_at timestamptz not null default now()
);

alter table users enable row level security;

-- 로그인한 사용자는 누구나 읽기 가능 (팀원 이름/이메일 조회에 필요)
create policy "users_select" on users
  for select using (auth.role() = 'authenticated');

-- 본인 프로필만 생성/수정
create policy "users_insert" on users
  for insert with check (auth.uid() = id);

create policy "users_update" on users
  for update using (auth.uid() = id);


-- ── 2. teams ────────────────────────────────────────────────
create table if not exists teams (
  id             text        primary key default gen_random_uuid()::text,
  name           text        not null,
  description    text        not null default '',
  created_by     uuid        not null references auth.users(id) on delete cascade,
  member_emails  text[]      not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists teams_created_by_idx on teams(created_by);

alter table teams enable row level security;

-- 로그인한 사용자는 누구나 읽기 (팀 소속 여부는 앱에서 필터링)
create policy "teams_select" on teams
  for select using (auth.role() = 'authenticated');

create policy "teams_insert" on teams
  for insert with check (auth.uid() = created_by);

-- 팀장만 수정/삭제
create policy "teams_update" on teams
  for update using (auth.uid() = created_by);

create policy "teams_delete" on teams
  for delete using (auth.uid() = created_by);


-- ── 3. tasks ────────────────────────────────────────────────
create table if not exists tasks (
  id          text        primary key default gen_random_uuid()::text,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  description text,
  date        date        not null,
  deadline    date,
  priority    text        not null default 'medium' check (priority in ('low','medium','high')),
  color       text,
  team_id     text        references teams(id) on delete set null,
  completed   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

create index if not exists tasks_user_date_idx on tasks(user_id, date);
create index if not exists tasks_user_id_idx   on tasks(user_id);

alter table tasks enable row level security;

-- 본인 할일만 읽기/쓰기
create policy "tasks_select" on tasks
  for select using (auth.uid() = user_id);

create policy "tasks_insert" on tasks
  for insert with check (auth.uid() = user_id);

create policy "tasks_update" on tasks
  for update using (auth.uid() = user_id);

create policy "tasks_delete" on tasks
  for delete using (auth.uid() = user_id);


-- ── 4. messages (팀 그룹 채팅) ──────────────────────────────
create table if not exists messages (
  id         text        primary key,
  team_id    text        not null references teams(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  user_name  text        not null,
  content    text        not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_team_idx on messages(team_id, created_at);

alter table messages enable row level security;

-- 로그인 사용자면 읽기 가능 (팀 소속 여부 검증은 앱에서)
create policy "messages_select" on messages
  for select using (auth.role() = 'authenticated');

create policy "messages_insert" on messages
  for insert with check (auth.uid() = user_id);

-- Realtime 활성화
alter publication supabase_realtime add table messages;


-- ── 5. direct_messages (1:1 DM) ─────────────────────────────
create table if not exists direct_messages (
  id           text        primary key,
  channel_id   text        not null,
  from_user_id uuid        not null references auth.users(id) on delete cascade,
  from_name    text        not null,
  to_user_id   uuid        not null references auth.users(id) on delete cascade,
  content      text        not null,
  created_at   timestamptz not null default now()
);

create index if not exists dm_channel_idx on direct_messages(channel_id, created_at);

alter table direct_messages enable row level security;

-- 보내거나 받은 메시지만 읽기
create policy "dm_select" on direct_messages
  for select using (
    auth.uid() = from_user_id or auth.uid() = to_user_id
  );

-- 본인이 보낸 메시지만 insert
create policy "dm_insert" on direct_messages
  for insert with check (auth.uid() = from_user_id);

-- Realtime 활성화
alter publication supabase_realtime add table direct_messages;


-- ── 6. team_events (팀 공유 일정) ────────────────────────────
create table if not exists team_events (
  id          text        primary key default gen_random_uuid()::text,
  team_id     text        not null references teams(id) on delete cascade,
  created_by  uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  description text        not null default '',
  date        date        not null,
  created_at  timestamptz not null default now()
);

create index if not exists te_team_idx on team_events(team_id, date);

alter table team_events enable row level security;

create policy "te_select" on team_events
  for select using (auth.role() = 'authenticated');

create policy "te_insert" on team_events
  for insert with check (auth.uid() = created_by);

create policy "te_delete" on team_events
  for delete using (auth.uid() = created_by);


-- ── 7. team_event_rsvp (참석 응답) ───────────────────────────
create table if not exists team_event_rsvp (
  event_id     text        not null references team_events(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  user_name    text        not null,
  response     text        not null check (response in ('yes','no','maybe')),
  responded_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table team_event_rsvp enable row level security;

create policy "rsvp_select" on team_event_rsvp
  for select using (auth.role() = 'authenticated');

-- upsert는 INSERT + UPDATE 정책이 모두 필요
create policy "rsvp_insert" on team_event_rsvp
  for insert with check (auth.uid() = user_id);

create policy "rsvp_update" on team_event_rsvp
  for update using (auth.uid() = user_id);


-- ============================================================
-- 기존 테이블 보정 (이미 테이블이 있고 컬럼/기본값이 누락된 경우)
-- ============================================================

-- tasks.id 기본값이 없을 경우
alter table tasks alter column id set default gen_random_uuid()::text;

-- tasks.priority 기본값
alter table tasks alter column priority set default 'medium';

-- tasks.completed 기본값
alter table tasks alter column completed set default false;
