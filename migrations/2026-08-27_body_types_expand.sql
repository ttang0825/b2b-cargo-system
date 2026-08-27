-- PR #103 리뷰 3번 — 차량형태 7종 → 20종 (원콜 오더 차종 참고)
--
-- 실행: GitHub Actions → "DB 마이그레이션" → dry-run 으로 확인 후 apply.
--
-- ══ 🔴 이 파일의 가산율은 **제안값이다. 승인 전에는 apply 하지 말 것** ═══════
--
--    기존 7종의 값은 실거래 근거가 있지만(v8), **신규 13종은 기존 7종에서 산술로
--    유도한 값**이다. 46차·52차가 운임을 바꿀 때 실거래 114건을 근거로 삼은 것과
--    비교하면 근거 등급이 훨씬 낮다(52차 8·15톤 보간이 "등급 D" 였는데 그보다 아래).
--    담당자가 숫자를 고친 뒤 실행하는 것을 전제로 쓴 파일이다.
--
--    🔴 그렇다고 전부 0/0 으로 넣으면 안 된다 — 냉장윙(0)이 냉장탑(0.25)보다 싸져
--    **차종 역전**이 나고, 화주가 싼 쪽을 골라 접수하면 마진이 통째로 빠진다.
--
-- ══ 유도 규칙 (신규 13종) ══════════════════════════════════════════════════
--
--   조합형("둘 중 아무거나")  → **낮은 쪽**을 따른다. 선택지가 넓어 배차가 쉽다
--       카고/윙   = min(카고 0.00, 윙바디 0.15) = 0.00
--       윙바디/탑 = min(윙바디 0.15, 탑차 0.10) = 0.10
--   기능 겹침("A + 리프트")   → 두 값을 더하되 **조합 할인**을 준다(같은 차 한 대다)
--       카고리프트   = 0.00 + 0.20 = 0.20
--       탑리프트     = 0.10 + 0.20 → 0.25 (할인)
--       리프트윙     = 0.15 + 0.20 → 0.30 (할인)
--       냉동탑리프트 = 0.35 + 0.20 → 0.45 (할인)
--   신규 단독
--       호로      0.05  카고 + 천막 덮개
--       윙플러스  0.20  윙바디 상위 사양
--       냉장윙    0.30  냉장탑(0.25) + 윙 개폐
--       초장축    0.20  장척 화물 전용
--       무진동    0.50 / 100,000  정밀기기 전용, 국내 보유 대수가 적다
--
-- ══ ⚠️ 원콜 23종 중 일부러 뺀 것 ═══════════════════════════════════════════
--
--   차종무관               `특수/협의`(0/0)가 이미 그 역할을 한다
--   🔴 추레라·다마스·라보   **차량형태가 아니라 차급이다.** 넣으면 "1톤 다마스" 같은
--                          조합이 생기고 `rate_distance_tiers` 에 그 차급 행이 없어
--                          견적이 안 나온다(15차 문구). 차급 확장은 운임 15구간 행이
--                          따라오는 별도 차수다(52차 `rate_8t_15t.sql` 이 본보기)
--
-- ⚠️ `탑차` 를 원콜 표기인 `탑` 으로 개명하지 않았다 — 담당자가 실제로 쓰는 말이
--    "탑차"다(`companies.recommended_vehicle` 539건이 "1톤 탑차·2.5톤 탑차" 형태).
--    2026-08-27 실측: 저장된 차량형태는 `quotes` 4건 · `portal_order_requests` 1건이
--    **전부 `카고`** 라 개명 자체는 안전하지만, 바꿀 이유가 없다.
--
-- 🔴 **코드와 같은 커밋에 있어야 한다** — `lib/vehicleBodyTypes.ts` 의
--    `QUOTE_BODY_TYPES` 와 이름이 하나라도 어긋나면 견적 계산이 문자열 완전일치로
--    매칭한 뒤 못 찾고 `continue` 한다(예외도 경고도 없이 가산만 빠진다).
--    아래 ④ 단언이 그것을 막는다.

-- ① 착수 전 확인 — 기존 7종이 실측값 그대로여야 한다
do $$
declare v_cnt int; v_bad int;
begin
  select count(*) into v_cnt from rate_surcharges where category = '차량형태';
  if v_cnt not in (7, 20) then
    raise exception '차량형태가 7행(반영 전) 또는 20행(반영 후)이 아니다: %행 — 담당자가 손으로 바꿨을 수 있으니 확인 후 진행할 것', v_cnt;
  end if;

  select count(*) into v_bad from (
    select * from (values
      ('카고', 0.00, 0), ('탑차', 0.10, 0), ('윙바디', 0.15, 0),
      ('리프트', 0.20, 30000), ('냉장탑', 0.25, 30000), ('냉동탑', 0.35, 50000),
      ('특수/협의', 0.00, 0)
    ) as expected(name, pct, flat)
    where not exists (
      select 1 from rate_surcharges r
       where r.category = '차량형태' and r.option_name = expected.name
         and r.rate_pct = expected.pct and coalesce(r.flat_amount, 0) = expected.flat
    )
  ) s;
  if v_bad > 0 then
    raise exception '기존 7종의 값이 2026-08-27 실측과 다르다: %건 — 그 사이 담당자가 바꿨다면 이 파일의 유도값도 다시 봐야 한다', v_bad;
  end if;
end $$;

-- ② 신규 13종 — 재실행 안전(이미 있으면 안 넣는다, 17차 패턴)
with ins as (
  insert into rate_surcharges (category, option_name, rate_pct, flat_amount)
  select '차량형태', v.name, v.pct, v.flat
    from (values
      ('카고/윙',      0.00,      0),
      ('호로',         0.05,      0),
      ('윙바디/탑',    0.10,      0),
      ('윙플러스',     0.20,      0),
      ('카고리프트',   0.20,  30000),
      ('초장축',       0.20,  30000),
      ('호로리프트',   0.25,  30000),
      ('탑리프트',     0.25,  30000),
      ('리프트윙',     0.30,  30000),
      ('냉장윙',       0.30,  30000),
      ('냉동탑리프트', 0.45,  50000),
      ('냉장윙리프트', 0.45,  50000),
      ('무진동',       0.50, 100000)
    ) as v(name, pct, flat)
   where not exists (
     select 1 from rate_surcharges r
      where r.category = '차량형태' and r.option_name = v.name
   )
  returning 1
)
select count(*) as 반영된_행수 from ins;

-- ③ 총 20행 · 차종 역전 없음
do $$
declare v_cnt int; v_bad int;
begin
  select count(*) into v_cnt from rate_surcharges where category = '차량형태';
  if v_cnt <> 20 then
    raise exception '차량형태가 20행이 아니다: %행', v_cnt;
  end if;

  -- 🔴 기능이 겹치는 차종이 원본보다 싸면 안 된다 — 화주가 싼 쪽을 골라 마진이 빠진다
  select count(*) into v_bad from (values
    ('냉장윙', '냉장탑'), ('냉동탑리프트', '냉동탑'), ('냉장윙리프트', '냉장윙'),
    ('탑리프트', '탑차'), ('리프트윙', '윙바디'), ('카고리프트', '카고'),
    ('호로리프트', '호로'), ('윙플러스', '윙바디')
  ) as pair(child, parent)
  where (select rate_pct from rate_surcharges where category='차량형태' and option_name=pair.child)
      < (select rate_pct from rate_surcharges where category='차량형태' and option_name=pair.parent);
  if v_bad > 0 then
    raise exception '상위 사양이 원본보다 싼 차종이 있다: %개 (차종 역전)', v_bad;
  end if;
end $$;

-- ④ 🔴 코드(`lib/vehicleBodyTypes.ts` QUOTE_BODY_TYPES)와 라벨 완전일치
--    ⚠️ 실제로는 ③의 행수 검사가 먼저 걸리는 경우가 많다(이름을 바꾸면 ②가 없어진
--    이름을 다시 넣어 21행이 된다). 그래도 남긴다 — 나중에 누가 ②의 목록만 고치고
--    이 단언은 안 고치는 실수를 막는 최종 안전장치다(15차와 같은 정신).
do $$
declare v_missing text; v_extra text;
begin
  select string_agg(name, ', ') into v_missing
    from (values
      ('카고'),('카고/윙'),('호로'),('탑차'),('윙바디/탑'),('윙바디'),('윙플러스'),
      ('리프트'),('카고리프트'),('초장축'),('호로리프트'),('탑리프트'),('냉장탑'),
      ('리프트윙'),('냉장윙'),('냉동탑'),('냉동탑리프트'),('냉장윙리프트'),('무진동'),
      ('특수/협의')
    ) as code(name)
   where not exists (
     select 1 from rate_surcharges r where r.category='차량형태' and r.option_name = code.name
   );
  if v_missing is not null then
    raise exception '코드에는 있는데 DB 에 없는 차종: % — 견적 계산이 조용히 가산을 빠뜨린다', v_missing;
  end if;

  select string_agg(option_name, ', ') into v_extra
    from rate_surcharges
   where category = '차량형태'
     and option_name not in ('카고','카고/윙','호로','탑차','윙바디/탑','윙바디','윙플러스',
       '리프트','카고리프트','초장축','호로리프트','탑리프트','냉장탑','리프트윙','냉장윙',
       '냉동탑','냉동탑리프트','냉장윙리프트','무진동','특수/협의');
  if v_extra is not null then
    raise exception 'DB 에는 있는데 코드에 없는 차종: % — 드롭다운 맨 뒤에 붙어 순서가 어색해진다', v_extra;
  end if;
end $$;

select option_name, rate_pct, flat_amount
  from rate_surcharges where category = '차량형태'
 order by rate_pct, flat_amount, option_name;

-- ── 되돌리기 ────────────────────────────────────────────────
-- delete from rate_surcharges
--  where category = '차량형태'
--    and option_name in ('카고/윙','호로','윙바디/탑','윙플러스','카고리프트','초장축',
--      '호로리프트','탑리프트','리프트윙','냉장윙','냉동탑리프트','냉장윙리프트','무진동');
