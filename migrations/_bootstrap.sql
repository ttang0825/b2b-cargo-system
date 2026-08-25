-- 마이그레이션 이력 테이블
--
-- 🔴 이 파일은 워크플로가 매번 가장 먼저 실행합니다. 사람이 직접 실행할 일은 없습니다.
--    `create table if not exists`라 몇 번을 돌려도 안전합니다.
--
-- 어느 파일이 언제 적용됐는지를 DB 자신이 기억하게 하는 것이 목적입니다.
-- 이 표가 없으면 "이 SQL을 이미 돌렸던가?"를 사람 기억에 의존해야 하고,
-- INSERT 계열 마이그레이션은 두 번 돌리는 순간 중복 행이 생깁니다.

create table if not exists _migrations (
  filename    text primary key,
  checksum    text,                                  -- 파일 내용의 sha256 (드리프트 감지용)
  applied_at  timestamptz not null default now(),
  applied_by  text                                   -- 'baseline' | github actor 이름
);

comment on table _migrations is
  '적용된 마이그레이션 파일 이력. .github/workflows/migrate.yml 이 관리한다. 손으로 고치지 말 것.';

-- ⚠️ 앱은 이 표를 읽지 않습니다. anon/authenticated에게 열 이유가 없으므로
--    RLS를 켜고 정책은 만들지 않습니다(43차 `consents`와 같은 방식).
--    워크플로는 postgres 계정으로 붙으므로 RLS의 영향을 받지 않습니다.
alter table _migrations enable row level security;
