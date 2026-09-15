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
-- 기대: 차급 수 × 15구간. 🔴 **2026-09-11 다마스·라보 신설 이후 13차급 = 195행**,
--       가산기준 13행. (22차~그 전까지는 11차급 165행이었다)
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
-- 🔴 22차에 8톤·15톤이 **중간에**, 2026-09-11 에 다마스·라보가 **맨 앞에** 끼어들었다.
--    차급을 더 넣을 때마다 여기를 갱신할 것 — 안 하면 새 차급이 검사에서 **조용히** 빠진다.
with ord(vt, rk) as (values
  ('다마스',1),('라보',2),
  ('1톤',3),('1.4톤',4),('2.5톤',5),('3.5톤',6),('5톤',7),('5톤 플러스/축',8),
  ('8톤',9),('11톤',10),('15톤',11),('18톤',12),('25톤',13)
)
select count(*) as 차급역전_건수
  from rate_distance_tiers a join ord oa on oa.vt = a.vehicle_type
  join rate_distance_tiers b on b.distance_label = a.distance_label
  join ord ob on ob.vt = b.vehicle_type
 where ob.rk = oa.rk + 1 and b.base_fare <= a.base_fare;

\echo ''
\echo '=== ⑦ 가산기준 전체 (2026-09-11 이후 13행) ==============='
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
\echo '=== ⑧-d2 🔴 customer_locations 전체 컬럼 (PR #103 리뷰) =='
--   🔴 왜 전체 목록인가. 25차가 이 표를 `.order("created_at")` 으로 조회했다가
--      **목록이 통째로 비는 버그**를 냈다(저장은 되는데 카드에 안 나타남).
--      다른 4곳은 order 절이 없어 멀쩡했고 이 화면만 걸렸다.
--      컬럼 이름을 짐작해서 쿼리를 쓰지 않도록 실제 목록을 남겨둔다.
select string_agg(column_name, ', ' order by ordinal_position) as 컬럼
  from information_schema.columns
 where table_schema = 'public' and table_name = 'customer_locations';

\echo ''
\echo '=== ⑧-d3 차량형태 선택지 (PR #103 리뷰 — 21종이어야, 차종무관 포함) =='
select count(*) as 행수,
       count(*) filter (where rate_pct is null or flat_amount is null) as null_0이어야
  from rate_surcharges where category = '차량형태';
select option_name, rate_pct, flat_amount
  from rate_surcharges where category = '차량형태'
 order by rate_pct, flat_amount, option_name;

\echo ''
\echo '=== ⑧-d4 무료 대기시간 (PR #103 리뷰 4번 — 전 차급 20분이어야) =='
select free_waiting_minutes as 무료_대기분, count(*) as 차급수
  from rate_vehicle_extra_fees group by 1 order by 1;

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

\echo ''
\echo '=== ⑩ 🔴 운임 v11 착수 전 실측 (차수 없음: 운임기준표 v11) ======'
-- 🔴 왜 전수 덤프인가. 레포에 운임 시드 파일이 없어서 "현행 값"을 아는 길이
--    이 조회뿐이다. v11 지시서의 「현행 → v11」 165칸 대조표가 여기서 나온다.
--    ⚠️ 위 ⑥ 의 주석 값(1톤 10km 48,000 등)은 16·17·22차 기준이라 **낡았다** —
--    주석이 아니라 이 덤프가 정본이다.
--    🔴 2026-09-09 v11 적용 후 기준: 165칸 전부 천원 단위 · 게시 6칸은
--       40,000 / 52,000 / 87,000 / 100,000 / 115,000 / 150,000 이다.

\echo ''
\echo '--- ⑩-a 차급명 전수 (🔴 견적 매칭이 문자열 완전일치다) ---'
select vehicle_type as 차급명, length(vehicle_type) as 글자수, count(*) as 구간수
  from rate_distance_tiers group by vehicle_type order by min(base_fare);

\echo ''
\echo '--- ⑩-b 거리 구간 표기 전수 + 상하한 ---'
select distance_label as 구간명, min(distance_from_km) as from_km,
       max(distance_to_km) as to_km, count(*) as 차급수
  from rate_distance_tiers group by distance_label
 order by coalesce(max(distance_to_km), 999999);

\echo ''
\echo '--- ⑩-c 🔴 195칸 전수 (행=구간 · 열=차급) ---'
select distance_label as 구간,
  max(base_fare) filter (where vehicle_type = '다마스')        as "다마스",
  max(base_fare) filter (where vehicle_type = '라보')          as "라보",
  max(base_fare) filter (where vehicle_type = '1톤')          as "1톤",
  max(base_fare) filter (where vehicle_type = '1.4톤')        as "1.4톤",
  max(base_fare) filter (where vehicle_type = '2.5톤')        as "2.5톤",
  max(base_fare) filter (where vehicle_type = '3.5톤')        as "3.5톤",
  max(base_fare) filter (where vehicle_type = '5톤')          as "5톤",
  max(base_fare) filter (where vehicle_type = '5톤 플러스/축') as "5톤+/축",
  max(base_fare) filter (where vehicle_type = '8톤')          as "8톤",
  max(base_fare) filter (where vehicle_type = '11톤')         as "11톤",
  max(base_fare) filter (where vehicle_type = '15톤')         as "15톤",
  max(base_fare) filter (where vehicle_type = '18톤')         as "18톤",
  max(base_fare) filter (where vehicle_type = '25톤')         as "25톤"
from rate_distance_tiers group by distance_label
order by min(coalesce(distance_to_km, 999999));

\echo ''
\echo '--- ⑩-d 🔴 위 표에서 못 잡힌 칸 (0이어야 — 차급명이 다르다는 뜻) ---'
select count(*) as 미매칭_칸수 from rate_distance_tiers
 where vehicle_type not in ('다마스','라보',
                            '1톤','1.4톤','2.5톤','3.5톤','5톤','5톤 플러스/축',
                            '8톤','11톤','15톤','18톤','25톤');

\echo ''
\echo '--- ⑩-e 혼적 할인 설정 (B장 전제) ---'
select string_agg(column_name || ' ' || data_type, ', ' order by ordinal_position) as 컬럼
  from information_schema.columns
 where table_schema='public' and table_name='mixed_loading_discount_settings';
select * from mixed_loading_discount_settings;

\echo ''
\echo '--- ⑩-f rate_surcharges 전체 (🔴 상하차 8종 병합 후 이름·금액) ---'
select category, option_name, rate_pct, flat_amount
  from rate_surcharges order by category, option_name;

\echo ''
\echo '--- ⑩-g 제약조건 (🔴 유니크가 없으면 재실행 시 중복 INSERT) ---'
select conname, pg_get_constraintdef(oid) as 정의
  from pg_constraint
 where conrelid in ('rate_distance_tiers'::regclass,
                    'mixed_loading_discount_settings'::regclass)
 order by conrelid::regclass::text, conname;
select indexname, indexdef from pg_indexes
 where tablename in ('rate_distance_tiers','mixed_loading_discount_settings')
 order by tablename, indexname;

\echo ''
\echo '--- ⑩-h _migrations 행 수 (파일을 더할 때마다 늘어난다) ---'
select count(*) as 마이그레이션_행수 from _migrations;
\echo ''
\echo '=== ⑪ 🔴 직원 계정 상태 (32차 착수 전) — 이름·이메일은 가려서 찍는다 ==='
-- 🔴 **이 저장소는 public 이다.** Actions 로그는 로그인 없이 누구나 읽는다.
--    직원 이름·이메일을 그대로 찍으면 그 순간 공개된다 — 반드시 마스킹할 것.
--    (사람이 누구인지 아는 것은 사용자이지 이 로그가 아니다.)
select string_agg(column_name, ', ' order by ordinal_position) as "staff_accounts 컬럼"
  from information_schema.columns
 where table_schema = 'public' and table_name = 'staff_accounts';

\echo '--- staff_accounts RLS 정책 (🔴 anon 이 있는지가 32차 설계를 가른다) ---'
select policyname, roles::text as 롤, cmd as 명령, qual as 조건
  from pg_policies where tablename = 'staff_accounts' order by policyname;

\echo '--- 🔴 실측: anon 이 실제로 몇 행을 읽는가 (0 이어야) ---'
begin;
  set local role anon;
  select count(*) as "anon이_읽는_행수_0이어야" from staff_accounts;
  reset role;
commit;

\echo '--- staff_accounts 롤별 GRANT ---'
select grantee, string_agg(distinct privilege_type, ',' order by privilege_type) as 권한
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'staff_accounts'
   and grantee in ('anon','authenticated','service_role')
 group by grantee order by grantee;

\echo '--- 🔴 32차: 아이디 없는 재직 직원 (0 이어야 merge 해도 안전) ---'
-- 🔴 이 값이 0 이 아닌데 코드를 merge 하면 **전 직원이 못 들어온다.**
--    아이디 값은 저장소가 public 이라 마이그레이션에 넣지 않았고,
--    Supabase SQL Editor 에서 손으로 채운다(2026-09-09_staff_login_id.sql 머리말).
select
  count(*) filter (where status = 'active' and (login_id is null or btrim(login_id) = ''))
                                                          as "아이디없는_재직자_0이어야",
  count(*) filter (where login_id is not null)            as 아이디_보유,
  count(*) filter (where login_id is not null
                     and login_id !~ '^[a-z][a-z0-9]{3,19}$')
                                                          as "규칙위반_0이어야",
  count(distinct lower(login_id))                         as 서로다른_아이디수
from staff_accounts;

\echo '--- 계정 목록 (마스킹) ---'
select row_number() over (order by created_at) as 번호,
       left(name, 1) || repeat('*', greatest(length(name) - 1, 0))          as 이름,
       left(split_part(email, '@', 1), 2) || '***@'
         || left(split_part(email, '@', 2), 1) || '***'                     as 이메일,
       -- 🔴 login_id 도 공개 로그에 그대로 찍지 않는다 — 자격의 절반이다.
       case when login_id is null then '(없음)'
            else left(login_id, 2) || repeat('*', greatest(length(login_id) - 2, 0)) end as 아이디,
       role, status, must_change_password as 강제변경, created_at::date as 등록일
  from staff_accounts order by created_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- ⑫ 화주 항목 정합 (33차) — companies · customer_applications 컬럼 목록
--
--    🔴 컬럼 "이름"만 찍는다. 이 저장소는 public 이고 Actions 로그도 공개라
--       실제 화주명·사업자등록번호·담당자 연락처는 한 글자도 나가면 안 된다(32차 규칙).
--    🟢 33차가 「어느 신청서 항목이 companies 로 안 넘어가는가」를 판단하는 근거다.
-- ─────────────────────────────────────────────────────────────────────────────
\echo '--- ⑫-a companies 컬럼 ---'
select ordinal_position as 순번, column_name as 컬럼, data_type as 형,
       is_nullable as null허용, column_default as 기본값
  from information_schema.columns
 where table_schema = 'public' and table_name = 'companies'
 order by ordinal_position;

\echo '--- ⑫-b customer_applications 컬럼 ---'
select ordinal_position as 순번, column_name as 컬럼, data_type as 형
  from information_schema.columns
 where table_schema = 'public' and table_name = 'customer_applications'
 order by ordinal_position;

\echo '--- ⑫-c 정기계약 컬럼 (33차 마이그레이션 뒤에 5개가 되어야 한다) ---'
select count(*) as 정기계약_컬럼수
  from information_schema.columns
 where table_schema = 'public' and table_name = 'companies'
   and column_name like 'recurring_contract%' or (table_name = 'companies'
   and table_schema = 'public' and column_name = 'is_recurring_contract');

-- ─────────────────────────────────────────────────────────────────────────────
-- ⑬ 견적 관리 배지가 안 사라진다 (34차 리뷰 1라운드)
--
--    신고: *"견적관리 부분에 계속해서 알림 표시 4건이 남아 있다."*
--    그 배지는 `TopNav` 가 **「status='수주' 인데 orders.quote_id 로 이어진 오더가
--    없는 견적」**을 센다(27차 리뷰). 그러니 남는 원인은 둘 중 하나다 —
--      (가) 정말 오더를 안 만든 건이다      → 배지가 맞다. 할 일이 남은 것
--      (나) 오더는 만들었는데 `quote_id` 가 비었다 → 배지가 영영 안 사라진다
--           (오더 화면에서 `?from_quote=` 를 거치지 않고 직접 등록하면 그렇게 된다)
--    이 항목은 그 둘을 갈라 보기 위한 **읽기 전용** 진단이다.
--
--    🔴 화주명·연락처는 한 글자도 찍지 않는다(32차 규칙 — 이 저장소와 Actions 로그는
--       공개다). 견적번호·날짜·건수만 본다.
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '=== ⑬ 견적 관리 배지 진단 (34차) ==========================='

\echo '--- ⑬-a 배지가 세는 수 (TopNav 와 같은 식) ---'
select count(*) as 배지_건수
  from quotes q
 where q.status = '수주'
   and not exists (select 1 from orders o where o.quote_id = q.id);

\echo '--- ⑬-b 그 건들 (견적번호·등록일만) ---'
select q.quote_no as 견적번호,
       q.created_at::date as 등록일,
       q.updated_at::date as 최종수정일,
       (q.approved_by_customer_at is not null) as 화주가_승인함,
       (q.company_id is not null)           as 회원건
  from quotes q
 where q.status = '수주'
   and not exists (select 1 from orders o where o.quote_id = q.id)
 order by q.created_at;

\echo '--- ⑬-c 🔴 (나) 가설 검증: quote_id 가 빈 오더가 몇 건인가 ---'
select count(*) filter (where quote_id is null) as quote_id_없는_오더,
       count(*) filter (where quote_id is not null) as quote_id_있는_오더,
       count(*) as 오더_전체
  from orders;

\echo '--- ⑬-d 견적 상태 분포 (수주가 몇 건인지) ---'
select status as 상태, count(*) as 건수
  from quotes group by status order by count(*) desc;

\echo ''
\echo '=== ⑭ 🔴 다마스·라보 착수 전 실측 (차수 없음: 차급 13종) ========'
-- 🔴 ⑩ 이 대부분을 덮지만 두 가지가 빠져 있어 더한다.
--    ① `rate_vehicle_extra_fees` 의 제약조건 — 이 표에도 2행을 INSERT 하는데
--       ⑩-g 는 `rate_distance_tiers` 와 혼적 설정만 본다. 유니크가 없으면
--       재실행 시 조용히 중복된다(⑩-g 를 더할 때 이 표를 빠뜨린 자리다).
--    ② `insurance_rate_settings` 의 컬럼 — 산재보험료가 차급별인지 실측으로
--       확인한다(코드상으로는 요율 두 개뿐이라 차급 무관이다).

\echo ''
\echo '--- ⑭-a rate_vehicle_extra_fees 제약조건·인덱스 (🔴 재실행 안전) ---'
select conname, pg_get_constraintdef(oid) as 정의
  from pg_constraint where conrelid = 'rate_vehicle_extra_fees'::regclass
 order by conname;
select indexname, indexdef from pg_indexes
 where tablename = 'rate_vehicle_extra_fees' order by indexname;

\echo ''
\echo '--- ⑭-b rate_vehicle_extra_fees 컬럼 (넣을 값의 모양) ---'
select string_agg(column_name || ' ' || data_type ||
                  case when is_nullable='NO' then ' NOT NULL' else '' end,
                  ', ' order by ordinal_position) as 컬럼
  from information_schema.columns
 where table_schema='public' and table_name='rate_vehicle_extra_fees';

\echo ''
\echo '--- ⑭-c insurance_rate_settings 컬럼 (🔴 차급별인가) ---'
select string_agg(column_name || ' ' || data_type, ', ' order by ordinal_position) as 컬럼
  from information_schema.columns
 where table_schema='public' and table_name='insurance_rate_settings';

\echo ''
\echo '--- ⑭-d rate_surcharges 컬럼 (🔴 차급별인가) ---'
select string_agg(column_name || ' ' || data_type, ', ' order by ordinal_position) as 컬럼
  from information_schema.columns
 where table_schema='public' and table_name='rate_surcharges';
\echo ''

\echo ''
\echo '=== ⑮ 목록 화면 무게 (페이지네이션 차수) ============================='
\echo '--- ⑮-a 화주 목록이 한 번에 그리는 행수 ---'
-- 🔴 여기가 「540건을 한 번에 그린다」의 근거다. `활성화주` 는 /admin/customers 가
--    `.in(status, …)` 로 서버에서 이미 거르는 수이고, `전체` 는 /admin/companies 가
--    조건 없이 받아오는 수다.
select
  (select count(*) from companies)                                        as 전체화주,
  (select count(*) from companies
    where status in ('견적요청','견적발송','첫거래완료','재거래발생','반복화주','월정산화주'))
                                                                          as 활성화주;

\echo ''
\echo '--- ⑮-b /admin/customers 가 곁다리로 긁는 표 ---'
-- 🔴 그 화면은 화주별 「최근 배차상태」 한 칸을 채우려고 **배차 전체**를 받아서
--    JS 로 접는다(limit 없음). 이 수가 화주 수보다 훨씬 크면 페이지네이션으로도
--    안 줄어드는 무게라는 뜻이다.
select
  (select count(*) from dispatches)                                       as 배차_전체,
  (select count(*) from orders)                                           as 오더_전체,
  (select count(*) from customer_accounts where is_active)                as 포털계정_활성;
\echo ''

\echo ''
\echo '=== ⑯ 🔴 35차 착수 전 실측 (내부 정합 — 오더·배차·정산) ================='
-- 🔴 지시서 §1 착수 전 확인 1·5·6·7번의 근거다. 전부 **읽기 전용**이고
--    화주명·차주명·직원명·연락처는 한 글자도 찍지 않는다(32차 규칙 —
--    이 저장소와 Actions 로그는 공개다). 건수·금액대·컬럼 이름만 본다.

\echo ''
\echo '--- ⑯-a 🔴 1번: 정산 건이 배차 운임보다 먼저 만들어졌는가 (원칙 47) ---'
-- invoices 의 금액은 생성 시점 스냅샷이고 그 뒤 배차에서 운임을 고쳐도 안 따라온다.
-- 「차주지급액이 표시가 안 된다」의 가장 유력한 원인이 이것이다.
select
  count(*)                                                        as invoice_전체,
  count(*) filter (where i.driver_payout_total is null)           as 차주지급_빈칸,
  count(*) filter (where i.customer_charge_total is null)          as 화주청구_빈칸,
  count(*) filter (where i.driver_payout_total is null
                     and coalesce(d.driver_payout, 0) > 0)         as 배차엔있는데_정산은빈칸,
  count(*) filter (where i.driver_payout_total is not null
                     and coalesce(d.driver_payout, 0) > 0
                     and i.driver_payout_total <> d.driver_payout) as 금액이_서로다름
from invoices i
left join orders o on o.id = i.order_id
left join dispatches d on d.order_id = o.id;

\echo ''
\echo '--- ⑯-b 그 건들의 시각 관계 (누가 먼저 만들어졌나 · 금액만) ---'
select
  i.billing_period                                   as 정산월,
  i.status                                           as 정산상태,
  coalesce(i.collection_method, '(빈칸)')            as 수금방식,
  i.driver_payout_total                              as 정산_차주지급,
  d.driver_payout                                    as 배차_차주지급,
  (i.created_at < d.updated_at)                      as 정산이_먼저,
  i.locked                                           as 잠김
from invoices i
join orders o on o.id = i.order_id
join dispatches d on d.order_id = o.id
where i.driver_payout_total is distinct from d.driver_payout
order by i.created_at desc
limit 20;

\echo ''
\echo '--- ⑯-c 🔴 1번: 정산확정을 막는 두 게이트에 걸리는 건 (선착불만) ---'
-- app/admin/invoices/[id]/page.tsx handleConfirmSettlement
--   ① 수수료 > 0 인데 입금완료 미체크    ② 수수료 = 0 인데 지급자가 '면제' 가 아님
select
  count(*)                                                                   as 선착불_전체,
  count(*) filter (where coalesce(brokerage_fee,0) > 0
                     and coalesce(brokerage_fee_paid,false) = false)          as 게이트1_입금미체크,
  count(*) filter (where coalesce(brokerage_fee,0) = 0
                     and coalesce(brokerage_fee_payer,'') <> 'waived')        as 게이트2_면제아님,
  count(*) filter (where locked)                                             as 이미확정
from invoices
where collection_method = 'driver_direct';

\echo ''
\echo '--- ⑯-d 확정 버튼을 볼 수 있는 사람 (role 분포 · 이름 안 찍음) ---'
select role, status, count(*) as 계정수
from staff_accounts group by role, status order by role, status;

\echo ''
\echo '--- ⑯-e 🔴 5번: 마진이 몇 개인가 (dispatches.margin 의 정체) ---'
select column_name as 컬럼, is_generated as 생성컬럼, generation_expression as 계산식
from information_schema.columns
where table_name = 'dispatches'
  and column_name in ('margin','customer_charge','driver_payout','driver_base_fare',
                      'industrial_insurance_applicable','industrial_insurance_rate',
                      'industrial_insurance_base_amount','industrial_insurance_driver_share',
                      'industrial_insurance_broker_share')
order by column_name;

\echo ''
\echo '--- ⑯-f 🔴 6번: 부가세 포함/별도 컬럼이 정말 없는가 (7차에 삭제됨) ---'
select table_name as 표, column_name as 컬럼
from information_schema.columns
where table_schema = 'public' and column_name ilike '%vat%'
order by table_name, column_name;

\echo ''
\echo '--- ⑯-g 🔴 7번: 계산기를 거친 배차가 몇 건인가 ---'
select
  count(*)                                                          as 배차_전체,
  count(*) filter (where driver_base_fare is not null)               as 계산기_거침,
  count(*) filter (where industrial_insurance_applicable)            as 산재_적용대상,
  count(*) filter (where coalesce(industrial_insurance_broker_share,0) > 0) as 주선사부담_있음,
  count(*) filter (where driver_payout is not null)                  as 지급운임_입력됨
from dispatches;

\echo ''
\echo '--- ⑯-h 🔴 13번: 대시보드가 쓸 수 있는 마진 원천 ---'
select
  count(*)                                        as invoice_전체,
  count(*) filter (where commission_total is not null) as 수수료합계_있음,
  count(*) filter (where receivable_amount is not null) as 죽은컬럼_receivable,
  count(*) filter (where payable_amount is not null)    as 죽은컬럼_payable
from invoices;

\echo ''
\echo '--- ⑯-i 정산 5건 한눈에 (🔴 이름·번호 없이 플래그만) ---'
-- ⑯-a 의 「차주지급 빈칸 1건」과 ⑯-c 의 「게이트2 에 걸린 1건」이 같은 건인지 가른다.
select
  i.billing_period                                as 정산월,
  i.status                                        as 상태,
  i.locked                                        as 잠김,
  coalesce(i.collection_method,'(빈칸)')          as 수금방식,
  (i.customer_charge_total is not null)           as 화주청구_있음,
  (i.driver_payout_total is not null)             as 차주지급_있음,
  coalesce(i.brokerage_fee,0)                     as 수수료,
  coalesce(i.brokerage_fee_payer,'(빈칸)')        as 지급자,
  coalesce(i.brokerage_fee_paid,false)            as 입금완료,
  (exists (select 1 from orders o join dispatches d on d.order_id = o.id
            where o.id = i.order_id))             as 배차있음
from invoices i
order by i.created_at;

\echo ''
\echo '--- ⑯-j 배차 6건 한눈에 (🔴 정산 건이 아예 없는 배차를 찾는다) ---'
-- invoices 5건 < dispatches 6건 이라 정산이 아예 안 만들어진 배차가 있다.
-- 「정산관리에서 표시가 안 된다」의 또 다른 후보다(스냅샷 문제와 원인이 다르다).
select
  d.dispatch_status                                   as 배차상태,
  coalesce(d.collection_method,'(빈칸)')              as 수금방식,
  (d.customer_charge is not null)                     as 청구운임_입력,
  (d.driver_payout is not null)                       as 지급운임_입력,
  (d.driver_base_fare is not null)                    as 계산기_거침,
  (o.id is not null)                                  as 오더연결,
  (exists (select 1 from invoices i where i.order_id = d.order_id)) as 정산건_있음,
  (d.updated_at > coalesce((select max(i.created_at) from invoices i
                             where i.order_id = d.order_id), d.created_at))
                                                      as 정산뒤에_배차수정됨
from dispatches d
left join orders o on o.id = d.order_id
order by d.created_at;

\echo ''
\echo '--- ⑯-k 🔴 원칙 27번: 새 컬럼을 넣기 전에 이미 있는지 본다 ---'
select table_name as 표,
       string_agg(column_name, ', ' order by ordinal_position) as 컬럼
from information_schema.columns
where table_schema = 'public' and table_name in ('orders','dispatches','invoices')
group by table_name order by table_name;

\echo ''
\echo '════════ ⑰ 36차 착수 전 확인 (읽기 전용) ════════'
\echo '🔴 이 저장소는 public 이다 — 화주 이름·사업자등록번호를 뽑지 않는다. 건수와 플래그만.'

\echo ''
\echo '--- ⑰-a 🔴 확인 1: companies 의 거래조건 관련 컬럼이 이미 있는가 ---'
select column_name as 컬럼, data_type as 타입,
       coalesce(column_default,'(없음)') as 기본값, is_nullable as null허용
from information_schema.columns
where table_schema = 'public' and table_name = 'companies'
  and column_name in ('billing_cutoff_day','payment_terms','billing_cycle',
                      'payment_due_basis','payment_due_value','credit_limit',
                      'tax_invoice_method','outstanding_amount')
order by column_name;

\echo ''
\echo '--- ⑰-b 🔴 확인 1·5: 화주 행 수와 거래조건 채움 현황 ---'
select
  count(*)                                                     as 화주_전체,
  count(*) filter (where status <> '거래중단')                 as 거래중단_아님,
  count(*) filter (where billing_cutoff_day is not null)       as 마감일_채워짐,
  count(*) filter (where coalesce(payment_terms,'') <> '')     as 결제조건_채워짐,
  count(*) filter (where coalesce(outstanding_amount,0) <> 0)  as 미수금_0아님
from companies;

\echo ''
\echo '--- ⑰-c 확인 5: 활성 화주(정산 실적이 있는 화주) 수 ---'
select count(distinct company_id) as 정산실적_있는_화주 from invoices where company_id is not null;

\echo ''
\echo '--- ⑰-d 🔴 확인 10: 선착불 정산 건의 실제 값 (이름 없이 플래그·금액만) ---'
select
  coalesce(i.collection_method,'(빈칸)')        as 수금방식,
  i.payment_received                            as 화주입금완료,
  coalesce(i.customer_charge_total,0)           as 화주청구액,
  coalesce(i.receivable_amount,-1)              as 받을돈,   -- -1 = null(옛 건)
  coalesce(i.brokerage_fee,0)                   as 주선수수료,
  coalesce(i.brokerage_fee_paid,false)          as 수수료입금완료,
  i.created_at::date                            as 생성일
from invoices i
order by i.collection_method nulls first, i.created_at;

\echo ''
\echo '--- ⑰-e 🔴 확인 9: 화주별 미수금 — 저장값 vs 두 공식 ---'
-- A = 지금 「신규 정산 등록」이 쓰는 식(customer_charge_total, 폴백 없음)
-- B = 35차가 고친 「입금완료 체크」가 쓰는 식(receivable_amount ?? customer_charge_total)
-- C = 선착불을 화주 미수금에서 뺀 식(= 36차 C장이 맞다고 보는 값)
select
  c.id::text = c.id::text                       as _,   -- 이름을 안 뽑기 위한 자리
  coalesce(c.outstanding_amount,0)              as 저장된_미수금,
  coalesce(sum(case when not i.payment_received then coalesce(i.customer_charge_total,0) end),0) as 식A_청구액,
  coalesce(sum(case when not i.payment_received then coalesce(i.receivable_amount, i.customer_charge_total,0) end),0) as 식B_받을돈,
  coalesce(sum(case when not i.payment_received and coalesce(i.collection_method,'broker') <> 'driver_direct'
                    then coalesce(i.receivable_amount, i.customer_charge_total,0) end),0) as 식C_선착불제외
from companies c
join invoices i on i.company_id = c.id
group by c.id, c.outstanding_amount
having coalesce(c.outstanding_amount,0) <> 0
    or coalesce(sum(case when not i.payment_received then coalesce(i.customer_charge_total,0) end),0) <> 0
order by 2 desc;

\echo ''
\echo '--- ⑰-f 🔴 확인 15: quotes 의 금액 구성요소가 각각 저장돼 있는가 ---'
select
  count(*)                                                        as 견적_전체,
  count(*) filter (where base_fare is not null)                   as 기본운임_있음,
  count(*) filter (where surcharge_amount is not null)            as 가산합계_있음,
  count(*) filter (where coalesce(discount_amount,0) <> 0)        as 할인컬럼_0아님,
  count(*) filter (where final_amount is not null)                as 최종금액_있음,
  count(*) filter (where exists (select 1 from quote_items qi where qi.quote_id = q.id)) as 항목행_있음
from quotes q;

\echo ''
\echo '--- ⑰-g 🔴 확인 15·16: 「직접 입력」으로 줄 합이 안 맞는 견적이 몇 건인가 ---'
-- 조정 = final_amount − (base_fare + Σ quote_items.amount)
select
  count(*)                                   as 견적_전체,
  count(*) filter (where 조정 = 0)           as 조정_0,
  count(*) filter (where 조정 < 0)           as 조정_감액,
  count(*) filter (where 조정 > 0)           as 조정_증액,
  coalesce(min(조정),0)                      as 최소조정,
  coalesce(max(조정),0)                      as 최대조정
from (
  select q.id,
         coalesce(q.final_amount,0)
           - (coalesce(q.base_fare,0)
              + coalesce((select sum(qi.amount) from quote_items qi where qi.quote_id = q.id),0)) as 조정
  from quotes q
) t;

\echo ''
\echo '--- ⑰-h 확인 6: portal_order_requests 컬럼 수와 정산 3컬럼 ---'
select count(*) as 컬럼수 from information_schema.columns
where table_schema='public' and table_name='portal_order_requests';
select column_name as 컬럼, coalesce(column_default,'(없음)') as 기본값, is_nullable as null허용
from information_schema.columns
where table_schema='public' and table_name='portal_order_requests'
  and column_name in ('collection_method','direct_collection_point','dropoff_arrival_type','billing_cycle','requested_billing_cycle')
order by column_name;

\echo ''
\echo '=== ⑯ 🔴 quotes 전체 컬럼 (36차 PR 2 — 견적서 공유 링크) =='
--   🔴 왜 전체 목록인가. 공유 링크 API 가 컬럼을 **손으로 열거**해서 조회하는데,
--      `quotes` 는 상차조건·차량형태·운송시간 같은 값을 **`selected_options`(jsonb)**
--      안에 한글 키로 담는다(orders 는 반대로 flat 컬럼). 그래서 있을 것 같은
--      이름(`trip_type`·`transport_time` 등)이 실제로는 없을 수 있고, 없는 컬럼을
--      select 하면 PostgREST 가 42703 을 돌려준다 — 원칙 55번대로 error 를 받지
--      않으면 그것이 **「견적서를 찾을 수 없습니다」(404)** 로 둔갑한다.
select string_agg(column_name, ', ' order by ordinal_position) as 컬럼
  from information_schema.columns
 where table_schema = 'public' and table_name = 'quotes';

\echo ''
\echo '--- ⑯-b 공유 토큰 발급 현황 (🔴 토큰 값 자체는 찍지 않는다 — 열쇠다) ---'
select count(*)                                              as 견적_전체,
       count(*) filter (where share_token is not null)        as 토큰_발급,
       count(*) filter (where share_token is not null
                          and company_id is not null)         as "발급_회사건",
       count(*) filter (where share_token is not null
                          and company_id is null)             as "발급_게스트건"
  from quotes;

\echo ''
\echo '--- ⑯-c 토큰 발급 건의 연락처 유무 (🔴 번호 자체는 찍지 않는다) ---'
--   뒤 4자리 확인은 「문자를 받은 그 번호」와 대조한다 — 그 번호가 null 이면
--   무엇을 입력해도 통과할 수 없다. 그 상태가 실제로 있는지 본다.
select q.id is not null                                       as _dummy,
       count(*)                                               as 토큰_발급건,
       count(*) filter (where c.contact_mobile is not null)    as 회사담당자번호_있음,
       count(*) filter (where q.guest_phone is not null)       as 게스트번호_있음,
       count(*) filter (where coalesce(c.contact_mobile, q.guest_phone) is null)
                                                              as "🔴 번호없음_확인불가"
  from quotes q
  left join companies c on c.id = q.company_id
 where q.share_token is not null
 group by 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- ⑱ 월정산 묶음 실태 (2026-09-15 · 사용자 신고 「정보나 방식이 애매하다」)
--
--   ⚠️ 활성 항목 판정은 `is_active` 가 아니라 **`released_at is null`** 이다
--      (화면 `loadActiveItems()` 와 같은 조건). 처음에 `is_active` 로 적었다가
--      42703 으로 멈췄다 — **컬럼은 짐작하지 말 것**(원칙 55번과 같은 자리).
--
--   🔴 **묶음 로직은 이 저장소에 없다** — `create_billing_batch` 등 DB 함수는
--      마이그레이션 자동화(47차) 이전인 14차 세션에 만들어져 **DB 에만 있다.**
--      그래서 함수 목록·정의 유무를 여기서 확인한다.
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '--- ⑱-a 월정산 대상이 실제로 얼마나 있나 ---'
select count(*)                                                  as 정산건_전체,
       count(*) filter (where billing_cycle = 'monthly')          as 월정산건,
       count(*) filter (where billing_cycle = 'monthly'
                          and company_id is not null)             as 월정산_회사건,
       count(*) filter (where billing_cycle = 'per_order')        as 건별,
       count(*) filter (where billing_cycle is null)              as 미지정
  from invoices;

\echo ''
\echo '--- ⑱-b 만들어진 묶음 ---'
select count(*)                                                  as 묶음_전체,
       count(*) filter (where batch_status = 'draft')             as 작성중,
       count(*) filter (where batch_status = 'confirmed')         as 확정,
       count(*) filter (where batch_status = 'cancelled')         as 취소,
       count(*) filter (where payment_due_date is not null)       as 결제일_입력됨,
       count(*) filter (where payment_status = 'overdue')         as 연체표시,
       count(*) filter (where payment_status = 'paid')            as 입금완료
  from customer_billing_batches;

\echo ''
\echo '--- ⑱-c 🔴 묶음에 안 담긴 월정산 정산 건 (자동 생성이 없어서 생기는 자리) ---'
select count(*)                                                  as 월정산건_묶음없음
  from invoices i
 where i.billing_cycle = 'monthly'
   and not exists (select 1 from customer_billing_batch_items bi
                    where bi.invoice_id = i.id and bi.released_at is null);

\echo ''
\echo '--- ⑱-d 결제일 설정을 가진 화주 (36차 A장 · 묶음이 이 값을 읽는지 보려고) ---'
select count(*)                                                  as 화주_전체,
       count(*) filter (where payment_due_basis is not null)      as 결제일기준_설정,
       count(*) filter (where payment_due_value is not null)      as 결제일값_설정,
       count(*) filter (where billing_cycle_default = 'monthly')  as 계약_월정산
  from companies;

\echo ''
\echo '--- ⑱-e 묶음 관련 DB 함수 목록 (저장소에 없는 로직) ---'
select p.proname                                                 as 함수명,
       pg_get_function_identity_arguments(p.oid)                 as 인자
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and (p.proname like '%billing_batch%' or p.proname like '%batch%')
 order by 1;

\echo ''
\echo '--- ⑱-f 묶음 표의 컬럼 (화면이 무엇을 그릴 수 있는지) ---'
select table_name, column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('customer_billing_batches', 'customer_billing_batch_items')
 order by table_name, ordinal_position;

-- ─────────────────────────────────────────────────────────────────────────────
-- ⑲ 묶음 DB 함수의 실제 본문 (2026-09-15 · 월정산 묶음 개편 착수 전)
--
-- 🔴 **묶음 로직 12개가 저장소에 없다**(14차 산출물 · 마이그레이션 자동화 47차보다
--    먼저 만들어졌다). 그래서 앱에서 그 함수를 조합해 쓰려면 **상태 가드가 무엇인지**
--    를 짐작하지 않고 실제로 읽어야 한다.
--
-- 🔴 이 절을 만든 직접적인 이유 — 연체 자동 판정이 `payment_status` 를
--    `'unpaid'` → `'overdue'` 로 바꾸는데, 입금완료 함수가 `'unpaid'` 만 받도록
--    적혀 있으면 **연체가 붙는 순간 입금완료 버튼이 막힌다.** 붙이기 전에 재야 한다.
--
-- 🟢 본문에는 고객 정보가 없다(로직뿐) — 공개 저장소에 찍어도 되는 것은 앱 소스와 같다.
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '--- ⑲-a payment_status / batch_status CHECK 제약 (허용값) ---'
select conname as 제약명, pg_get_constraintdef(oid) as 정의
  from pg_constraint
 where conrelid = 'customer_billing_batches'::regclass
   and contype = 'c'
 order by conname;

\echo ''
\echo '--- ⑲-b 상태를 만지는 함수 4개의 본문 ---'
select p.proname as 함수명, pg_get_functiondef(p.oid) as 본문
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('mark_billing_batch_payment_received',
                     'set_billing_batch_payment_due_date',
                     'release_billing_batch',
                     'add_item_to_billing_batch')
 order by p.proname;

\echo ''
\echo '--- ⑲-c create_billing_batch 본문 (같은 기간에 두 번 만들면 어떻게 되는가) ---'
select pg_get_functiondef(p.oid) as 본문
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'create_billing_batch';

-- ─────────────────────────────────────────────────────────────────────────────
-- ⑳ 🔴 「담기가 안 된다」 실측 (2026-09-15 · 실사용 리뷰 5라운드)
--
-- 🔴 **왜 이 절이 필요한가** — 「담기를 눌러도 담기지 않는다」를 세 번 받는 동안
--    나는 화면 쪽 원인만 고쳤다(오류 위치 · 빈 렌더 · 오래된 클로저). 전부 실재하는
--    결함이었지만 **운영 DB 의 그 행이 실제로 어느 관문에 걸리는지는 한 번도 재지
--    않았다.** 목(mock)으로는 통과하는데 운영에서 막히면 목이 헐거운 것이다(원칙 56번).
--
-- 🔴 `add_item_to_billing_batch` 의 관문을 **행마다 그대로 다시 계산해서** 어디서
--    걸리는지 이름으로 찍는다. 짐작하지 않기 위한 절이다.
--
-- 🟢 공개 저장소다 — **화주명·오더번호를 찍지 않는다.** id 는 앞 8자만.
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '--- ⑳-a is_billing_batch_candidate() 본문 (무엇을 후보로 보는가) ---'
select pg_get_functiondef(p.oid) as 본문
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'is_billing_batch_candidate';

\echo ''
\echo '--- ⑳-b 아직 묶음에 안 담긴 월정산 정산 건의 관문별 판정 ---'
select left(i.id::text, 8)                                   as 정산건,
       i.billing_period                                      as 저장된_정산월,
       i.settlement_reference_date                           as 정산기준일,
       i.status                                              as 상태,
       i.customer_charge_total                               as 청구금액,
       coalesce(i.locked, false)                             as 잠김,
       coalesce(i.customer_side_locked, false)               as 화주측잠김,
       public.is_billing_batch_candidate(i.*)                as 후보인가,
       -- 🔴 이 셋 중 하나라도 false/true 로 걸리면 add_item 이 거절한다
       case
         when coalesce(i.customer_side_locked, false) then 'already_customer_side_locked'
         when coalesce(i.locked, false)               then 'invoice_locked'
         when i.customer_charge_total is null
           or i.customer_charge_total <= 0            then 'amount_not_finalized'
         when not public.is_billing_batch_candidate(i.*) then 'invoice_no_longer_eligible'
         else '(통과 — 담길 수 있어야 한다)'
       end                                                   as 예상_거절사유
  from invoices i
 where i.billing_cycle = 'monthly'
   and i.collection_method = 'broker'
   and not exists (
     select 1 from customer_billing_batch_items bi
      where bi.invoice_id = i.id and bi.released_at is null
   )
 order by i.settlement_reference_date nulls last;

\echo ''
\echo '--- ⑳-c 후보 뷰에 실제로 보이는 행 (화면이 「담기」를 그리는 근거) ---'
select left(invoice_id::text, 8) as 정산건,
       billing_period            as 저장된_정산월,
       settlement_reference_date as 정산기준일,
       customer_charge_total     as 청구금액
  from customer_billing_batch_candidates
 order by settlement_reference_date nulls last;

\echo ''
\echo '--- ⑳-d 그 화주들의 같은 달 묶음 상태 (auto-attach 가 건너뛰는 조건) ---'
select left(b.id::text, 8)  as 묶음,
       b.period_start, b.period_end,
       b.batch_status       as 상태,
       b.payment_status     as 입금,
       (select count(*) from customer_billing_batch_items x
         where x.batch_id = b.id and x.released_at is null) as 담긴건수
  from customer_billing_batches b
 order by b.period_end desc, b.created_at desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- ㉑ 🔴 add_item_to_billing_batch 를 **실제로 불러보고 되돌린다** (2026-09-15)
--
-- 🔴 ⑳ 에서 「관문은 전부 통과한다」가 나왔는데도 담긴 건수가 0이다. 그렇다면
--    막히는 곳은 **DB 가 아니라 그 앞(HTTP·인증·서버 키)**일 수 있다. 둘을 가르려면
--    DB 함수를 **직접 불러보는 수밖에 없다.**
--
-- 🔴 **아무것도 저장하지 않는다** — 안쪽 블록에서 일부러 예외를 던져 되돌린다
--    (plpgsql 의 `begin/exception` 이 savepoint 라 그 안의 insert 가 취소된다).
--    🔴 이 되돌리기를 빼지 말 것. 빼면 운영 데이터에 실제로 항목이 들어간다.
-- ─────────────────────────────────────────────────────────────────────────────
\echo ''
\echo '--- ㉑ add_item 시뮬레이션 (저장하지 않음) ---'
do $$
declare
  v_batch   uuid;
  v_company uuid;
  v_inv     uuid;
  v_result  jsonb;
begin
  select id, company_id into v_batch, v_company
    from customer_billing_batches
   where batch_status = 'draft'
   order by created_at desc
   limit 1;

  if v_batch is null then
    raise notice '작성 중 묶음이 없다 — 시뮬레이션 건너뜀';
    return;
  end if;

  select i.id into v_inv
    from invoices i
   where i.company_id = v_company
     and i.billing_cycle = 'monthly'
     and i.collection_method = 'broker'
     and not exists (select 1 from customer_billing_batch_items bi
                      where bi.invoice_id = i.id and bi.released_at is null)
   limit 1;

  if v_inv is null then
    raise notice '🔴 그 묶음의 화주(%)에는 담을 후보가 없다 — 후보 2건은 **다른 화주**의 것이다',
      left(v_company::text, 8);
    return;
  end if;

  begin
    v_result := public.add_item_to_billing_batch(v_batch, v_inv);
    raise notice '🔴 DB 판정: %', v_result;
    raise exception using errcode = '22000', message = 'intentional-rollback';
  exception
    when sqlstate '22000' then
      raise notice '되돌렸다 — 아무것도 저장하지 않았다';
  end;
end $$;
