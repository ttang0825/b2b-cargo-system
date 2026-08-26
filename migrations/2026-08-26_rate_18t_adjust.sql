-- 22차 — 18톤 15행 하향 (전 구간 ×0.89, '200km 이내'만 예외)
--
-- 🔴 이 파일은 GitHub Actions "DB 마이그레이션" 워크플로가 실행합니다(47차).
--    Supabase SQL Editor에 붙여넣지 마십시오. 워크플로가 파일 전체를
--    --single-transaction 으로 감싸므로 begin;/commit; 을 쓰지 않습니다.
--
--
-- ── 왜 내리는가 ──────────────────────────────────────────────────────
--
--   2026-08-25 중대형 실거래 **114건**(24시콜) 중 18톤 **'완료' 8건**을 역산하니
--   우리 표가 **약 13% 높았습니다.**
--
--   원인은 v8 보간식 `11톤 + 0.70 × (25톤 − 11톤)` 의 **위치계수 0.70 과대평가**입니다.
--   실측에서 18톤은 11톤과 거의 같은 가격대였습니다(차주지급 중앙값 둘 다 180,000원).
--
--   17차(46차 세션)가 이 사실을 알고도 값을 그대로 둔 이유는 "대형 오더는 드물고,
--   나오더라도 담당자가 최종금액을 수동 조정할 수 있다"였습니다.
--   🔴 **21차(51차 세션)에서 그 전제가 깨졌습니다** — 화주포털 발주요청 희망 톤수가
--   6종 → 9종이 되면서 **화주가 스스로 18톤을 요청하고 자동견적이 그대로 나갑니다.**
--
--
-- ── 🔴 '200km 이내'만 −5.5%인 이유 (되돌리지 말 것) ──────────────────
--
--   361,000 × 0.89 = 321,000 인데 **11톤이 325,000** 이라 차급 역전이 됩니다.
--   v8 원본에서 그 구간만 11톤과의 격차가 11%로 좁았기 때문입니다.
--   그래서 그 칸만 **11톤 대비 +5% 바닥**을 적용해 341,000 으로 두었습니다.
--   ⚠️ 나중에 "왜 이 칸만 다르지" 하고 ×0.89 로 맞추지 마십시오 — 역전이 되살아납니다.
--
--
-- ⚠️ 🟢 **11톤은 손대지 않습니다** — 검증됐습니다(완료 36건, 마진 중앙값 +19.6%).
-- ⚠️ **25톤도 손대지 않습니다** — 완료 3건이라 판단 불가. 관찰 대상입니다.
-- 🔴 되돌리기가 없습니다(운임 이력 테이블이 없습니다). 되돌리는 SQL 은 파일 맨 아래에.
--
--
-- ── 착수 전 확인 (2026-08-26, verify 워크플로로 운영 DB 실측) ────────
--   총 135행 / 9차급 / 15구간 · 18톤 15칸 현재값이 아래 '현행'과 전부 일치.


-- ① 대상이 15행인가
do $$
declare n int;
begin
  select count(*) into n from rate_distance_tiers where vehicle_type = '18톤';
  if n <> 15 then
    raise exception '18톤 행수가 15가 아니다: %행. 중단한다.', n;
  end if;
end $$;


-- ② 값 교체
--    현행 → 신규 (인하율)
--      10km   205,000 → 182,000  (-11.2%)      150km  337,000 → 300,000  (-11.0%)
--      20km   217,000 → 193,000  (-11.1%)      170km  349,000 → 311,000  (-10.9%)
--      30km   241,000 → 214,000  (-11.2%)      200km  361,000 → 341,000  ( -5.5%) ← 바닥
--      60km   253,000 → 225,000  (-11.1%)      250km  470,000 → 418,000  (-11.1%)
--      90km   277,000 → 247,000  (-10.8%)      300km  542,000 → 482,000  (-11.1%)
--     110km   301,000 → 268,000  (-11.0%)      350km  636,000 → 566,000  (-11.0%)
--     130km   313,000 → 279,000  (-10.9%)      400km  766,000 → 682,000  (-11.0%)
--                                              초과   882,000 → 785,000  (-11.0%)
with upd as (
  update rate_distance_tiers t set base_fare = v.f
  from (values
    ('10km 이내',  182000),
    ('20km 이내',  193000),
    ('30km 이내',  214000),
    ('60km 이내',  225000),
    ('90km 이내',  247000),
    ('110km 이내', 268000),
    ('130km 이내', 279000),
    ('150km 이내', 300000),
    ('170km 이내', 311000),
    ('200km 이내', 341000),
    ('250km 이내', 418000),
    ('300km 이내', 482000),
    ('350km 이내', 566000),
    ('400km 이내', 682000),
    ('400km 초과', 785000)
  ) as v(lab, f)
  where t.vehicle_type = '18톤' and t.distance_label = v.lab
  returning 1
)
select count(*) as 반영된_행수 from upd;


-- ③ 단언 — 15행 전부 바뀌었고 역전이 없다
do $$
declare n int;
begin
  -- 라벨이 하나라도 안 맞으면 그 행은 조용히 안 바뀐다. 신규값과 일치하는 행수로 확인.
  select count(*) into n from rate_distance_tiers
   where vehicle_type = '18톤'
     and base_fare in (182000,193000,214000,225000,247000,268000,279000,300000,
                       311000,341000,418000,482000,566000,682000,785000);
  if n <> 15 then
    raise exception '18톤 신규값과 일치하는 행이 15가 아니다: %행. 라벨 불일치를 의심할 것.', n;
  end if;

  -- 천원 단위
  select count(*) into n from rate_distance_tiers
   where vehicle_type = '18톤' and base_fare % 1000 <> 0;
  if n <> 0 then raise exception '18톤에 천원 단위가 아닌 행이 있다: %행', n; end if;

  -- 차급 역전 — 11톤 < 18톤 < 25톤 이 모든 구간에서 성립하는가
  select count(*) into n
    from rate_distance_tiers a
    join rate_distance_tiers b on b.distance_label = a.distance_label and b.vehicle_type = '11톤'
   where a.vehicle_type = '18톤' and a.base_fare <= b.base_fare;
  if n <> 0 then raise exception '18톤이 11톤 이하인 구간이 있다: %개', n; end if;

  select count(*) into n
    from rate_distance_tiers a
    join rate_distance_tiers b on b.distance_label = a.distance_label and b.vehicle_type = '25톤'
   where a.vehicle_type = '18톤' and a.base_fare >= b.base_fare;
  if n <> 0 then raise exception '18톤이 25톤 이상인 구간이 있다: %개', n; end if;

  -- 거리 역전 — 거리가 늘면 값도 늘어야 한다
  select count(*) into n from (
    select base_fare, lag(base_fare) over (order by distance_from_km) as prev
      from rate_distance_tiers where vehicle_type = '18톤'
  ) s where prev is not null and base_fare <= prev;
  if n <> 0 then raise exception '18톤에 거리 역전이 있다: %개', n; end if;
end $$;


-- ④ 기존 9차급 중 18톤 외에는 하나도 안 바뀌었는지 표본으로 확인
do $$
declare v int;
begin
  select base_fare into v from rate_distance_tiers where vehicle_type='1톤'  and distance_label='10km 이내';
  if v <> 48000 then raise exception '1톤 10km 이 48,000 이 아니다: %', v; end if;
  select base_fare into v from rate_distance_tiers where vehicle_type='11톤' and distance_label='10km 이내';
  if v <> 169000 then raise exception '11톤 10km 이 169,000 이 아니다: %', v; end if;
  select base_fare into v from rate_distance_tiers where vehicle_type='25톤' and distance_label='400km 초과';
  if v <> 954000 then raise exception '25톤 400km 초과가 954,000 이 아니다: %', v; end if;
end $$;


-- ⑤ 확인용
select distance_label, base_fare from rate_distance_tiers
 where vehicle_type = '18톤' order by distance_from_km;


-- ══════════════════════════════════════════════════════════════════════
-- 🔴 되돌리는 SQL (필요할 때만. 이 파일을 고치지 말고 아래를 새 파일에 복사할 것)
-- ══════════════════════════════════════════════════════════════════════
--
-- update rate_distance_tiers t set base_fare = v.f
-- from (values
--   ('10km 이내',205000),('20km 이내',217000),('30km 이내',241000),
--   ('60km 이내',253000),('90km 이내',277000),('110km 이내',301000),
--   ('130km 이내',313000),('150km 이내',337000),('170km 이내',349000),
--   ('200km 이내',361000),('250km 이내',470000),('300km 이내',542000),
--   ('350km 이내',636000),('400km 이내',766000),('400km 초과',882000)
-- ) as v(lab, f)
-- where t.vehicle_type = '18톤' and t.distance_label = v.lab;
