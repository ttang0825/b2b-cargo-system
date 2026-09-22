-- 문자 2종 추가 — 「정보 회신 요청」 · 「리워드 이용 안내」 (2026-09-22)
--
-- 사용자 요청(2026-09-22, 두 줄):
--   ① *"견적문자 보내면서 추가로 문자를 하나더 보내면 좋겠다. 상,하차지 상세주소와
--      상,하차지 담당자 연락처를 문자로 회신해 달라는 문자메세지. 이 메세지는 화주통화
--      내용에 따라 보낼수도 있고 보내지 않을수도 있다."*
--   ② *"포인트 지급 안내 메세지를 보내고 싶다. 고객 첫거래후 전화로 계정등록을 유도할
--      생각이다. 계정등록후 계정정보 안내 문자를 보낸후 이벤트 포인트 사용안내 문자도
--      보내고 싶다. 위치는 화주 상세 기업고객 리워드에 문자보내기 기능이 있으면 되고
--      간단한 내용으로 전달하면 될것 같다."*
--
--   `quote_info_request`  정보 회신 요청 — 견적 상세, 「견적서 문자 발송」 옆 버튼.
--                         상·하차지 **상세주소**와 **현장 담당자 연락처**를 회신해
--                         달라고 청한다. 🔴 통화 내용에 따라 보낼 수도 안 보낼 수도
--                         있으므로 **큐가 아니라 별도 버튼**이다(견적 문자를 보내지
--                         않고 이것만 보내는 경우도 있다).
--   `reward_intro`        리워드 이용 안내 — 화주 상세 리워드 패널의 버튼.
--                         계정 발급 안내(`portal_account_issued`) **다음에** 보낸다.
--
-- 🔴 **기존 리워드 문자 셋과 합치지 말 것** — 넷이 서로 다른 시점을 가리킨다:
--      reward_intro    이런 제도가 있습니다      (시작할 때 한 번)
--      reward_status   이만큼 쌓일 예정입니다    (운송완료 · 수동)
--      reward_earned   이만큼 쌓였습니다         (입금 확인)
--      reward_deducted 이만큼 썼습니다           (운임 할인)
--    한 종류로 묶으면 화주가 받은 문자가 무엇이었는지 이력에서 되짚을 수 없다
--    (2026-09-21 에 `reward_earned`/`reward_status` 를 가른 것과 같은 이유다).
--
-- 🔴 **적용 순서 — DB 가 먼저다.** 코드를 먼저 올리면 문자는 실제로 나가는데
--    **이력만 조용히 안 남는다**(`sendSmsWithLog` 는 예외를 밖으로 던지지 않아
--    화면에 증상이 0이다). 2026-09-18 · 09-21 에 같은 자리를 세 번 겪었다.
--
-- 🔴 `related_type` 은 **손대지 않는다** — ① 은 `quote`, ② 는 `reward` 로 둘 다
--    이미 허용된 갈래다(`sms_logs_related_type_check` 5종 그대로).
-- 🔴 **백필하지 않는다 · 기존 행을 한 건도 UPDATE 하지 않는다.**

do $$
declare
  old_def text;
  -- 🔴 **최종 목록이다**(새 두 종 포함) — 옛 목록으로 두면 이 마이그레이션을 다시
  --    돌릴 때 **자기가 넣은 값을 「모르는 값」으로 보고 멈춘다**(PR #181 실측).
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
    'quote_info_request',
    'reward_earned',
    'reward_deducted',
    'reward_status',
    'reward_intro'
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

-- 이미 저장된 이력 중 새 목록 밖의 값이 있으면 멈춘다(있으면 그 이력이 막힌다)
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
       'quote_info_request','reward_earned','reward_deducted','reward_status',
       'reward_intro'
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
    'quote_info_request'::text,          -- 🆕 상·하차지 상세주소·담당자 회신 요청
    'reward_earned'::text,               -- 적립됨 (입금 확인)
    'reward_deducted'::text,             -- 적립금 사용(차감)
    'reward_status'::text,               -- 적립 현황 안내 (예상 적립)
    'reward_intro'::text                 -- 🆕 리워드 이용 안내 (시작할 때 한 번)
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
    'quote_info_request','reward_earned','reward_deducted','reward_status',
    'reward_intro'
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

-- 🚨 **정의를 읽는 것만으로는 「정말 저장되는가」를 못 잰다** — 두 종을 실제로 한 행씩
--    넣어 보고 **반드시 되돌린다**. 이 블록이 실패하면 마이그레이션 전체가 롤백된다.
--    🔴 **갈래(`related_type`)도 같이 잰다** — ① 은 `quote`, ② 는 `reward` 다.
--       한쪽만 재면 나머지 갈래가 막혀 있어도 통과한다.
--    ⚠️ 수신번호·본문에 **가짜 값만** 쓴다(이 저장소는 public 이고 로그도 공개다).

do $$
declare
  probe_a uuid;
  probe_b uuid;
begin
  insert into sms_logs (
    provider, related_type, related_id, template_type, recipient_type,
    recipient_phone, message_content, status, sent_at
  ) values (
    'solapi', 'quote', gen_random_uuid(), 'quote_info_request', 'customer',
    '01000000000', '[마이그레이션 저장 시험 — 즉시 삭제됩니다]', 'skipped', now()
  )
  returning id into probe_a;

  insert into sms_logs (
    provider, related_type, related_id, template_type, recipient_type,
    recipient_phone, message_content, status, sent_at
  ) values (
    'solapi', 'reward', gen_random_uuid(), 'reward_intro', 'customer',
    '01000000000', '[마이그레이션 저장 시험 — 즉시 삭제됩니다]', 'skipped', now()
  )
  returning id into probe_b;

  if probe_a is null or probe_b is null then
    raise exception '새 문자 종류로 이력을 저장하지 못했습니다';
  end if;

  delete from sms_logs where id in (probe_a, probe_b);

  if exists (select 1 from sms_logs where id in (probe_a, probe_b)) then
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
--       'reward_earned','reward_deducted','reward_status']));
--
-- 🔴 **되돌리기 전에 `quote_info_request`·`reward_intro` 행이 있는지 먼저 보십시오** —
--    있으면 CHECK 복원이 실패하고, 억지로 지우면 **그 발송 이력이 통째로 사라집니다.**
-- ⚠️ 위 목록은 추정이 아니라 **로그에 남은 「기존 정의」를 보고 맞추십시오.**
