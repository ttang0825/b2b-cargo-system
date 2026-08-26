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
-- 기대: 차급 수 × 15구간. **22차 이후 11차급 = 165행**, 가산기준 11행.
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
\echo '=== ⑥ 기준점 표본 (16·17·22차 확정값) ==================='
--   1톤  10km 이내 = 48,000  /  1톤 60km 이내 = 84,000  /  1톤 400km 이내 = 289,000  (16차)
--   11톤 10km 이내 = 169,000 /  25톤 400km 초과 = 954,000                            (17차, 무변경)
--   8톤  10km 이내 = 151,000 /  8톤  400km 초과 = 636,000                            (22차 신설)
--   15톤 60km 이내 = 215,000 /  15톤 400km 초과 = 740,000                            (22차 신설)
--   18톤 10km 이내 = 182,000 /  🔴 18톤 200km 이내 = **341,000**                      (22차 하향)
--      ⚠️ 200km 만 −5.5% 다 — ×0.89 면 321,000 이라 11톤 325,000 보다 낮아진다(차급 역전).
select vehicle_type, distance_label, base_fare
from rate_distance_tiers
where (vehicle_type, distance_label) in
      (('1톤','10km 이내'), ('1톤','60km 이내'), ('1톤','400km 이내'),
       ('11톤','10km 이내'), ('25톤','400km 초과'),
       ('8톤','10km 이내'), ('8톤','400km 초과'),
       ('15톤','60km 이내'), ('15톤','400km 초과'),
       ('18톤','10km 이내'), ('18톤','200km 이내'))
order by base_fare;

\echo ''
\echo '=== ⑥-b 차급 역전 — 인접 차급끼리 값이 안 커지는 칸 (0이어야 함) =='
-- 🔴 22차에 8톤·15톤이 **중간에** 끼어들었다. 차급을 더 넣을 때마다 여기를 갱신할 것.
with ord(vt, rk) as (values
  ('1톤',1),('1.4톤',2),('2.5톤',3),('3.5톤',4),('5톤',5),('5톤 플러스/축',6),
  ('8톤',7),('11톤',8),('15톤',9),('18톤',10),('25톤',11)
)
select count(*) as 차급역전_건수
  from rate_distance_tiers a join ord oa on oa.vt = a.vehicle_type
  join rate_distance_tiers b on b.distance_label = a.distance_label
  join ord ob on ob.vt = b.vehicle_type
 where ob.rk = oa.rk + 1 and b.base_fare <= a.base_fare;

\echo ''
\echo '=== ⑦ 가산기준 전체 (22차 이후 11행) ===================='
-- 🔴 차급 수와 반드시 같아야 한다 — 빠진 차급은 대기료가 조용히 0원이 된다(16차).
select vehicle_type, free_waiting_minutes, waiting_fee_per_unit, waypoint_fee
from rate_vehicle_extra_fees order by waiting_fee_per_unit, vehicle_type;
select count(*) as 가산기준_없는_차급 from (
  select distinct vehicle_type from rate_distance_tiers
  except select vehicle_type from rate_vehicle_extra_fees
) s;

\echo ''
\echo '=== ⑦-b 물품특성 가산 (22차 하향분 포함) ================'
--   파손주의  0.1  / 15,000   (22차. 이전 30,000)
--   장척/중량 0.15 / 40,000   (22차. 이전 0.2 / 80,000. ⚠️ 표본 5건 — 관찰 대상)
select option_name, rate_pct, flat_amount
from rate_surcharges where category = '물품특성' order by option_name;

\echo ''
\echo '=== ⑧ 동의 기록 (14차) =================================='
select source, consent_type, version, agreed, count(*) as 건수
from consents group by source, consent_type, version, agreed
order by source, consent_type;

\echo ''
\echo '=== ⑧-b 동의가 어느 접수 건에 붙었는가 (고아 행 0이어야 함) =='
--   🔴 14차에 "행이 생겼다만 보면 안 되고 join까지 볼 것"이라고 못박은 지점이다.
--   subject_id 는 text 라 원본 테이블 id 를 text 로 맞춰 붙여 본다.
select c.subject_type, c.consent_type,
       count(*)                                     as 동의행수,
       count(*) filter (where 원본.id is not null)  as 원본_있음,
       count(*) filter (where 원본.id is null)      as 고아_행
from consents c
left join lateral (
  select p.id from portal_order_requests p
   where c.subject_type = 'portal_order_request' and p.id::text = c.subject_id
  union all
  select a.id from customer_applications a
   where c.subject_type = 'application' and a.id::text = c.subject_id
  union all
  select q.id from public_quote_requests q
   where c.subject_type = 'quote_request' and q.id::text = c.subject_id
) as 원본 on true
group by c.subject_type, c.consent_type
order by c.subject_type, c.consent_type;

\echo ''
\echo '=== ⑧-c 동의 항목별 건수 (privacy / terms / third_party) =='
select consent_type, version, count(*) as 건수
from consents group by consent_type, version order by consent_type;

\echo ''
\echo '=== ⑧-d customer_locations 컬럼 (20차) ==================='
--   🔴 `name`·`note` 는 0이어야 한다 — `location_name`·`notes` 를 재사용하기로
--   확정했다(48차, 사용자 확인). 1 이상이면 중복 컬럼이 생긴 것이다.
select
  count(*) filter (where column_name = 'location_name')  as location_name,
  count(*) filter (where column_name = 'notes')          as notes,
  count(*) filter (where column_name = 'address_detail') as address_detail,
  count(*) filter (where column_name = 'contact_name')   as contact_name,
  count(*) filter (where column_name = 'contact_phone')  as contact_phone,
  count(*) filter (where column_name in ('name','note')) as "중복컬럼_0이어야"
from information_schema.columns where table_name = 'customer_locations';

\echo ''
\echo '=== ⑧-e customer_presets (20차) =========================='
select
  (select count(*) from pg_class
    where relname = 'customer_presets' and relrowsecurity)                 as "RLS_켜짐_1",
  (select count(*) from pg_policies where tablename = 'customer_presets')  as "정책_2",
  (select count(*) from pg_constraint
    where conrelid = 'customer_presets'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) like '%preset_type%')                  as "CHECK_1이상",
  (select count(*) from customer_presets)                                  as 행수;

\echo ''
\echo '=== ⑧-f 상하차방식 8행 · 도크 (20차) ====================='
select option_name, rate_pct, flat_amount
from rate_surcharges where category = '상하차방식' order by option_name;

\echo ''
\echo '=== ⑧-g RLS·정책 요약 (21차) — 읽기 전용 ================='
select
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
     and n.nspname='public' where c.relkind='r' and not c.relrowsecurity)   as "RLS꺼진표_0이어야",
  (select count(*) from pg_policy p
     where p.polroles::regrole[] @> array['anon'::regrole])                 as "anon정책_2여야",
  (select count(*) from pg_policy p
     where p.polroles::regrole[] @> array['anon'::regrole] and p.polcmd='a') as "그중_INSERT전용_2",
  (select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid
     where p.polname = 'staff_all_' || c.relname)                          as "직원정책_26이어야",
  (select count(*) from pg_policy p
     where p.polroles::regrole[] @> array['authenticated'::regrole]
       and p.polname not like 'staff\_all\_%')                            as "화주정책_14여야";

\echo ''
\echo '=== ⑧-h 🔴 롤별 실측 — anon 은 0행, 직원은 전부 (21차) ==='
-- ⚠️ set local 은 트랜잭션 안에서만 듣는다. 이 블록을 한 줄씩 따로 실행하면
--    조용히 postgres 권한으로 돌아 시험이 통째로 무의미해진다(19차가 한 번 속았다).
begin;
  set local role anon;
  select 'anon' as 롤,
    (select count(*) from companies)            as companies,
    (select count(*) from quotes)               as quotes,
    (select count(*) from drivers)              as drivers,
    (select count(*) from individual_customers) as 개인고객,
    (select count(*) from rate_distance_tiers)  as 운임구간,
    (select count(*) from staff_accounts)       as 직원;
  reset role;
  select set_config('request.jwt.claims',
    json_build_object('sub', (select id from staff_accounts where status='active'
                              order by created_at limit 1),
                      'role','authenticated')::text, true);
  set local role authenticated;
  select '직원' as 롤,
    (select count(*) from companies)            as companies,
    (select count(*) from quotes)               as quotes,
    (select count(*) from drivers)              as drivers,
    (select count(*) from individual_customers) as 개인고객,
    (select count(*) from rate_distance_tiers)  as 운임구간,
    (select count(*) from staff_accounts)       as 직원;
  reset role;
commit;

\echo ''
\echo '=== ⑧-i 묶음 후보 뷰 security_invoker (21차, on 이어야) ==='
select coalesce((select option_value from pg_options_to_table(c.reloptions)
                 where option_name='security_invoker'), '(꺼짐)') as security_invoker
from pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public'
where c.relname='customer_billing_batch_candidates';

\echo ''
\echo '=== ⑨ 마이그레이션 이력 ================================='
select filename, applied_at, applied_by from _migrations order by filename;
