-- 21차 · anon RLS 정리 ④ — RLS 가 꺼져 있던 13개를 켠다
--
-- 🔴 RLS 를 켜는 순간 **정책이 없으면 전부 거부**다. 그래서 켜기와 정책을 **같은 파일,
--   같은 트랜잭션**에 둔다. 파일이 갈리면 그 사이에 화면이 죽는다(파일 사이는 원자적이지
--   않다 — 47차 (F)②). 🔴 **이 둘을 다른 파일로 쪼개지 말 것.**
--
-- 왜 이 13개가 문제였나: RLS 가 꺼져 있으면 정책이 아니라 GRANT 가 유일한 관문인데
-- `anon` 은 47개 표 전부에 SELECT·INSERT·UPDATE·DELETE 를 갖고 있다. 즉 `drivers`
-- (차주 성명·연락처·차량번호)와 `individual_customers`(개인고객 성명·연락처·이메일)가
-- **anon key 만으로 읽기도 쓰기도 삭제도 되는 상태**였다(49차 조사).
--
-- ⚠️ **적용 순서** — 화주포털 발주요청 화면이 `rate_surcharges` 를 직접 읽고 있었다.
--   같은 PR 에서 그 조회를 service_role 서버 API 로 옮겼으므로, **코드가 먼저 배포된 뒤**
--   이 마이그레이션을 넣어야 한다. 순서를 뒤집으면 발주요청 화면의 드롭다운이 빈다.

-- ── ① 관리자가 쓰는 7개 — RLS 켜고 직원 전용 정책 ────────────────────────
-- 🔴 `is_active_staff()` 는 19차가 만든 security definer 함수다. 서브쿼리로 대체하지
--   말 것 — `staff_accounts` 에도 RLS 가 걸려 있어 조용히 false 가 된다.
do $$
declare
  t text;
  targets text[] := array[
    'drivers', 'vehicles',
    'individual_customers', 'individual_customer_addresses',
    -- 🔴 운임기준표 3종. 여기가 막히면 견적 자동계산이 통째로 죽는다.
    'rate_distance_tiers', 'rate_surcharges', 'rate_vehicle_extra_fees'
  ];
begin
  foreach t in array targets loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'staff_all_' || t, t);
    execute format(
      'create policy %I on public.%I as permissive for all to authenticated '
      || 'using (public.is_active_staff()) with check (public.is_active_staff())',
      'staff_all_' || t, t
    );
  end loop;
end $$;

-- ── ② 쓰이지 않는 6개 — RLS 만 켜고 정책은 만들지 않는다(= service_role 전용) ──
-- 코드 전수 grep 에서 참조 0건이고 행도 0건이다. 정책을 안 만들면 anon·authenticated
-- 양쪽 다 막히고 service_role 만 닿는다 — `consents`·`sms_logs` 와 같은 모양이다.
-- ⚠️ **표를 지우지는 않았다**(금지사항 9 — 50차도 죽은 파일을 확인하고 그대로 뒀다).
--   나중에 쓸 일이 생기면 그때 정책을 만들면 된다.
-- ⚠️ `profiles` 는 27차가 남긴 레거시다(`quotes.created_by` 가 한때 이 표를 참조했다).
do $$
declare
  t text;
  targets text[] := array[
    'activity_logs', 'contacts', 'files', 'profiles', 'rates', 'sales_activities'
  ];
  n bigint;
begin
  foreach t in array targets loop
    execute format('select count(*) from public.%I', t) into n;
    if n <> 0 then
      raise exception '% 가 비어 있지 않다(%행) — 죽은 표라는 전제가 틀렸으니 정책을 다시 볼 것.', t, n;
    end if;
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ── ③ 단언: public 스키마에 RLS 꺼진 표가 하나도 없어야 한다 ─────────────
do $$
declare
  leftover text;
begin
  select string_agg(c.relname, ' ') into leftover
  from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relkind = 'r' and not c.relrowsecurity;
  if leftover is not null then
    raise exception 'RLS 가 아직 꺼진 표가 있다: %', leftover;
  end if;
end $$;

-- ── ④ 🔴 롤별 실측 ──────────────────────────────────────────────────────
do $$
declare
  v_staff uuid;
  v_cust  uuid;
  n_owner bigint;
  n_role  bigint;
  t text;
  staff_tables text[] := array[
    'drivers','vehicles','individual_customers','individual_customer_addresses',
    'rate_distance_tiers','rate_surcharges','rate_vehicle_extra_fees'
  ];
begin
  select id into v_staff from staff_accounts where status = 'active' order by created_at limit 1;
  if v_staff is null then raise exception '재직 직원이 없어 검증할 수 없다.'; end if;
  select auth_user_id into v_cust
    from customer_accounts where is_active = true and auth_user_id is not null limit 1;

  foreach t in array staff_tables loop
    execute format('select count(*) from public.%I', t) into n_owner;

    -- (a) 직원 — 전부 보여야 한다
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    execute format('select count(*) from public.%I', t) into n_role;
    execute 'reset role';
    if n_role <> n_owner then
      raise exception '직원 세션에서 % 가 안 보인다: 전체 %행 / 직원에게 %행', t, n_owner, n_role;
    end if;

    if n_owner = 0 then continue; end if;   -- 비어 있으면 아래 판정이 무의미

    -- (b) anon — 0행이어야 한다
    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
    execute format('select count(*) from public.%I', t) into n_role;
    execute 'reset role';
    if n_role <> 0 then
      raise exception 'anon 이 아직 % 를 읽는다: %행', t, n_role;
    end if;

    -- (c) 화주 — 0행이어야 한다 (전부 관리자·내부 데이터다)
    if v_cust is not null then
      perform set_config('request.jwt.claims',
        json_build_object('sub', v_cust, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
      execute format('select count(*) from public.%I', t) into n_role;
      execute 'reset role';
      if n_role <> 0 then
        raise exception '화주가 % 를 %행 읽는다 — 0이어야 한다.', t, n_role;
      end if;
    end if;
  end loop;

  -- (d) 🔴 anon 쓰기가 막히는지 **실제로 시도**한다. RLS 는 읽기만이 아니라 쓰기도 막는다.
  --   49차 조사의 표현대로 이 표들은 "읽기도 쓰기도 삭제도 되는" 상태였다.
  --   ⚠️ DELETE 로 잰다 — 컬럼 이름을 몰라도 되고 영향 행수가 그대로 증거가 된다.
  --   실제로 지워지더라도 이 트랜잭션은 아래 raise 로 통째로 되돌아간다.
  foreach t in array array['rate_distance_tiers','rate_surcharges','drivers','vehicles',
                           'companies','quotes','orders','customer_locations'] loop
    execute format('select count(*) from public.%I', t) into n_owner;
    if n_owner = 0 then continue; end if;

    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
    execute format('delete from public.%I', t);
    get diagnostics n_role = row_count;
    execute 'reset role';

    if n_role <> 0 then
      raise exception 'anon 이 % 를 %행 지울 수 있다 — 0이어야 한다.', t, n_role;
    end if;
  end loop;
end $$;

reset role;

-- ═══════════════════════════════════════════════════════════════════════
-- 🔴 되돌리는 SQL
--
--   do $$ declare t text; begin
--     foreach t in array array['drivers','vehicles','individual_customers',
--       'individual_customer_addresses','rate_distance_tiers','rate_surcharges',
--       'rate_vehicle_extra_fees'] loop
--       execute format('drop policy if exists %I on public.%I', 'staff_all_'||t, t);
--     end loop;
--     foreach t in array array['activity_logs','contacts','drivers','files',
--       'individual_customer_addresses','individual_customers','profiles',
--       'rate_distance_tiers','rate_surcharges','rate_vehicle_extra_fees','rates',
--       'sales_activities','vehicles'] loop
--       execute format('alter table public.%I disable row level security', t);
--     end loop;
--   end $$;
-- ═══════════════════════════════════════════════════════════════════════
