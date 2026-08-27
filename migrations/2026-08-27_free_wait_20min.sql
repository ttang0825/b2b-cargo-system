-- PR #103 리뷰 4번 — 무료 대기시간 30분 → 20분 (전 차급)
--
-- 실행: GitHub Actions → "DB 마이그레이션" → dry-run 으로 확인 후 apply.
--
-- 🔴 **이것은 가격 변경이다.** 무료로 기다려주는 시간이 30분에서 20분으로 줄어드는 것이라,
--    같은 대기 60분 건의 대기료가 1구간(30분)에서 2구간(40분→2구간)으로 늘 수 있다.
--    사용자 지시(PR #103 리뷰 4번, "내부시스템에도 적용")로 반영한다.
--
-- 🔴 **초과 단가의 단위(30분당)는 건드리지 않는다** — 리뷰가 말한 것은 "무료 대기 시간"
--    하나뿐이다. `waiting_fee_per_unit` 과 `/admin/rates` 의 "초과 시 (30분당)" 열은 그대로다.
--
-- ⚠️ 이미 저장된 견적은 소급 재계산되지 않는다(저장 시점 금액 그대로) — 52차와 같다.
-- ⚠️ 담당자는 `/admin/rates` "가산기준" 탭에서 차급별로 언제든 다시 바꿀 수 있다.

do $$
declare
  v_rows int;
  v_bad int;
begin
  -- 재실행 안전장치 — 이미 20분이면 UPDATE 가 0행이고 그대로 통과한다(멱등)
  select count(*) into v_rows from rate_vehicle_extra_fees;
  if v_rows <> 11 then
    raise exception '가산기준이 11행이 아니다: %행 (22차 이후 11차급이어야 한다)', v_rows;
  end if;

  select count(*) into v_bad
    from rate_vehicle_extra_fees
   where free_waiting_minutes not in (20, 30);
  if v_bad > 0 then
    raise exception '무료 대기시간이 20/30 이 아닌 차급이 있다: %건 — 담당자가 손으로 바꾼 값일 수 있으니 확인 후 진행할 것', v_bad;
  end if;
end $$;

with upd as (
  update rate_vehicle_extra_fees
     set free_waiting_minutes = 20
   where free_waiting_minutes <> 20
  returning 1
)
select count(*) as 반영된_행수 from upd;

do $$
declare
  v_bad int;
begin
  select count(*) into v_bad
    from rate_vehicle_extra_fees
   where free_waiting_minutes <> 20;
  if v_bad > 0 then
    raise exception '아직 20분이 아닌 차급이 있다: %건', v_bad;
  end if;
end $$;

select vehicle_type, free_waiting_minutes as 무료_대기분, waiting_fee_per_unit as 초과_30분당
  from rate_vehicle_extra_fees
 order by vehicle_type;

-- ── 되돌리기 ────────────────────────────────────────────────
-- update rate_vehicle_extra_fees set free_waiting_minutes = 30;
