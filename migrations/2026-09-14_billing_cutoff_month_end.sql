-- 36차 리뷰 3라운드 — 정산 마감일을 전부 「월말」로 통일
--
-- 사용자 지시: *"정산 마감일은 구설정은 필요없다. 월정산을 했을때 모두 월말기준으로
-- 바꾸자. 정산마감은 월말기준이라는 표시는 두자."*
--
-- 🔴 **이것은 값을 지우는 마이그레이션이다** — 이 저장소에서 드문 경우이므로
--    지우기 전 값을 `_bak_billing_cutoff_day_20260914` 에 남긴다(운임 교체 때
--    쓴 `_bak_rate_distance_tiers_*` 와 같은 패턴). 🔴 **그 표를 먼저 지우지 말 것.**
--
-- 🟢 **과거 월정산 묶음은 안전하다 — 실측으로 확인했다.**
--    `components/MonthlyBillingBatchPanel.tsx` 가 원칙 46번대로
--      ① 기존 묶음을 **`period_end` 가 그 달력월 안에 있는지**로 찾고(마감일로 역산하지 않는다)
--      ② 찾은 묶음은 **저장된 `period_start`/`period_end` 를 그대로** 쓴다
--    마감일은 **새 묶음을 만들 때의 기간 계산에만** 쓰인다. 그래서 이 값을 비워도
--    과거 묶음이 사라지거나 기간이 바뀌지 않는다.
--    🔴 이 성질이 깨지면(= 묶음을 마감일로 역산해 찾도록 되돌리면) 이 마이그레이션이
--       소급 사고가 된다 — 원칙 46번을 되돌리지 말 것.
--
-- 🔴 **컬럼은 남긴다.** `monthToPeriod()` 가 `null` 이면 달력월(1일~말일)로 계산하므로
--    **`null` 이 곧 월말**이고, 컬럼을 지우면 그 코드가 통째로 깨진다.
--    화면 입력칸만 없앴다(같은 커밋).

-- ── ① 지우기 전 값 백업 ─────────────────────────────────────────────────────
-- 🔴 `if not exists` 로 두 번 돌려도 처음 값이 덮이지 않게 한다.
create table if not exists _bak_billing_cutoff_day_20260914 as
  select id, billing_cutoff_day, now() as backed_up_at
    from companies
   where billing_cutoff_day is not null;

-- ── ② 월말로 통일 ───────────────────────────────────────────────────────────
with upd as (
  update companies set billing_cutoff_day = null
   where billing_cutoff_day is not null
  returning 1
)
select count(*) as 월말로_바꾼_화주수 from upd;

-- ── ③ 🔴 단언: 남은 값이 하나도 없다 ────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n from companies where billing_cutoff_day is not null;
  if n <> 0 then
    raise exception '🔴 마감일이 남은 화주가 있다: %건 — 전부 월말(null)이어야 한다', n;
  end if;
end $$;

-- ── ④ 🔴 단언: 백업이 비어 있지 않다(되돌릴 근거) ───────────────────────────
-- ⚠️ 실측 시점에 값이 있던 화주는 **1건**이었다. 0건이면 이미 누가 지웠다는 뜻이라
--    멈추고 사람이 확인해야 한다 — 조용히 넘어가면 되돌릴 방법이 사라진다.
do $$
declare n int;
begin
  select count(*) into n from _bak_billing_cutoff_day_20260914;
  if n = 0 then
    raise exception '🔴 백업이 비어 있다 — 지울 값이 애초에 없었는지 사람이 확인할 것';
  end if;
end $$;

-- ── ⑤ 🔴 단언: 컬럼을 지우지 않았다 ─────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n from information_schema.columns
   where table_schema='public' and table_name='companies' and column_name='billing_cutoff_day';
  if n <> 1 then
    raise exception '🔴 billing_cutoff_day 컬럼이 사라졌다 — null 이 곧 월말이라 이 컬럼이 필요하다';
  end if;
end $$;

-- ── ⑥ 결과 (🔴 이 저장소는 public 이다 — 이름을 뽑지 않는다) ────────────────
select
  (select count(*) from companies)                                  as 화주_전체,
  (select count(*) from companies where billing_cutoff_day is not null) as 마감일_남음,
  (select count(*) from _bak_billing_cutoff_day_20260914)           as 백업된_행,
  (select count(*) from customer_billing_batches)                   as 월정산_묶음_전체;

-- 되돌리기 (🔴 백업 표가 있어야 한다)
--   update companies c set billing_cutoff_day = b.billing_cutoff_day
--     from _bak_billing_cutoff_day_20260914 b where b.id = c.id;
--   delete from _migrations where filename = '2026-09-14_billing_cutoff_month_end.sql';
