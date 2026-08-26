-- 22차 — 물품특성 가산기준 2행 하향 (파손주의 · 장척/중량)
--
-- 🔴 이 파일은 GitHub Actions "DB 마이그레이션" 워크플로가 실행합니다(47차).
--    begin;/commit; 을 쓰지 않습니다(워크플로가 --single-transaction).
--
--
-- ── 근거 (v8 5-1 실측 환산) ──────────────────────────────────────────
--
--   파손주의    10% + 30,000  →  10% + 15,000
--     가구·인테리어 거리보정 1.00, 평균 대비 +0.17 (**14건**) → 환산 약 +12,000.
--     현행 30,000 은 실측의 두 배를 넘습니다.
--
--   장척/중량   20% + 80,000  →  15% + 40,000
--     장척 0.98, 평균 대비 +0.14 (**5건**) → 환산 약 +10,000.
--
--   ⚠️ 🔴 **장척/중량은 표본 5건입니다.** v8 자신이 *"표본 5건 미만은 금액을 바꾸지
--      말 것"* 이라 했고 5건은 그 경계선입니다. **투입 후 관찰 대상으로 기록합니다** —
--      실거래가 쌓이면 다시 볼 것.
--
--
-- ── 🟢 화주 화면에는 영향이 없습니다 ────────────────────────────────
--
--   21차(51차 세션)가 `/api/customer/surcharge-options` 를 **이름만** 내려주도록
--   만들었기 때문에 화주는 금액을 보지 않습니다. **바뀌는 것은 관리자 견적 계산뿐**입니다.
--   🔴 **그 API 에 `rate_pct`·`flat_amount` 를 추가하지 마십시오**(28차 비공개 확정).
--
-- ⚠️ 이미 저장된 견적(`quotes`)은 소급 재계산되지 않습니다 — 저장 시점 금액 그대로입니다.
-- 🔴 되돌리기가 없습니다. 되돌리는 SQL 은 파일 맨 아래에.
--
--
-- ── 착수 전 확인 (2026-08-26, verify 워크플로로 운영 DB 실측) ────────
--   물품특성 8행 · 파손주의 `0.1 / 30,000` · 장척/중량 `0.2 / 80,000` — 전제와 일치.


-- ① 대상 확인
do $$
declare n int; r numeric; f numeric;
begin
  select count(*) into n from rate_surcharges
   where category = '물품특성' and option_name in ('파손주의','장척/중량');
  if n <> 2 then raise exception '대상이 2행이 아니다: %행', n; end if;

  select rate_pct, flat_amount into r, f from rate_surcharges
   where category = '물품특성' and option_name = '파손주의';
  if r <> 0.1 or f <> 30000 then
    raise exception '파손주의 현재값이 0.1 / 30,000 이 아니다: % / %', r, f;
  end if;

  select rate_pct, flat_amount into r, f from rate_surcharges
   where category = '물품특성' and option_name = '장척/중량';
  if r <> 0.2 or f <> 80000 then
    raise exception '장척/중량 현재값이 0.2 / 80,000 이 아니다: % / %', r, f;
  end if;
end $$;


-- ② 교체
with upd as (
  update rate_surcharges set flat_amount = 15000
   where category = '물품특성' and option_name = '파손주의'
  returning 1
)
select count(*) as 파손주의_반영행수 from upd;

with upd as (
  update rate_surcharges set rate_pct = 0.15, flat_amount = 40000
   where category = '물품특성' and option_name = '장척/중량'
  returning 1
)
select count(*) as 장척중량_반영행수 from upd;


-- ③ 단언
do $$
declare r numeric; f numeric; n int;
begin
  select rate_pct, flat_amount into r, f from rate_surcharges
   where category = '물품특성' and option_name = '파손주의';
  if r <> 0.1 or f <> 15000 then
    raise exception '파손주의가 0.1 / 15,000 이 아니다: % / %', r, f;
  end if;

  select rate_pct, flat_amount into r, f from rate_surcharges
   where category = '물품특성' and option_name = '장척/중량';
  if r <> 0.15 or f <> 40000 then
    raise exception '장척/중량이 0.15 / 40,000 이 아니다: % / %', r, f;
  end if;

  -- 나머지 6행은 손대지 않았다
  select count(*) into n from rate_surcharges where category = '물품특성';
  if n <> 8 then raise exception '물품특성이 8행이 아니다: %행', n; end if;

  select count(*) into n from rate_surcharges
   where category = '물품특성' and option_name = '고가/정밀' and rate_pct = 0.15 and flat_amount = 50000;
  if n <> 1 then raise exception '고가/정밀 이 0.15 / 50,000 에서 바뀌었다'; end if;

  select count(*) into n from rate_surcharges
   where category = '물품특성' and option_name = '식품/온도관리' and rate_pct = 0.1 and flat_amount = 50000;
  if n <> 1 then raise exception '식품/온도관리 가 0.1 / 50,000 에서 바뀌었다'; end if;
end $$;


-- ④ 확인용
select option_name, rate_pct, flat_amount from rate_surcharges
 where category = '물품특성' order by option_name;


-- ══════════════════════════════════════════════════════════════════════
-- 🔴 되돌리는 SQL (필요할 때만. 이 파일을 고치지 말고 아래를 새 파일에 복사할 것)
-- ══════════════════════════════════════════════════════════════════════
--
-- update rate_surcharges set flat_amount = 30000
--  where category = '물품특성' and option_name = '파손주의';
-- update rate_surcharges set rate_pct = 0.2, flat_amount = 80000
--  where category = '물품특성' and option_name = '장척/중량';
