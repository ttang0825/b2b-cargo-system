-- 리워드 3차 후속 — 「적립 현황 안내」 문자 1종 추가 (2026-09-21)
--
-- 배경(사용자 2026-09-21): *"기본적으로 화주포털에는 리워드 상황을 노출안하는 경우가
--   많을 것 같다. 혹시나 원하는 화주가 있을 경우 기능만 마련해 둔거다. 그래서 문자로
--   현 리워드 상황을 알려주는게 중요하다. 월정산건도 한건의 운송이 완료되면 예상
--   적립금을 알려주고 얼마가 쌓이고 있는지 확인이 문자메세지로 필요한거다."*
--
-- 🚨 **이 한 줄이 채널의 주종을 뒤집는다** — 2·3차는 **포털이 주**이고 문자가 거드는
--    구조였다. 이제 **문자가 주**이고 포털은 원하는 화주에게만 켜 주는 선택지다.
--    🔴 그래서 앞으로 「포털에서 보면 되니까」로 문자를 줄이지 말 것.
--
--   `reward_status`  적립 현황 안내 — 두 자리에서 쓴다
--     ① 수동    화주 상세 리워드 패널의 「적립 안내 문자」 (언제든)
--     ② 운송완료 배차가 `운송완료` 로 바뀔 때 확인창 (월정산 화주가 건건이 받는다)
--
-- 🔴 **적립 안내(`reward_earned`)와 다른 종류다 — 합치지 말 것.**
--    앞엣것은 **입금이 확인되어 실제로 쌓인 순간**이고, 이것은 **아직 안 쌓인
--    예상**을 알린다. 한 종류로 묶으면 이력에서 둘을 구분할 수 없고, 화주가 받은
--    문자가 「적립됐다」인지 「적립될 것이다」인지 되짚을 수 없다.
--
-- 🔴 **적용 순서 — DB 가 먼저다.** 코드를 먼저 올리면 문자는 실제로 나가는데
--    **이력만 조용히 안 남는다**(`sendSmsWithLog` 는 예외를 밖으로 던지지 않아
--    화면에 증상이 0이다). 2026-09-18 · 09-21 에 같은 자리를 세 번 겪었다.
--
-- 🔴 `related_type` 은 **손대지 않는다** — 이것도 `reward` 갈래다.
-- 🔴 **백필하지 않는다 · 기존 행을 한 건도 UPDATE 하지 않는다.**

do $$
declare
  old_def text;
  -- 🔴 **최종 목록이다**(`reward_status` 포함) — 옛 목록으로 두면 이 마이그레이션을
  --    다시 돌릴 때 **자기가 넣은 값을 「모르는 값」으로 보고 멈춘다**(실측 확인).
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
    'reward_deducted',
    'reward_status'
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
       'reward_earned','reward_deducted','reward_status'
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
    'reward_earned'::text,               -- 적립됨 (입금 확인)
    'reward_deducted'::text,             -- 적립금 사용(차감)
    'reward_status'::text                -- 🆕 적립 현황 안내 (예상 적립)
  ]));

-- ── 단언 — 하나라도 어긋나면 통째로 롤백된다 ────────────────────────────────

do $$
declare
  def_t  text;
  s      text;
  n_miss int := 0;
begin
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
    'reward_earned','reward_deducted','reward_status'
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
--    보고 **반드시 되돌린다**. 이 블록이 실패하면 마이그레이션 전체가 롤백된다.
--    ⚠️ 수신번호·본문에 **가짜 값만** 쓴다(이 저장소는 public 이고 로그도 공개다).

do $$
declare probe_id uuid;
begin
  insert into sms_logs (
    provider, related_type, related_id, template_type, recipient_type,
    recipient_phone, message_content, status, sent_at
  ) values (
    'solapi', 'reward', gen_random_uuid(), 'reward_status', 'customer',
    '01000000000', '[마이그레이션 저장 시험 — 즉시 삭제됩니다]', 'skipped', now()
  )
  returning id into probe_id;

  if probe_id is null then
    raise exception 'reward / reward_status 로 문자 이력을 저장하지 못했습니다';
  end if;

  delete from sms_logs where id = probe_id;

  if exists (select 1 from sms_logs where id = probe_id) then
    raise exception '시험용 행이 지워지지 않았습니다 — 운영 이력에 남습니다';
  end if;
end $$;

-- ── 되돌리기 ────────────────────────────────────────────────────────────────
--
--   alter table sms_logs drop constraint if exists sms_logs_template_type_check;
--   alter table sms_logs add constraint sms_logs_template_type_check
--     check (template_type = any (array['dispatch_confirmed','dispatch_confirmed_customer',
--       'pickup_completed','delivery_completed','application_approved','application_rejected',
--       'portal_account_issued','portal_password_reissued','quote_summary',
--       'reward_earned','reward_deducted']));
--
-- 🔴 **되돌리기 전에 `reward_status` 행이 있는지 먼저 보십시오** — 있으면 CHECK
--    복원이 실패하고, 억지로 지우면 **그 발송 이력이 통째로 사라집니다.**
-- ⚠️ 위 목록은 추정이 아니라 **로그에 남은 「기존 정의」를 보고 맞추십시오.**
