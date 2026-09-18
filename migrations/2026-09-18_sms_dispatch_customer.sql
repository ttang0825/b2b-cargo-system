-- 문자 발송 정리 — 고객용 배차확정 종류 1종 추가 + 외부배차 차종 칸
--
-- 배경(사용자 2026-09-17):
--   *「배차확정안내는 차주뿐만 아니라 고객에도 필요하다. 여기에는 상하차지 주소 정보와
--     상하차일시 기사명, 기사전화번호, 차량번호, 차종정보가 적혀 있어야 한다.」*
--
-- 🔴 **지시서는 「DB 변경 없을 것으로 봄」이었고 그것이 틀렸다.** 착수 전 실측
--    (`_verify.sql` ㉚-b)에서 `sms_logs` 에 `sms_logs_template_type_check` 가
--    **8종 고정**으로 걸려 있는 것이 드러났다. `sms_logs` 는 마이그레이션 체계
--    **이전**에 손으로 만든 표라 저장소에 정의가 없었다.
--
-- 🔴 **적용 순서 — DB 가 먼저다.** 코드를 먼저 올리면 고객용 문자가 실제로는 나가는데
--    **이력만 조용히 안 남는다**(`lib/sendSms.ts` 의 `sendSmsWithLog` 는 예외를 밖으로
--    던지지 않는다 — 화면에 아무 증상이 없다). 그러면 재발송·상태 추적이 통째로
--    불가능해진다. PR #171 이 `dispatch_status` 에서 같은 판단을 했다.
--
-- 🔴 **폐지하는 두 종을 CHECK 목록에서 빼지 않는다.**
--    A장이 상차완료·하차완료 문자를 없애지만 `pickup_completed`·`delivery_completed`
--    두 값은 **허용값으로 그대로 둔다**:
--      ① 옛 행이 제약을 어기게 된다(지금은 0건이지만 CHECK 를 좁히는 것은 되돌리기가
--         어렵고, 0건인 것과 「앞으로도 0건일 것」은 다르다)
--      ② 실패 건 **재발송**(`app/api/admin/sms-logs/resend/route.ts`)이 원문 그대로
--         다시 보내는데, 그 경로가 같은 `template_type` 으로 새 행을 하나 더 남긴다
--    🔴 **그래서 8종 → 9종이지 7종 → 8종이 아니다.**
--
-- 🔴 **`recipient_type` 은 건드리지 않는다** — 새로 쓰는 값은 `customer` 하나이고
--    `quote_summary` 5건이 이미 그 값으로 저장돼 있다(㉚-c 실측). 이미 통과하는 값이다.
--
-- ⚠️ **원칙 27번 사전 확인을 마쳤다** — `external_vehicle_type` 은 저장소 전체에
--    **0건**이다(`grep -rn` · `.ts`/`.tsx`/`.sql`). 그래서
--    `add column if not exists` 가 조용히 무시되는 함정에 걸리지 않는다.
--
-- ⚠️ 착수 시점 실측(㉚, 2026-09-18) — 문자 이력은 `quote_summary` **5건이 전부**이고
--    배차확정 문자는 **한 번도 나간 적이 없다** · 폐지 두 종 이력 **0건** ·
--    운영 배차 **22건이 전부 `external`**(외부 배정) · 하차 23:59 자리 채움 **3건**.
--
-- 🔴 **백필하지 않는다** · **기존 행을 한 건도 UPDATE 하지 않는다.**
--    허용값을 **더하기만** 하고 컬럼을 **하나 더하기만** 하므로 소급 영향이 0이다.

-- ── ① sms_logs.template_type 허용값 8종 → 9종 ───────────────────────────────
--
-- 🚨 **옛 정의를 먼저 읽어서, 내가 모르는 값이 있으면 멈춘다.**
--    이 표는 저장소에 정의가 없어서 「8종」은 코드(`SmsTemplateType`)에서 온 추정이다.
--    그대로 다시 만들면 **내가 모르는 10번째 값이 조용히 금지된다.**
--    그래서 옛 정의에서 따옴표 문자열을 전부 뽑아 새 목록과 대조하고,
--    정의 전문을 로그에 남긴다(되돌리기 근거).

do $$
declare
  old_def text;
  allowed text[] := array[
    'dispatch_confirmed',
    'dispatch_confirmed_customer',
    'pickup_completed',
    'delivery_completed',
    'application_approved',
    'application_rejected',
    'portal_account_issued',
    'portal_password_reissued',
    'quote_summary'
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
    -- 🔴 되돌리기 근거. Actions 로그에 남는다(값 목록일 뿐 개인정보가 아니다).
    raise notice '기존 정의: %', old_def;

    for m in select regexp_matches(old_def, '''([^'']+)''', 'g') loop
      v := m[1];
      if not (v = any (allowed)) then
        n_extra := n_extra + 1;
        raise warning '기존 허용값 「%」가 새 목록에 없습니다', v;
      end if;
    end loop;

    if n_extra <> 0 then
      raise exception
        '기존 CHECK 에 새 목록이 모르는 값이 %개 있습니다 — 그대로 다시 만들면 그 값이 조용히 금지됩니다. 정의: %',
        n_extra, old_def;
    end if;
  end if;
end $$;

-- 🔴 실재하는 데이터가 전부 새 목록 안인지 — 아니면 ALTER 자체가 실패하지만,
--    실패 메시지가 「check constraint violated」뿐이라 어느 값인지 안 나온다.
do $$
declare bad text;
begin
  select string_agg(distinct template_type, ', ') into bad
    from public.sms_logs
   where template_type is not null
     and template_type not in (
       'dispatch_confirmed','dispatch_confirmed_customer','pickup_completed',
       'delivery_completed','application_approved','application_rejected',
       'portal_account_issued','portal_password_reissued','quote_summary'
     );
  if bad is not null then
    raise exception 'sms_logs 에 새 목록 밖의 종류가 있습니다: %', bad;
  end if;
end $$;

alter table sms_logs drop constraint if exists sms_logs_template_type_check;

alter table sms_logs
  add constraint sms_logs_template_type_check
  check (template_type = any (array[
    'dispatch_confirmed'::text,          -- 차주 「화물정보 안내」 (라벨만 바뀜 · 키는 그대로)
    'dispatch_confirmed_customer'::text, -- 🆕 고객 「배차확정 안내」
    'pickup_completed'::text,            -- 🔴 2026-09 폐지 · 옛 이력·재발송용으로 남긴다
    'delivery_completed'::text,          -- 🔴 2026-09 폐지 · 옛 이력·재발송용으로 남긴다
    'application_approved'::text,
    'application_rejected'::text,
    'portal_account_issued'::text,
    'portal_password_reissued'::text,
    'quote_summary'::text
  ]));

-- ── ② dispatches.external_vehicle_type ──────────────────────────────────────
--
-- 🔴 **왜 필요한가** — 고객 문자가 차종을 적어야 하는데(사용자 원문), 외부 배정에는
--    담을 칸이 없었다. 내부 배정은 `drivers → vehicles(vehicle_type)` 로 실제 차량의
--    차종을 알지만, 외부는 `external_driver_name/phone` + `external_vehicle_plate`
--    셋뿐이었다. ⚠️ **운영 배차 22건이 전부 외부 배정이라 이 경로가 기본값이다.**
--
-- 🔴 **`orders.vehicle_type`(요청 차종)으로 때우지 않는다** — 그것은 「부른 차」이고
--    실제로 온 차와 다를 수 있다. 고객 문자의 목적이 **「잘못된 차량 배차를 사전에
--    발견」**(사용자 원문)하는 것이라, 요청 차종을 찍으면 그 문자가 스스로를 확인해
--    항상 맞는 것처럼 보인다. 값이 비었을 때만 오더 차종으로 떨어진다.
--
-- 🔴 자유 텍스트다 — 외부 정보망 차주는 내부 `vehicles` 표에 없어서
--    `external_driver_name` 과 같은 이유로 코드값을 못 건다.

alter table dispatches add column if not exists external_vehicle_type text;

comment on column dispatches.external_vehicle_type is
  '외부 배정 차주의 실제 차종(자유 텍스트). 고객 배차확정 문자가 쓴다. 비면 orders.vehicle_type(요청 차종)으로 떨어진다';

-- ── ③ 단언 — 하나라도 어긋나면 통째로 롤백된다 ──────────────────────────────

do $$
declare
  def       text;
  s         text;
  n_missing int := 0;
  n_dirty   int;
begin
  select pg_get_constraintdef(oid) into def
    from pg_constraint
   where conrelid = 'public.sms_logs'::regclass
     and conname  = 'sms_logs_template_type_check';
  if def is null then
    raise exception 'sms_logs_template_type_check 가 없습니다 — 제약이 사라지면 아무 값이나 저장됩니다';
  end if;

  -- 🔴 9종이 전부 허용되는지 **이름으로** 확인한다.
  --    (하나라도 빠지면 그 종류의 문자 이력이 조용히 안 남는다)
  foreach s in array array[
    'dispatch_confirmed','dispatch_confirmed_customer','pickup_completed',
    'delivery_completed','application_approved','application_rejected',
    'portal_account_issued','portal_password_reissued','quote_summary'
  ] loop
    if position(s in def) = 0 then
      n_missing := n_missing + 1;
      raise warning '허용값에 % 가 없습니다', s;
    end if;
  end loop;
  if n_missing <> 0 then
    raise exception 'template_type 허용값 %개가 빠졌습니다 — 정의: %', n_missing, def;
  end if;

  -- 🔴 새 컬럼이 전부 null 인지(백필하지 않기로 했다).
  select count(*) into n_dirty from dispatches where external_vehicle_type is not null;
  if n_dirty <> 0 then
    raise exception 'external_vehicle_type 에 값이 들어간 행이 %건 있습니다 — 백필하지 않기로 했습니다', n_dirty;
  end if;

  -- 🔴 외부 배정 차주 칸 셋이 그대로 있는지 — 고객 문자가 이 셋과 새 칸을 같이 읽는다.
  foreach s in array array['external_driver_name','external_driver_phone','external_vehicle_plate'] loop
    if not exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'dispatches' and column_name = s
    ) then
      raise exception 'dispatches.% 가 없습니다 — 고객 배차확정 문자가 읽는 칸입니다', s;
    end if;
  end loop;
end $$;

-- ── ④ 실제로 저장되는지 한 번 해보고 되돌린다 ───────────────────────────────
--
-- 🔴 **단언이 통과해도 실제 INSERT 가 막힐 수 있다**(다른 제약·NOT NULL 이 걸린다).
--    그래서 `dispatch_confirmed_customer` 로 한 행 넣어 보고 **반드시 되돌린다**.
--    ⚠️ 이 블록이 실패하면 마이그레이션 전체가 롤백된다 — 그것이 의도다.
--    ⚠️ 수신번호·본문에 **가짜 값만** 쓴다(이 저장소는 public 이고 로그도 공개다).

do $$
declare probe_id uuid;
begin
  insert into sms_logs (
    provider, related_type, related_id, template_type, recipient_type,
    recipient_phone, message_content, status, sent_at
  ) values (
    'solapi', 'dispatch', gen_random_uuid(), 'dispatch_confirmed_customer', 'customer',
    '01000000000', '[마이그레이션 저장 시험 — 즉시 삭제됩니다]', 'skipped', now()
  )
  returning id into probe_id;

  if probe_id is null then
    raise exception 'dispatch_confirmed_customer 로 문자 이력을 저장하지 못했습니다';
  end if;

  delete from sms_logs where id = probe_id;

  if exists (select 1 from sms_logs where id = probe_id) then
    raise exception '시험용 행이 지워지지 않았습니다 — 운영 이력에 남습니다';
  end if;
end $$;

-- ── 되돌리기 ────────────────────────────────────────────────────────────────
--
--   alter table sms_logs drop constraint if exists sms_logs_template_type_check;
--   alter table sms_logs
--     add constraint sms_logs_template_type_check
--     check (template_type = any (array['dispatch_confirmed','pickup_completed',
--       'delivery_completed','application_approved','application_rejected',
--       'portal_account_issued','portal_password_reissued','quote_summary']));
--   alter table dispatches drop column if exists external_vehicle_type;
--
-- 🔴 **되돌리기 전에 `dispatch_confirmed_customer` 행이 있는지 먼저 보십시오** —
--    있으면 CHECK 복원이 실패하고, 억지로 지우면 **그 발송 이력이 통째로 사라집니다.**
-- ⚠️ 위 8종 목록은 **추정이 아니라 ① 이 로그에 남긴 「기존 정의」를 보고 맞추십시오.**
