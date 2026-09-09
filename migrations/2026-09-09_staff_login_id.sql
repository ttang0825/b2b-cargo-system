-- 32차 — 내부시스템 로그인 아이디 전환: staff_accounts 컬럼 두 개
--
-- 무엇을 왜
--   내부관리(/admin)는 지금 직원이 **이메일**로 로그인한다. 실무에서 걸리는 것이 셋인데,
--   그중 진짜 이유는 두 번째다.
--     1. 이메일을 매번 다 쳐야 한다
--     2. 🔴 비밀번호를 잊으면 아무도 풀어줄 수 없다 (RESEND_API_KEY 미등록 · SMTP 미연결)
--     3. 화주포털은 이미 아이디 로그인이라 두 시스템의 방식이 다르다
--
-- 🔴 화주포털 방식을 베끼지 않았다. 포털은 아이디를 **합성 이메일**
--    ({login_id}@wecarry-portal.internal) 로 바꿔 Auth 에 등록한다 — 화주는 실제
--    이메일이 없어도 계정이 나가야 하기 때문이다. **직원은 실제 회사 메일이 있고,
--    그것이 나중에 Resend 를 켰을 때 유일한 복구 경로다.** 합성 이메일로 갈아치우면
--    그 경로를 스스로 없애는 셈이라, 이번에는 「매핑 방식」을 쓴다:
--        직원이 입력          login_id + 비밀번호
--        서버가 하는 일        login_id 로 행을 찾아 → 그 행의 email 로 로그인시킨다
--        Auth 에 저장된 이메일   🔴 그대로 (한 글자도 안 바꾼다)
--
-- 🔴 이 파일에는 **아이디 값이 없다.** 이 저장소는 public 이라, 직원 실명과 로그인
--    아이디를 커밋하면 git 이력에 영구히 공개된다(로그인 화면도 공개돼 있다).
--    값 채우기는 Supabase SQL Editor 에서 한 번 손으로 한다 — 예외 사유가 이것이고,
--    확인은 `_verify.sql` ⑪ 의 「아이디 없는 재직 직원 0명」으로 한다.
--    🔴 그 확인 전에는 코드를 merge 하지 말 것. 전원이 못 들어온다.
--
-- 되돌리기는 파일 맨 아래 주석 참고.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. 사전 확인 — 원칙 27번
--    `add column if not exists` 는 컬럼이 이미 있으면 조용히 아무것도 안 한다.
--    레거시로 같은 이름이 다른 타입으로 있으면 그대로 넘어가 버리므로 먼저 막는다.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  select data_type into t
    from information_schema.columns
   where table_schema = 'public' and table_name = 'staff_accounts'
     and column_name = 'login_id';
  if t is not null and t <> 'text' then
    raise exception 'staff_accounts.login_id 가 이미 있는데 타입이 text 가 아닙니다: %', t;
  end if;

  select data_type into t
    from information_schema.columns
   where table_schema = 'public' and table_name = 'staff_accounts'
     and column_name = 'must_change_password';
  if t is not null and t <> 'boolean' then
    raise exception 'staff_accounts.must_change_password 타입이 boolean 이 아닙니다: %', t;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. 컬럼
--    ⚠️ login_id 에 not null 을 걸지 않는다 — 값을 채우기 전에는 비어 있는 것이 정상이고,
--       걸면 이 마이그레이션 자체가 실패한다.
-- ─────────────────────────────────────────────────────────────────────────────
alter table staff_accounts add column if not exists login_id text;

-- 임시 비밀번호를 받은 직원이 첫 로그인에서 반드시 바꾸게 하는 표시.
-- 🔴 화주포털의 customer_accounts.must_change_password 와 **공유하지 않는다**(표가 다르다).
alter table staff_accounts
  add column if not exists must_change_password boolean not null default false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. 소문자 유니크 인덱스
--    🔴 대소문자를 무시해야 한다 — `WCJJY` 와 `wcjjy` 가 따로 만들어지면 로그인이
--       엉뚱한 사람에게 붙는다. 서버도 항상 lower() 로 조회한다.
--    🟢 NULL 은 유니크 대상이 아니므로 아직 아이디가 없는 행이 여럿이어도 괜찮다.
-- ─────────────────────────────────────────────────────────────────────────────
create unique index if not exists staff_accounts_login_id_lower_key
  on staff_accounts (lower(login_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. 단언
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'staff_accounts'
     and column_name in ('login_id', 'must_change_password');
  if n <> 2 then
    raise exception '컬럼 두 개가 다 만들어지지 않았습니다: %개', n;
  end if;

  select count(*) into n
    from pg_indexes
   where schemaname = 'public'
     and indexname = 'staff_accounts_login_id_lower_key';
  if n <> 1 then
    raise exception '소문자 유니크 인덱스가 만들어지지 않았습니다';
  end if;

  -- 이 단계에서는 아무도 강제 변경 상태면 안 된다(재발급을 아직 아무도 안 했다).
  select count(*) into n from staff_accounts where must_change_password;
  if n <> 0 then
    raise exception 'must_change_password 가 true 인 계정이 %건 있습니다', n;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. 결과
--    🔴 이 출력은 **공개된 Actions 로그**에 남는다 — 이름·이메일·아이디를 찍지 말 것.
--       세는 것만 남긴다.
-- ─────────────────────────────────────────────────────────────────────────────
select
  count(*)                                                as 전체_직원,
  count(*) filter (where status = 'active')               as 재직,
  count(*) filter (where status = 'active'
                     and login_id is null)                as "아이디_없음_다음_단계에서_채움",
  count(*) filter (where must_change_password)            as "강제변경_0이어야"
from staff_accounts;

-- ─────────────────────────────────────────────────────────────────────────────
-- 🔴 되돌리기 (필요할 때만, 손으로)
--
--   drop index if exists staff_accounts_login_id_lower_key;
--   alter table staff_accounts drop column if exists login_id;
--   alter table staff_accounts drop column if exists must_change_password;
--
--   ⚠️ 코드가 이미 배포된 뒤에 되돌리면 로그인이 통째로 막힌다 — 코드를 먼저
--      이전 커밋으로 되돌린 다음에 실행할 것.
-- ─────────────────────────────────────────────────────────────────────────────
