-- 차수 없음 — 다마스·라보 신설: rate_distance_tiers 30행 + rate_vehicle_extra_fees 2행
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
--   지금은 다마스·라보로 실을 짐도 담당자가 **1톤으로 견적을 냅니다.** 근거리 시내에서
--   두 차급의 실측 지급이 1톤의 0.63~0.80 이라, 1톤 값으로 받으면 화주에게 비싸고
--   차주에게는 그 값으로 안 갑니다 — 그 차이가 통째로 협상으로 넘어갑니다.
--
--
-- ── 🔴 값의 근거: 표가 정본입니다. 재계산하지 마십시오 ───────────────
--
--   🔴 **SQL·수식으로 생성하지 마십시오.** `round(one_ton * 0.90, -3)` 처럼 만들면
--      **라보 `400km 초과` 한 칸이 어긋납니다** — 285,000 × 0.90 = 256,500 이라
--      반올림 방식에 따라 256,000 / 257,000 으로 갈리고 **확정값은 256,000** 입니다.
--   ⚠️ 아래 계수는 값이 어떻게 나왔는지를 설명할 뿐 **계산식이 아닙니다**
--      (다마스 0.849~0.904 · 라보 0.875~0.952 로 구간마다 다릅니다).
--
--   화주 청구가 (부가세 별도 · 독차 · 주간 · 지게차 상하차 기준, 단위 원)
--     구간         다마스    라보    (참고) 1톤
--     10km 이내     34,000   35,000     40,000
--     20km 이내     45,000   46,000     52,000
--     30km 이내     54,000   56,000     62,000
--     60km 이내     64,000   67,000     72,000
--     90km 이내     75,000   79,000     83,000
--    110km 이내     84,000   88,000     93,000
--    130km 이내     94,000   99,000    104,000
--    150km 이내    103,000  108,000    114,000
--    170km 이내    112,000  118,000    124,000
--    200km 이내    122,000  128,000    135,000
--    250km 이내    136,000  144,000    155,000
--    300km 이내    153,000  162,000    176,000
--    350km 이내    186,000  197,000    216,000
--    400km 이내    213,000  226,000    248,000
--    400km 초과    242,000  256,000    285,000   ← 🔴 라보 256,000 (257,000 아님)
--
--   ⚠️ **10km → 20km 의 +32% / +31% 급등은 정상입니다.** 1톤의 같은 칸이
--      +30%(40,000 → 52,000)이라 그대로 물려받은 모양이고, 원인은 **1톤 10km
--      40,000 정책 고정값**입니다. 「펴자」고 하지 마십시오.
--
--
-- ── ⚠️ 두 차급은 「싼 차」가 아닙니다 — 차이는 운영 규칙으로 넘깁니다 ──
--
--   거리 통제 비교(같은 시도·같은 거리구간·1톤 완료·독차) 실측, 1톤 대비
--     근거리 ~30km    (표본 29건)   다마스 0.63   라보 0.80
--     중거리 31~200km (표본 12건)   다마스 1.00   라보 1.14   ← 🔴 1톤과 동가이거나 더 비싸다
--     장거리 201km+   (표본  2건)   다마스 0.77   라보 0.75   ← 🟡 근거 등급 D
--
--   🔴 중거리 실측(1.00 · 1.14)에 맞춰 값을 올리면 **차급 역전**이 됩니다(아래 ⑤가
--      막습니다). 근거리 실측(0.63)에 맞춰 내리면 그 구간 배차가 막힙니다.
--      그래서 **1톤 아래로 눌러 잡았고**, 차이는 배차 담당자 운영 규칙으로 넘깁니다:
--        · 지급 상한 = 청구가 ÷ 1.15  (🔴 코드로 만들지 말 것 — 아래 참고)
--        · 60~200km 는 1톤 수준 지급을 각오할 것
--        · 10km 이내는 마진이 거의 없거나 음수일 수 있음
--          (실측 지급 중앙 다마스 32,500 · 라보 35,000 vs 상한 29,565 · 30,435)
--   🟡 **장거리는 표본 2건이라 근거 등급 D 입니다** — 8톤·15톤과 같은 성격. 관찰 대상.
--
--   🔴 `base_fare` 는 **화주 청구가**입니다. 마진율 컬럼·설정 화면을 만들지 마십시오 —
--      만드는 순간 이 값의 의미가 뒤집혀 공개 게시가에 원가가 나갑니다.
--
--
-- ── 실측으로 확인하고 넣은 것 (2026-09-11, verify ⑩·⑭) ──────────────
--
--   · `rate_distance_tiers` 165행 · 11차급 · 15구간 · v11 값 · 다마스/라보 0건
--   · 🔴 **유니크 제약이 없습니다**(PRIMARY KEY (id) 뿐) — 두 번 돌면 중복 INSERT 라
--        아래 ①이 막습니다
--   · `rate_vehicle_extra_fees` 11행 · UNIQUE (vehicle_type) 있음 · null 0건
--   · `distance_from_km` 은 0/11/21/31/61/… 규칙 — 아래 ②가 같은 규칙을 따릅니다
--   · 🟢 `rate_surcharges`(가산)·`insurance_rate_settings`(산재)·
--        `mixed_loading_discount_settings`(혼적 3구간) 은 **전부 차급 무관**이라
--        이 차수에 손댈 것이 없습니다(컬럼에 vehicle_type 이 없습니다)
--
-- ⚠️ 차급 문자열은 `'다마스'` · `'라보'` 입니다. `lib/constants.ts` 의 `VEHICLE_TYPES_ALL`
--    과 **완전일치**해야 합니다 — 견적 자동산출이 문자열 완전일치로 매칭하므로
--    한 글자만 달라도 그 차급 계산 패널이 통째로 사라집니다(`if (!tierMatch) return null`).
-- ⚠️ `400km 초과` 행의 `distance_to_km` 은 **null** 입니다. 15차 매칭이
--    `distance_to_km === null` 을 "상한 없는 마지막 구간"으로 처리합니다.


-- ① 재실행 방지 — 이미 들어간 다마스/라보가 있으면 멈춘다
do $$
declare n int; v int;
begin
  select count(*) into n from rate_distance_tiers where vehicle_type in ('다마스','라보');
  if n <> 0 then
    raise exception '이미 들어간 다마스/라보 행이 있다: %행. 중단한다(중복 INSERT 방지).', n;
  end if;

  select count(*) into n from rate_vehicle_extra_fees where vehicle_type in ('다마스','라보');
  if n <> 0 then
    raise exception '이미 들어간 다마스/라보 가산기준 행이 있다: %행. 중단한다.', n;
  end if;

  select count(*) into n from rate_distance_tiers;
  if n <> 165 then raise exception '착수 전 총행수가 165가 아니다: %행 — v11 이 반영된 상태여야 한다.', n; end if;

  select count(*) into n from rate_vehicle_extra_fees;
  if n <> 11 then raise exception '착수 전 가산기준이 11행이 아니다: %행', n; end if;

  -- 값을 눌러 잡은 기준선인 1톤이 v11 값인가 (첫 칸과 마지막 칸)
  select base_fare into v from rate_distance_tiers
   where vehicle_type = '1톤' and distance_label = '10km 이내';
  if v <> 40000 then raise exception '1톤 10km 이 40,000 이 아니다: % — v11 이 먼저 반영돼야 한다.', v; end if;
  select base_fare into v from rate_distance_tiers
   where vehicle_type = '1톤' and distance_label = '400km 초과';
  if v <> 285000 then raise exception '1톤 400km 초과가 285,000 이 아니다: %', v; end if;
end $$;


-- ② 30행 INSERT
--    🔴 값을 수식으로 만들지 말 것 — 위 「값의 근거」 참고(라보 400km 초과가 어긋난다)
with ins as (
  insert into rate_distance_tiers
    (distance_label, distance_from_km, distance_to_km, vehicle_type, base_fare)
  values
    ('10km 이내',   0,  10,  '다마스',  34000), ('10km 이내',   0,  10,  '라보',  35000),
    ('20km 이내',  11,  20,  '다마스',  45000), ('20km 이내',  11,  20,  '라보',  46000),
    ('30km 이내',  21,  30,  '다마스',  54000), ('30km 이내',  21,  30,  '라보',  56000),
    ('60km 이내',  31,  60,  '다마스',  64000), ('60km 이내',  31,  60,  '라보',  67000),
    ('90km 이내',  61,  90,  '다마스',  75000), ('90km 이내',  61,  90,  '라보',  79000),
    ('110km 이내', 91, 110,  '다마스',  84000), ('110km 이내', 91, 110,  '라보',  88000),
    ('130km 이내',111, 130,  '다마스',  94000), ('130km 이내',111, 130,  '라보',  99000),
    ('150km 이내',131, 150,  '다마스', 103000), ('150km 이내',131, 150,  '라보', 108000),
    ('170km 이내',151, 170,  '다마스', 112000), ('170km 이내',151, 170,  '라보', 118000),
    ('200km 이내',171, 200,  '다마스', 122000), ('200km 이내',171, 200,  '라보', 128000),
    ('250km 이내',201, 250,  '다마스', 136000), ('250km 이내',201, 250,  '라보', 144000),
    ('300km 이내',251, 300,  '다마스', 153000), ('300km 이내',251, 300,  '라보', 162000),
    ('350km 이내',301, 350,  '다마스', 186000), ('350km 이내',301, 350,  '라보', 197000),
    ('400km 이내',351, 400,  '다마스', 213000), ('400km 이내',351, 400,  '라보', 226000),
    ('400km 초과',401, null, '다마스', 242000), ('400km 초과',401, null, '라보', 256000)
  returning 1
)
select count(*) as 반영된_행수 from ins;


-- ③ 대기료·경유지 2행 INSERT — 🔴 위 ②와 반드시 같은 파일에 있어야 한다
--    🔴 **1톤과 같은 값**이다(20분 / 10,000 / 20,000). 1톤보다 높게 잡으면 그 자체가
--       차급 역전이고, 낮추면 근거가 없다(대기·경유는 짐 무게가 아니라 시간 비용이라
--       1톤과 같은 일이다 — 위 「싼 차가 아니다」와 같은 이유).
with ins as (
  insert into rate_vehicle_extra_fees
    (vehicle_type, free_waiting_minutes, waiting_fee_per_unit, waypoint_fee)
  values ('다마스', 20, 10000, 20000),
         ('라보',   20, 10000, 20000)
  returning 1
)
select count(*) as 반영된_행수 from ins;


-- ④ 단언 — 구조
do $$
declare n int;
begin
  select count(*) into n from rate_distance_tiers;
  if n <> 195 then raise exception '총행수가 195가 아니다: %행 (165 + 30)', n; end if;

  select count(distinct vehicle_type) into n from rate_distance_tiers;
  if n <> 13 then raise exception '차급수가 13이 아니다: %', n; end if;

  select count(*) into n from (
    select vehicle_type from rate_distance_tiers group by vehicle_type having count(*) <> 15
  ) s;
  if n <> 0 then raise exception '구간수가 15가 아닌 차급이 있다: %개', n; end if;

  select count(*) into n from rate_distance_tiers where base_fare is null or base_fare <= 0;
  if n <> 0 then raise exception 'base_fare 가 비었거나 0 이하인 행이 있다: %행', n; end if;

  select count(*) into n from rate_distance_tiers where base_fare % 1000 <> 0;
  if n <> 0 then raise exception '천원 단위가 아닌 행이 있다: %행', n; end if;

  select count(*) into n from rate_distance_tiers
   where distance_label = '400km 초과' and distance_to_km is not null;
  if n <> 0 then raise exception '400km 초과인데 상한이 있는 행이 있다: %행', n; end if;

  -- 🔴 신설 30행이 기존과 같은 하한 규칙(0/11/21/…)을 따르는가
  select count(*) into n from rate_distance_tiers a
    join rate_distance_tiers b on b.distance_label = a.distance_label
   where a.vehicle_type in ('다마스','라보') and b.vehicle_type = '1톤'
     and a.distance_from_km is distinct from b.distance_from_km;
  if n <> 0 then raise exception 'distance_from_km 이 기존 행과 다른 신설 행이 있다: %행', n; end if;

  select count(*) into n from rate_vehicle_extra_fees;
  if n <> 13 then raise exception '가산기준이 13행이 아니다: %행', n; end if;

  select count(*) into n from rate_vehicle_extra_fees
   where free_waiting_minutes is null or waiting_fee_per_unit is null or waypoint_fee is null;
  if n <> 0 then raise exception '가산기준에 null 이 있다: %행', n; end if;
end $$;


-- ⑤ 단언 — 🔴 13차급 통합 역전 검사 (새 차급이 **맨 앞에** 끼어들므로 반드시 다시 본다)
--    🔴 차급을 더 넣을 때마다 아래 ord 목록을 갱신할 것 —
--       빠뜨리면 그 차급이 검사에서 **조용히** 빠진다.
do $$
declare n int;
begin
  -- 차급 역전: 톤수 순서대로 값이 커져야 한다
  with ord(vt, rk) as (values
    ('다마스',1),('라보',2),
    ('1톤',3),('1.4톤',4),('2.5톤',5),('3.5톤',6),('5톤',7),('5톤 플러스/축',8),
    ('8톤',9),('11톤',10),('15톤',11),('18톤',12),('25톤',13)
  )
  select count(*) into n
    from rate_distance_tiers a join ord oa on oa.vt = a.vehicle_type
    join rate_distance_tiers b on b.distance_label = a.distance_label
    join ord ob on ob.vt = b.vehicle_type
   where ob.rk = oa.rk + 1 and b.base_fare <= a.base_fare;
  if n <> 0 then raise exception '차급 역전이 있다: %개 (인접 차급끼리 값이 안 커진다)', n; end if;

  -- ord 목록에서 빠진 차급이 없는가 (위 검사가 조용히 건너뛰는 것을 막는다)
  with ord(vt) as (values
    ('다마스'),('라보'),('1톤'),('1.4톤'),('2.5톤'),('3.5톤'),('5톤'),('5톤 플러스/축'),
    ('8톤'),('11톤'),('15톤'),('18톤'),('25톤')
  )
  select count(*) into n from rate_distance_tiers
   where vehicle_type not in (select vt from ord);
  if n <> 0 then raise exception '역전 검사 목록에 없는 차급이 있다: %행', n; end if;

  -- 거리 역전: 같은 차급에서 거리가 늘면 값도 늘어야 한다
  select count(*) into n from (
    select vehicle_type, base_fare,
           lag(base_fare) over (partition by vehicle_type order by distance_from_km) as prev
      from rate_distance_tiers
  ) s where prev is not null and base_fare <= prev;
  if n <> 0 then raise exception '거리 역전이 있다: %개', n; end if;
end $$;


-- ⑥ 단언 — 표본 (완료조건 4·5·6)
do $$
declare v int; n int;
begin
  select base_fare into v from rate_distance_tiers where vehicle_type='다마스' and distance_label='10km 이내';
  if v <> 34000 then raise exception '다마스 10km 이 34,000 이 아니다: %', v; end if;
  select base_fare into v from rate_distance_tiers where vehicle_type='다마스' and distance_label='200km 이내';
  if v <> 122000 then raise exception '다마스 200km 이 122,000 이 아니다: %', v; end if;
  select base_fare into v from rate_distance_tiers where vehicle_type='다마스' and distance_label='400km 초과';
  if v <> 242000 then raise exception '다마스 400km 초과가 242,000 이 아니다: %', v; end if;

  select base_fare into v from rate_distance_tiers where vehicle_type='라보' and distance_label='10km 이내';
  if v <> 35000 then raise exception '라보 10km 이 35,000 이 아니다: %', v; end if;
  select base_fare into v from rate_distance_tiers where vehicle_type='라보' and distance_label='200km 이내';
  if v <> 128000 then raise exception '라보 200km 이 128,000 이 아니다: %', v; end if;
  -- 🔴 반올림 규칙이 갈리는 유일한 칸이다. 257,000 이면 누가 수식으로 다시 만든 것이다.
  select base_fare into v from rate_distance_tiers where vehicle_type='라보' and distance_label='400km 초과';
  if v <> 256000 then raise exception '라보 400km 초과가 256,000 이 아니다: % (수식으로 재생성하면 257,000 이 된다)', v; end if;

  -- 🔴 기존 165행이 한 칸도 안 바뀌었는가 — 게시 6칸으로 확인한다
  select count(*) into n from (values
    ('1톤',40000),('1.4톤',52000),('2.5톤',87000),
    ('3.5톤',100000),('5톤',115000),('5톤 플러스/축',150000)
  ) as want(vt, amt)
    join rate_distance_tiers t
      on t.vehicle_type = want.vt and t.distance_label = '10km 이내'
   where t.base_fare <> want.amt;
  if n <> 0 then raise exception '게시 6칸이 바뀌었다: %칸 — 기존 165행은 손대지 않아야 한다.', n; end if;
end $$;


-- ⑦ 확인용
select vehicle_type, count(*) as 구간수, min(base_fare) as 최저, max(base_fare) as 최고
  from rate_distance_tiers group by vehicle_type order by min(base_fare);
select vehicle_type, free_waiting_minutes, waiting_fee_per_unit, waypoint_fee
  from rate_vehicle_extra_fees order by waiting_fee_per_unit, waypoint_fee;


-- ── 🟢 되돌리기 ─────────────────────────────────────────────────────
--
--   delete from rate_distance_tiers     where vehicle_type in ('다마스','라보');
--   delete from rate_vehicle_extra_fees where vehicle_type in ('다마스','라보');
--   delete from _migrations             where filename = '2026-09-11_rate_damas_labo.sql';
--
--   🔴 되돌리면 `lib/constants.ts` 의 `VEHICLE_TYPES_ALL` 도 11종으로 되돌려야 합니다 —
--      배열에만 남아 있으면 그 차급을 고른 순간 계산 패널이 통째로 사라집니다.
--   🟢 기존 165행은 건드리지 않으므로 v11 게시가는 되돌리기와 무관합니다.
