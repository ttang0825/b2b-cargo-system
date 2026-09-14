-- 35차 A-3·A-4·A-5·B-3 — 부가세 구분 · 수수료 면제 · 차주 세금계산서 · 오더 금액
--
-- 사용자 확정(2026-09-11)
--   5번  화주 청구금액에 「부가세 별도 / 부가세 포함」 선택이 있어야 한다
--   6·9번 선착불 오더의 주선수수료는 **부가세 포함가로 기입**한다
--   10번 「수수료 지급자」는 불필요하다 — 수수료는 무조건 차주가 지급한다
--   8번  선착불은 화주에게 세금계산서를 발행하지 않고, **차주에게 수수료분**을 발행한다
--   2번  운송오더 화면에 금액이 보이고 기입돼야 한다
--
-- 🔴 **부가세 구분 두 컬럼은 「신설」이 아니라 「되살리기」다.**
--    7차 세션에 `dispatches`/`invoices` 의 `customer_charge_vat_included`·
--    `driver_vat_included` **4개를 전부 삭제**했다(사유: *"토글이 계산에만 쓰이고
--    실익이 없다"*). 그때 입력값을 **항상 공급가액(부가세 별도)** 으로 고정했고,
--    `lib/settlementCalc.ts` 의 `toSupplyAmount()` 도 같이 지웠다.
--    이번에 되살리는 이유는 그때와 사정이 달라졌기 때문이다 —
--    **선착불에서 화주가 차주에게 부가세 포함가를 주는 경우가 실제로 있고**(사용자 5번),
--    마진을 「부가세 제외」로 내려면 두 금액의 기준을 알아야 한다.
--
-- 🔴 **기본값은 false = 「부가세 별도(공급가액)」다.** 7차 이후 저장된 모든 금액이
--    공급가액이므로 기본값을 true 로 두면 **과거 데이터의 의미가 통째로 바뀐다.**
--    ⚠️ 24시콜 가져오기 차수는 「합계」를 `customer_charge` 에 넣는데, 그 합계가
--    부가세 포함이면 **반드시 `customer_charge_vat_included = true` 를 같이 넣을 것.**
--    안 넣으면 공급가액으로 읽혀 마진이 10% 크게 잡힌다.
--
-- 🔴 **`brokerage_fee_payer` 컬럼은 지우지 않는다**(원칙 45번) — 과거 기록이라
--    읽기 전용으로 얼린다. 화면과 저장 화이트리스트에서만 뺀다.
--    그 값 중 `waived`(면제)만 정산확정 게이트에 실제로 쓰이고 있었으므로
--    `brokerage_fee_waived` 로 옮겨 담는다.
--
-- 🔴 **오더에는 금액 컬럼이 하나도 없었다**(실측 2026-09-11) — 지금까지 금액은
--    배차 등록 때 처음 들어갔다. 그래서 담당자가 오더 화면에서 합의 금액을 볼 수가
--    없었다. 오더에 넣고 배차가 **빈 칸일 때만** 물려받는다.

-- ─────────────────────────────────────────────────────────────────────────────
-- ① 원칙 27번 — 같은 뜻의 레거시 컬럼이 이미 있으면 멈춘다
--    `add column if not exists` 는 컬럼이 이미 있으면 조용히 아무것도 안 하므로,
--    "넣었다고 생각했는데 옛 컬럼이 그대로"인 상태가 생긴다.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n
  from information_schema.columns
  where table_schema = 'public'
    and (   (table_name in ('dispatches','invoices')
             and column_name in ('customer_charge_vat_included','driver_vat_included',
                                 'brokerage_fee_waived'))
         or (table_name = 'invoices'
             and column_name in ('driver_tax_invoice_issued','driver_tax_invoice_date'))
         or (table_name = 'orders'
             and column_name in ('customer_charge','customer_charge_vat_included')));
  if n <> 0 then
    raise exception '이 마이그레이션이 넣으려는 컬럼이 이미 %개 있습니다 — 덮어쓰기 전에 확인하십시오', n;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ② A-3 부가세 구분 — 배차·정산 (7차에 지운 4개를 되살린다)
-- ─────────────────────────────────────────────────────────────────────────────
alter table dispatches
  add column if not exists customer_charge_vat_included boolean not null default false,
  add column if not exists driver_vat_included          boolean not null default false;

alter table invoices
  add column if not exists customer_charge_vat_included boolean not null default false,
  add column if not exists driver_vat_included          boolean not null default false;

comment on column dispatches.customer_charge_vat_included is
  '화주 청구금액이 부가세 포함가인가. false = 공급가액(부가세 별도). 35차 A-3';
comment on column dispatches.driver_vat_included is
  '차주 지급금액이 부가세 포함가인가. false = 공급가액(부가세 별도). 35차 A-3';

-- ─────────────────────────────────────────────────────────────────────────────
-- ③ B-3 오더 금액 — 견적에서 합의한 청구금액을 오더가 들고 있게 한다
-- ─────────────────────────────────────────────────────────────────────────────
alter table orders
  add column if not exists customer_charge              numeric,
  add column if not exists customer_charge_vat_included boolean not null default false;

comment on column orders.customer_charge is
  '화주 청구금액(합의가). 배차 등록 시 빈 칸이면 이 값을 물려받는다. 35차 B-3';

-- ─────────────────────────────────────────────────────────────────────────────
-- ④ A-4 수수료 면제 — `brokerage_fee_payer = 'waived'` 를 옮겨 담는다
--    🔴 게이트를 없애는 것이 아니라 **판정 근거를 옮기는 것**이다.
--       수수료 0원이 「정말 0원」인지 「아직 안 적었다」인지 가릴 방법이 없어지면
--       미수금이 조용히 사라진다.
-- ─────────────────────────────────────────────────────────────────────────────
alter table dispatches add column if not exists brokerage_fee_waived boolean not null default false;
alter table invoices   add column if not exists brokerage_fee_waived boolean not null default false;

update dispatches set brokerage_fee_waived = true where brokerage_fee_payer = 'waived';
update invoices   set brokerage_fee_waived = true where brokerage_fee_payer = 'waived';

comment on column invoices.brokerage_fee_waived is
  '주선수수료 면제. 수수료 0원인 선착불 건을 정산확정할 수 있는 유일한 근거. 35차 A-4';
comment on column invoices.brokerage_fee_payer is
  '🔴 35차에 화면에서 뺐다(수수료는 무조건 차주 부담). 과거 기록 보존용 읽기 전용 — 새로 쓰지 말 것';

-- ─────────────────────────────────────────────────────────────────────────────
-- ⑤ A-5 차주 세금계산서 — 선착불의 수수료분
--    🔴 화주쪽 `tax_invoice_issued` 와 **다른 칸이다.** 선착불에서 화주쪽은
--       발행하지 않으므로 화면에서 감추고, 차주쪽만 쓴다.
-- ─────────────────────────────────────────────────────────────────────────────
alter table invoices
  add column if not exists driver_tax_invoice_issued boolean not null default false,
  add column if not exists driver_tax_invoice_date   date;

comment on column invoices.driver_tax_invoice_issued is
  '차주에게 주선수수료분 세금계산서를 발행했는가(선착불). 화주쪽 tax_invoice_issued 와 다른 칸. 35차 A-5';

-- ─────────────────────────────────────────────────────────────────────────────
-- ⑥ 단언 — 넣으려던 컬럼 9개가 전부 생겼는가
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n
  from information_schema.columns
  where table_schema = 'public'
    and (   (table_name in ('dispatches','invoices')
             and column_name in ('customer_charge_vat_included','driver_vat_included',
                                 'brokerage_fee_waived'))
         or (table_name = 'invoices'
             and column_name in ('driver_tax_invoice_issued','driver_tax_invoice_date'))
         or (table_name = 'orders'
             and column_name in ('customer_charge','customer_charge_vat_included')));
  -- 🔴 10개다 — dispatches 3(부가세2+면제1) · invoices 3 · invoices 세금계산서 2 ·
  --    orders 2. 처음에 11로 적었다가 단언에 걸려 트랜잭션이 통째로 되돌아갔다
  --    (안전장치가 제 몫을 한 것이고, 그때 DB 에는 아무것도 반영되지 않았다).
  if n <> 10 then
    raise exception '컬럼이 10개가 아닙니다: %', n;
  end if;
end $$;

-- 기본값이 false 인지 — true 로 들어가면 과거 금액의 의미가 통째로 바뀐다
do $$
declare n int;
begin
  select count(*) into n
  from information_schema.columns
  where table_schema = 'public'
    and column_name in ('customer_charge_vat_included','driver_vat_included','brokerage_fee_waived',
                        'driver_tax_invoice_issued')
    and column_default is distinct from 'false';
  if n <> 0 then
    raise exception '기본값이 false 가 아닌 컬럼이 %개 있습니다', n;
  end if;
end $$;

-- 면제 이관이 한 건도 빠지지 않았는가
do $$
declare n int;
begin
  select count(*) into n from invoices
  where brokerage_fee_payer = 'waived' and brokerage_fee_waived = false;
  if n <> 0 then
    raise exception '면제 이관이 안 된 정산 건이 %건 있습니다', n;
  end if;
  select count(*) into n from dispatches
  where brokerage_fee_payer = 'waived' and brokerage_fee_waived = false;
  if n <> 0 then
    raise exception '면제 이관이 안 된 배차 건이 %건 있습니다', n;
  end if;
end $$;

\echo '--- 이관 결과 (🔴 이름·번호 없이 건수만) ---'
select 'invoices'   as 표, count(*) filter (where brokerage_fee_waived) as 면제건, count(*) as 전체 from invoices
union all
select 'dispatches' as 표, count(*) filter (where brokerage_fee_waived), count(*) from dispatches;
