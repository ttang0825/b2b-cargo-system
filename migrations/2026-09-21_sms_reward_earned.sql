-- 리워드 2차 — 적립 안내 문자 1종 추가 (2026-09-21)
--
-- 배경(사용자 2026-09-21): 리워드 2차 범위 확정 — *「1, 2, 3 문자안내까지」*.
--   1차가 저장만 해 두고 **아무도 안 읽던** `reward_memberships.sms_notification_enabled`
--   가 여기서 처음으로 동작을 가른다.
--
-- 🔴 **적용 순서 — DB 가 먼저다.** 코드를 먼저 올리면 문자는 실제로 나가는데
--    **이력만 조용히 안 남는다**(`sendSmsWithLog` 는 예외를 밖으로 던지지 않아
--    화면에 증상이 0이다). 2026-09-18 에 같은 자리를 겪었다.
--
-- 🚨 **이번에는 CHECK 가 둘이다.** 착수 전 실측(`_verify.sql` ㉞-d)에서
--    `sms_logs_related_type_check` 도 **4종 고정**인 것이 드러났다 —
--    적립 문자는 배차도 신청도 견적도 아닌 **새 갈래**라 그 칸까지 늘려야 한다.
--    🔴 **한쪽만 늘리면 insert 가 통째로 막힌다**(둘은 한 벌이다).
--
--    related_type  4종 → 5종 (`reward`)
--    template_type 9종 → 10종 (`reward_earned`)
--
-- 🔴 **`recipient_type` 은 건드리지 않는다** — 쓰는 값이 `customer` 하나이고
--    이미 허용돼 있다(㉞-d 실측).
--
-- 🔴 **`related_id` 에는 원장 행 id 를 넣는다**(정산 건 id 가 아니다) —
--    묶음 정산은 한 번에 여러 건이 적립되고 문자는 **합계 한 통**이라, 정산 건
--    하나를 골라 적으면 나머지가 그 문자와 안 이어진다. 원장의 **마지막 적립 행**을
--    대표로 잡는다. ⚠️ `sms_logs.related_id` 에는 FK 가 없다(다형 참조).
--
-- ⚠️ 착수 시점 실측(㉞, 2026-09-21) — 멤버십 2건 중 **문자안내 t 가 1건** ·
--    둘 다 대표 연락처는 있다 · 문자 이력에 리워드 종류 0건(당연).
--
-- 🔴 **백필하지 않는다 · 기존 행을 한 건도 UPDATE 하지 않는다.** 허용값을
--    **더하기만** 하므로 소급 영향이 0이다.

-- ── ① sms_logs.related_type 4종 → 5종 ───────────────────────────────────────
--
-- 🚨 옛 정의를 먼저 읽어 **내가 모르는 값이 있으면 멈춘다**(2026-09-18 과 같은 방식).
--    그대로 다시 만들면 모르는 값이 조용히 금지된다.

do $$
declare
  old_def text;
  -- 🔴 **최종 목록이다**(새 값 포함) — 옛 목록으로 두면 이 마이그레이션을
  --    다시 돌릴 때 자기가 넣은 값을 「모르는 값」으로 보고 멈춘다(실측 확인).
  allowed text[] := array['dispatch','application','portal_account','quote','reward'];
  m       text[];
  v       text;
  n_extra int := 0;
begin
  select pg_get_constraintdef(oid) into old_def
    from pg_constraint
   where conrelid = 'public.sms_logs'::regclass
     and conname  = 'sms_logs_related_type_check';

  if old_def is null then
    raise notice '기존 sms_logs_related_type_check 가 없습니다 — 새로 만듭니다';
  else
    raise notice '기존 정의(related_type): %', old_def;  -- 🔴 되돌리기 근거
    for m in select regexp_matches(old_def, '''([^'']+)''', 'g') loop
      v := m[1];
      if not (v = any (allowed)) then
        n_extra := n_extra + 1;
        raise warning '기존 허용값 「%」가 새 목록에 없습니다', v;
      end if;
    end loop;
    if n_extra <> 0 then
      raise exception
        'related_type CHECK 에 새 목록이 모르는 값이 %개 있습니다 — 그대로 다시 만들면 그 값이 조용히 금지됩니다. 정의: %',
        n_extra, old_def;
    end if;
  end if;
end $$;

do $$
declare bad text;
begin
  select string_agg(distinct related_type, ', ') into bad
    from public.sms_logs
   where related_type is not null
     and related_type not in ('dispatch','application','portal_account','quote','reward');
  if bad is not null then
    raise exception 'sms_logs 에 새 목록 밖의 갈래가 있습니다: %', bad;
  end if;
end $$;

alter table sms_logs drop constraint if exists sms_logs_related_type_check;

alter table sms_logs
  add constraint sms_logs_related_type_check
  check (related_type = any (array[
    'dispatch'::text,
    'application'::text,
    'portal_account'::text,
    'quote'::text,
    'reward'::text          -- 🆕 적립 안내 (related_id = reward_ledger.id)
  ]));

-- ── ② sms_logs.template_type 9종 → 10종 ─────────────────────────────────────

do $$
declare
  old_def text;
  -- 🔴 **최종 목록이다**(`reward_earned` 포함) — 위 ① 과 같은 이유다.
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
    'reward_earned'
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
       'portal_account_issued','portal_password_reissued','quote_summary','reward_earned'
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
    'reward_earned'::text                -- 🆕 적립 안내
  ]));

-- ── ③ 단언 — 하나라도 어긋나면 통째로 롤백된다 ──────────────────────────────

do $$
declare
  def_r  text;
  def_t  text;
  s      text;
  n_miss int := 0;
begin
  select pg_get_constraintdef(oid) into def_r
    from pg_constraint
   where conrelid = 'public.sms_logs'::regclass and conname = 'sms_logs_related_type_check';
  select pg_get_constraintdef(oid) into def_t
    from pg_constraint
   where conrelid = 'public.sms_logs'::regclass and conname = 'sms_logs_template_type_check';

  if def_r is null then
    raise exception 'sms_logs_related_type_check 가 없습니다 — 제약이 사라지면 아무 값이나 저장됩니다';
  end if;
  if def_t is null then
    raise exception 'sms_logs_template_type_check 가 없습니다 — 제약이 사라지면 아무 값이나 저장됩니다';
  end if;

  foreach s in array array['dispatch','application','portal_account','quote','reward'] loop
    if position('''' || s || '''' in def_r) = 0 then
      n_miss := n_miss + 1;
      raise warning 'related_type 허용값에 % 가 없습니다', s;
    end if;
  end loop;

  foreach s in array array[
    'dispatch_confirmed','dispatch_confirmed_customer','pickup_completed',
    'delivery_completed','application_approved','application_rejected',
    'portal_account_issued','portal_password_reissued','quote_summary','reward_earned'
  ] loop
    if position('''' || s || '''' in def_t) = 0 then
      n_miss := n_miss + 1;
      raise warning 'template_type 허용값에 % 가 없습니다', s;
    end if;
  end loop;

  if n_miss <> 0 then
    raise exception '허용값 %개가 빠졌습니다 — 그 갈래·종류의 문자 이력이 조용히 안 남습니다', n_miss;
  end if;
end $$;

-- 🚨 **정의를 읽는 것만으로는 「정말 저장되는가」를 못 잰다** — 실제로 한 행 넣어
--    보고 **반드시 되돌린다**(2026-09-18 과 같은 방식). 이 블록이 실패하면
--    마이그레이션 전체가 롤백되고, 그것이 의도다.
--    ⚠️ 수신번호·본문에 **가짜 값만** 쓴다(이 저장소는 public 이고 로그도 공개다).

do $$
declare probe_id uuid;
begin
  insert into sms_logs (
    provider, related_type, related_id, template_type, recipient_type,
    recipient_phone, message_content, status, sent_at
  ) values (
    'solapi', 'reward', gen_random_uuid(), 'reward_earned', 'customer',
    '01000000000', '[마이그레이션 저장 시험 — 즉시 삭제됩니다]', 'skipped', now()
  )
  returning id into probe_id;

  if probe_id is null then
    raise exception 'reward / reward_earned 로 문자 이력을 저장하지 못했습니다';
  end if;

  delete from sms_logs where id = probe_id;

  if exists (select 1 from sms_logs where id = probe_id) then
    raise exception '시험용 행이 지워지지 않았습니다 — 운영 이력에 남습니다';
  end if;
end $$;

-- ── 되돌리기 ────────────────────────────────────────────────────────────────
--
--   alter table sms_logs drop constraint if exists sms_logs_related_type_check;
--   alter table sms_logs add constraint sms_logs_related_type_check
--     check (related_type = any (array['dispatch','application','portal_account','quote']));
--   alter table sms_logs drop constraint if exists sms_logs_template_type_check;
--   alter table sms_logs add constraint sms_logs_template_type_check
--     check (template_type = any (array['dispatch_confirmed','dispatch_confirmed_customer',
--       'pickup_completed','delivery_completed','application_approved','application_rejected',
--       'portal_account_issued','portal_password_reissued','quote_summary']));
--
-- 🔴 **되돌리기 전에 `reward_earned` 행이 있는지 먼저 보십시오** — 있으면 CHECK
--    복원이 실패하고, 억지로 지우면 **그 발송 이력이 통째로 사라집니다.**
-- ⚠️ 위 목록은 추정이 아니라 **① ② 가 로그에 남긴 「기존 정의」를 보고 맞추십시오.**
