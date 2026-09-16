-- 38차 B장 — 웹 푸시 구독 표 신설
--
-- 배경: 지금은 관리자 화면을 열어 둔 동안에만 새 접수를 알 수 있다(A장의 소리·배너).
-- **브라우저를 닫아도** 폰과 데스크탑에 알림이 오게 하려면 브라우저가 발급한 구독
-- 정보를 서버가 들고 있어야 한다. 이 표가 그것이다.
--
-- 🔴 설계 결정 — 바꾸기 전에 이유를 먼저 볼 것
--
--   RLS on + 정책 0개   `consents`·`sms_logs`·`support_access_logs` 와 같은 방식.
--                       서버 API(service_role)로만 읽고 쓴다.
--                       🔴 **컬럼 GRANT 로는 못 가른다** — 화주포털 계정과 직원 계정이
--                       둘 다 `authenticated` 롤이라(19차), 정책을 하나라도 만들면
--                       **화주가 직원 기기의 구독 정보를 읽을 수 있게 된다.**
--
--   endpoint unique     같은 기기가 두 번 등록되면 알림이 두 번 온다. 브라우저가 주는
--                       endpoint 가 곧 기기별 고유값이라 여기에 유니크를 건다.
--                       🔴 **「먼저 조회해서 없으면 insert」로 대신하지 말 것**(§7 —
--                       완전히 동시에 들어오는 두 요청은 애플리케이션 조회로 못 막는다).
--                       서버 API 는 `on conflict (endpoint) do update` 로 쓴다.
--
--   staff_id FK         `on delete cascade` 다. 퇴사해서 직원 행이 지워지면 그 사람
--                       기기로 알림이 계속 가면 안 된다.
--                       ⚠️ `support_access_logs`(원칙 32번)와 반대로 잡은 것이다 —
--                       그쪽은 **이력**이라 남겨야 하지만 이것은 **살아 있는 발송
--                       대상 목록**이라 남으면 사고다.
--
--   user_agent          어느 기기인지 사람이 알아보기 위한 것뿐이다.
--                       🔴 **이것으로 무엇을 가르지 말 것** — 값이 없거나 거짓일 수 있다.
--
--   실패 기록 두 칸      `last_success_at` / `failed_at`. 🔴 **발송이 404·410 이면 행을
--                       지운다**(기기를 바꾸거나 앱을 지운 것이다). 그 밖의 오류는
--                       `failed_at` 만 찍고 남긴다 — 일시적 장애로 구독을 버리면
--                       담당자가 다시 눌러야 한다.
--
-- 🔴 **개인정보가 아니다** — 이 표에는 이름·연락처가 없고, 브라우저가 발급한 기기
--    식별자와 공개키뿐이다. 그래서 처리방침 변경이 없다.
--    🔴 **여기에 직원 이름·이메일 컬럼을 더하지 말 것**(이 저장소는 public 이고,
--    필요하면 `staff_accounts` 를 조인하면 된다).

create table if not exists push_subscriptions (
  id              uuid        primary key default gen_random_uuid(),
  staff_id        uuid        not null references staff_accounts (id) on delete cascade,
  -- 브라우저가 준 푸시 서비스 주소. 🔴 기기 하나당 하나 — 유니크다.
  endpoint        text        not null unique,
  -- 브라우저가 준 암호화 키 두 개(RFC 8291). 이것이 있어야 페이로드를 실을 수 있다.
  p256dh          text        not null,
  auth            text        not null,
  -- 어느 기기인지 사람이 알아보기 위한 것뿐 (선택)
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_success_at timestamptz,
  failed_at       timestamptz
);

-- 발송은 **전 직원 구독 전수**를 훑으므로 인덱스가 필요 없지만,
-- 「이 직원의 기기 목록」과 「퇴사자 정리」에 쓴다.
create index if not exists push_subscriptions_staff_idx on push_subscriptions (staff_id);

alter table push_subscriptions enable row level security;
-- 🔴 정책을 만들지 않는다. 정책 0개 + RLS on = service_role 전용.
--    🔴 **화주와 직원이 같은 롤이라 「직원만」 정책을 쓸 수 없다** — 만들면 새어 나간다.

-- ── 단언 ────────────────────────────────────────────────────────────────────
-- 🔴 위 결정 셋이 실제로 반영됐는지 **되돌릴 수 있을 때** 확인한다.
--    어긋나면 아무것도 반영되지 않고 워크플로가 빨간불로 멈춘다.
do $$
declare
  n_policy   int;
  has_rls    boolean;
  has_uniq   boolean;
  fk_action  text;
begin
  select count(*) into n_policy
    from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions';
  if n_policy <> 0 then
    raise exception 'push_subscriptions 에 정책이 % 개 있습니다 — 0개여야 합니다(화주와 직원이 같은 롤이라 새어 나갑니다)', n_policy;
  end if;

  select relrowsecurity into has_rls from pg_class where oid = 'public.push_subscriptions'::regclass;
  if not has_rls then
    raise exception 'push_subscriptions 에 RLS 가 꺼져 있습니다';
  end if;

  select exists (
    select 1 from pg_constraint
     where conrelid = 'public.push_subscriptions'::regclass
       and contype = 'u'
       and pg_get_constraintdef(oid) like '%(endpoint)%'
  ) into has_uniq;
  if not has_uniq then
    raise exception 'endpoint 유니크 제약이 없습니다 — 같은 기기가 두 번 등록되면 알림이 두 번 갑니다';
  end if;

  -- 'c' = cascade. 퇴사자 기기로 알림이 계속 가면 안 된다.
  select confdeltype into fk_action from pg_constraint
    where conrelid = 'public.push_subscriptions'::regclass and contype = 'f';
  if fk_action is distinct from 'c' then
    raise exception 'staff_id FK 의 on delete 가 cascade 가 아닙니다: %', fk_action;
  end if;
end $$;

-- ── 되돌리기 ────────────────────────────────────────────────────────────────
--   drop table if exists push_subscriptions;
-- 🔴 되돌리면 직원들이 각자 「이 기기로 알림 받기」를 **다시 눌러야** 한다.
