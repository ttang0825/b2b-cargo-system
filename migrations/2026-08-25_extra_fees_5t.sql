-- 16차 — rate_vehicle_extra_fees: 5톤 · 5톤 플러스/축 2행의 대기료·경유지비 채우기
--
-- 🔴 이 파일은 사용자가 Supabase SQL Editor에서 직접 실행합니다.
--
-- 배경 — 5톤급 견적에 대기료가 0원으로 잡히고 있었습니다
--
--   이 두 차급은 `waiting_fee_per_unit`·`waypoint_fee`가 **null** 입니다.
--   견적 계산은 값의 존재로 분기합니다(`app/admin/quotes/page.tsx`):
--
--       if (extra?.waiting_fee_per_unit && waitingMin > freeMin) { ... }
--       if (extra?.waypoint_fee && waypointCount > 0) { ... }
--
--   null은 falsy라 5톤 견적에 대기 180분을 넣어도 대기료가 0원이고,
--   `breakdown`에 항목조차 안 생겨 **견적서에 흔적이 남지 않습니다.**
--   화면에는 반대로 읽히는 안내(placeholder "무료 30분 초과분만 가산")가 붙어 있습니다.
--
--   돈을 못 받는다는 뜻은 아닙니다 — 현장 추가비(`dispatch_extra_charges`)로 배차
--   단계에서 수동 등록할 수 있습니다. 문제는 **견적서에 미리 안내되지 않는다**는 것이고,
--   34차 개정 약관 제11조 2항이 추가 청구를 "사유와 금액을 안내하고 협의한 후"로
--   묶어놨기 때문에 사후 협의가 어려워집니다.
--
-- 넣는 값은 현행 1~3.5톤에서 보간한 것입니다.
--
--   차급              무료대기   30분당    경유지 1곳
--   1톤 (현행)         30분     10,000     20,000
--   1.4톤 (현행)       30분     10,000     25,000
--   2.5톤 (현행)       30분     20,000     30,000
--   3.5톤 (현행)       30분     20,000     35,000
--   5톤               30분     25,000     40,000   ← 이번에 채움
--   5톤 플러스/축      30분     25,000     50,000   ← 이번에 채움

begin;

create table if not exists _bak_rate_vehicle_extra_fees_20260825 as
  select * from rate_vehicle_extra_fees;

update rate_vehicle_extra_fees
set waiting_fee_per_unit = 25000, waypoint_fee = 40000
where vehicle_type = '5톤';
-- 기대: UPDATE 1

update rate_vehicle_extra_fees
set waiting_fee_per_unit = 25000, waypoint_fee = 50000
where vehicle_type = '5톤 플러스/축';
-- 기대: UPDATE 1

commit;

-- 실행 후 검증 — commit 뒤에 따로 돌리십시오.

-- 완료조건 5: 0행이어야 함
-- select vehicle_type, free_waiting_minutes, waiting_fee_per_unit, waypoint_fee
-- from rate_vehicle_extra_fees
-- where waiting_fee_per_unit is null or waypoint_fee is null;

-- 전체 확인 (6차급이 모두 값을 가져야 함)
-- select vehicle_type, free_waiting_minutes, waiting_fee_per_unit, waypoint_fee
-- from rate_vehicle_extra_fees
-- order by vehicle_type;

-- 되돌려야 하면 (스냅샷이 남아 있는 동안만 유효):
-- update rate_vehicle_extra_fees t
-- set waiting_fee_per_unit = b.waiting_fee_per_unit, waypoint_fee = b.waypoint_fee
-- from _bak_rate_vehicle_extra_fees_20260825 b where t.id = b.id;
