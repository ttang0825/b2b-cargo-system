-- 공지사항 간이 서식 (굵게 · 크기 · 색 · 이모지) + 수정 + 「화주에게 다시 알림」
-- 2026-09-17
--
-- 🔴 **정식 편집기(Tiptap 등) 도입을 뒤집은 것이다**(사용자 확정 2026-09-17).
--    지시서 0-3 ①번은 「정식 편집기 도입」이었으나, 사용자가 작업량을 보고
--    *"최소한의 수정으로 글자볼드, 글자크기, 글자컬러, 이모티콘"* 으로 범위를 줄였다.
--    🔴 그래서 **신규 의존성이 0 그대로다** — 편집기도 정화 라이브러리도 안 들어온다.
--    본문은 **평문으로 저장**하고 화면에 그릴 때만 `lib/announcementMarkup.ts` 가
--    허용한 표기만 서식으로 바꾼다(나머지는 전부 글자로 이스케이프).
--    🔴 **「HTML 을 저장한다」로 되돌리지 말 것** — 그 순간 정화 라이브러리가 필요해지고
--    이 마이그레이션의 `content_format` 값 목록도 같이 바뀌어야 한다.
--
-- 늘리는 칸 셋
--   content_format  본문을 어떤 방식으로 읽을지  ('plain' | 'markup')
--   updated_at      마지막으로 고친 시각 (자동 갱신 트리거 포함)
--   announced_at    🔴 **화주 화면의 「새 공지」 판정 기준**
--
-- 🔴 `announced_at` 이 필요한 이유 — 지금은 세 화면이 전부 `created_at` 으로
--    NEW 를 판정한다(사이드바 배지 · 홈 「안 읽음 N」 · 목록 NEW 알약). 수정 기능이
--    생기면 「오타 하나 고쳤는데 모든 화주에게 새 공지로 뜨는」 일이 생긴다.
--    그래서 **담당자가 저장 화면에서 고른다**(「화주에게 다시 알림」 체크 · 기본 꺼짐).
--    🔴 `updated_at` 으로 판정하지 말 것 — 그러면 체크가 무의미해진다.

-- ── ① 지금 상태 확인 (원칙 27번 — 짐작하지 않는다) ──────────────────────
-- 🔴 `add column if not exists` 는 컬럼이 이미 있으면 **조용히 아무것도 안 한다.**
--    타입이 다른 동명의 레거시 컬럼이 있으면 아래 백필이 엉뚱한 곳에 들어간다.
do $$
declare
  v_bad text;
begin
  select string_agg(column_name || '(' || data_type || ')', ', ')
    into v_bad
  from information_schema.columns
  where table_schema = 'public' and table_name = 'announcements'
    and (
      (column_name = 'content_format' and data_type <> 'text')
      or (column_name = 'updated_at'   and data_type <> 'timestamp with time zone')
      or (column_name = 'announced_at' and data_type <> 'timestamp with time zone')
    );
  if v_bad is not null then
    raise exception '중단: announcements 에 타입이 다른 동명 컬럼이 이미 있습니다 — %', v_bad;
  end if;
end $$;

-- ── ② 컬럼 셋 ───────────────────────────────────────────────────────────
alter table public.announcements
  add column if not exists content_format text        not null default 'plain',
  add column if not exists updated_at     timestamptz  not null default now(),
  add column if not exists announced_at   timestamptz;

-- 값 목록을 DB 에서도 못 박는다. 🔴 코드(`lib/announcementMarkup.ts`)에서 값을 늘릴 때
--    이 제약도 같이 갱신할 것 — 안 하면 저장이 통째로 막힌다(§7 함정, 실제로 겪은 자리).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.announcements'::regclass
      and conname = 'announcements_content_format_check'
  ) then
    alter table public.announcements
      add constraint announcements_content_format_check
      check (content_format in ('plain', 'markup'));
  end if;
end $$;

-- ── ③ 백필 ─────────────────────────────────────────────────────────────
-- 🔴 기존 행은 **반드시 'plain' 으로 남아야 한다** — 실측(㉙-f)에 기존 1행의 본문에
--    줄바꿈이 있다. 서식으로 읽으면 그 줄바꿈이 통째로 사라진다.
--    `default 'plain'` 이라 자동으로 그렇게 되지만, 눈으로 보이게 한 번 더 적는다.
update public.announcements set content_format = 'plain' where content_format is null;

-- 🔴 `announced_at` 백필을 빼지 말 것 — 비어 있으면 화주 화면의 NEW 판정이
--    「기준이 없다 = 전부 새 글」로 떨어져, 옛 공지가 통째로 NEW 로 되살아난다.
update public.announcements
   set announced_at = created_at
 where announced_at is null;

alter table public.announcements
  alter column announced_at set not null,
  alter column announced_at set default now();

-- ── ④ updated_at 자동 갱신 ─────────────────────────────────────────────
-- ⚠️ 이 저장소의 다른 7개 표에는 이 트리거가 있지만 **마이그레이션 파일이 없다**
--    (사용자가 Supabase SQL 편집기에서 손으로 만든 것 · CLAUDE.md §2). 그래서 공용
--    함수 이름을 짐작하지 않고 **이 표 전용 함수**를 둔다 — 이름이 겹칠 일이 없다.
create or replace function public.set_announcements_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_announcements_updated_at();

-- ── ⑤ 조회 인덱스 ──────────────────────────────────────────────────────
-- 화주 화면 셋이 전부 `announced_at > 마지막으로 본 시각` 으로 센다.
create index if not exists announcements_announced_at_idx
  on public.announcements (announced_at desc);

-- ── ⑥ 단언 ─────────────────────────────────────────────────────────────
do $$
declare
  v_missing text;
  v_plain   int;
  v_null    int;
  v_trg     int;
begin
  select string_agg(c, ', ') into v_missing
  from unnest(array['content_format','updated_at','announced_at']) as c
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'announcements' and column_name = c
  );
  if v_missing is not null then
    raise exception '중단: 컬럼이 안 생겼습니다 — %', v_missing;
  end if;

  select count(*) into v_plain from public.announcements where content_format = 'plain';
  select count(*) into v_null  from public.announcements where announced_at is null;
  if v_null > 0 then
    raise exception '중단: announced_at 이 비어 있는 행이 %건 있습니다', v_null;
  end if;

  select count(*) into v_trg from pg_trigger
  where tgrelid = 'public.announcements'::regclass and tgname = 'announcements_set_updated_at';
  if v_trg <> 1 then
    raise exception '중단: updated_at 트리거가 안 걸렸습니다';
  end if;

  raise notice '✅ 공지 간이 서식 준비 완료 — plain 행 %건 · announced_at 빈 행 0건 · 트리거 1개', v_plain;
end $$;

-- ── ⑦ 결과 확인 ────────────────────────────────────────────────────────
select ordinal_position as "순서", column_name as "컬럼", data_type as "타입",
       is_nullable as "널허용", column_default as "기본값"
from information_schema.columns
where table_schema = 'public' and table_name = 'announcements'
order by ordinal_position;

select content_format as "본문 방식", count(*) as "행수",
       count(*) filter (where content like '%' || chr(10) || '%') as "줄바꿈 있는 행"
from public.announcements group by content_format order by 1;
