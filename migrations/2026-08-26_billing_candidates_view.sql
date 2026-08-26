-- 21차 · 월정산 묶음 후보 뷰를 호출자 권한으로 실행하게 한다
--
-- 🔴 왜 이번에 처리해야 하는가 — ② 이후에는 이 뷰가 **유일하게 열린 문**이 된다.
--   뷰는 기본적으로 **뷰 소유자 권한**으로 실행된다. 이 뷰의 owner 는 `postgres`(표
--   소유자)라 **하위 표의 RLS 를 우회한다.** ② 로 `invoices` 를 잠가도 anon 이 이 뷰에
--   GRANT 를 갖고 있으면 뷰를 통해 그대로 읽힌다.
--   (19차가 ③ 차수로 미뤘던 항목인데, ②를 하는 순간 위험이 커져서 앞당겼다.)
--
-- 🟢 `security_invoker = on` 이면 **호출자 권한**으로 실행돼 하위 표의 RLS 가 적용된다.
--   하위 표(`invoices`)에 직원 정책이 이미 있으므로 **직원은 보고, 화주·anon 은 못 본다.**
--   운영 PostgreSQL 은 **17.6** 이라 지원된다(15+ 필요, 21차 조사에서 확인).
--
-- ⚠️ anon 의 GRANT 자체는 회수하지 않았다 — **③ 차수 범위**다(금지사항 7).
--   GRANT 가 남아 있어도 RLS 가 막으므로 실질적으로는 닫힌다.
alter view public.customer_billing_batch_candidates set (security_invoker = on);

do $$
declare
  v_staff uuid;
  v_cust  uuid;
  n_owner bigint;
  n_role  bigint;
begin
  -- ⚠️ 저장되는 값은 `on` 이지 `true` 가 아니다(둘 다 boolean 으로 캐스팅된다).
  if not coalesce((select option_value::boolean from pg_options_to_table(
        (select reloptions from pg_class where oid = 'public.customer_billing_batch_candidates'::regclass))
      where option_name = 'security_invoker'), false) then
    raise exception 'security_invoker 가 켜지지 않았다.';
  end if;

  select id into v_staff from staff_accounts where status = 'active' order by created_at limit 1;
  select auth_user_id into v_cust
    from customer_accounts where is_active = true and auth_user_id is not null limit 1;

  execute 'select count(*) from public.customer_billing_batch_candidates' into n_owner;

  -- 직원은 소유자와 같아야 한다
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  execute 'select count(*) from public.customer_billing_batch_candidates' into n_role;
  execute 'reset role';
  if n_role <> n_owner then
    raise exception '직원이 묶음 후보 뷰를 못 읽는다: 전체 %행 / 직원에게 %행', n_owner, n_role;
  end if;

  if n_owner = 0 then return; end if;   -- 비어 있으면 아래 판정이 무의미

  -- 🔴 anon 은 0행이어야 한다
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  execute 'select count(*) from public.customer_billing_batch_candidates' into n_role;
  execute 'reset role';
  if n_role <> 0 then
    raise exception 'anon 이 아직 묶음 후보 뷰를 읽는다: %행', n_role;
  end if;
end $$;

reset role;

-- 🔴 되돌리는 SQL
--   alter view public.customer_billing_batch_candidates set (security_invoker = off);
