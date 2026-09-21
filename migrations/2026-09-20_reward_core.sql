-- ─────────────────────────────────────────────────────────────────────────────
-- 기업고객 리워드 1차 · A장 — 표 셋 + 캠페인 1행 (2026-09-20)
--
-- 위캐리가 **직접 영업한 기업 화주**에게 운임 공급가액의 5%를 적립하는 **선택형**
-- 프로모션이다. 1차는 **내부 기반만** 만든다 — 화주포털·문자·사용(할인·상품권)은 2·3차.
--
-- ── 🔴 되돌리면 안 되는 결정 ────────────────────────────────────────────────
--
-- ① **잔액 컬럼을 만들지 않는다.** 잔액은 **원장 합계의 표시 시점 계산**이다.
--    `companies.outstanding_amount` 가 저장 스냅샷이라 **선착불 화주는 영영 안
--    고쳐졌던** 사고가 이 저장소에 있다(36차 C장 · `lib/receivableCalc.ts` 주석).
--    🔴 `companies` 에 `reward_balance` 같은 컬럼을 더하지 말 것.
--
-- ② **설정 넷은 각각 독립이다** — `enabled`(적립 ON/OFF) · `portal_visible`(포털 노출) ·
--    `reward_method`(혜택 방식) · `sms_notification_enabled`(문자 안내).
--    🔴 **「포인트형/상품권형」 같은 enum 한 칸으로 묶지 말 것** — 묶으면
--    **「적립은 하되 포털에는 안 보이고 상품권으로 주는」 고객**을 운영할 수 없다.
--
-- ③ **원장은 append-only 다.** 잘못 적립됐으면 **반대 부호로 한 줄 더** 넣는다.
--    🔴 행을 DELETE 하거나 `amount` 를 UPDATE 하는 경로를 만들지 말 것.
--
-- ④ 🚨 **중복 적립 방지는 DB UNIQUE 가 최종 방어선이다.** 화면·서버에서만 막으면
--    두 탭·두 번 클릭·재시도가 전부 새어 나간다. 위반(`23505`)은 오류가 아니라
--    **「이미 적립됨」**이므로 라우트가 조용히 성공으로 넘긴다.
--
-- ── 🔴 지시서와 다르게 판단한 것 하나 ───────────────────────────────────────
--
-- 지시서는 `source_id` 를 **`on delete set null`** 로 하라고 했다(정산을 지워도 원장이
-- 남아야 하므로). **그런데 FK 를 걸 수가 없다** — `source_type` 이
-- `invoice | billing_batch | manual` 이라 한 컬럼이 여러 표를 가리키는 다형 참조이고,
-- Postgres 에는 다형 FK 가 없다.
--
--   🟢 **FK 를 아예 걸지 않는 것이 `set null` 보다 강하다.**
--      · 정산을 지워도 원장은 그대로 남는다(요구사항 충족 — FK 가 없으니 cascade 도 없다)
--      · `source_id` 값이 **그대로 남아** 부분 UNIQUE 가 계속 막는다
--        (`set null` 이면 그 순간 유니크에서 빠져 **재적립이 가능해진다**)
--      · 지워진 원본을 가리키던 id 가 남아 **무엇이 지워졌는지 추적**할 수 있다
--   🔴 대신 `description` 에 **원본 번호를 글자로** 남긴다(id 가 고아가 돼도 읽힌다).
--
-- ── 🔴 RLS — 세 표 모두 「on + 정책 0개」 ────────────────────────────────────
--
-- 화주포털 계정과 직원 계정이 **둘 다 `authenticated` 롤**이다(19·21차). 정책을
-- 하나라도 열면 **화주가 남의 회사 적립금을 읽는다.** 닿는 길은 service_role
-- 서버 라우트뿐이다(`push_subscriptions`·`customer_push_subscriptions` 와 같은 설계).
--
--   ⚠️ **`public.is_active_staff()` 라는 길이 있는데 일부러 안 썼다.**
--      PR #179(전화응대 매뉴얼)가 「읽기는 RLS 정책 + 그 함수 · 쓰기는 service_role」
--      구조를 처음 만들었다. 여기서 안 쓰는 이유는 둘이다 —
--        1. 리워드는 **돈과 화주 상호**다. `call_script` 는 내부 문서 한 행이라
--           새어도 손해가 글자뿐이지만 이것은 다르다
--        2. 그 함수의 **실전 이력이 이틀치**다. 실측하지 않은 채 돈 데이터에 걸지 않는다
--      🔴 **「관리자 화면이 못 읽으니 정책을 열자」로 되돌아가지 말 것.**
--         나중에 라우트가 번거로워지면 **읽기만** 그 방식으로 옮기는 것은 정당하다 —
--         🔴 **그때도 쓰기는 service_role 이다.**
--
-- ── ⚠️ `updated_at` 트리거를 만들지 않았다 ──────────────────────────────────
--
-- 다른 표들의 자동 갱신 트리거는 **마이그레이션 파일이 없어**(사용자가 손으로 만든 것)
-- 공용 함수 이름을 짐작할 수 없다. 이 표들은 **쓰는 길이 서버 라우트 하나뿐**이라
-- 라우트가 `updated_at = now()` 를 직접 넣는다. 🔴 트리거를 나중에 만들더라도
-- 라우트 쪽을 같이 보지 말고 그냥 두면 된다(같은 값을 두 번 쓸 뿐이다).
--
-- 🔴 백필 **0** — `reward_memberships` 는 **0행**으로 시작한다. 소급 적립도 하지 않는다
--    (사용자 확정: *「아직 안내한 기업이 없다」*). 🔴 **활성 화주를 자동으로 넣지 말 것** —
--    이것은 전 화주 자동 적용이 아니라 **선택형 영업 혜택**이다.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── ① 원칙 27번 — 만들려는 이름이 이미 있으면 멈춘다 ───────────────────────
do $$
declare n int;
begin
  select count(*) into n
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('reward_campaigns','reward_memberships','reward_ledger');
  if n <> 0 then
    raise exception '이 마이그레이션이 만들려는 표가 이미 %개 있습니다 — 덮어쓰기 전에 확인하십시오', n;
  end if;

  -- 🔴 잔액 컬럼을 어딘가에 이미 만들어 뒀다면 설계가 갈린 것이다 — 멈춘다.
  select count(*) into n
  from information_schema.columns
  where table_schema = 'public' and table_name = 'companies'
    and column_name like 'reward%';
  if n <> 0 then
    raise exception 'companies 에 reward 컬럼이 %개 있습니다 — 잔액은 원장 합계의 표시 시점 계산입니다', n;
  end if;
end $$;

-- ── ② 캠페인 — 이벤트 정책 (지금은 1행) ───────────────────────────────────
create table public.reward_campaigns (
  id                 uuid primary key default gen_random_uuid(),
  name               text        not null,
  start_date         date        not null,
  earn_end_date      date        not null,
  use_end_date       date        not null,
  -- 🔴 요율은 **여기가 정의처다.** 코드에 `0.05` 를 리터럴로 적지 말 것 —
  --    요율이 바뀌면 옛 적립 이력이 조용히 다른 뜻이 된다.
  earn_rate          numeric(6,4) not null,
  minimum_use_amount integer     not null default 0,
  active             boolean     not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint reward_campaigns_rate_range check (earn_rate > 0 and earn_rate <= 1),
  constraint reward_campaigns_date_order  check (start_date <= earn_end_date
                                             and earn_end_date <= use_end_date)
);

comment on table public.reward_campaigns is
  '기업고객 리워드 캠페인 정책. 요율·기간의 유일한 정의처 — 코드에 리터럴로 적지 말 것';

-- ── ③ 멤버십 — 기업별 참여 설정 ───────────────────────────────────────────
create table public.reward_memberships (
  id                       uuid primary key default gen_random_uuid(),
  -- 🔴 기본 RESTRICT 다(원칙 32번의 「실제 업무 기록」 쪽) — 적립 이력이 있는 화주는
  --    삭제가 막히는 것이 맞다. 화주 상세가 이미 관련 건수를 확인해 막고 있다.
  company_id               uuid        not null references public.companies(id),
  campaign_id              uuid        not null references public.reward_campaigns(id),

  -- 🔴 넷은 **각각 독립이다** — 하나로 묶지 말 것(위 ② 참고).
  enabled                  boolean     not null default false,
  -- 🔴 1차에서는 **아무도 안 읽는다**(2차용). 「쓰이지 않는 칸이니 지우자」로 지우지 말 것 —
  --    지우면 2차가 이 표를 다시 고쳐야 하고, 그 사이 담당자가 설정한 값이 사라진다.
  portal_visible           boolean     not null default false,
  reward_method            text        not null default 'manual',
  -- 🔴 위와 같다 — 1차에서 읽는 코드가 0건이어야 한다.
  sms_notification_enabled boolean     not null default false,

  started_at               date,
  ended_at                 date,
  internal_note            text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  updated_by               uuid references public.staff_accounts(id) on delete set null,

  -- 🔴 한 회사가 같은 캠페인에 두 번 참여할 수 없다.
  constraint reward_memberships_company_campaign_key unique (company_id, campaign_id),
  constraint reward_memberships_method_check
    check (reward_method in ('freight_discount','giftcard','manual'))
);

comment on column public.reward_memberships.enabled is
  '🔴 OFF 는 「신규 적립 중단」이다 — 기존 적립금을 없애는 것이 아니다';
comment on column public.reward_memberships.portal_visible is
  '🔴 1차에서는 저장만 되고 아무도 읽지 않는다(2차 화주포털용) — 지우지 말 것';
comment on column public.reward_memberships.sms_notification_enabled is
  '🔴 1차에서는 저장만 되고 아무도 읽지 않는다(2차 문자 안내용) — 지우지 말 것';

create index reward_memberships_company_idx on public.reward_memberships (company_id);

-- ── ④ 원장 — 적립·회수·조정 ───────────────────────────────────────────────
create table public.reward_ledger (
  id                  uuid        primary key default gen_random_uuid(),
  company_id          uuid        not null references public.companies(id),
  campaign_id         uuid        not null references public.reward_campaigns(id),

  -- transport_earn 적립(+) · reversal 회수(−) · adjustment 수동 조정(±)
  -- ⚠️ freight_discount · giftcard · expiry 는 3차에서 늘린다 — 그때 이 CHECK 도 같이.
  transaction_type    text        not null,
  amount              integer     not null,

  -- 적립일 때 그 건의 **공급가액**(부가세·현장 추가비 제외)
  earning_base_amount integer,
  -- 🔴 **그때의 요율 스냅샷** — 캠페인 요율이 바뀌어도 옛 이력이 맞아야 한다
  earn_rate_snapshot  numeric(6,4),

  -- 🔴 **FK 를 걸지 않는다**(맨 위 「지시서와 다르게 판단한 것」 참고) —
  --    다형 참조라 FK 자체가 불가능하고, 없는 편이 `set null` 보다 강하다.
  source_type         text        not null,
  source_id           uuid,
  -- 🔴 원본 번호를 **글자로** 남긴다 — 원본이 지워져도 무엇이었는지 읽힌다.
  description         text,

  created_at          timestamptz not null default now(),
  created_by          uuid references public.staff_accounts(id) on delete set null,

  constraint reward_ledger_type_check
    check (transaction_type in ('transport_earn','reversal','adjustment')),
  constraint reward_ledger_source_check
    check (source_type in ('invoice','billing_batch','manual')),
  -- 🔴 수동 조정이 아니면 원본 id 가 있어야 한다(중복 방지가 그것에 걸려 있다).
  constraint reward_ledger_source_id_check
    check (source_type = 'manual' or source_id is not null),
  -- 적립은 +, 회수는 −. 조정은 양쪽 다 되지만 0 은 아니다.
  constraint reward_ledger_amount_sign_check
    check ((transaction_type = 'transport_earn' and amount > 0)
        or (transaction_type = 'reversal'       and amount < 0)
        or (transaction_type = 'adjustment'     and amount <> 0))
);

-- 🚨 **중복 적립 방지의 최종 방어선.** 같은 원본으로 같은 종류를 두 번 넣을 수 없다.
--    `transaction_type` 이 들어 있어서 적립 한 줄 + 회수 한 줄은 공존하고,
--    **회수가 둘이 되는 것도 같이 막힌다.**
--    🔴 이 인덱스를 지우지 말 것 — 두 탭·두 번 클릭·재시도가 전부 여기서 걸린다.
create unique index reward_ledger_source_unique
  on public.reward_ledger (campaign_id, transaction_type, source_type, source_id)
  where source_id is not null;

create index reward_ledger_company_idx on public.reward_ledger (company_id, created_at desc);

comment on table public.reward_ledger is
  '🔴 append-only. 잘못 적립됐으면 반대 부호로 한 줄 더 — 행을 지우거나 금액을 고치지 말 것';

-- ── ⑤ RLS — 셋 다 on + 정책 0개 ───────────────────────────────────────────
alter table public.reward_campaigns   enable row level security;
alter table public.reward_memberships enable row level security;
alter table public.reward_ledger      enable row level security;

-- ── ⑥ 캠페인 1행 (사용자 확정 2026-09-18) ─────────────────────────────────
--
-- ⚠️ **아래 `2026-09-01` 은 더 이상 현재 값이 아니다.** 2026-09-21 에
--    `2026-09-21_reward_campaign_start.sql` 이 **2026-08-07** 로 옮겼다.
--    🔴 **이 파일의 SQL 을 고치지 말 것**(적용이 끝난 파일이다 — README 규칙).
--    🔴 **여기 적힌 날짜를 근거로 되돌리지도 말 것** — DB 가 정본이다
--       (운임 혼적 할인에서 같은 일이 있었다 · CLAUDE.md 「문서 정합 정리 2차」).
insert into public.reward_campaigns
  (name, start_date, earn_end_date, use_end_date, earn_rate, minimum_use_amount, active)
values
  ('기업고객 운임 리워드 1차', date '2026-09-01', date '2027-02-28', date '2027-05-31',
   0.0500, 50000, true);

-- ── ⑦ 단언 ────────────────────────────────────────────────────────────────
do $$
declare
  n            int;
  v_campaign   public.reward_campaigns%rowtype;
  v_company    uuid;
  v_ledger_id  uuid;
  v_dup_blocked boolean := false;
begin
  -- (1) 표 셋이 생겼는가
  select count(*) into n from information_schema.tables
  where table_schema = 'public'
    and table_name in ('reward_campaigns','reward_memberships','reward_ledger');
  if n <> 3 then raise exception '표가 3개가 아닙니다 — %개', n; end if;

  -- (2) 🔴 RLS 가 셋 다 켜져 있고 정책이 **0개**인가
  select count(*) into n from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public'
    and c.relname in ('reward_campaigns','reward_memberships','reward_ledger')
    and c.relrowsecurity;
  if n <> 3 then raise exception 'RLS 가 켜지지 않은 표가 있습니다 — 켜진 것 %개', n; end if;

  select count(*) into n from pg_policies
  where schemaname = 'public'
    and tablename in ('reward_campaigns','reward_memberships','reward_ledger');
  if n <> 0 then
    raise exception '리워드 표에 정책이 %개 있습니다 — 화주와 직원이 같은 롤이라 정책을 열면 안 됩니다', n;
  end if;

  -- (3) 캠페인 1행이 확정값 그대로인가
  select * into v_campaign from public.reward_campaigns;
  if not found then raise exception '캠페인 행이 없습니다'; end if;
  select count(*) into n from public.reward_campaigns;
  if n <> 1 then raise exception '캠페인이 1행이 아닙니다 — %행', n; end if;
  if v_campaign.earn_rate <> 0.0500 then
    raise exception '적립률이 5%% 가 아닙니다 — %', v_campaign.earn_rate;
  end if;
  if v_campaign.start_date    <> date '2026-09-01'
  or v_campaign.earn_end_date <> date '2027-02-28'
  or v_campaign.use_end_date  <> date '2027-05-31' then
    raise exception '캠페인 기간이 확정값과 다릅니다 — % / % / %',
      v_campaign.start_date, v_campaign.earn_end_date, v_campaign.use_end_date;
  end if;
  if v_campaign.minimum_use_amount <> 50000 then
    raise exception '사용 하한이 50,000 이 아닙니다 — %', v_campaign.minimum_use_amount;
  end if;

  -- (4) 🔴 백필 0 — 멤버십·원장이 비어 있는가
  select count(*) into n from public.reward_memberships;
  if n <> 0 then raise exception '멤버십이 %행 있습니다 — 백필하지 않습니다', n; end if;
  select count(*) into n from public.reward_ledger;
  if n <> 0 then raise exception '원장이 %행 있습니다 — 소급 적립하지 않습니다', n; end if;

  -- (5) 🚨 **UNIQUE 가 실제로 막는지 깨뜨려서 확인한다**(함정 31번).
  --     통과만 보면 아무것도 안 재는 시험과 구분되지 않는다.
  select id into v_company from public.companies limit 1;
  if v_company is null then
    raise notice '⚠️ 화주가 0행이라 UNIQUE 시험을 건너뜁니다';
  else
    insert into public.reward_ledger
      (company_id, campaign_id, transaction_type, amount, earning_base_amount,
       earn_rate_snapshot, source_type, source_id, description)
    values
      (v_company, v_campaign.id, 'transport_earn', 5000, 100000, 0.0500,
       'invoice', '00000000-0000-0000-0000-000000000001', '마이그레이션 시험')
    returning id into v_ledger_id;

    begin
      insert into public.reward_ledger
        (company_id, campaign_id, transaction_type, amount, earning_base_amount,
         earn_rate_snapshot, source_type, source_id, description)
      values
        (v_company, v_campaign.id, 'transport_earn', 5000, 100000, 0.0500,
         'invoice', '00000000-0000-0000-0000-000000000001', '마이그레이션 시험 2');
    exception when unique_violation then
      v_dup_blocked := true;
    end;

    if not v_dup_blocked then
      raise exception '같은 원본으로 두 번 적립이 됐습니다 — UNIQUE 가 막지 못합니다';
    end if;

    -- 🔴 회수는 같은 원본이어도 들어가야 한다(종류가 다르다).
    insert into public.reward_ledger
      (company_id, campaign_id, transaction_type, amount,
       source_type, source_id, description)
    values
      (v_company, v_campaign.id, 'reversal', -5000,
       'invoice', '00000000-0000-0000-0000-000000000001', '마이그레이션 시험 회수');

    -- 시험 행을 지운다(🔴 운영에서는 원장을 지우지 않는다 — 여기는 시험 자국이다).
    delete from public.reward_ledger
    where source_id = '00000000-0000-0000-0000-000000000001'
      and description like '마이그레이션 시험%';

    select count(*) into n from public.reward_ledger;
    if n <> 0 then raise exception '시험 행이 %개 남았습니다', n; end if;
  end if;

  raise notice '✅ 리워드 표 셋 · RLS 정책 0개 · 캠페인 1행(5%%) · 백필 0 · UNIQUE 동작 확인';
end $$;
