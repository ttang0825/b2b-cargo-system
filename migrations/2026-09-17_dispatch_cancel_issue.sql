-- 배차 취소 · 문제발생 사유 — 상태값 1종 추가 + 컬럼 5개
--
-- 배경(사용자 2026-09-17):
--   *「배차확정 후 배차기사의 변심으로 취소한 경우, 어떻게 해야하나?」*
--   *「운행중 사고가 났을시 … 화주포털에 노출시 문제발생으로만 뜨고 화주입장에서는
--     어떤 상황인지 잘모르게 된다」*
--
-- 지금은 **취소하면 배차 행이 통째로 지워지고**(삭제 버튼 하나뿐), 사고가 나도 화주는
-- 빨간 배지 하나만 본다. 이 마이그레이션은 그 둘을 **기록할 자리**를 만든다.
--
-- 🔴 **적용 순서 — DB 가 먼저다.** 코드를 먼저 올리면 `취소` 를 저장하는 순간
--    CHECK 위반으로 **배차 저장이 통째로 막힌다**(PR #163 이 정확히 그 증상이었다).
--
-- 🔴 **기존 행은 한 건도 UPDATE 하지 않는다** — 허용값을 **더하기만** 하므로 소급
--    영향이 0이다. 그것이 이 마이그레이션이 안전한 유일한 이유다.
--
-- 🔴 **백필하지 않는다** — 지금까지 삭제된 배차는 복원할 근거가 없다.
--
-- 🔴 설계 결정 — 바꾸기 전에 이유를 먼저 볼 것
--
--   '취소' 를 상태값으로   행을 남기기 위해서다. 별도 boolean(`cancelled`)을 두면
--                         `dispatch_status` 와 어긋날 수 있고(그 사고가 이미
--                         `issue_occurred` ↔ `dispatch_status='문제발생'` 에서
--                         일어났다 — `lib/dispatchStage.ts` 주석), 3단계 매핑과
--                         화주 조회가 둘 다 상태값을 보고 있다.
--
--   cancel_reason         **코드**(`driver_noshow` 등)를 담는다. 정의처는
--                         `lib/dispatchCancel.ts` 하나다. 🔴 **CHECK 를 걸지 않았다** —
--                         사유 목록은 실무가 굳기 전이라 늘어난다(원칙 50번의
--                         「상수를 늘리면 CHECK 도 같이」를 피하려는 것이고,
--                         그래서 코드가 유일한 방어선이다).
--
--   cancel_reason_note    담당자가 적는 경위. 🔴 **내부 전용** — 화주 화면 0줄.
--
--   cancelled_by          `staff_accounts(id)` 참조. `on delete set null` 이다 —
--                         🔴 **퇴사한 직원 행이 지워져도 취소 기록은 남아야 한다**
--                         (원칙 32번의 그 판단이고, 이력이지 발송 대상이 아니다).
--
--   issue_reason          B장이 쓴다. 🔴 **같은 마이그레이션에 함께 넣는다** —
--                         `_migrations` 를 두 번 늘리면 A 만 merge 된 상태에서
--                         B 의 컬럼이 없어 화면이 깨진다.
--                         🔴 **`issue_notes`(자유 서술)를 대체하는 것이 아니다** —
--                         드롭다운은 **분류**이고 자유 서술은 **경위**다. 둘 다 남는다.
--
-- ⚠️ **원칙 27번 사전 확인을 마쳤다**(`_verify.sql` ㉖-g, 2026-09-17) —
--    `dispatches` 에 있는 것은 `issue_occurred`·`issue_notes` 둘뿐이고
--    `cancel_*`·`issue_reason` 은 **없다**. 그래서 `add column if not exists` 가
--    조용히 무시되는 함정에 걸리지 않는다.
--
-- ⚠️ 착수 시점 실측(㉖) — 배차 **11행 · 전부 `운송완료`** · `issue_occurred=true` **0건** ·
--    `issue_notes` **0건** · 한 오더에 배차 2건 이상 **0건**.

-- ── ① dispatch_status 허용값 6종 → 7종 ──────────────────────────────────────
--
-- 🔴 **기존 6종을 한 글자도 바꾸지 않는다.** `취소` 만 더한다.
--    (실측한 현재 정의:
--     CHECK ((dispatch_status = ANY (ARRAY['접수중','배차확정','상차완료',
--                                          '하차완료','운송완료','문제발생']))))

alter table dispatches drop constraint if exists dispatches_dispatch_status_check;

alter table dispatches
  add constraint dispatches_dispatch_status_check
  check (dispatch_status = any (array[
    '접수중'::text,
    '배차확정'::text,
    '상차완료'::text,
    '하차완료'::text,
    '운송완료'::text,
    '문제발생'::text,
    '취소'::text
  ]));

-- ── ② 컬럼 5개 ──────────────────────────────────────────────────────────────

alter table dispatches add column if not exists cancel_reason      text;
alter table dispatches add column if not exists cancel_reason_note text;
alter table dispatches add column if not exists cancelled_at       timestamptz;
alter table dispatches add column if not exists cancelled_by       uuid;
alter table dispatches add column if not exists issue_reason       text;

-- 🔴 FK 는 따로 건다 — `add column if not exists ... references` 는 컬럼이 이미
--    있으면 **REFERENCES 절이 조용히 무시된다**(원칙 27번, `quotes.created_by` 사고).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.dispatches'::regclass
       and conname  = 'dispatches_cancelled_by_fkey'
  ) then
    alter table dispatches
      add constraint dispatches_cancelled_by_fkey
      foreign key (cancelled_by) references staff_accounts (id) on delete set null;
  end if;
end $$;

comment on column dispatches.cancel_reason is
  '배차 취소 사유 코드. 정의처는 lib/dispatchCancel.ts 하나 — 화면에 코드를 직접 적지 말 것';
comment on column dispatches.cancel_reason_note is
  '취소 경위(자유 서술). 내부 전용 — 화주 화면·견적서·엑셀 0줄';
comment on column dispatches.issue_reason is
  '문제발생 사유 코드. 정의처는 lib/dispatchIssue.ts 하나. issue_notes(경위)를 대체하지 않는다';

-- ── ③ 단언 — 하나라도 어긋나면 통째로 롤백된다 ──────────────────────────────

do $$
declare
  def        text;
  n_missing  int;
  n_cancel   int;
  n_dirty    int;
  fk_action  char;
  s          text;
begin
  select pg_get_constraintdef(oid) into def
    from pg_constraint
   where conrelid = 'public.dispatches'::regclass
     and conname  = 'dispatches_dispatch_status_check';
  if def is null then
    raise exception 'dispatches_dispatch_status_check 가 없습니다 — 제약이 사라지면 아무 값이나 저장됩니다';
  end if;

  -- 🔴 기존 6종이 전부 그대로 허용되는지 **이름으로** 확인한다.
  --    (하나라도 빠지면 그 상태의 배차를 더 이상 저장할 수 없다)
  n_missing := 0;
  foreach s in array array['접수중','배차확정','상차완료','하차완료','운송완료','문제발생','취소'] loop
    if position(s in def) = 0 then
      n_missing := n_missing + 1;
      raise warning '허용값에 % 가 없습니다', s;
    end if;
  end loop;
  if n_missing <> 0 then
    raise exception 'dispatch_status 허용값 %개가 빠졌습니다 — 정의: %', n_missing, def;
  end if;

  -- 🔴 기존 행이 하나도 안 바뀌었는지: `취소` 행은 **0건**이어야 한다.
  select count(*) into n_cancel from dispatches where dispatch_status = '취소';
  if n_cancel <> 0 then
    raise exception '이 마이그레이션은 상태를 바꾸지 않는데 취소 행이 %건 있습니다', n_cancel;
  end if;

  -- 🔴 새 컬럼은 전부 null 이어야 한다(백필하지 않기로 했다).
  select count(*) into n_dirty
    from dispatches
   where cancel_reason is not null
      or cancel_reason_note is not null
      or cancelled_at is not null
      or cancelled_by is not null
      or issue_reason is not null;
  if n_dirty <> 0 then
    raise exception '새 컬럼에 값이 들어간 행이 %건 있습니다 — 백필하지 않기로 했습니다', n_dirty;
  end if;

  -- 🔴 cancelled_by FK 가 set null 인지(퇴사자 행이 지워져도 기록은 남아야 한다).
  select confdeltype into fk_action
    from pg_constraint
   where conrelid = 'public.dispatches'::regclass
     and conname  = 'dispatches_cancelled_by_fkey';
  if fk_action is null then
    raise exception 'dispatches_cancelled_by_fkey 가 없습니다';
  end if;
  if fk_action <> 'n' then
    raise exception 'cancelled_by FK 의 on delete 가 set null 이 아닙니다: % — 직원 행 삭제가 막히거나 취소 기록이 같이 지워집니다', fk_action;
  end if;

  -- 🔴 `issue_notes` 를 없애지 않았는지(드롭다운이 자유 서술을 대체하지 않는다).
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'dispatches' and column_name = 'issue_notes'
  ) then
    raise exception 'issue_notes 가 없습니다 — 분류(issue_reason)가 경위(issue_notes)를 대체하지 않기로 했습니다';
  end if;
end $$;

-- ── ④ 실제로 저장되는지 한 번 해보고 되돌린다 ───────────────────────────────
--
-- 🔴 **단언이 통과해도 실제 INSERT 가 막힐 수 있다**(다른 제약이 걸린다).
--    그래서 `취소` 상태로 한 건 넣어 보고 **반드시 되돌린다**.
--    ⚠️ 이 블록이 실패하면 마이그레이션 전체가 롤백된다 — 그것이 의도다.

do $$
declare
  probe_id uuid;
  ord_id   uuid;
begin
  select id into ord_id from orders limit 1;
  if ord_id is null then
    raise notice '오더가 0건이라 저장 시험을 건너뜁니다';
    return;
  end if;

  insert into dispatches (order_id, dispatch_status, cancel_reason, cancelled_at)
  values (ord_id, '취소', 'driver_noshow', now())
  returning id into probe_id;

  if probe_id is null then
    raise exception '취소 상태로 배차를 저장하지 못했습니다';
  end if;

  delete from dispatches where id = probe_id;

  if exists (select 1 from dispatches where id = probe_id) then
    raise exception '시험용 행이 지워지지 않았습니다 — 운영 데이터에 남습니다';
  end if;
end $$;

-- ── 되돌리기 ────────────────────────────────────────────────────────────────
--
--   alter table dispatches drop constraint if exists dispatches_dispatch_status_check;
--   alter table dispatches
--     add constraint dispatches_dispatch_status_check
--     check (dispatch_status = any (array['접수중','배차확정','상차완료',
--                                         '하차완료','운송완료','문제발생']));
--   alter table dispatches drop column if exists cancel_reason;
--   alter table dispatches drop column if exists cancel_reason_note;
--   alter table dispatches drop column if exists cancelled_at;
--   alter table dispatches drop column if exists cancelled_by;
--   alter table dispatches drop column if exists issue_reason;
--
-- 🔴 **되돌리기 전에 `취소` 행이 있는지 먼저 보십시오** — 있으면 CHECK 복원이
--    실패하고, 억지로 지우면 **그 취소 이력이 통째로 사라집니다.**
