-- 36차 A·B장 — 화주 거래조건 + 발주요청 정산방식 「요청」
--
-- 🔴 **`billing_cutoff_day`(정산 마감일)를 신설하지 않는다.** 이미 있고
--    `lib/companyFields.ts` 의 「거래 조건」 섹션에도 이미 등록돼 있다(실측 2026-09-14:
--    smallint · 기본값 없음 · 540행 중 1행 채워짐). 두 벌이면 월정산 묶음이 갈린다
--    (원칙 46번이 기록한 그 사고 자리다).
--
-- 🔴 **`payment_terms`(결제조건, 자유 텍스트)도 신설하지 않고 지우지도 않는다.**
--    이미 있고 1행이 쓰고 있다. 원칙 45번대로 **읽기 전용으로 얼려두고** 새 두 칸
--    (`payment_due_basis` + `payment_due_value`)이 그 자리를 대신한다.
--    🔴 **새 칸 → 옛 칸으로 역방향 동기화하지 말 것.**
--
-- 🔴 **결제일이 두 칸인 이유** — 사용자 확정 *"화주가 우리에게 결제하는 일이다.
--    이는 화주마다 다르다"*. 한 칸 자유 입력으로는 「정산 예정일」을 계산할 수 없다.
--
--      payment_due_basis = 'cutoff'      + value 30  →  말일 마감분을 익월 30일 이내
--      payment_due_basis = 'fixed_day'   + value 25  →  매월 25일
--      payment_due_basis = 'fixed_day'   + value  0  →  매월 **말일**
--      payment_due_basis = 'tax_invoice' + value 15  →  세금계산서 발행일 +15일
--      payment_due_basis = 'negotiated'  + value 없음 →  협의. 자동계산에서 제외
--
--    🔴 **`payment_due_value` 의 0 은 「말일 또는 당일」이다** — 화면 라벨이 그것을
--       말한다. 1~31 로 못박지 않은 것은 `cutoff`·`tax_invoice` 가 45일·60일처럼
--       31을 넘길 수 있기 때문이다(상한 180).
--
-- 🔴 **정기계약(33차 5컬럼)과 축이 다르다** — 정기계약이 아니어도 월정산일 수 있고
--    정기계약인데 건별일 수 있다. `recurring_contract_frequency` 에 담지 말 것.
--
-- 🔴 **기본값을 주지 않는다(전부 null = 「미정」).** 기존 540행에 일괄로 「건별」을
--    채우면 「안 정했다」와 「건별로 정했다」가 영영 구분되지 않는다(사용자 확정).
--
-- 🔴 **여신 한도는 값만 받는다** — 넘었을 때 어디서 무엇을 막을지는 별개 설계다.
--
-- 🔴 **B장: 컬럼 이름이 `billing_cycle` 이 아니라 `requested_billing_cycle` 이다.**
--    27차가 `portal_order_requests` 에 `billing_cycle` 을 더하지 말라고 못박았고
--    (*「월정산은 화주별 계약이라 담당자가 정한다」*) **그 사유는 그대로 살아 있다.**
--    이 칸은 확정값이 아니라 **화주의 요청값**이고, 확정은 담당자가 견적·오더에서 한다.
--    이름에 그것이 드러나야 다음 세션이 확정값으로 읽지 않는다.
--    🟢 `collection_method`·`direct_collection_point`·`dropoff_arrival_type` 셋과
--       **같은 모양**이다(nullable · 기본값 없음 · 담당자가 확정).

-- ── ① companies — 거래조건 5칸 ──────────────────────────────────────────────
alter table companies
  add column if not exists billing_cycle_default text,
  add column if not exists payment_due_basis     text,
  add column if not exists payment_due_value     smallint,
  add column if not exists credit_limit          numeric,
  add column if not exists tax_invoice_method    text;

-- ── ② portal_order_requests — 요청값 1칸 ────────────────────────────────────
alter table portal_order_requests
  add column if not exists requested_billing_cycle text;

-- ── ③ 허용값 제약 ───────────────────────────────────────────────────────────
-- 🔴 값 목록의 정의처는 코드(`lib/companyFields.ts`·`lib/settlementLabels.ts`)이고
--    이 제약은 **두 번째 방어선**이다. 코드에서 값을 늘리면 여기도 같이 늘릴 것.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'companies_billing_cycle_default_check') then
    alter table companies add constraint companies_billing_cycle_default_check
      check (billing_cycle_default is null or billing_cycle_default in ('per_order','monthly'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_payment_due_basis_check') then
    alter table companies add constraint companies_payment_due_basis_check
      check (payment_due_basis is null or payment_due_basis in ('cutoff','fixed_day','tax_invoice','negotiated'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_payment_due_value_check') then
    alter table companies add constraint companies_payment_due_value_check
      check (payment_due_value is null or (payment_due_value >= 0 and payment_due_value <= 180));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_credit_limit_check') then
    alter table companies add constraint companies_credit_limit_check
      check (credit_limit is null or credit_limit >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_tax_invoice_method_check') then
    alter table companies add constraint companies_tax_invoice_method_check
      check (tax_invoice_method is null or tax_invoice_method in ('standard','reverse','none'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'portal_order_requests_requested_billing_cycle_check') then
    alter table portal_order_requests add constraint portal_order_requests_requested_billing_cycle_check
      check (requested_billing_cycle is null or requested_billing_cycle in ('per_order','monthly'));
  end if;
end $$;

-- ── ④ 🔴 단언: 마감일을 신설하지 않았다 ─────────────────────────────────────
do $$
declare t text;
begin
  select data_type into t from information_schema.columns
   where table_schema='public' and table_name='companies' and column_name='billing_cutoff_day';
  if t is null then
    raise exception '🔴 billing_cutoff_day 가 없다 — 이 마이그레이션은 그것이 이미 있다는 전제로 쓰였다';
  end if;
  if t <> 'smallint' then
    raise exception '🔴 billing_cutoff_day 타입이 바뀌었다: % (실측 시점에는 smallint 였다)', t;
  end if;
end $$;

-- ── ⑤ 🔴 단언: 새 컬럼 6개가 전부 생겼다 ────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n from information_schema.columns
   where table_schema='public'
     and ((table_name='companies' and column_name in
            ('billing_cycle_default','payment_due_basis','payment_due_value','credit_limit','tax_invoice_method'))
       or (table_name='portal_order_requests' and column_name='requested_billing_cycle'));
  if n <> 6 then
    raise exception '새 컬럼이 6개가 아니다: %개', n;
  end if;
end $$;

-- ── ⑥ 🔴 단언: 기존 행을 한 줄도 채우지 않았다(전부 「미정」) ────────────────
-- 🔴 이 단언이 「일괄로 건별을 채우자」를 막는다(사용자 확정).
do $$
declare n int;
begin
  select count(*) into n from companies
   where billing_cycle_default is not null
      or payment_due_basis is not null
      or payment_due_value is not null
      or credit_limit is not null
      or tax_invoice_method is not null;
  if n <> 0 then
    raise exception '새 거래조건 칸이 이미 채워진 화주가 있다: %건 (기본값을 준 것은 아닌지 확인할 것)', n;
  end if;

  select count(*) into n from portal_order_requests where requested_billing_cycle is not null;
  if n <> 0 then
    raise exception '요청 청구주기가 이미 채워진 발주요청이 있다: %건', n;
  end if;
end $$;

-- ── ⑦ 🔴 단언: 기존 컬럼을 건드리지 않았다 ──────────────────────────────────
do $$
declare n int;
begin
  -- 정기계약 5컬럼이 그대로 있다(축이 다르므로 여기에 담지 않았다)
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='companies'
     and column_name in ('is_recurring_contract','recurring_contract_started_on',
                         'recurring_contract_ended_on','recurring_contract_frequency','recurring_contract_note');
  if n <> 5 then
    raise exception '정기계약 5컬럼이 5개가 아니다: %개', n;
  end if;
  -- 얼려 두는 구형 칸이 그대로 있다
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='companies' and column_name in ('payment_terms','billing_cutoff_day');
  if n <> 2 then
    raise exception 'payment_terms·billing_cutoff_day 가 2개가 아니다: %개', n;
  end if;
end $$;

-- ── ⑧ 결과 (🔴 이 저장소는 public 이다 — 화주 이름을 뽑지 않는다) ───────────
select
  count(*)                                             as 화주_전체,
  count(*) filter (where billing_cycle_default is not null) as 청구주기_정해짐,
  count(*) filter (where payment_due_basis is not null)     as 결제일기준_정해짐,
  count(*) filter (where credit_limit is not null)          as 여신한도_정해짐,
  count(*) filter (where tax_invoice_method is not null)    as 계산서방식_정해짐,
  count(*) filter (where billing_cutoff_day is not null)    as 마감일_채워짐,
  count(*) filter (where coalesce(payment_terms,'') <> '')  as 구형_결제조건_채워짐
from companies;

-- 되돌리기 (🔴 쓸 일이 없기를 바라지만 남겨 둔다)
--   alter table companies
--     drop column if exists billing_cycle_default,
--     drop column if exists payment_due_basis,
--     drop column if exists payment_due_value,
--     drop column if exists credit_limit,
--     drop column if exists tax_invoice_method;
--   alter table portal_order_requests drop column if exists requested_billing_cycle;
--   delete from _migrations where filename = '2026-09-14_company_trade_terms.sql';
