-- 보유기간 만료 파기 장치 — 준비 (2026-09-07)
--
-- 처리방침 제3조가 약속한 두 가지를 실제로 지키기 위한 준비입니다. 지금까지는 코드·
-- 스케줄러·DB 어디에도 파기 경로가 없었습니다(고지만 하고 장치가 없던 상태).
--
--   견적 문의 (거래로 이어지지 않은 건)   문의일로부터 1년
--   고객 등록 신청 (미승인·거절 건)       처리 완료일로부터 6개월
--
-- 이 파일은 **두 가지만** 만듭니다. 실제 삭제는 `scripts/purge-expired.sql` 이
-- 매일 워크플로에서 돌면서 합니다(마이그레이션은 한 번만 도는 것이라 반복 실행하는
-- 파기에는 맞지 않습니다).
--
--   ① customer_applications.processed_at  — 6개월의 기산점
--   ② retention_purge_logs                — 파기 이력(무엇을 몇 건 지웠는지)

-- ─────────────────────────────────────────────────────────────────────
-- ① 처리 완료 시각
--
-- 🔴 `updated_at` 을 기산점으로 쓰면 안 됩니다 — 담당자가 메모만 고쳐도 값이 밀려서
--    파기가 무한정 늦춰지고, 그러면 고지한 6개월을 못 지킵니다. 그래서 상태를
--    거절·보류·승인으로 바꾸는 순간에만 찍는 별도 컬럼을 둡니다.
-- 🔴 기존 행을 백필하지 않습니다 — 언제 처리했는지 알 수 없어서 채우면 거짓 기록이
--    됩니다(49차가 약관 동의를 소급 INSERT 하지 않은 것과 같은 이유).
--    대신 파기 SQL 이 `coalesce(processed_at, created_at)` 로 떨어뜨립니다.
alter table customer_applications
  add column if not exists processed_at timestamptz;

comment on column customer_applications.processed_at is
  '상태를 승인/거절/보류로 바꾼 시각. 처리방침 제3조의 "처리 완료일로부터 6개월" 기산점. '
  '값이 없으면(이 컬럼 신설 이전 건) 파기 판정은 created_at 으로 떨어진다.';

-- ─────────────────────────────────────────────────────────────────────
-- ② 파기 이력
--
-- 🔴 이 표에는 개인정보를 넣지 않습니다 — 무엇을 몇 건 지웠는지만 남깁니다.
--    지운 내용을 여기 옮겨 담으면 파기한 것이 아니라 옮긴 것이 됩니다.
-- ⚠️ Actions 로그는 90일이면 사라집니다. 1년 주기 파기의 이력으로는 짧아서 DB 에도
--    남깁니다.
create table if not exists retention_purge_logs (
  id          uuid primary key default gen_random_uuid(),
  purged_at   timestamptz not null default now(),
  target      text not null,          -- 'public_quote_requests' | 'customer_applications'
  rule        text not null,          -- 사람이 읽는 근거 (처리방침 조문)
  deleted     integer not null,
  dry_run     boolean not null default false
);

comment on table retention_purge_logs is
  '보유기간 만료 파기 이력. 개인정보를 담지 않는다 — 표 이름·근거·건수만 남긴다.';

-- 🔴 RLS 를 켜고 정책은 만들지 않습니다 — service_role(워크플로) 전용입니다.
--    `consents`·`sms_logs`·`support_access_logs` 와 같은 취급입니다(49차 ①-4).
alter table retention_purge_logs enable row level security;

-- ─────────────────────────────────────────────────────────────────────
-- 단언 — 하나라도 어긋나면 아무것도 반영되지 않고 워크플로가 빨간불로 멈춥니다
do $$
declare n int;
begin
  select count(*) into n from information_schema.columns
   where table_name = 'customer_applications' and column_name = 'processed_at';
  if n <> 1 then raise exception 'processed_at 컬럼이 만들어지지 않았습니다: %', n; end if;

  -- 🔴 기산점 컬럼은 nullable 이어야 합니다 — NOT NULL 이면 기존 6건이 막힙니다.
  select count(*) into n from information_schema.columns
   where table_name = 'customer_applications' and column_name = 'processed_at'
     and is_nullable = 'YES';
  if n <> 1 then raise exception 'processed_at 이 nullable 이 아닙니다'; end if;

  -- 🔴 백필하지 않았음을 확인 — 값이 있으면 거짓 기록이 들어간 것입니다.
  select count(*) into n from customer_applications where processed_at is not null;
  if n <> 0 then raise exception '기존 행에 processed_at 이 채워졌습니다: %건', n; end if;

  select count(*) into n from information_schema.tables
   where table_name = 'retention_purge_logs';
  if n <> 1 then raise exception 'retention_purge_logs 가 만들어지지 않았습니다'; end if;

  select count(*) into n from pg_policies where tablename = 'retention_purge_logs';
  if n <> 0 then raise exception '이력 표에 정책이 생겼습니다(service_role 전용이어야 함): %', n; end if;

  select count(*) into n from pg_class
   where relname = 'retention_purge_logs' and relrowsecurity;
  if n <> 1 then raise exception '이력 표의 RLS 가 꺼져 있습니다'; end if;
end $$;

-- 되돌리기 (필요할 때만 손으로)
--   drop table if exists retention_purge_logs;
--   alter table customer_applications drop column if exists processed_at;
