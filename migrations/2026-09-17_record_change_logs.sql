-- 견적·오더 **수정 이력** + 화주포털 「수정견적」 배지
--
-- 배경(사용자 2026-09-17):
--   *「한번 승인된 견적에서 견적조정으로 수정이 될때, 화주포털 견적확인 목록에서 금액
--     앞에 "수정견적" 이라고 뱃지가 붙으면 좋을 것 같다. … 이 수정견적 뱃지는 운송이
--     완료된 후 자동으로 사라지면 된다」*
--   *「견적상세와 운송오더 상세에는 견적과 운송오더가 수정된 이력이 어딘가 남아 있으면
--     좋겠다」*
--
-- 바로 앞 차수(PR #172)가 **견적 금액을 고치면 오더 청구금액이 따라오게** 만들었다.
-- 그래서 「누가 언제 무엇을 얼마로 고쳤나」를 되짚을 자리가 필요해졌고, 화주도 자기가
-- 승인한 금액이 조정됐다는 것을 목록에서 알아야 한다.
--
-- 🔴 **표를 새로 만들지 않았다 — `activity_logs` 를 되살려 쓴다.**
--    ⚠️ **처음에는 `record_change_logs` 를 새로 만들 생각이었다.** 그런데 원칙 27번
--       사전 확인(`_verify.sql` ㉘-b·㉘-f, 2026-09-17)에서 **이미 정확히 그 모양의 표가
--       있다**는 것이 드러났다 —
--         id · user_id · table_name · record_id · action · changed_fields(jsonb) · created_at
--       21차(`2026-08-26_rls_enable_13.sql`)가 「쓰이지 않는 6개」로 분류해 **RLS 만 켜고
--       정책은 만들지 않은** 레거시이고, 그 파일이 *「나중에 쓸 일이 생기면 그때 정책을
--       만들면 된다」*고 적어 뒀다. **지금이 그때다.**
--    🔴 **`record_change_logs` 를 새로 만들지 말 것** — 만들면 같은 일을 하는 표가 둘이
--       되고, 다음 세션이 어느 쪽을 읽어야 하는지 알 수 없게 된다.
--
-- 🚨 **원칙 27번이 기록한 그 함정이 실제로 여기에 있었다.** ㉘-g 실측 —
--       activity_logs_user_id_fkey | FOREIGN KEY (user_id) REFERENCES profiles(id)
--    `profiles` 는 **같은 21차가 죽은 표로 분류한 0행짜리 레거시**다(27차가 남긴 것).
--    이대로 두면 직원 id 를 넣는 순간 **FK 위반으로 insert 가 통째로 막힌다** —
--    `quotes.created_by` 가 `profiles` 를 참조해 `created_by` 자동기록이 막혔던
--    바로 그 사고와 **같은 표, 같은 원인**이다. ②에서 갈아끼운다.
--
-- 🔴 **백필하지 않는다** — 지금까지의 수정은 기록이 없다. 지어내면 감사 로그가 아니다.
--    (`activity_logs` 는 **0행**이다 — ㉘-g 실측. 그래서 되살려도 옛 값이 섞이지 않는다.)
--
-- 🔴 설계 결정 — 바꾸기 전에 이유를 먼저 볼 것
--
--   quotes.revised_at      「수정견적」 배지의 **유일한 신호**다. 🔴 **`updated_at` 으로
--                          대신하지 말 것** — 담당자 메모 한 줄, 화주 본인의 승인,
--                          특이사항 한 글자가 전부 `updated_at` 을 움직인다. PR #164 가
--                          포털 배너에서 정확히 그 문제를 겪고 **「바뀐 뒤의 상태」로**
--                          신호를 갈아끼웠다. 여기도 같다.
--                          🔴 **`수주` 인 견적의 `final_amount` 가 실제로 바뀐 때만**
--                          코드가 이 값을 찍는다(`lib/quoteRevision.ts`). 구간·품목만
--                          고친 것은 「수정견적」이 아니다 — 화주가 보는 것은 금액이다.
--
--   activity_logs.user_id  `profiles` → **`staff_accounts(id)`**. `on delete set null`
--                          이다 — 🔴 **퇴사한 직원 행이 지워져도 이력은 남아야 한다**
--                          (원칙 32번. 이력이지 발송 대상이 아니다).
--                          ⚠️ 그래서 **직원 이름은 `changed_fields` 안에 굳혀 저장한다** —
--                          원칙 32번이 말하는 「표시용 텍스트 스냅샷」이고, 이름이
--                          바뀌거나 행이 지워져도 그때 누가 했는지가 남는다.
--
--   changed_fields         `{"by": "<그때의 직원 이름>", "changes": [{field,label,before,after}]}`.
--                          🔴 **값은 기록 시점의 「보이는 문자열」로 굳힌다**(130,000원 ·
--                          2026-09-17 14:00 · 혼적가능). 감사 로그라 **그때 화면에 뭐라고
--                          쓰여 있었는지**가 남아야 하고, 코드가 라벨을 바꿔도 옛 기록의
--                          뜻이 달라지면 안 된다.
--
--   정책                    직원 전용(`is_active_staff()`). 🔴 **화주 정책을 만들지 말 것** —
--                          화주포털과 직원이 **둘 다 `authenticated` 롤**이라(19차)
--                          정책을 하나라도 열면 화주가 내부 수정 이력을 통째로 읽는다.
--                          🔴 화주가 보는 것은 「수정견적」 배지 하나뿐이고 그 신호는
--                          `quotes.revised_at` 이다(이 표가 아니다).
--
-- ⚠️ 착수 시점 실측(㉘) — `수주` 견적 **9건 · 전부 오더 있음 · 오더 2건 이상 0건** ·
--    오더/배차는 `운송완료/운송완료` 12 · `운송완료/취소` 6 · `activity_logs` **0행**.

-- ── ① quotes.revised_at ─────────────────────────────────────────────────────
--
-- ⚠️ **원칙 27번 사전 확인을 마쳤다**(㉘-a) — `quotes` 에 `revis%` 컬럼은 **없다**.
--    그래서 `add column if not exists` 가 조용히 무시되는 함정에 걸리지 않는다.

alter table quotes add column if not exists revised_at timestamptz;

comment on column quotes.revised_at is
  '수주 이후 견적 금액이 조정된 시각. 화주포털 「수정견적」 배지의 신호 — lib/quoteRevision.ts 가 유일 정의처.';

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'quotes' and column_name = 'revised_at'
  ) then
    raise exception 'quotes.revised_at 이 만들어지지 않았습니다';
  end if;
  -- 🔴 백필하지 않았음을 못박는다 — 있으면 「전부 수정견적」이 되어 배지가 무의미해진다.
  if exists (select 1 from quotes where revised_at is not null) then
    raise exception 'revised_at 이 이미 채워져 있습니다 — 백필한 적이 없어야 합니다';
  end if;
end $$;

-- ── ② activity_logs 되살리기 ────────────────────────────────────────────────
--
-- 🚨 **죽은 `profiles` 를 가리키던 외래키를 갈아끼운다.** 제약 이름을 박아 쓰지 않고
--    **실제로 걸려 있는 것을 찾아서** 지운다 — 이름이 다를 수 있다.

do $$
declare
  con record;
begin
  for con in
    select c.conname, confrelid::regclass::text as target
    from pg_constraint c
    where c.conrelid = 'public.activity_logs'::regclass
      and c.contype = 'f'
      and c.conkey = array[(select attnum from pg_attribute
                            where attrelid = 'public.activity_logs'::regclass
                              and attname = 'user_id')]
  loop
    raise notice 'activity_logs.user_id 의 기존 외래키를 지웁니다: % → %', con.conname, con.target;
    execute format('alter table public.activity_logs drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.activity_logs
  add constraint activity_logs_user_id_fkey
  foreign key (user_id) references public.staff_accounts(id) on delete set null;

-- 상세 화면이 「이 레코드의 이력」을 최신순으로 읽는다 — 그 질의 모양 그대로.
create index if not exists activity_logs_target_idx
  on public.activity_logs (table_name, record_id, created_at desc);

-- ── ③ 직원 정책 ─────────────────────────────────────────────────────────────
--
-- 21차가 RLS 만 켜고 정책을 안 만들어 둔 표라 지금은 service_role 만 닿는다.
-- 🔴 조건은 **`public.is_active_staff()`** 다 — 화주포털 계정도 `authenticated` 라
--    그냥 `to authenticated` 만 주면 화주가 내부 이력을 읽는다(19차·21차).

drop policy if exists staff_all_activity_logs on public.activity_logs;

create policy staff_all_activity_logs on public.activity_logs
  as permissive for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- ── ④ 단언 — 고친 것이 실제로 동작하는지 넣어 보고 되돌린다 ──────────────────
--
-- 🔴 **이 블록을 빼지 말 것.** ②를 안 하면 insert 가 FK 위반으로 막히는데, 화면에서는
--    「이력이 안 쌓인다」로만 보여 원인을 짚을 단서가 없다(PR #154 가 겪은 자리다).

do $$
declare
  v_staff uuid;
  probe_id uuid;
  n bigint;
begin
  -- ㉘-a 대상: 직원이 하나도 없으면 시험할 수 없다(운영에는 넷 있다).
  select id into v_staff from staff_accounts order by created_at limit 1;
  if v_staff is null then
    raise exception 'staff_accounts 가 비어 있어 수정 이력 insert 를 시험할 수 없습니다';
  end if;

  insert into public.activity_logs (user_id, table_name, record_id, action, changed_fields)
  values (
    v_staff, 'quotes', gen_random_uuid(), 'update',
    jsonb_build_object(
      'by', '마이그레이션 시험',
      'changes', jsonb_build_array(
        jsonb_build_object('field', 'final_amount', 'label', '최종 견적금액',
                           'before', '100,000원', 'after', '130,000원')
      )
    )
  )
  returning id into probe_id;

  if probe_id is null then
    raise exception 'activity_logs 에 수정 이력을 넣지 못했습니다';
  end if;

  delete from public.activity_logs where id = probe_id;

  select count(*) into n from public.activity_logs;
  if n <> 0 then
    raise exception '시험용 행이 지워지지 않았습니다 — 운영 데이터에 %행이 남습니다', n;
  end if;
end $$;

-- 외래키가 실제로 staff_accounts 를 가리키는지 못박는다.
do $$
declare
  def text;
begin
  select pg_get_constraintdef(c.oid) into def
  from pg_constraint c
  where c.conrelid = 'public.activity_logs'::regclass
    and c.conname = 'activity_logs_user_id_fkey';
  if def is null or def not like '%staff_accounts%' then
    raise exception 'activity_logs.user_id 외래키가 staff_accounts 를 가리키지 않습니다: %', coalesce(def, '(없음)');
  end if;
end $$;

-- ── 되돌리기 ────────────────────────────────────────────────────────────────
--
--   drop policy if exists staff_all_activity_logs on public.activity_logs;
--   drop index if exists public.activity_logs_target_idx;
--   alter table public.activity_logs drop constraint if exists activity_logs_user_id_fkey;
--   alter table public.activity_logs
--     add constraint activity_logs_user_id_fkey
--     foreign key (user_id) references public.profiles(id);
--   alter table quotes drop column if exists revised_at;
--
-- 🔴 **되돌리기 전에 `activity_logs` 에 쌓인 행이 있는지 먼저 보십시오** — 옛 외래키를
--    복원하면 `profiles` 에 없는 직원 id 를 가진 행 때문에 실패하고, 억지로 지우면
--    **그 수정 이력이 통째로 사라집니다.**
