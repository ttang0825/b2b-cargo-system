-- 화주포털 B장 — 화주용 웹 푸시 구독 표 신설
--
-- 배경: 38차 A장이 화주포털에 화면 안 알림(배너·탭 제목·소리)을 넣었지만, 그것은
-- **포털을 열어 둔 동안에만** 보인다. 화주는 담당자와 달리 하루 종일 포털을 띄워 두지
-- 않는다 — 견적이 도착한 것을 **닫아 둔 채로** 알 수 있어야 한다.
--
-- 🔴 **`push_subscriptions`(직원용)와 섞지 않고 표를 따로 만든 것이 핵심 결정이다.**
--    한 표에 `staff_id`/`customer_account_id` 를 나란히 두면 언젠가 누군가
--    「조회 편하게」 정책을 하나 열고, 그 순간 **화주와 직원 기기가 한꺼번에 샌다**
--    (화주포털 계정과 직원 계정이 **둘 다 `authenticated` 롤**이다 — 19차).
--    표가 둘이면 그 사고가 한쪽에서 끝난다. 🔴 **합치지 말 것.**
--
-- 🔴 설계 결정 — 바꾸기 전에 이유를 먼저 볼 것
--
--   RLS on + 정책 0개        직원용 표와 같다. 서버 API(service_role)로만 읽고 쓴다.
--
--   endpoint unique          같은 기기가 두 번 등록되면 알림이 두 번 온다.
--                            🔴 「먼저 조회해서 없으면 insert」로 대신하지 말 것(§7).
--                            서버 API 는 `on conflict (endpoint) do update` 로 쓴다.
--
--   customer_account_id 뿐   🔴 **`company_id` 를 여기에 복사해 두지 않는다.**
--                            담당자 계정이 다른 화주로 옮겨지면 복사해 둔 값이 낡아
--                            **남의 회사 소식이 그 폰으로 간다.** 발송은 그때그때
--                            `customer_accounts` 를 조인해서 회사를 정한다(한 번의 조인).
--                            ⚠️ 그래서 이 표만 보고는 「어느 화주인가」를 알 수 없다 —
--                            그것이 의도다.
--
--   FK 는 on delete cascade  계정이 지워지면 그 기기로 알림이 계속 가면 안 된다.
--                            ⚠️ `support_access_logs`(원칙 32번)와 반대다 — 그쪽은
--                            **이력**이고 이것은 **살아 있는 발송 대상 목록**이다.
--
--   user_agent               어느 기기인지 사람이 알아보기 위한 것뿐이다.
--                            🔴 이것으로 무엇을 가르지 말 것(없거나 거짓일 수 있다).
--
-- 🔴 **개인정보가 아니다** — 이름·연락처가 없고 브라우저가 발급한 기기 식별자와
--    공개키뿐이다. 그래서 처리방침 변경이 없다.
--    🔴 **여기에 상호·담당자명·연락처 컬럼을 더하지 말 것**(이 저장소는 public 이고,
--    필요하면 `customer_accounts` 를 조인하면 된다).

create table if not exists customer_push_subscriptions (
  id                  uuid        primary key default gen_random_uuid(),
  customer_account_id uuid        not null references customer_accounts (id) on delete cascade,
  -- 브라우저가 준 푸시 서비스 주소. 🔴 기기 하나당 하나 — 유니크다.
  endpoint            text        not null unique,
  -- 브라우저가 준 암호화 키 두 개(RFC 8291). 이것이 있어야 페이로드를 실을 수 있다.
  p256dh              text        not null,
  auth                text        not null,
  user_agent          text,
  created_at          timestamptz not null default now(),
  last_success_at     timestamptz,
  failed_at           timestamptz
);

-- 발송이 **회사 단위**라 매번 `customer_accounts` 를 조인한다 — 그 조인의 축이다.
create index if not exists customer_push_subscriptions_account_idx
  on customer_push_subscriptions (customer_account_id);

alter table customer_push_subscriptions enable row level security;
-- 🔴 정책을 만들지 않는다. 정책 0개 + RLS on = service_role 전용.

-- ── 단언 ────────────────────────────────────────────────────────────────────
-- 🔴 위 결정들이 실제로 반영됐는지 **되돌릴 수 있을 때** 확인한다.
do $$
declare
  n_policy  int;
  has_rls   boolean;
  has_uniq  boolean;
  fk_action text;
  n_company int;
begin
  select count(*) into n_policy
    from pg_policies where schemaname = 'public' and tablename = 'customer_push_subscriptions';
  if n_policy <> 0 then
    raise exception 'customer_push_subscriptions 에 정책이 % 개 있습니다 — 0개여야 합니다(화주와 직원이 같은 롤이라 새어 나갑니다)', n_policy;
  end if;

  select relrowsecurity into has_rls
    from pg_class where oid = 'public.customer_push_subscriptions'::regclass;
  if not has_rls then
    raise exception 'customer_push_subscriptions 에 RLS 가 꺼져 있습니다';
  end if;

  select exists (
    select 1 from pg_constraint
     where conrelid = 'public.customer_push_subscriptions'::regclass
       and contype = 'u'
       and pg_get_constraintdef(oid) like '%(endpoint)%'
  ) into has_uniq;
  if not has_uniq then
    raise exception 'endpoint 유니크 제약이 없습니다 — 같은 기기가 두 번 등록되면 알림이 두 번 갑니다';
  end if;

  select confdeltype into fk_action from pg_constraint
    where conrelid = 'public.customer_push_subscriptions'::regclass and contype = 'f';
  if fk_action is distinct from 'c' then
    raise exception 'customer_account_id FK 의 on delete 가 cascade 가 아닙니다: %', fk_action;
  end if;

  -- 🔴 `company_id` 를 복사해 두지 않기로 한 결정을 지킨다.
  select count(*) into n_company
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'customer_push_subscriptions'
     and column_name = 'company_id';
  if n_company <> 0 then
    raise exception 'company_id 컬럼이 있습니다 — 계정이 다른 화주로 옮겨지면 낡은 값으로 남의 회사 소식이 갑니다. 발송 시 customer_accounts 를 조인하십시오';
  end if;

  -- 🔴 직원용 표와 섞이지 않았는지도 본다.
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'customer_push_subscriptions'
       and column_name = 'staff_id'
  ) then
    raise exception 'staff_id 컬럼이 있습니다 — 직원용은 push_subscriptions 이고 표를 섞지 않기로 했습니다';
  end if;
end $$;

-- ── 되돌리기 ────────────────────────────────────────────────────────────────
--   drop table if exists customer_push_subscriptions;
-- 🔴 되돌리면 화주들이 각자 「이 기기로 알림 받기」를 **다시 눌러야** 한다.
