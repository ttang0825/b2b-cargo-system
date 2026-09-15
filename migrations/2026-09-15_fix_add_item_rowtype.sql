-- 🔴 월정산 묶음에 정산 건이 **한 건도 담기지 않던** 버그 (2026-09-15)
--
-- 증상 — 「담기」·「모두 담기」·운송완료 자동 담기가 전부 실패한다. 화면에는
--        아무 일도 안 일어난 것처럼 보이고, 묶음의 담긴 건수가 계속 0이다.
--        (사용자 신고 3회 · 실사용 리뷰 3~5라운드)
--
-- 원인 — `add_item_to_billing_batch` 가
--
--            declare v_invoice record;          -- ← 여기
--            ...
--            if not is_billing_batch_candidate(v_invoice) then
--
--        `is_billing_batch_candidate(p_invoice invoices)` 는 **`invoices` 행 타입**을
--        받는데, `record` 로 선언한 변수는 그 타입으로 캐스트되지 않는다:
--
--            ERROR: cannot cast type record to invoices
--            CONTEXT: PL/pgSQL function add_item_to_billing_batch(uuid,uuid) line 52
--
--        관문을 **전부 통과한 건**이 마지막 줄에서 예외로 죽는다. 그래서 거절 사유가
--        아니라 **에러**가 올라오고, 담기는 언제나 실패한다.
--
-- 🔴 고치는 것은 **선언 한 줄뿐**이다 — `record` → `invoices%rowtype`.
--    나머지 본문은 운영 DB 에서 그대로 떠온 것이고 **한 글자도 바꾸지 않았다**
--    (관문 순서·사유 이름·스냅샷 계산·unique_violation 처리 전부 동일).
--    🔴 이 기회에 다른 것을 같이 고치지 말 것 — 이 함수는 돈이 걸린 경로다.
--
-- 🟢 곁다리로 **이 함수가 처음으로 저장소에 들어온다.** 묶음 DB 함수 12개는
--    14차 산출물이라 저장소에 없었고(마이그레이션 자동화 47차보다 먼저), 그래서
--    이번에 「어디서 막히는지」를 알아내는 데 실측이 필요했다.
--
-- ⚠️ `v_batch` 는 `record` 그대로 둔다 — 타입 지정 함수에 넘기지 않으므로 문제가 없고,
--    건드리면 「한 줄만 고쳤다」가 아니게 된다.

create or replace function public.add_item_to_billing_batch(p_batch_id uuid, p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_batch record;
  -- 🔴 `record` 가 아니라 `invoices%rowtype` 이어야 한다(위 주석 참고).
  v_invoice invoices%rowtype;
  v_supply numeric;
  v_vat numeric;
  v_total numeric;
begin
  select * into v_batch from customer_billing_batches where id = p_batch_id for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'batch_not_found');
  end if;
  if v_batch.batch_status <> 'draft' then
    return jsonb_build_object('success', false, 'reason', 'batch_not_draft');
  end if;

  select * into v_invoice from invoices where id = p_invoice_id for update;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'invoice_not_found');
  end if;

  if v_invoice.company_id is distinct from v_batch.company_id then
    return jsonb_build_object('success', false, 'reason', 'company_mismatch');
  end if;
  if v_invoice.collection_method <> 'broker' or v_invoice.billing_cycle <> 'monthly' then
    return jsonb_build_object('success', false, 'reason', 'not_monthly_broker');
  end if;
  if v_invoice.settlement_reference_date is null
     or v_invoice.settlement_reference_date < v_batch.period_start
     or v_invoice.settlement_reference_date > v_batch.period_end then
    return jsonb_build_object('success', false, 'reason', 'billing_period_out_of_range');
  end if;
  if v_invoice.status <> '정산대기' then
    return jsonb_build_object('success', false, 'reason', 'invoice_status_not_eligible');
  end if;
  if v_invoice.customer_side_locked then
    return jsonb_build_object('success', false, 'reason', 'already_customer_side_locked');
  end if;
  if v_invoice.locked then
    return jsonb_build_object('success', false, 'reason', 'invoice_locked');
  end if;
  if v_invoice.customer_charge_total is null or v_invoice.customer_charge_total <= 0 then
    return jsonb_build_object('success', false, 'reason', 'amount_not_finalized');
  end if;
  if exists (
    select 1 from customer_billing_batch_items
    where invoice_id = p_invoice_id and released_at is null
  ) then
    return jsonb_build_object('success', false, 'reason', 'already_in_another_batch');
  end if;

  if not is_billing_batch_candidate(v_invoice) then
    return jsonb_build_object('success', false, 'reason', 'invoice_no_longer_eligible');
  end if;

  v_supply := v_invoice.customer_charge_total;
  v_vat := round(v_supply * 0.1);
  v_total := round(v_supply * 1.1);

  insert into customer_billing_batch_items (
    batch_id, invoice_id, supply_amount_snapshot, vat_amount_snapshot, total_amount_snapshot
  ) values (
    p_batch_id, p_invoice_id, v_supply, v_vat, v_total
  );

  return jsonb_build_object('success', true);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'reason', 'already_in_another_batch');
end;
$function$;

-- 🔴 **단언 — 고친 함수를 실제로 불러보고 되돌린다.**
--    「배포했는데 여전히 안 담긴다」를 또 겪지 않으려면, 여기서 한 번 통과시켜 봐야 한다.
--    안쪽 블록의 예외가 savepoint 를 되돌리므로 **아무것도 저장되지 않는다.**
do $$
declare
  v_batch   uuid;
  v_company uuid;
  v_inv     uuid;
  v_result  jsonb;
begin
  select id, company_id into v_batch, v_company
    from customer_billing_batches
   where batch_status = 'draft'
   order by created_at desc
   limit 1;

  if v_batch is null then
    raise notice '작성 중 묶음이 없어 시험을 건너뛴다 (함수 교체는 그대로 반영됨)';
    return;
  end if;

  select i.id into v_inv
    from invoices i
   where i.company_id = v_company
     and i.billing_cycle = 'monthly'
     and i.collection_method = 'broker'
     and i.status = '정산대기'
     and not exists (select 1 from customer_billing_batch_items bi
                      where bi.invoice_id = i.id and bi.released_at is null)
   limit 1;

  if v_inv is null then
    raise notice '그 묶음 화주에 담을 후보가 없어 시험을 건너뛴다 (함수 교체는 그대로 반영됨)';
    return;
  end if;

  begin
    v_result := public.add_item_to_billing_batch(v_batch, v_inv);
    if not coalesce((v_result ->> 'success')::boolean, false) then
      -- 🔴 여기서 멈추면 함수 교체도 통째로 되돌아간다(워크플로가 한 트랜잭션이다).
      raise exception '고친 함수가 여전히 담지 못한다: %', v_result;
    end if;
    raise notice '🟢 시험 통과 — add_item 이 정상으로 담는다 (되돌린다)';
    raise exception using errcode = '22000', message = 'intentional-rollback';
  exception
    when sqlstate '22000' then
      raise notice '시험분을 되돌렸다 — 아무것도 저장하지 않았다';
  end;
end $$;
