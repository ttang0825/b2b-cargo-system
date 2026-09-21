-- 리워드 3차 — 차감 안내 문자 + 「화주에게 보이는 사유」 칸 (2026-09-21)
--
-- 배경(사용자 2026-09-21): *"적립금을 차감했을때도 문자가 발송되어야 한다.
--   얼마 차감됐고, 어떻게 사용됐고 얼마 남았는지..."*
--
-- ── 🚨 왜 컬럼을 새로 만드는가 ──────────────────────────────────────────────
--
--   차감은 지금 **수동 조정(`transaction_type='adjustment'` · 음수)** 하나뿐이고,
--   그 사유는 `reward_ledger.description` 에 들어간다. 그런데 그 칸은 2차에
--   **「화주에게 절대 주지 않는다」**고 못박은 담당자의 **내부 메모**다
--   (`lib/rewardPortal.ts` 머리말 · `/api/customer/reward` 의 select 에서도 뺐다).
--
--   🔴 **그래서 `description` 을 문자·포털에 그대로 쓰면 안 된다.** 대신
--      **화주에게 보이는 한 줄**(`customer_note`)을 따로 둔다 —
--      「운임 차감(오더 20260921003)」처럼 담당자가 화주 눈으로 쓰는 문장이다.
--
--   🔴 **`transaction_type` 에 `use`(사용)를 지금 추가하지 않았다.** 적립금을
--      실제로 쓰는 방식(운임 할인 / 상품권 지급)은 **3차 이후로 미뤄진 미결**이고
--      (HANDOFF §5-27), 그 결정 전에 유형을 늘리면 지금 이 자리에서 그 설계를
--      못 박게 된다. 🔴 실측(`_verify.sql` ㉟-a) — 지금 허용값은
--      `transport_earn` / `reversal` / `adjustment` 셋뿐이다.
--
-- 🔴 **적용 순서 — DB 가 먼저다.** 코드를 먼저 올리면 문자는 실제로 나가는데
--    **이력만 조용히 안 남는다**(`sendSmsWithLog` 는 예외를 밖으로 던지지 않아
--    화면에 증상이 0이다). 2026-09-18 · 2026-09-21 에 같은 자리를 두 번 겪었다.
--
-- 🔴 **백필하지 않는다 · 기존 행을 한 건도 UPDATE 하지 않는다.**
--    이미 쌓인 조정 1건에는 `customer_note` 가 비어 있고, 그것이 맞다
--    (그때는 화주에게 보일 문장을 받은 적이 없다).

-- ── ① reward_ledger.customer_note ───────────────────────────────────────────
--
-- 🔴 원칙 27번 — 같은 이름이 이미 있으면 `add column if not exists` 가 **조용히
--    아무것도 안 한다**. 있는지부터 보고, 있으면 타입까지 확인한다.

do $$
declare t text;
begin
  select data_type into t
    from information_schema.columns
   where table_schema = 'public' and table_name = 'reward_ledger'
     and column_name = 'customer_note';
  if t is not null and t <> 'text' then
    raise exception
      'reward_ledger.customer_note 가 이미 있는데 타입이 % 입니다 — 쓰임이 다를 수 있으니 멈춥니다', t;
  end if;
  if t is not null then
    raise notice 'reward_ledger.customer_note 가 이미 있습니다 — 그대로 둡니다';
  end if;
end $$;

alter table reward_ledger add column if not exists customer_note text;

comment on column reward_ledger.customer_note is
  '화주에게 보이는 한 줄(포털 적립내역·차감 안내 문자). 🔴 description(내부 사유)과 다르다 — 그쪽은 화주에게 주지 않는다.';

-- ── ② sms_logs.template_type 10종 → 11종 ────────────────────────────────────
--
-- 🚨 옛 정의를 먼저 읽어 **내가 모르는 값이 있으면 멈춘다**(2026-09-18·21 과 같은 방식).
-- 🔴 `related_type` 은 **손대지 않는다** — 차감 안내도 `reward` 갈래이고 그 값은
--    2026-09-21 에 이미 넣었다(㉞-d 실측으로 확인).

do $$
declare
  old_def text;
  -- 🔴 **최종 목록이다**(`reward_deducted` 포함) — 옛 목록으로 두면 이 마이그레이션을
  --    다시 돌릴 때 **자기가 넣은 값을 「모르는 값」으로 보고 멈춘다**
  --    (2026-09-21 에 실제로 그 결함을 냈다 · PR #179 의 「재실행 시점에도 그 숫자인가」).
  allowed text[] := array[
    'dispatch_confirmed',
    'dispatch_confirmed_customer',
    'pickup_completed',
    'delivery_completed',
    'application_approved',
    'application_rejected',
    'portal_account_issued',
    'portal_password_reissued',
    'quote_summary',
    'reward_earned',
    'reward_deducted'
  ];
  m       text[];
  v       text;
  n_extra int := 0;
begin
  select pg_get_constraintdef(oid) into old_def
    from pg_constraint
   where conrelid = 'public.sms_logs'::regclass
     and conname  = 'sms_logs_template_type_check';

  if old_def is null then
    raise notice '기존 sms_logs_template_type_check 가 없습니다 — 새로 만듭니다';
  else
    raise notice '기존 정의(template_type): %', old_def;  -- 🔴 되돌리기 근거
    for m in select regexp_matches(old_def, '''([^'']+)''', 'g') loop
      v := m[1];
      if not (v = any (allowed)) then
        n_extra := n_extra + 1;
        raise warning '기존 허용값 「%」가 새 목록에 없습니다', v;
      end if;
    end loop;
    if n_extra <> 0 then
      raise exception
        'template_type CHECK 에 새 목록이 모르는 값이 %개 있습니다 — 그대로 다시 만들면 그 값이 조용히 금지됩니다. 정의: %',
        n_extra, old_def;
    end if;
  end if;
end $$;

do $$
declare bad text;
begin
  select string_agg(distinct template_type, ', ') into bad
    from public.sms_logs
   where template_type is not null
     and template_type not in (
       'dispatch_confirmed','dispatch_confirmed_customer','pickup_completed',
       'delivery_completed','application_approved','application_rejected',
       'portal_account_issued','portal_password_reissued','quote_summary',
       'reward_earned','reward_deducted'
     );
  if bad is not null then
    raise exception 'sms_logs 에 새 목록 밖의 종류가 있습니다: %', bad;
  end if;
end $$;

alter table sms_logs drop constraint if exists sms_logs_template_type_check;

alter table sms_logs
  add constraint sms_logs_template_type_check
  check (template_type = any (array[
    'dispatch_confirmed'::text,
    'dispatch_confirmed_customer'::text,
    'pickup_completed'::text,            -- 🔴 2026-09 폐지 · 옛 이력·재발송용으로 남긴다
    'delivery_completed'::text,          -- 🔴 2026-09 폐지 · 옛 이력·재발송용으로 남긴다
    'application_approved'::text,
    'application_rejected'::text,
    'portal_account_issued'::text,
    'portal_password_reissued'::text,
    'quote_summary'::text,
    'reward_earned'::text,
    'reward_deducted'::text              -- 🆕 차감 안내 (related_id = reward_ledger.id)
  ]));

-- ── ③ 단언 — 하나라도 어긋나면 통째로 롤백된다 ──────────────────────────────

do $$
declare
  def_t  text;
  s      text;
  n_miss int := 0;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'reward_ledger'
       and column_name = 'customer_note' and data_type = 'text'
  ) then
    raise exception 'reward_ledger.customer_note 가 없습니다 — 화주에게 보일 사유를 담을 칸이 사라집니다';
  end if;

  -- 🔴 `description` 이 그대로 살아 있어야 한다 — 내부 사유를 옮긴 것이 아니라
  --    **화주용 한 줄을 따로 만든 것**이다(두 칸은 뜻이 다르다).
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'reward_ledger'
       and column_name = 'description'
  ) then
    raise exception 'reward_ledger.description 이 사라졌습니다 — 내부 사유를 잃으면 원장 줄을 아무도 설명할 수 없습니다';
  end if;

  select pg_get_constraintdef(oid) into def_t
    from pg_constraint
   where conrelid = 'public.sms_logs'::regclass and conname = 'sms_logs_template_type_check';
  if def_t is null then
    raise exception 'sms_logs_template_type_check 가 없습니다 — 제약이 사라지면 아무 값이나 저장됩니다';
  end if;

  foreach s in array array[
    'dispatch_confirmed','dispatch_confirmed_customer','pickup_completed',
    'delivery_completed','application_approved','application_rejected',
    'portal_account_issued','portal_password_reissued','quote_summary',
    'reward_earned','reward_deducted'
  ] loop
    if position('''' || s || '''' in def_t) = 0 then
      n_miss := n_miss + 1;
      raise warning 'template_type 허용값에 % 가 없습니다', s;
    end if;
  end loop;

  if n_miss <> 0 then
    raise exception '허용값 %개가 빠졌습니다 — 그 종류의 문자 이력이 조용히 안 남습니다', n_miss;
  end if;
end $$;

-- 🚨 **정의를 읽는 것만으로는 「정말 저장되는가」를 못 잰다** — 실제로 한 행 넣어
--    보고 **반드시 되돌린다**. 이 블록이 실패하면 마이그레이션 전체가 롤백되고,
--    그것이 의도다.
--    ⚠️ 수신번호·본문에 **가짜 값만** 쓴다(이 저장소는 public 이고 로그도 공개다).

do $$
declare probe_id uuid;
begin
  insert into sms_logs (
    provider, related_type, related_id, template_type, recipient_type,
    recipient_phone, message_content, status, sent_at
  ) values (
    'solapi', 'reward', gen_random_uuid(), 'reward_deducted', 'customer',
    '01000000000', '[마이그레이션 저장 시험 — 즉시 삭제됩니다]', 'skipped', now()
  )
  returning id into probe_id;

  if probe_id is null then
    raise exception 'reward / reward_deducted 로 문자 이력을 저장하지 못했습니다';
  end if;

  delete from sms_logs where id = probe_id;

  if exists (select 1 from sms_logs where id = probe_id) then
    raise exception '시험용 행이 지워지지 않았습니다 — 운영 이력에 남습니다';
  end if;
end $$;

-- ── 되돌리기 ────────────────────────────────────────────────────────────────
--
--   alter table reward_ledger drop column if exists customer_note;
--   alter table sms_logs drop constraint if exists sms_logs_template_type_check;
--   alter table sms_logs add constraint sms_logs_template_type_check
--     check (template_type = any (array['dispatch_confirmed','dispatch_confirmed_customer',
--       'pickup_completed','delivery_completed','application_approved','application_rejected',
--       'portal_account_issued','portal_password_reissued','quote_summary','reward_earned']));
--
-- 🔴 **컬럼을 지우면 그 안의 화주 안내 문장이 같이 사라진다** — 먼저
--    `select count(*) from reward_ledger where customer_note is not null` 을 보십시오.
-- 🔴 **되돌리기 전에 `reward_deducted` 행이 있는지 먼저 보십시오** — 있으면 CHECK
--    복원이 실패하고, 억지로 지우면 **그 발송 이력이 통째로 사라집니다.**
-- ⚠️ 위 목록은 추정이 아니라 **② 가 로그에 남긴 「기존 정의」를 보고 맞추십시오.**
