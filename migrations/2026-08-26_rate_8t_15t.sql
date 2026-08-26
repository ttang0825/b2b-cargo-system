-- 22차 — 8톤·15톤 신설: rate_distance_tiers 30행 + rate_vehicle_extra_fees 2행
--
-- 🔴 이 파일은 GitHub Actions "DB 마이그레이션" 워크플로가 실행합니다(47차).
--    begin;/commit; 을 쓰지 않습니다(워크플로가 --single-transaction).
--
-- 🔴 **이 파일을 둘로 쪼개지 마십시오.** 차급을 넣고 대기료(rate_vehicle_extra_fees)를
--    빠뜨리면 그 차급 견적에서 대기료가 **조용히 0원**이 됩니다 — 예외도 경고도 없이
--    가산만 빠집니다(16차에 5톤급이 실제로 그 상태였습니다).
--
--
-- ── 왜 넣는가 ────────────────────────────────────────────────────────
--
--   2026-08-25 중대형 실거래 **114건** 중 **36건(32%)**이 우리 표에 없는 차급이었습니다
--   — 8톤 13 · 9.5톤 5 · 14톤 12 · 15톤 6.
--   한국 화물시장 표준 차급은 `1 / 1.4 / 2.5 / 3.5 / 5 / 5톤축 / 8 / 11 / 15 / 18 / 25`
--   이고 **v8이 8톤과 15톤을 빠뜨렸습니다.** 둘을 넣으면 커버율 **100%**가 됩니다
--   (9.5톤 → 8톤, 14톤 → 15톤으로 흡수).
--
--   지금은 15톤이 필요한 화주가 11톤이나 18톤으로 고릅니다. 11톤으로 고르면 실제로는
--   15톤 차를 잡아야 하는데 견적이 낮아 **마진이 깎이고**, 18톤으로 고르면 **비쌉니다.**
--
--
-- ── 🔴 값의 근거 등급: D (보간) ──────────────────────────────────────
--
--   8톤  = (5톤 플러스/축 + 11톤) / 2,  천원 반올림
--   15톤 = (11톤 + 18톤 조정후) / 2,    천원 반올림
--   ⚠️ 15톤은 **같은 날 조정한 18톤 값을 근거로 삼습니다**
--      (`2026-08-26_rate_18t_adjust.sql`. 파일명 순서상 그 파일이 먼저 실행됩니다).
--
--   ⚠️ 🟢 **8톤은 실측과 잘 맞습니다** — 실거래 역산(완료 5건) 중앙값 193,000 이고
--      아래 표의 8톤 30~110km 구간이 187,000~211,000 입니다.
--   ⚠️ 🔴 **15톤은 완료 표본이 1건**이라 사실상 검증되지 않았습니다.
--      **투입 후 관찰 대상입니다.** 실거래가 쌓이면 다시 볼 것.
--
--   신설분 (단위 천원)
--     구간        5톤+    [8톤]   11톤   [15톤]   18톤    25톤
--     10km 이내    133     151     169     176     182     217
--     20km 이내    145     163     181     187     193     241
--     30km 이내    157     175     193     204     214     265
--     60km 이내    169     187     205     215     225     277
--     90km 이내    181     199     217     232     247     301
--    110km 이내    193     211     229     248     268     325
--    130km 이내    205     223     241     260     279     337
--    150km 이내    217     247     277     288     300     361
--    170km 이내    241     265     289     300     311     373
--    200km 이내    277     301     325     333     341     386
--    250km 이내    301     350     398     408     418     506
--    300km 이내    361     404     446     464     482     578
--    350km 이내    437     470     504     535     566     702
--    400km 이내    506     556     607     644     682     839
--    400km 초과    578     636     694     740     785     954
--
--
-- ⚠️ 차급 문자열은 `"8톤"` · `"15톤"` 입니다. `lib/constants.ts` 의 `VEHICLE_TYPES_ALL`
--    과 **완전일치**해야 합니다 — 견적 자동산출이 문자열 완전일치로 매칭하므로
--    한 글자만 달라도 그 차급 계산 패널이 통째로 사라집니다.
-- ⚠️ `400km 초과` 행의 `distance_to_km` 은 **null** 입니다. 15차 매칭이
--    `distance_to_km === null` 을 "상한 없는 마지막 구간"으로 처리합니다.
-- 🔴 INSERT 라 두 번 돌리면 중복 행이 생깁니다(이 표에 유니크 제약이 없습니다).
--    그래서 아래 ①이 재실행을 막습니다.


-- ① 재실행 방지 — 이미 들어간 8/15톤이 있으면 멈춘다
do $$
declare n int; v int;
begin
  select count(*) into n from rate_distance_tiers where vehicle_type in ('8톤','15톤');
  if n <> 0 then
    raise exception '이미 들어간 8/15톤 행이 있다: %행. 중단한다(중복 INSERT 방지).', n;
  end if;

  select count(*) into n from rate_vehicle_extra_fees where vehicle_type in ('8톤','15톤');
  if n <> 0 then
    raise exception '이미 들어간 8/15톤 가산기준 행이 있다: %행. 중단한다.', n;
  end if;

  -- 보간의 근거가 되는 18톤이 조정된 뒤인가 (같은 날 앞 파일)
  select base_fare into v from rate_distance_tiers
   where vehicle_type = '18톤' and distance_label = '10km 이내';
  if v <> 182000 then
    raise exception '18톤 10km 이 182,000 이 아니다: % — 18톤 조정 파일이 먼저 반영돼야 한다.', v;
  end if;
end $$;


-- ② 30행 INSERT
with ins as (
  insert into rate_distance_tiers
    (distance_label, distance_from_km, distance_to_km, vehicle_type, base_fare)
  values
    ('10km 이내',   0,  10,  '8톤', 151000), ('10km 이내',   0,  10,  '15톤', 176000),
    ('20km 이내',  11,  20,  '8톤', 163000), ('20km 이내',  11,  20,  '15톤', 187000),
    ('30km 이내',  21,  30,  '8톤', 175000), ('30km 이내',  21,  30,  '15톤', 204000),
    ('60km 이내',  31,  60,  '8톤', 187000), ('60km 이내',  31,  60,  '15톤', 215000),
    ('90km 이내',  61,  90,  '8톤', 199000), ('90km 이내',  61,  90,  '15톤', 232000),
    ('110km 이내', 91, 110,  '8톤', 211000), ('110km 이내', 91, 110,  '15톤', 248000),
    ('130km 이내',111, 130,  '8톤', 223000), ('130km 이내',111, 130,  '15톤', 260000),
    ('150km 이내',131, 150,  '8톤', 247000), ('150km 이내',131, 150,  '15톤', 288000),
    ('170km 이내',151, 170,  '8톤', 265000), ('170km 이내',151, 170,  '15톤', 300000),
    ('200km 이내',171, 200,  '8톤', 301000), ('200km 이내',171, 200,  '15톤', 333000),
    ('250km 이내',201, 250,  '8톤', 350000), ('250km 이내',201, 250,  '15톤', 408000),
    ('300km 이내',251, 300,  '8톤', 404000), ('300km 이내',251, 300,  '15톤', 464000),
    ('350km 이내',301, 350,  '8톤', 470000), ('350km 이내',301, 350,  '15톤', 535000),
    ('400km 이내',351, 400,  '8톤', 556000), ('400km 이내',351, 400,  '15톤', 644000),
    ('400km 초과',401, null, '8톤', 636000), ('400km 초과',401, null, '15톤', 740000)
  returning 1
)
select count(*) as 반영된_행수 from ins;


-- ③ 대기료·경유지 2행 INSERT — 🔴 위 ②와 반드시 같은 파일에 있어야 한다
--    8톤  : 5톤+(25,000/50,000)과 11톤(30,000/60,000) 사이
--    15톤 : 11톤(30,000/60,000)과 18톤(35,000/70,000) 사이
with ins as (
  insert into rate_vehicle_extra_fees
    (vehicle_type, free_waiting_minutes, waiting_fee_per_unit, waypoint_fee)
  values ('8톤',  30, 30000, 55000),
         ('15톤', 30, 35000, 65000)
  returning 1
)
select count(*) as 반영된_행수 from ins;


-- ④ 단언 — 구조
do $$
declare n int;
begin
  select count(*) into n from rate_distance_tiers;
  if n <> 165 then raise exception '총행수가 165가 아니다: %행 (135 + 30)', n; end if;

  select count(distinct vehicle_type) into n from rate_distance_tiers;
  if n <> 11 then raise exception '차급수가 11이 아니다: %', n; end if;

  select count(*) into n from (
    select vehicle_type from rate_distance_tiers group by vehicle_type having count(*) <> 15
  ) s;
  if n <> 0 then raise exception '구간수가 15가 아닌 차급이 있다: %개', n; end if;

  select count(*) into n from rate_distance_tiers where base_fare % 1000 <> 0;
  if n <> 0 then raise exception '천원 단위가 아닌 행이 있다: %행', n; end if;

  select count(*) into n from rate_distance_tiers
   where distance_label = '400km 초과' and distance_to_km is not null;
  if n <> 0 then raise exception '400km 초과인데 상한이 있는 행이 있다: %행', n; end if;

  select count(*) into n from rate_vehicle_extra_fees;
  if n <> 11 then raise exception '가산기준이 11행이 아니다: %행', n; end if;

  select count(*) into n from rate_vehicle_extra_fees
   where free_waiting_minutes is null or waiting_fee_per_unit is null or waypoint_fee is null;
  if n <> 0 then raise exception '가산기준에 null 이 있다: %행', n; end if;
end $$;


-- ⑤ 단언 — 🔴 11차급 통합 역전 검사 (새 차급이 중간에 끼어들므로 반드시 다시 본다)
do $$
declare n int;
begin
  -- 차급 역전: 톤수 순서대로 값이 커져야 한다
  with ord(vt, rk) as (values
    ('1톤',1),('1.4톤',2),('2.5톤',3),('3.5톤',4),('5톤',5),('5톤 플러스/축',6),
    ('8톤',7),('11톤',8),('15톤',9),('18톤',10),('25톤',11)
  )
  select count(*) into n
    from rate_distance_tiers a join ord oa on oa.vt = a.vehicle_type
    join rate_distance_tiers b on b.distance_label = a.distance_label
    join ord ob on ob.vt = b.vehicle_type
   where ob.rk = oa.rk + 1 and b.base_fare <= a.base_fare;
  if n <> 0 then raise exception '차급 역전이 있다: %개 (인접 차급끼리 값이 안 커진다)', n; end if;

  -- 거리 역전: 같은 차급에서 거리가 늘면 값도 늘어야 한다
  select count(*) into n from (
    select vehicle_type, base_fare,
           lag(base_fare) over (partition by vehicle_type order by distance_from_km) as prev
      from rate_distance_tiers
  ) s where prev is not null and base_fare <= prev;
  if n <> 0 then raise exception '거리 역전이 있다: %개', n; end if;
end $$;


-- ⑥ 단언 — 표본 (완료조건 7)
do $$
declare v int;
begin
  select base_fare into v from rate_distance_tiers where vehicle_type='8톤'  and distance_label='10km 이내';
  if v <> 151000 then raise exception '8톤 10km 이 151,000 이 아니다: %', v; end if;
  select base_fare into v from rate_distance_tiers where vehicle_type='8톤'  and distance_label='400km 초과';
  if v <> 636000 then raise exception '8톤 400km 초과가 636,000 이 아니다: %', v; end if;
  select base_fare into v from rate_distance_tiers where vehicle_type='15톤' and distance_label='60km 이내';
  if v <> 215000 then raise exception '15톤 60km 이 215,000 이 아니다: %', v; end if;
  select base_fare into v from rate_distance_tiers where vehicle_type='15톤' and distance_label='400km 초과';
  if v <> 740000 then raise exception '15톤 400km 초과가 740,000 이 아니다: %', v; end if;
  select base_fare into v from rate_distance_tiers where vehicle_type='18톤' and distance_label='200km 이내';
  if v <> 341000 then raise exception '18톤 200km 이 341,000 이 아니다: %', v; end if;
end $$;


-- ⑦ 확인용
select vehicle_type, count(*) as 구간수, min(base_fare) as 최저, max(base_fare) as 최고
  from rate_distance_tiers group by vehicle_type order by min(base_fare);
select * from rate_vehicle_extra_fees where vehicle_type in ('8톤','15톤');


-- ══════════════════════════════════════════════════════════════════════
-- 🔴 되돌리는 SQL (필요할 때만. 이 파일을 고치지 말고 아래를 새 파일에 복사할 것)
-- ══════════════════════════════════════════════════════════════════════
--
-- delete from rate_distance_tiers      where vehicle_type in ('8톤','15톤');   -- 30행
-- delete from rate_vehicle_extra_fees  where vehicle_type in ('8톤','15톤');   --  2행
--
-- ⚠️ 되돌리면 `lib/constants.ts` 의 `VEHICLE_TYPES_ALL` 에서도 두 종을 빼야 합니다.
--    배열에만 남으면 드롭다운에는 뜨는데 "운임기준이 없습니다" 가 나옵니다.
