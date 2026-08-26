-- 19차 · anon RLS 정리 ① — 재직 직원 전용 정책 추가
--
-- 무엇을 하는가:
--   관리자 화면의 DB 질의가 anon key 가 아니라 "로그인한 직원의 세션"으로 나가도록
--   바꾸기 전에(같은 PR 의 lib/supabaseClient.ts), 그 세션이 통과할 정책을 먼저 만든다.
--
-- 🔴 왜 코드보다 정책이 먼저인가 — 19차 지시서의 전제가 틀렸다.
--   지시서는 "anon 정책이 USING(true) 로 열려 있으니 authenticated 로 바뀌어도 그대로
--   통과한다"고 했으나, RLS 정책은 롤별로 갈린다. anon 정책은 `TO anon` 이라
--   authenticated 요청에는 아예 적용되지 않는다. 실제 DB 를 조사한 결과:
--     · 11개 테이블에 `TO authenticated` 정책이 있는데 전부 **화주 본인 회사로 한정**돼
--       있고 대부분 SELECT 전용이다 → 직원이 authenticated 로 붙으면 0행 + 저장 불가
--     · anon 정책만 있는 테이블(claims·external_networks 등)은 authenticated 에 맞는
--       정책이 하나도 없어 **RLS 기본값인 거부**가 된다
--   즉 정책을 안 만들고 코드만 바꾸면 관리자 화면이 조회·저장 모두 막힌다.
--
-- 🔴 기존 정책은 하나도 지우지 않는다. RLS 정책은 permissive 라 OR 로 합쳐지므로,
--   anon 정책(현행 동작)과 화주 정책(화주포털)은 그대로 두고 직원용을 한 겹 더한다.
--   그래서 이 마이그레이션만으로는 노출이 넓어지지도 좁아지지도 않는다 — 되돌릴 때도
--   여기서 만든 것만 지우면 된다.
--
-- 🔴 dispatch_extra_charges 는 일부러 뺐다. 16차가 차주 지급액(driver_payout_amount)을
--   컬럼 단위 GRANT 로 authenticated 에서 회수해 화주에게 감췄는데, 직원도 이제
--   authenticated 가 되므로 GRANT 로는 둘을 구분할 수 없다. 관리자 조회를
--   service_role 서버 API(/api/admin/dispatch-extra-charges/list)로 옮겨서
--   16차의 컬럼 보호를 그대로 지킨다(사용자 결정 2026-08-26).

-- ── ① 재직 직원 판정 함수 ────────────────────────────────────────────────
-- 🔴 security definer 다. staff_accounts 자체에도 RLS 가 걸려 있어서, 정책 안에서
--   그냥 서브쿼리로 조회하면 그 조회에 다시 RLS 가 걸려 조용히 false 가 될 수 있다.
--   정책이 참조하는 판정은 RLS 를 우회해야 한다.
-- 🔴 `authenticated` 롤은 화주포털 계정도 같이 쓴다. 조건을 단순 `authenticated` 로
--   두면 화주가 관리자 데이터를 읽는다. 반드시 재직 직원임을 확인할 것.
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.staff_accounts
    where id = auth.uid() and status = 'active'
  );
$fn$;

revoke all on function public.is_active_staff() from public;
grant execute on function public.is_active_staff() to authenticated;

-- ── ② 직원 전용 정책 (관리자 화면이 anon 클라이언트로 직접 질의하는 테이블) ──
do $$
declare
  t text;
  targets text[] := array[
    'announcements', 'claims', 'companies', 'customer_accounts',
    'customer_billing_batch_items', 'customer_billing_batches',
    'customer_locations', 'dispatches', 'external_networks', 'invoices',
    'orders', 'portal_order_requests', 'public_quote_requests',
    'quote_items', 'quotes',
    -- 🔴 staff_accounts 도 필요하다. 이 표의 {public} 정책은 `using(true)` 가 아니라
    --   **본인 행만**(id = auth.uid()) 이라, 직원 세션으로는 자기 한 줄만 보인다.
    --   관리자 화면은 "등록/최종수정: OOO" 표시(ProcessedByFooter)·직원 계정 관리·
    --   문자 이력의 보낸 사람 등에서 **다른 직원의 이름**을 읽어야 한다.
    --   ⚠️ 넓히는 것이 아니다 — anon 정책이 이미 전체를 열어두고 있고, 그것을
    --   회수하는 ③ 차수 뒤에는 이 정책이 유일한 통로가 된다.
    'staff_accounts'
  ];
begin
  foreach t in array targets loop
    execute format('drop policy if exists %I on public.%I', 'staff_all_' || t, t);
    execute format(
      'create policy %I on public.%I as permissive for all to authenticated '
      || 'using (public.is_active_staff()) with check (public.is_active_staff())',
      'staff_all_' || t, t
    );
  end loop;
end $$;

-- 월정산 묶음 후보 뷰. 뷰에는 정책을 걸 수 없어 GRANT 로만 통제된다.
-- ⚠️ anon 이 이미 읽고 있던 것과 같은 수준을 authenticated 에도 준 것이다.
--   ③(anon GRANT 회수) 차수에서 이 뷰를 security_invoker 로 바꾸거나 서버 API 로
--   옮길지 함께 정할 것 — 지금은 화주도 읽을 수 있는 상태다.
grant select on public.customer_billing_batch_candidates to authenticated;

-- ── ③ 단언: 함수와 정책이 실제로 생겼는가 ────────────────────────────────
do $$
declare
  n int;
begin
  if to_regprocedure('public.is_active_staff()') is null then
    raise exception 'is_active_staff() 가 만들어지지 않았다.';
  end if;

  select count(*) into n
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname = 'public'
  where p.polname = 'staff_all_' || c.relname
    and p.polroles::regrole[] @> array['authenticated'::regrole];
  if n <> 16 then
    raise exception '직원 정책이 16개여야 하는데 %개다.', n;
  end if;

  -- 🔴 기존 정책이 지워지지 않았는지 확인한다. 화주포털 정책 14개 + anon 정책들이
  --   그대로 있어야 이번 변경이 "한 겹 더하기"로 끝난다.
  select count(*) into n
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname = 'public'
  where p.polroles::regrole[] @> array['authenticated'::regrole]
    and p.polname not like 'staff\_all\_%';
  if n <> 14 then
    raise exception '기존 화주 정책이 14개여야 하는데 %개다 — 지워졌는지 확인할 것.', n;
  end if;

  select count(*) into n
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname = 'public'
  where p.polroles::regrole[] @> array['anon'::regrole];
  if n <> 19 then
    raise exception 'anon 정책이 19개여야 하는데 %개다 — 지워졌는지 확인할 것.', n;
  end if;
end $$;

-- ── ④ 🔴 진짜 확인: 재직 직원을 흉내내어 관리자 화면이 보는 행수를 비교한다 ──
-- 정책을 만들었다는 것과 그 정책으로 실제 데이터가 보인다는 것은 다르다.
-- 여기서 실패하면 트랜잭션이 통째로 되돌아가고 워크플로가 빨간불로 멈춘다.
do $$
declare
  v_staff uuid;
  n_owner bigint;
  n_staff bigint;
  t text;
  -- 관리자 화면이 anon 클라이언트로 직접 읽는 테이블 전부.
  -- 정책을 새로 만든 15개 + 이미 통과해야 하는 것들(RLS 꺼짐 / {public} 정책)을
  -- 같이 넣어 관리자 화면 전체를 한 번에 검사한다.
  targets text[] := array[
    'announcements', 'claims', 'companies', 'customer_accounts',
    'customer_billing_batch_items', 'customer_billing_batches',
    'customer_locations', 'dispatches', 'external_networks', 'invoices',
    'orders', 'portal_order_requests', 'public_quote_requests',
    'quote_items', 'quotes',
    'staff_accounts', 'insurance_rate_settings',
    'mixed_loading_discount_settings', 'settlement_type_change_logs',
    'drivers', 'individual_customers', 'individual_customer_addresses',
    'rate_distance_tiers', 'rate_surcharges', 'rate_vehicle_extra_fees',
    'vehicles'
  ];
begin
  select id into v_staff from staff_accounts
  where status = 'active' order by created_at limit 1;
  if v_staff is null then
    raise exception '재직 중인 직원 계정이 없어 정책을 검증할 수 없다.';
  end if;

  foreach t in array targets loop
    execute format('select count(*) from public.%I', t) into n_owner;

    perform set_config('request.jwt.claims',
      json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    execute format('select count(*) from public.%I', t) into n_staff;
    execute 'reset role';

    if n_staff <> n_owner then
      raise exception '직원 세션에서 % 가 안 보인다: 전체 %행 / 직원에게 %행',
        t, n_owner, n_staff;
    end if;
  end loop;

  -- 월정산 묶음 후보 뷰도 직원 세션에서 읽히는지 확인(에러 없이 조회되면 통과)
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  if not public.is_active_staff() then
    execute 'reset role';
    raise exception '직원 흉내내기가 안 됐다 — is_active_staff() 가 false 다.';
  end if;
  execute 'select count(*) from public.customer_billing_batch_candidates' into n_staff;
  execute 'reset role';
end $$;

reset role;
