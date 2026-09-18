-- 차수 없음 — 라보 운임을 다마스와 같은 값으로 통일 (rate_distance_tiers 15칸)
--
-- 🔴 이 파일은 GitHub Actions "DB 마이그레이션" 워크플로가 실행합니다(47차).
--    begin;/commit; 을 쓰지 않습니다(워크플로가 --single-transaction).
--
--
-- ── 사용자 지시 (2026-09-18) ─────────────────────────────────────────
--
--   *"운임기준표에서 다마스, 라보는 기본 30000원으로 정하자.
--     그 이후거리 금액도 모두 다마스기준으로 통일하자."*
--
--   🔴 **다마스 「10km 이내」는 이미 30,000 입니다**(v12 A장 · PR #156). 그래서 이
--      작업이 실제로 바꾸는 것은 **라보 15칸을 다마스 값으로 내리는 것**뿐이고,
--      다마스는 한 칸도 건드리지 않습니다.
--
--
-- ── 🔴 실측이 먼저였습니다 (verify, 2026-09-18 · run 35329286813) ────
--
--   ⑩-c 195칸 전수에서 **라보 두 칸이 5,000 배수가 아니었습니다.**
--
--     구간           마이그레이션이 넣은 값   DB 실측
--     110km 이내            85,000          **85,100**
--     400km 이내           225,000         **225,100**
--
--   ㉒-b 의 `오천배수아님_다마스라보` 가 **2** 로 떴습니다(1톤 이상 만원 배수 위반은 0).
--   `/admin/rates` 는 클릭이 곧 저장이라 **담당자가 고치다 난 100원 오타**로 보입니다.
--   🔴 **이 통일이 그 두 칸도 함께 정리합니다**(80,000 · 215,000).
--   🔴 **「85,100 이 의도한 값이었다」로 되돌리지 마십시오** — 5,000 격자(v12 A장
--      `DAMAS_LABO_ROUND_UNIT`)를 깨는 값이고, 반올림이 흡수하지 못합니다.
--
--
-- ── ⚠️ 보고한 우려 — 사용자가 알고 고른 것입니다 ─────────────────────
--
--   라보는 **다마스보다 큰 차**입니다(적재 높이 160cm 개방형 vs 110cm 밀폐형 ·
--   둘 다 500kg 이내 · 2026-09-11 사용자 확정). 그래서 지금까지 값이 한 칸씩 위였고,
--   실측 지급 중앙값도 라보가 더 높았습니다(다마스 32,500 · 라보 35,000).
--
--   🔴 그래서 **라보 배차의 마진이 줄어듭니다.** 특히 10km 이내는
--      지급 상한(= 청구가 ÷ 1.15)이 **26,087원**인데 실측 지급 중앙값이 35,000원이라
--      **역마진 구간**입니다. ⚠️ 다만 이것은 새로 생긴 문제가 아니라 **다마스가 이미
--      같은 상태**였고(v12 A장이 30,000으로 내리면서 받아들인 것), 이번에 라보가
--      같은 자리로 온 것입니다.
--
--   🔴 **「마진이 안 나오니 라보만 다시 올리자」로 되돌리지 마십시오** — 사용자 지시가
--      「다마스 기준으로 통일」입니다. 되돌리려면 먼저 물어야 합니다.
--
--
-- ── 🔴 차급 역전 검사를 완화했습니다 (같은 커밋에서 `_verify.sql` ⑥-b 도) ──
--
--   기존 검사는 `다마스 < 라보 < 1톤 < …` **엄격 증가**였습니다(v12 A장 ④ · verify ⑥-b).
--   다마스 = 라보 가 되면 그 검사가 **15칸 전부를 역전으로 잡습니다.**
--
--   🔴 **`<=` 를 전부 `<` 로 바꾸지 마십시오** — 그러면 다른 12쌍의 동가까지 통과해
--      검사가 헐거워집니다. **다마스↔라보 한 쌍만** 동가를 허용합니다(아래 ④).
--
--
-- ── 🟢 코드 변경이 0인 이유 ──────────────────────────────────────────
--
--   · 랜딩·차량안내 게시가는 **다마스·라보를 게시하지 않습니다**
--     (`lib/startPrices.ts` 의 `PUBLISHED_START_PRICE_TONS` 6종 — 1톤 ~ 5톤 플러스/축).
--     그래서 `apply` 가 끝나도 **공개 화면은 한 글자도 안 바뀝니다.**
--   · 견적 계산은 `rate_distance_tiers` 를 매번 읽습니다(하드코딩 0).
--   · 반올림 격자(`SMALL_VAN_VEHICLE_TYPES` 5,000)는 그대로입니다 — 다마스 15칸이
--     전부 5,000 배수라 복사해도 격자를 깨지 않습니다(아래 ④가 확인합니다).
--   · 대기료(`rate_vehicle_extra_fees`)는 **두 차급이 이미 같습니다**
--     (20분 무료 · 10,000원/단위 · 경유지 20,000 · 2026-09-11 신설값). 손댈 것이 없습니다.
--
--
-- ── 🔴 되돌리기 ──────────────────────────────────────────────────────
--   운임 이력 테이블이 없습니다. ① 이 만드는 백업 스냅샷이 되돌릴 유일한 수단이고,
--   복원 SQL 은 이 파일 맨 아래 주석에 있습니다.


-- ① 백업 스냅샷 — 되돌릴 유일한 수단
--    🔴 `if not exists` 라 재실행해도 **처음 값을 덮어쓰지 않습니다.**
create table if not exists _bak_rate_distance_tiers_before_labo_unify as
  select * from rate_distance_tiers;


-- ② 착수 단언 — 실측과 같은 모양인가
do $$
declare n int;
begin
  select count(*) into n from rate_distance_tiers;
  if n <> 195 then raise exception '총행수가 195가 아니다: %행. 중단한다.', n; end if;

  select count(distinct vehicle_type) into n from rate_distance_tiers;
  if n <> 13 then raise exception '차급이 13종이 아니다: %종. 중단한다.', n; end if;

  select count(distinct distance_label) into n from rate_distance_tiers;
  if n <> 15 then raise exception '구간이 15종이 아니다: %종. 중단한다.', n; end if;

  -- 🔴 차급명이 한 글자라도 다르면 그 15행이 조용히 안 바뀐다.
  select count(*) into n from rate_distance_tiers
   where vehicle_type not in ('다마스', '라보', '1톤', '1.4톤', '2.5톤', '3.5톤', '5톤', '5톤 플러스/축', '8톤', '11톤', '15톤', '18톤', '25톤');
  if n <> 0 then raise exception '예상 밖의 차급명이 %행 있다. 실측부터 다시 할 것.', n; end if;

  select count(*) into n from rate_distance_tiers where vehicle_type = '다마스';
  if n <> 15 then raise exception '다마스가 15행이 아니다: %행. 중단한다.', n; end if;
  select count(*) into n from rate_distance_tiers where vehicle_type = '라보';
  if n <> 15 then raise exception '라보가 15행이 아니다: %행. 중단한다.', n; end if;

  -- 🔴 **기준이 되는 다마스 값을 단언한다.** 이 작업은 「다마스 값으로 통일」이므로
  --    다마스가 내가 실측한 값과 다르면 사용자가 아는 값이 아니다 — 멈춘다.
  select count(*) into n
    from (values
      ('10km 이내', 30000), ('20km 이내', 40000), ('30km 이내', 50000),
      ('60km 이내', 60000), ('90km 이내', 70000), ('110km 이내', 80000),
      ('130km 이내', 90000), ('150km 이내', 100000), ('170km 이내', 110000),
      ('200km 이내', 120000), ('250km 이내', 135000), ('300km 이내', 155000),
      ('350km 이내', 185000), ('400km 이내', 215000), ('400km 초과', 240000)
    ) as want(label, fare)
    join rate_distance_tiers t
      on t.vehicle_type = '다마스' and t.distance_label = want.label
   where t.base_fare <> want.fare;
  if n <> 0 then
    raise exception '다마스 값이 실측(2026-09-18)과 다른 칸이 %칸 있다. 다시 재고 값을 확정할 것.', n;
  end if;

  -- 🟢 착수 시점 라보 위반 2칸(85,100 · 225,100)은 단언하지 않는다 — 있어도 없어도
  --    아래 ③이 덮어쓰고 ④가 결과를 확인한다.
end $$;


-- ③ 값 교체 — 라보 15칸을 같은 구간의 다마스 값으로
--    🔴 계수·수식이 아니라 **같은 표의 다마스 행을 그대로 복사**한다. 사용자 지시가
--       「다마스 기준으로 통일」이라 복사가 곧 정본이고, 두 벌로 적으면 갈린다.
with d as (
  select distance_label, base_fare
    from rate_distance_tiers where vehicle_type = '다마스'
), upd as (
  update rate_distance_tiers t
     set base_fare = d.base_fare
    from d
   where t.vehicle_type = '라보'
     and t.distance_label = d.distance_label
     and t.base_fare is distinct from d.base_fare
  returning 1
)
select count(*) as 라보_변경칸수 from upd;


-- ④ 반영 단언
do $$
declare n int;
begin
  -- (1) 라보 15칸이 다마스와 한 칸도 다르지 않은가
  select count(*) into n
    from rate_distance_tiers l
    join rate_distance_tiers d
      on d.vehicle_type = '다마스' and d.distance_label = l.distance_label
   where l.vehicle_type = '라보' and l.base_fare <> d.base_fare;
  if n <> 0 then raise exception '라보가 다마스와 다른 칸이 %칸 남았다', n; end if;

  -- (2) 격자 — 다마스·라보 5,000 배수 / 1톤 이상 10,000 배수
  --     🔴 착수 시점의 85,100 · 225,100 이 여기서 0이 되어야 한다.
  select count(*) into n from rate_distance_tiers
   where vehicle_type in ('다마스','라보') and base_fare % 5000 <> 0;
  if n <> 0 then raise exception '다마스·라보인데 5,000 배수가 아닌 행이 %행 있다', n; end if;

  select count(*) into n from rate_distance_tiers
   where vehicle_type not in ('다마스','라보') and base_fare % 10000 <> 0;
  if n <> 0 then raise exception '1톤 이상인데 만원 배수가 아닌 행이 %행 있다', n; end if;

  -- (3) 거리 역전 — 같은 차급에서 멀수록 비싸야 한다
  select count(*) into n from (
    select vehicle_type, base_fare,
           lag(base_fare) over (partition by vehicle_type
                                order by coalesce(distance_to_km, 999999)) as prev
      from rate_distance_tiers
  ) s where prev is not null and base_fare <= prev;
  if n <> 0 then raise exception '거리 역전이 %칸 있다', n; end if;

  -- (4) 차급 목록에서 빠진 차급이 있으면 멈춘다 (PR #142 ⑤ 와 같은 장치)
  select count(*) into n from rate_distance_tiers
   where vehicle_type not in ('다마스', '라보', '1톤', '1.4톤', '2.5톤', '3.5톤', '5톤', '5톤 플러스/축', '8톤', '11톤', '15톤', '18톤', '25톤');
  if n <> 0 then raise exception '역전 검사 목록에 없는 차급이 %행 있다. 목록을 갱신할 것.', n; end if;

  -- (5) 차급 역전 — 인접 차급끼리 뒤 차급이 **더 싸면** 위반
  --     🔴 다마스↔라보 한 쌍만 **동가를 허용**한다(이 차수가 그렇게 만들었다).
  --        나머지 11쌍은 엄격 증가 그대로다 — `<=` 를 전부 `<` 로 바꾸지 말 것.
  select count(*) into n
    from rate_distance_tiers a
    join (values ('다마스',1),('라보',2),('1톤',3),('1.4톤',4),('2.5톤',5),('3.5톤',6),('5톤',7),('5톤 플러스/축',8),('8톤',9),('11톤',10),('15톤',11),('18톤',12),('25톤',13)) as oa(vt,rk)
      on oa.vt = a.vehicle_type
    join rate_distance_tiers b on b.distance_label = a.distance_label
    join (values ('다마스',1),('라보',2),('1톤',3),('1.4톤',4),('2.5톤',5),('3.5톤',6),('5톤',7),('5톤 플러스/축',8),('8톤',9),('11톤',10),('15톤',11),('18톤',12),('25톤',13)) as ob(vt,rk)
      on ob.vt = b.vehicle_type
   where ob.rk = oa.rk + 1
     and case when oa.vt = '다마스' then b.base_fare <  a.base_fare
                                   else b.base_fare <= a.base_fare end;
  if n <> 0 then raise exception '차급 역전이 %칸 있다', n; end if;

  -- (6) 총행수는 그대로 (UPDATE 만 했다 — INSERT·DELETE 0)
  select count(*) into n from rate_distance_tiers;
  if n <> 195 then raise exception '총행수가 195가 아니게 됐다: %행', n; end if;
end $$;


-- ⑤ 반영 결과 (로그로 눈에 보이게)
select t.distance_label as 구간,
       max(t.base_fare) filter (where t.vehicle_type = '다마스') as "다마스",
       max(t.base_fare) filter (where t.vehicle_type = '라보')   as "라보",
       max(t.base_fare) filter (where t.vehicle_type = '1톤')    as "(참고) 1톤",
       max(b.base_fare) filter (where b.vehicle_type = '라보')   as "라보(전)"
  from rate_distance_tiers t
  left join _bak_rate_distance_tiers_before_labo_unify b
    on b.vehicle_type = t.vehicle_type and b.distance_label = t.distance_label
 where t.vehicle_type in ('다마스','라보','1톤')
 group by t.distance_label
 order by min(coalesce(t.distance_to_km, 999999));


-- ── 🔴 되돌리기 (손으로 실행할 것) ───────────────────────────────────
--
--   update rate_distance_tiers t
--      set base_fare = b.base_fare
--     from _bak_rate_distance_tiers_before_labo_unify b
--    where b.id = t.id and t.vehicle_type = '라보';
--
--   ⚠️ 되돌리면 **85,100 · 225,100 두 칸의 오타도 같이 돌아옵니다.**
--   ⚠️ 그리고 `_verify.sql` ⑥-b 의 완화(다마스↔라보 동가 허용)는 그대로 둬도
--      됩니다 — 엄격 증가 상태도 그 검사를 통과합니다.
