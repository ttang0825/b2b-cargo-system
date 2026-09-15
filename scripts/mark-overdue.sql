-- 월정산 묶음 **연체 자동 판정** — 매일 워크플로가 돌립니다 (.github/workflows/overdue.yml)
--
-- 🔴 이 파일은 마이그레이션이 아닙니다 — `migrations/` 에 두지 마십시오.
--    거기 있는 파일은 `_migrations` 에 기록되어 **한 번만** 돕니다.
--
-- 🔴 왜 만들었나 — 사용자 신고(2026-09-15) *"실제 정산마감일이 지나고 어떻게
--    진행되는지도 알아야 한다"*. `payment_status` 에 `'overdue'` 값이 있고 묶음
--    화면이 그것을 「연체」로 그릴 줄도 알았지만, **그 값을 세팅하는 코드가
--    0곳**이었습니다(실측 2026-09-15 · 연체표시 0건).
--
-- 🔴 **확정된 묶음만 대상입니다.** 작성 중(draft)은 아직 화주에게 청구하지 않은
--    것이라 「연체」라는 말이 성립하지 않습니다. 마감일이 지난 draft 는 묶음
--    화면이 「마감 지남 — 확정 대기」로 알리고, **확정은 담당자가 손으로 누릅니다**
--    (사용자 확정 (A)안 — 돈이 걸린 상태를 코드가 마음대로 굳히지 않습니다).
--
-- 🔴 **`payment_due_date` 가 비어 있으면 대상이 아닙니다.** 없는 기한으로 연체를
--    매기면 화주와 합의하지 않은 날에 연체가 붙습니다. 「협의」 화주는 담당자가
--    묶음 화면에서 날짜를 넣은 뒤에야 이 작업이 걸립니다.
--
-- ⚠️ **연체가 붙으면 「묶음 해제」가 막힙니다** — `release_billing_batch` 가
--    `payment_status in ('paid','overdue')` 를 거절합니다(2026-09-15 함수 본문 실측,
--    `_verify.sql` ⑲). 이미 청구가 나간 묶음을 조용히 되돌리지 않겠다는 뜻이라
--    **의도된 동작**이고, 그래도 필요하면 관리자 「완전삭제」가 남아 있습니다.
--    🟢 입금완료 처리는 막히지 않습니다(그 함수는 `'paid'` 만 거절합니다 — 같이 쟀습니다).
--
-- 🟢 **되돌리는 것은 입금완료 처리입니다** — 연체 묶음에 입금이 들어오면 담당자가
--    「입금완료 처리」를 누르고 그 순간 `'paid'` 가 됩니다.
--
-- 실행
--   psql "$DATABASE_URL" -f scripts/mark-overdue.sql                 (dry-run)
--   psql "$DATABASE_URL" -v dry_run=false -f scripts/mark-overdue.sql (실제 반영)

\set ON_ERROR_STOP on

-- 🔴 기본값은 dry-run 입니다. `\if :{?dry_run}` 로 **이미 정의된 경우에만** 건너뛰어야
--    합니다 — 그냥 `\set dry_run true` 를 쓰면 명령줄의 `-v dry_run=false` 를
--    파일이 도로 덮어써서 실제 반영이 영영 안 됩니다(`purge-expired.sql` 과 같은 함정).
\if :{?dry_run}
\else
  \set dry_run true
\endif

select set_config('app.overdue_dry_run', :'dry_run', false);

\echo ''
\echo '=== 월정산 묶음 연체 판정 ================================='
\echo '모드 (dry_run):' :dry_run

\echo ''
\echo '--- 대상 (확정 · 미입금 · 납부기한 지남) ---'
select b.id,
       b.period_start || ' ~ ' || b.period_end as 기간,
       b.payment_due_date                      as 납부기한,
       current_date - b.payment_due_date       as 지난일수,
       b.total_amount                          as 총액,
       b.payment_status                        as 현재상태
  from customer_billing_batches b
 where b.batch_status = 'confirmed'
   and b.payment_status = 'unpaid'
   and b.payment_due_date is not null
   and b.payment_due_date < current_date
 order by b.payment_due_date;

do $$
declare
  v_dry boolean := current_setting('app.overdue_dry_run')::boolean;
  -- 🔴 조건 버그로 멀쩡한 묶음이 무더기로 연체가 되는 것을 막는 상한입니다.
  --    정상 운영에서 하루에 이만큼 새로 연체될 수 없습니다. 넘으면 아무것도 바꾸지
  --    않고 멈춥니다(워크플로가 `--single-transaction` 이라 통째로 되돌아갑니다).
  c_max int := 200;
  n_target int;
  n_done   int := 0;
begin
  select count(*) into n_target
    from customer_billing_batches
   where batch_status = 'confirmed'
     and payment_status = 'unpaid'
     and payment_due_date is not null
     and payment_due_date < current_date;

  if n_target > c_max then
    raise exception '연체 대상이 % 건으로 상한(%)을 넘었습니다 — 조건을 확인하십시오.',
      n_target, c_max;
  end if;

  if v_dry then
    raise notice 'dry-run: % 건이 연체로 바뀔 예정입니다.', n_target;
  else
    update customer_billing_batches
       set payment_status = 'overdue'
     where batch_status = 'confirmed'
       and payment_status = 'unpaid'
       and payment_due_date is not null
       and payment_due_date < current_date;
    get diagnostics n_done = row_count;
    raise notice '% 건을 연체로 표시했습니다.', n_done;
  end if;
end $$;

\echo ''
\echo '=== 묶음 현황 (판정 후) ==================================='
select count(*)                                          as 묶음_전체,
       count(*) filter (where batch_status = 'draft')     as 작성중,
       count(*) filter (where batch_status = 'draft'
                          and period_end < current_date)  as 작성중_마감지남,
       count(*) filter (where batch_status = 'confirmed') as 확정,
       count(*) filter (where payment_status = 'overdue') as 연체,
       count(*) filter (where payment_status = 'paid')    as 입금완료,
       count(*) filter (where batch_status = 'confirmed'
                          and payment_due_date is null)   as 확정_기한없음
  from customer_billing_batches;
