-- 21차 · anon RLS 정리 ② — anon 무조건 허용 정책을 지운다
--
-- 🔴 19차와 성격이 다르다. 19차는 정책을 "더하기"만 했지만 이번은 "지우기"다.
--   되돌리려면 지운 정책을 복원해야 한다 — 복원 SQL 은 이 파일 맨 아래 주석에 있다.
--
-- 무엇을 지우는가:
--   anon 롤의 무조건 허용 정책 17개(`ALL true/true` 13 + `SELECT true` 4).
--   🔴 **INSERT 전용 anon 정책 2개는 남긴다** — 이것을 지우면 공개 견적문의(/quote)와
--   운송관리 계정 신청(/apply)이 죽는다(원칙 3).
--     public_quote_requests.public_can_insert_quote_request
--     customer_applications.public_can_insert_application
--   ⚠️ 14차가 `public_quote_requests` anon INSERT 를 "제거 대상"으로 적었지만 그건
--   서버 API 실사용 검증 후의 이야기다. 이번에 지우지 않는다.
--
-- 무엇을 남기는가:
--   · 화주 정책 14개 (화주포털) — 지우면 화주포털이 죽는다
--   · 직원 정책 staff_all_* (19차) — 지우면 관리자 화면이 죽는다
--   · RLS on + 정책 0개인 표들 (consents·sms_logs·dispatch_photos 등) — service_role
--     전용이 정상이다. 고치지 말 것
--
-- ⚠️ **적용 순서 — 19차와 반대다.** 19차 마이그레이션은 정책을 더하기만 해서 코드보다
--   먼저 넣어도 무해했지만, 이번은 지우는 것이라 **코드가 먼저 배포된 뒤** 넣어야 한다
--   (화주포털의 rate_surcharges 조회가 서버 API 로 옮겨진 뒤여야 한다 — 같은 PR).

-- ── ① 지우기 전에 대체 정책을 먼저 만든다 ───────────────────────────────
-- 🔴 customer_presets 는 48차에 만들어졌는데 19차 대상 목록에서 빠져 있었다
--   (쓰는 화면이 아직 없어 눈에 안 띄었다). 직원 정책 없이 anon 을 지우면 22·23차
--   화면이 붙는 순간 관리자 쪽에서 못 읽는다. 지금 만들어 둔다.
-- 🔴 `is_active = true` 조건이 붙은 화주 정책은 건드리지 않는다(48차 확정) —
--   빼면 비활성화된 계정이 프리셋을 읽고 쓴다.
drop policy if exists staff_all_customer_presets on public.customer_presets;
create policy staff_all_customer_presets on public.customer_presets
  as permissive for all to authenticated
  using (public.is_active_staff()) with check (public.is_active_staff());

-- {public} 롤 정책 중 관리자가 화면에서 직접 읽는 두 설정 표는 직원 정책으로 바꾼다.
-- (`public` 롤은 anon·authenticated 를 모두 포함해 anon 정책보다 넓다 — anon 정책만
--  지우고 이것을 두면 anon 이 이 경로로 계속 들어온다.)
drop policy if exists staff_all_insurance_rate_settings on public.insurance_rate_settings;
create policy staff_all_insurance_rate_settings on public.insurance_rate_settings
  as permissive for all to authenticated
  using (public.is_active_staff()) with check (public.is_active_staff());

drop policy if exists staff_all_mixed_loading_discount_settings on public.mixed_loading_discount_settings;
create policy staff_all_mixed_loading_discount_settings on public.mixed_loading_discount_settings
  as permissive for all to authenticated
  using (public.is_active_staff()) with check (public.is_active_staff());

-- ── ② 🔴 지우기 전 단언 — 대체 정책이 없는 테이블이 있으면 멈춘다 ────────
-- 50차의 staff_accounts 사례처럼, 이 단언이 실제로 사고를 막는다.
do $$
declare
  r record;
  missing text := '';
begin
  for r in
    select distinct c.relname as tbl, c.oid as reloid
    from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    where p.polroles::regrole[] @> array['anon'::regrole]
      and p.polcmd <> 'a'                      -- INSERT 전용은 안 지운다
  loop
    -- dispatch_extra_charges 는 일부러 직원 정책이 없다 — 관리자 조회가 19차에
    -- service_role 서버 API 로 옮겨졌고, 화주는 authenticated 정책 + 컬럼 GRANT 로
    -- 안전 컬럼만 본다. 🔴 여기에 authenticated 전체 SELECT 를 주지 말 것(16차 보호).
    if r.tbl = 'dispatch_extra_charges' then continue; end if;

    if not exists (
      select 1 from pg_policy q
      where q.polrelid = r.reloid
        and q.polroles::regrole[] @> array['authenticated'::regrole]
        and q.polname = 'staff_all_' || r.tbl
    ) then
      missing := missing || r.tbl || ' ';
    end if;
  end loop;

  if missing <> '' then
    raise exception '대체할 직원 정책이 없는 테이블이 있다 — anon 정책을 지우면 막힌다: %', missing;
  end if;
end $$;

-- ── ③ anon 무조건 허용 정책 삭제 (INSERT 전용 2개는 보존) ────────────────
do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select c.relname as tbl, p.polname as pol
    from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n2 on n2.oid = c.relnamespace and n2.nspname = 'public'
    where p.polroles::regrole[] @> array['anon'::regrole]
      and p.polcmd <> 'a'
  loop
    execute format('drop policy %I on public.%I', r.pol, r.tbl);
    n := n + 1;
  end loop;

  if n <> 17 then
    raise exception 'anon 무조건 허용 정책이 17개여야 하는데 %개를 지웠다.', n;
  end if;
end $$;

-- ── ④ {public} 롤의 `using(true)` 정책 삭제 ──────────────────────────────
-- 🔴 뒤 두 개(settlement_type_change_logs · invoice_amendment_logs)는 **이력 표**라
--   정책을 0개로 두어 service_role 전용이 된다(사용자 결정 2026-08-26).
--   쓰는 쪽이 전부 service_role 서버 API 이므로 동작에 지장이 없고, 현행 대체물인
--   settlement_field_change_logs · sms_logs · support_access_logs 가 이미 같은 모양이다.
-- ⚠️ `staff_accounts` 의 "staff can read own row"({public}, `auth.uid() = id`)는 남긴다 —
--   조건이 좁아 anon 에게는 열리지 않는다(anon 은 auth.uid() 가 null).
do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select c.relname as tbl, p.polname as pol
    from pg_policy p join pg_class c on c.oid = p.polrelid
    join pg_namespace n2 on n2.oid = c.relnamespace and n2.nspname = 'public'
    where p.polroles = '{0}'                        -- {public}
      and pg_get_expr(p.polqual, p.polrelid) = 'true'
  loop
    execute format('drop policy %I on public.%I', r.pol, r.tbl);
    n := n + 1;
  end loop;

  if n <> 4 then
    raise exception '{public} using(true) 정책이 4개여야 하는데 %개를 지웠다.', n;
  end if;
end $$;

-- ── ⑤ 남은 모습 단언 ────────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname = 'public'
  where p.polroles::regrole[] @> array['anon'::regrole];
  if n <> 2 then
    raise exception '남은 anon 정책은 INSERT 전용 2개여야 하는데 %개다.', n;
  end if;

  if not exists (select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
                 where c.relname = 'public_quote_requests'
                   and p.polroles::regrole[] @> array['anon'::regrole] and p.polcmd = 'a') then
    raise exception '/quote 공개 견적문의의 anon INSERT 정책이 사라졌다.';
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
                 where c.relname = 'customer_applications'
                   and p.polroles::regrole[] @> array['anon'::regrole] and p.polcmd = 'a') then
    raise exception '/apply 계정 신청의 anon INSERT 정책이 사라졌다.';
  end if;

  -- 화주 정책 14개가 그대로 있어야 화주포털이 산다
  select count(*) into n
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname = 'public'
  where p.polroles::regrole[] @> array['authenticated'::regrole]
    and p.polname not like 'staff\_all\_%';
  if n <> 14 then
    raise exception '화주 정책이 14개여야 하는데 %개다 — 지워졌는지 확인할 것.', n;
  end if;

  -- 직원 정책 16 + 이번 3 = 19
  select count(*) into n
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname = 'public'
  where p.polname = 'staff_all_' || c.relname;
  if n <> 19 then
    raise exception '직원 정책이 19개여야 하는데 %개다.', n;
  end if;
end $$;

-- ── ⑥ 🔴 롤별 실측 — 세 롤을 흉내내어 실제로 재본다 ──────────────────────
do $$
declare
  v_staff uuid;
  v_cust  uuid;
  v_comp  uuid;
  n_owner bigint;
  n_role  bigint;
  t text;
  staff_tables text[] := array[
    'announcements','claims','companies','customer_accounts',
    'customer_billing_batch_items','customer_billing_batches','customer_locations',
    'customer_presets','dispatches','external_networks','invoices','orders',
    'portal_order_requests','public_quote_requests','quote_items','quotes',
    'staff_accounts','insurance_rate_settings','mixed_loading_discount_settings'
  ];
  anon_zero_tables text[] := array[
    'companies','customer_accounts','customer_locations','quotes','orders',
    'dispatches','invoices','quote_items','portal_order_requests','claims',
    'staff_accounts','external_networks','customer_presets',
    'settlement_type_change_logs','invoice_amendment_logs',
    'insurance_rate_settings','mixed_loading_discount_settings'
  ];
begin
  select id into v_staff from staff_accounts where status = 'active' order by created_at limit 1;
  if v_staff is null then raise exception '재직 직원이 없어 검증할 수 없다.'; end if;
  select auth_user_id, company_id into v_cust, v_comp
    from customer_accounts where is_active = true and auth_user_id is not null limit 1;

  -- (a) 직원 — 관리자 화면이 읽는 표에서 소유자와 행수가 같아야 한다
  foreach t in array staff_tables loop
    execute format('select count(*) from public.%I', t) into n_owner;
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    execute format('select count(*) from public.%I', t) into n_role;
    execute 'reset role';
    if n_role <> n_owner then
      raise exception '직원 세션에서 % 가 안 보인다: 전체 %행 / 직원에게 %행', t, n_owner, n_role;
    end if;
  end loop;

  -- (b) 🔴 anon — 개인정보가 있는 표에서 0행이어야 한다
  foreach t in array anon_zero_tables loop
    execute format('select count(*) from public.%I', t) into n_owner;
    if n_owner = 0 then continue; end if;   -- 원래 비어 있으면 판정이 무의미
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
    execute format('select count(*) from public.%I', t) into n_role;
    execute 'reset role';
    if n_role <> 0 then
      raise exception 'anon 이 아직 % 를 읽는다: %행', t, n_role;
    end if;
  end loop;

  -- (c) 화주 — 자기 회사만. 직원 전용 표는 0행
  if v_cust is not null then
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_cust, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    execute 'select count(*) from public.staff_accounts' into n_role;
    if n_role <> 0 then
      execute 'reset role';
      raise exception '화주가 staff_accounts 를 %행 읽는다 — 0이어야 한다.', n_role;
    end if;
    execute 'select count(*) from public.claims' into n_role;
    if n_role <> 0 then
      execute 'reset role';
      raise exception '화주가 claims 를 %행 읽는다 — 0이어야 한다.', n_role;
    end if;
    execute 'select count(*) from public.external_networks' into n_role;
    if n_role <> 0 then
      execute 'reset role';
      raise exception '화주가 external_networks 를 %행 읽는다 — 0이어야 한다.', n_role;
    end if;

    -- 🔴 22·23차 화면이 처음으로 쓰는 두 표 — 자기 회사 것만 읽고 쓸 수 있어야 한다
    execute format('select count(*) from public.customer_locations where company_id <> %L', v_comp)
      into n_role;
    if n_role <> 0 then
      execute 'reset role';
      raise exception '화주가 남의 회사 배송지를 %행 읽는다.', n_role;
    end if;
    execute format('select count(*) from public.customer_presets where company_id <> %L', v_comp)
      into n_role;
    if n_role <> 0 then
      execute 'reset role';
      raise exception '화주가 남의 회사 프리셋을 %행 읽는다.', n_role;
    end if;

    execute 'reset role';
  end if;
end $$;

reset role;

-- ═══════════════════════════════════════════════════════════════════════
-- 🔴 되돌리는 SQL — 이번은 "지우기"라 복원 문장이 필요하다
--
--   -- anon 무조건 허용 17개 복원 (전부 원래 이름 그대로)
--   create policy admin_full_access_announcements on announcements for all to anon using (true) with check (true);
--   create policy claims_anon_all on claims for all to anon using (true) with check (true);
--   create policy admin_full_access_companies on companies for all to anon using (true) with check (true);
--   create policy admin_full_access_customer_accounts on customer_accounts for all to anon using (true) with check (true);
--   create policy admin_full_access_customer_locations on customer_locations for all to anon using (true) with check (true);
--   create policy admin_full_access_customer_presets on customer_presets for all to anon using (true) with check (true);
--   create policy admin_full_access_dispatches on dispatches for all to anon using (true) with check (true);
--   create policy external_networks_anon_all on external_networks for all to anon using (true) with check (true);
--   create policy admin_full_access_invoices on invoices for all to anon using (true) with check (true);
--   create policy admin_full_access_orders on orders for all to anon using (true) with check (true);
--   create policy admin_full_access_portal_order_requests on portal_order_requests for all to anon using (true) with check (true);
--   create policy admin_full_access_quote_items on quote_items for all to anon using (true) with check (true);
--   create policy admin_full_access_quotes on quotes for all to anon using (true) with check (true);
--   create policy "anon can select customer billing batch items" on customer_billing_batch_items for select to anon using (true);
--   create policy "anon can select customer billing batches" on customer_billing_batches for select to anon using (true);
--   create policy "anon can select dispatch extra charges" on dispatch_extra_charges for select to anon using (true);
--   create policy "anon can read staff accounts" on staff_accounts for select to anon using (true);
--
--   -- {public} using(true) 4개 복원
--   create policy "anon full access" on insurance_rate_settings for all using (true) with check (true);
--   create policy "anon full access" on mixed_loading_discount_settings for all using (true) with check (true);
--   create policy "anon full access" on settlement_type_change_logs for all using (true) with check (true);
--   create policy invoice_amendment_logs_select_anon on invoice_amendment_logs for select using (true);
--
--   -- 이번에 만든 직원 정책 3개 제거
--   drop policy staff_all_customer_presets on customer_presets;
--   drop policy staff_all_insurance_rate_settings on insurance_rate_settings;
--   drop policy staff_all_mixed_loading_discount_settings on mixed_loading_discount_settings;
-- ═══════════════════════════════════════════════════════════════════════
