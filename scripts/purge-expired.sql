-- 보유기간 만료 파기 — 매일 워크플로가 돌립니다 (.github/workflows/purge.yml)
--
-- 🔴 이 파일은 마이그레이션이 아닙니다 — `migrations/` 에 두지 마십시오.
--    거기 있는 파일은 `_migrations` 에 기록되어 **한 번만** 돕니다. 파기는 매일
--    돌아야 하므로 별도 스크립트입니다.
--
-- 🔴 왜 매일인가 — 처리방침 제7조가 "보유기간 종료일로부터 **5일 이내**" 파기를
--    약속합니다. 주 1회면 최대 7일이 밀려 그 문구를 못 지킵니다.
--
-- 실행
--   psql "$DATABASE_URL" -f scripts/purge-expired.sql                 (dry-run)
--   psql "$DATABASE_URL" -v dry_run=false -f scripts/purge-expired.sql (실제 삭제)

\set ON_ERROR_STOP on

-- 🔴 기본값은 dry-run 입니다. `\if :{?dry_run}` 로 **이미 정의된 경우에만** 건너뛰어야
--    합니다 — 그냥 `\set dry_run true` 를 쓰면 명령줄의 `-v dry_run=false` 를
--    파일이 도로 덮어써서 실제 삭제가 영영 안 돕니다.
\if :{?dry_run}
\else
  \set dry_run true
\endif

-- 🔴 psql 변수는 `do $$ ... $$` **안에서 치환되지 않습니다**(달러 인용 안쪽은 psql 이
--    건드리지 않는다). 그래서 값을 세션 설정으로 한 번 옮겨서 넘깁니다.
select set_config('app.purge_dry_run', :'dry_run', false);

\echo ''
\echo '=== 보유기간 만료 파기 ====================================='
\echo '모드 (dry_run):' :dry_run

do $$
declare
  v_dry   boolean := current_setting('app.purge_dry_run')::boolean;
  -- 🔴 조건 버그로 표가 통째로 날아가는 것을 막는 상한입니다. 정상 운영에서 하루에
  --    이만큼 만료될 수 없습니다. 넘으면 아무것도 지우지 않고 멈춥니다.
  c_max   int := 500;
  n_quote int;
  n_apply int;
  d_quote int := 0;
  d_apply int := 0;
begin
  -- ── 견적 문의: 문의일로부터 1년 (처리방침 제3조)
  -- 🔴 `quote_id is null` 을 빼지 마십시오. 처리방침 문구가 "견적 문의
  --    **(거래로 이어지지 않은 건)**" 입니다. 견적으로 전환된 문의는 거래 기록이라
  --    5년 계열이고, 이 조건이 없으면 그것까지 지웁니다.
  select count(*) into n_quote
    from public_quote_requests
   where quote_id is null
     and created_at < now() - interval '1 year';

  -- ── 고객 등록 신청: 처리 완료일로부터 6개월 (처리방침 제3조)
  -- 🔴 `company_id is null` 과 상태 조건을 빼지 마십시오. 승인된 신청은 화주가 되어
  --    거래 기록(5년)이 됩니다. 승인 시 `company_id` 가 붙는 것이 그 표시입니다.
  -- ⚠️ `coalesce(processed_at, created_at)` — `processed_at` 은 2026-09-07 에 생긴
  --    컬럼이라 그 이전 건은 값이 없습니다. 백필하면 거짓 기록이 되므로 신청일로
  --    떨어뜨립니다.
  select count(*) into n_apply
    from customer_applications
   where company_id is null
     and status <> '승인됨'
     and coalesce(processed_at, created_at) < now() - interval '6 months';

  raise notice '대상 — 견적문의 %건 / 고객등록신청 %건', n_quote, n_apply;

  if n_quote > c_max or n_apply > c_max then
    raise exception '한 번에 지우려는 건수가 상한(%)을 넘습니다 — 견적문의 % / 신청 %. 조건을 먼저 확인하십시오.',
      c_max, n_quote, n_apply;
  end if;

  if v_dry then
    raise notice 'dry-run 이라 아무것도 지우지 않았습니다.';
  else
    delete from public_quote_requests
     where quote_id is null
       and created_at < now() - interval '1 year';
    get diagnostics d_quote = row_count;

    delete from customer_applications
     where company_id is null
       and status <> '승인됨'
       and coalesce(processed_at, created_at) < now() - interval '6 months';
    get diagnostics d_apply = row_count;

    raise notice '삭제 — 견적문의 %건 / 고객등록신청 %건', d_quote, d_apply;
  end if;

  -- 🔴 이력은 dry-run 도 남깁니다 — "그날 대상이 0건이었다"는 것도 입증 자료입니다.
  -- ⚠️ `consents` 행은 지우지 않습니다. 14차가 FK 를 일부러 안 걸었고 원본이
  --    사라져도 동의 기록은 남는 설계입니다(고아 행이 정상, 52차 ⑤).
  insert into retention_purge_logs (target, rule, deleted, dry_run) values
    ('public_quote_requests', '처리방침 제3조 · 견적 문의(거래로 이어지지 않은 건) 1년',
     case when v_dry then n_quote else d_quote end, v_dry),
    ('customer_applications', '처리방침 제3조 · 고객 등록 신청(미승인·거절 건) 6개월',
     case when v_dry then n_apply else d_apply end, v_dry);
end $$;

\echo ''
\echo '=== 남은 건수 (파기 후) ===================================='
select 'public_quote_requests' as 표,
       count(*)                                       as 전체,
       count(*) filter (where quote_id is not null)    as 견적전환_보존,
       count(*) filter (where quote_id is null)        as 미전환
  from public_quote_requests
union all
select 'customer_applications',
       count(*),
       count(*) filter (where company_id is not null),
       count(*) filter (where company_id is null)
  from customer_applications;

\echo ''
\echo '=== 최근 파기 이력 10건 ===================================='
select purged_at, target, deleted, dry_run
  from retention_purge_logs
 order by purged_at desc
 limit 10;
