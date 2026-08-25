-- 16차 — rate_vehicle_extra_fees: 5톤 · 5톤 플러스/축 2행의 대기료·경유지비 채우기
--
-- 🔴 이 파일은 사용자가 Supabase SQL Editor에서 직접 실행합니다.
--
-- ⚠️ 1~3단계를 **한 번에 실행하지 말고 순서대로 하나씩** 실행하십시오.
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


-- ═══════════════════════════════════════════════════════════════════
-- 1단계 — 백업 스냅샷
-- ═══════════════════════════════════════════════════════════════════

create table if not exists _bak_rate_vehicle_extra_fees_20260825 as
  select * from rate_vehicle_extra_fees;


-- ═══════════════════════════════════════════════════════════════════
-- 2단계 — 2행 교체
--
-- 🔴 결과에 `반영된_행수`가 나옵니다. **2여야 합니다.**
--    (한 문장이라 중간에 실패하면 아무것도 반영되지 않습니다.)
-- ═══════════════════════════════════════════════════════════════════

with upd as (
  update rate_vehicle_extra_fees t
  set waiting_fee_per_unit = v.waiting_fee,
      waypoint_fee         = v.waypoint_fee
  from (values
    ('5톤',            25000, 40000),
    ('5톤 플러스/축',   25000, 50000)
  ) as v(vehicle_type, waiting_fee, waypoint_fee)
  where t.vehicle_type = v.vehicle_type
  returning 1
)
select count(*) as 반영된_행수 from upd;


-- ═══════════════════════════════════════════════════════════════════
-- 3단계 — 검증 (완료조건 5)
--
-- 🔴 **0행이 나와야 정상입니다.**
-- ═══════════════════════════════════════════════════════════════════

select vehicle_type, free_waiting_minutes, waiting_fee_per_unit, waypoint_fee
from rate_vehicle_extra_fees
where waiting_fee_per_unit is null or waypoint_fee is null;


-- 눈으로도 한 번 (6차급이 전부 값을 가져야 함)
-- select vehicle_type, free_waiting_minutes, waiting_fee_per_unit, waypoint_fee
-- from rate_vehicle_extra_fees order by vehicle_type;


-- ═══════════════════════════════════════════════════════════════════
-- 되돌리기 — 2단계가 잘못됐을 때만
-- ═══════════════════════════════════════════════════════════════════

-- update rate_vehicle_extra_fees t
-- set waiting_fee_per_unit = b.waiting_fee_per_unit, waypoint_fee = b.waypoint_fee
-- from _bak_rate_vehicle_extra_fees_20260825 b where t.id = b.id;
