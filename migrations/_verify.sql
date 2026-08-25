-- 운임·동의 데이터 상태 점검  (읽기 전용 — UPDATE/INSERT/DELETE 없음)
--
-- 워크플로에서 mode 를 'verify' 로 고르면 이 파일이 실행되고, 결과가 실행 로그에
-- 그대로 찍힙니다. 🔴 그동안 사용자가 Supabase SQL Editor에서 한 줄씩 돌리고
-- 결과를 옮겨 적던 것을 대신하는 것이 이 파일의 목적입니다.
--
-- ⚠️ 확인하고 싶은 항목이 생기면 여기에 SELECT 를 추가하십시오.
--    읽기 전용만 넣을 것 — 이 파일은 사람 확인 없이 돌아갑니다.

\echo ''
\echo '=== ① 운임기준표 구조 ==================================='
-- 기대: 차급 수 × 15구간. 9차급이면 135행.
select
  (select count(distinct vehicle_type) from rate_distance_tiers) as 차급수,
  (select count(distinct distance_label) from rate_distance_tiers) as 구간수,
  (select count(*) from rate_distance_tiers)                      as 총행수,
  (select count(*) from rate_vehicle_extra_fees)                  as 가산기준_행수;

\echo ''
\echo '=== ② 차급별 구간 수 (전부 15여야 함) ==================='
select vehicle_type, count(*) as 구간수
from rate_distance_tiers group by vehicle_type order by count(*) desc, vehicle_type;

\echo ''
\echo '=== ③ 이상값 — 전부 0이어야 함 =========================='
select
  (select count(*) from rate_distance_tiers where base_fare is null or base_fare <= 0)      as 값없거나_0이하,
  (select count(*) from rate_distance_tiers where base_fare % 1000 <> 0)                    as 천원단위_아님,
  (select count(*) from rate_vehicle_extra_fees
     where waiting_fee_per_unit is null or waypoint_fee is null)                            as 가산기준_null,
  (select count(*) from rate_distance_tiers where distance_to_km is null
     and distance_label <> '400km 초과')                                                    as 상한없는데_마지막구간아님;

\echo ''
\echo '=== ④ 마지막 구간 (차급마다 1행씩, 상한 null 이어야 함) =='
select vehicle_type, distance_label, distance_to_km, base_fare
from rate_distance_tiers where distance_to_km is null order by base_fare;

\echo ''
\echo '=== ⑤ 거리 역전 — 같은 차급인데 멀수록 싸지는 구간 (0이어야 함) =='
select count(*) as 거리역전_건수 from (
  select vehicle_type, base_fare,
         lag(base_fare) over (partition by vehicle_type order by coalesce(distance_to_km, 999999)) as 앞구간
  from rate_distance_tiers
) t where 앞구간 is not null and base_fare < 앞구간;

\echo ''
\echo '=== ⑥ 기준점 표본 (16·17차 확정값) ======================'
--   1톤 10km 이내 = 48,000  /  1톤 60km 이내 = 84,000  /  1톤 400km 이내 = 289,000
select vehicle_type, distance_label, base_fare
from rate_distance_tiers
where (vehicle_type, distance_label) in
      (('1톤','10km 이내'), ('1톤','60km 이내'), ('1톤','400km 이내'))
order by base_fare;

\echo ''
\echo '=== ⑦ 가산기준 전체 ====================================='
select vehicle_type, free_waiting_minutes, waiting_fee_per_unit, waypoint_fee
from rate_vehicle_extra_fees order by waiting_fee_per_unit, vehicle_type;

\echo ''
\echo '=== ⑧ 동의 기록 (14차) =================================='
select source, consent_type, version, agreed, count(*) as 건수
from consents group by source, consent_type, version, agreed
order by source, consent_type;

\echo ''
\echo '=== ⑨ 마이그레이션 이력 ================================='
select filename, applied_at, applied_by from _migrations order by filename;
