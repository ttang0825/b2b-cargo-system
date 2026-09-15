-- 36차 리뷰 2라운드 — 발주요청에 「결제일 요청」 한 칸
--
-- 사용자 지시: *"발주요청에서 월정산일경우 옆에 정산마감은 월말기준이라고 명시하고
-- 결제일을 선택할수 있는 항목이 생기게 하자. 기본적으로 화주상세에 적힌 결제일이
-- 표시되게."*
--
-- 🔴 **`requested_billing_cycle` 과 같은 성격이다 — 「요청」이지 확정이 아니다.**
--    27차가 `portal_order_requests` 에 확정 정산값을 넣지 말라고 못박은 이유
--    (*「월정산은 화주별 계약이라 담당자가 정한다」*)가 그대로 살아 있다.
--    🔴 이름에서 `requested_` 를 떼지 말 것.
--
-- 🔴 **값의 뜻은 `companies.payment_due_value` 와 같다 — 「정산 익월 며칠」이다**
--    (36차 리뷰 2라운드에 정산 마감이 **월말 고정**으로 확정돼서 기준 칸이 필요 없다).
--      0      익월 말일
--      1~31   익월 그 날짜
--      null   요청 없음(= 화주 계약값을 그대로 따른다)
--
-- 🔴 **「협의」를 여기에 담지 않는다.** 협의는 화주가 고를 것이 아니라 담당자와
--    이미 정해 둔 계약 형태(`companies.payment_due_basis = 'negotiated'`)이고,
--    그런 화주에게는 포털이 이 칸을 아예 그리지 않는다.
--
-- 🔴 **건별 화주에게는 이 칸이 없다** — 즉시지급이라 결제일이라는 개념이 없다.
--
-- ⚠️ 기준 칸(`requested_payment_due_basis`)은 **만들지 않았다.** 마감이 월말로
--    고정이라 기준이 하나뿐이기 때문이다. 나중에 기준이 여럿이 되면 그때 만든다 —
--    🔴 지금 만들어 두면 화주가 못 고르는 칸이 영원히 null 로 남는다.

-- ── ① 컬럼 ─────────────────────────────────────────────────────────────────
alter table portal_order_requests
  add column if not exists requested_payment_due_value smallint;

-- ── ② 허용값 제약 ───────────────────────────────────────────────────────────
-- 🔴 `companies_payment_due_value_check`(0~180)보다 **좁다** — 그쪽은 예전
--    「마감 후 N일」 기준(45·60일)까지 받던 범위이고, 이 칸은 날짜뿐이다.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'portal_order_requests_requested_payment_due_value_check') then
    alter table portal_order_requests
      add constraint portal_order_requests_requested_payment_due_value_check
      check (requested_payment_due_value is null
             or (requested_payment_due_value >= 0 and requested_payment_due_value <= 31));
  end if;
end $$;

-- ── ③ 🔴 단언: 기준 칸을 만들지 않았다 ──────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='portal_order_requests'
     and column_name = 'requested_payment_due_basis';
  if n <> 0 then
    raise exception '🔴 requested_payment_due_basis 가 생겼다 — 마감이 월말 고정이라 기준 칸은 만들지 않기로 했다';
  end if;
end $$;

-- ── ④ 🔴 단언: 바로 앞 마이그레이션의 여섯 칸이 그대로 있다 ─────────────────
-- 🔴 `credit_limit` 은 **화면에서만 뺐고 컬럼은 남긴다**(36차 리뷰 2라운드 —
--    사용자 *"여신한도는 지금 뺀다"*). 지우면 되살릴 때 마이그레이션이 또 필요하고,
--    실측상 **채워진 행이 0건**이라 남겨 두는 비용이 없다.
do $$
declare n int;
begin
  select count(*) into n from information_schema.columns
   where table_schema='public'
     and ((table_name='companies' and column_name in
            ('billing_cycle_default','payment_due_basis','payment_due_value','credit_limit','tax_invoice_method'))
       or (table_name='portal_order_requests' and column_name='requested_billing_cycle'));
  if n <> 6 then
    raise exception '2026-09-14_company_trade_terms.sql 의 6칸이 6개가 아니다: %개', n;
  end if;
end $$;

-- ── ⑤ 🔴 단언: 기존 행을 채우지 않았다 ─────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n from portal_order_requests where requested_payment_due_value is not null;
  if n <> 0 then
    raise exception '요청 결제일이 이미 채워진 발주요청이 있다: %건', n;
  end if;
end $$;

-- ── ⑥ 결과 (🔴 이 저장소는 public 이다 — 이름을 뽑지 않는다) ────────────────
select
  count(*)                                                    as 발주요청_전체,
  count(*) filter (where requested_billing_cycle is not null) as 청구주기_요청됨,
  count(*) filter (where requested_payment_due_value is not null) as 결제일_요청됨
from portal_order_requests;

-- 되돌리기
--   alter table portal_order_requests drop column if exists requested_payment_due_value;
--   delete from _migrations where filename = '2026-09-14_portal_request_payment_due.sql';
