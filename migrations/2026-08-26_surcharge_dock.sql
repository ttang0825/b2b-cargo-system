-- 20차 3-3 — rate_surcharges 상하차방식에 `도크` 1행 추가
--
-- 실행: GitHub Actions → "DB 마이그레이션" → dry-run 으로 확인 후 apply.
--
-- 🔴 **왜 DB 행이 필요한가.** `option_name` 은 앱에서 바꿀 수 없고(운임기준표 API가
--    `rate_pct`/`flat_amount` 두 필드만 허용한다), 견적 계산은 **문자열 완전일치**로 매칭한다.
--
--      const found = findOption("상하차방식", opt);
--      if (!found) continue;      // ← 못 찾으면 예외도 경고도 없이 가산만 빠진다
--
--    행이 없으면 `/admin/rates` 에서 **어떤 값을 넣어도 `도크` 건에는 가격이 안 붙는다.**
--    그리고 조용히 빠지기 때문에 담당자가 알아채지 못한다.
--
-- 🔴 금액은 `0 / 0` 으로 넣는다 — 신규 옵션이라 **기존 견적 계산에 영향이 없어야 한다.**
--    실제 가산 금액은 담당자가 `/admin/rates` "가산기준" 탭에서 정한다.
--
-- ⚠️ 2026-08-26 확인: `상하차방식` 카테고리는 7행이었고 `도크` 는 없었다.
--    이 파일 실행 후 8행이 된다.

-- 재실행 안전장치 — 이미 있으면 아무것도 안 넣는다(17차 패턴).
with ins as (
  insert into rate_surcharges (category, option_name, rate_pct, flat_amount)
  select '상하차방식', '도크', 0, 0
  where not exists (
    select 1 from rate_surcharges
     where category = '상하차방식' and option_name = '도크'
  )
  returning 1
)
select count(*) as 반영된_행수 from ins;

-- ═══ 검증 ═══
do $$
declare
  n int;
begin
  -- ① 도크가 정확히 1행 (두 번 돌려도 1행이어야 한다)
  select count(*) into n from rate_surcharges
   where category = '상하차방식' and option_name = '도크';
  if n <> 1 then raise exception '도크 행이 1개가 아닙니다: %', n; end if;

  -- ② 카테고리 전체가 8행 (완료조건 5)
  select count(*) into n from rate_surcharges where category = '상하차방식';
  if n <> 8 then raise exception '상하차방식이 8행이 아닙니다: %', n; end if;

  -- ③ 🔴 금액이 0/0 인가 — 기존 견적에 영향을 주면 안 된다
  select count(*) into n from rate_surcharges
   where category = '상하차방식' and option_name = '도크'
     and (coalesce(rate_pct, 0) <> 0 or coalesce(flat_amount, 0) <> 0);
  if n <> 0 then raise exception '도크 금액이 0/0 이 아닙니다'; end if;

  -- ④ 🔴 코드(lib/loadingMethods.ts)의 8종과 DB 라벨이 완전일치하는가.
  --    한 글자만 달라도 그 옵션의 가산이 조용히 빠진다.
  select count(*) into n from rate_surcharges
   where category = '상하차방식'
     and option_name not in ('기본운송','지게차','도크','수작업',
                             '호이스트','크레인','컨베이어','협의필요');
  if n <> 0 then
    raise exception 'lib/loadingMethods.ts 의 8종에 없는 option_name 이 있습니다: %', n;
  end if;
end $$;
