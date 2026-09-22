-- 리워드 — 운임 할인 적용 (2026-09-22)
--
-- 배경(사용자 2026-09-22): *"운임 할인 적용도 만들어줘."*
--   1차가 `reward_method = 'freight_discount'` 를 **저장만 하고 읽는 코드를 0건**으로
--   남겨 둔 자리다(HANDOFF §7 의 ⏳). 쌓인 적립금을 **운임에서 깎아 주는** 경로다.
--
-- ── 🚨 착수 전 실측이 설계를 정했다 (`_verify.sql` ㊲ · 2026-09-22) ──────────
--
--   ㊲-a  원장 CHECK 는 `transport_earn · reversal · adjustment` **셋뿐**이다.
--         🟢 `reward_core.sql` ④ 의 주석이 *「freight_discount · giftcard ·
--            expiry 는 3차에서 늘린다 — 그때 이 CHECK 도 같이」* 라고 예고해 뒀다.
--         🔴 **그래서 이름을 `use` 가 아니라 `freight_discount` 로 쓴다** —
--            `lib/rewardCalc.ts` 의 `RewardMethod` 와 같은 낱말이라야 한다.
--   ㊲-b  캠페인: 요율 5% · **최소 사용액 50,000원** · 사용 종료일 2027-05-31.
--   ㊲-c  🚨 **지금 쓸 수 있는 화주가 하나도 없다** — 잔액이 9,000 / 0 / 0 이라
--         셋 다 최소 사용액에 못 미친다. **그래도 만든다**(기능이 먼저 있어야
--         담당자가 쓰기 시작한다). 🔴 다만 **「쓸 수 있는 건이 0이라 시험이
--         안 된다」를 근거로 관문을 느슨하게 풀지 말 것.**
--   ㊲-d  🚨 **선착불 3건에는 걸 수 없다** — 화주가 차주에게 직접 내므로
--         위캐리가 화주에게 끊는 청구서가 **애초에 없다.** 깎을 대상이 없다.
--         걸 수 있는 것은 **주선사수금(broker) 13건**뿐이다.
--   ㊲-e  🚨 **묶음 스냅샷 함수 둘이 `customer_charge_total` 만 읽는다** —
--         `add_item_to_billing_batch` 는 그 값을 그대로, `refresh_item_snapshot`
--         은 `+ 나중에 생긴 추가비`. **둘 다 저장소 밖(14차 산출물)이다.**
--   ㊲-f  `invoices` 에 할인·리워드 이름의 칸이 **0개**다(원칙 27번 — 조용히
--         안 만들어지는 일은 없다).
--
-- ── 🔴 그래서 「금액을 어디에 적는가」를 이렇게 정했다 ──────────────────────
--
--   할인은 **화주가 낼 돈을 바꾼다.** 금액을 보여주는 자리가 여덟 곳이 넘고
--   (관리자 목록·상세 · 포털 정산확인·홈·월별통계 · 대시보드 · 미수금 ·
--   월정산 묶음), 한 곳만 빠뜨리면 **화면마다 금액이 갈린다** — 36차 C장의
--   미수금 신고가 정확히 그 모양이었다.
--
--   🟢 **그래서 `customer_charge_total` 자체를 「깎은 뒤 금액」으로 둔다.**
--      그러면 그 값을 읽는 **모든 자리가 저절로 맞고**, 저장소 밖에 있는
--      묶음 DB 함수 둘도 **한 글자도 안 고쳐도 된다.**
--      깎기 전 금액은 `customer_charge_total + reward_discount_amount` 로
--      **언제든 되돌아온다** — 잃는 것이 없다.
--
--   🔴 **원칙 47번을 어기는 것이 아니다.** 그 원칙이 금지하는 것은
--      **「나중에 생긴 추가 금액(현장 추가비)을 스냅샷에 섞는 것」**이고,
--      이것은 **담당자가 사유를 적고 내리는 청구 금액 결정**이다 —
--      35차 A-7(배차 기준 재동기화)과 같은 결이고, 그 라우트와 똑같이
--      ① 사유 필수 ② `invoice_amendment_logs` 에 전/후 기록 ③ 확정 건 차단이다.
--      🔴 **이 판단을 근거로 「추가비도 스냅샷에 넣자」로 넓히지 말 것.**
--
--   🚨 **그래서 `resync` 라우트에 한 줄이 필요하다** — 그 라우트는 배차 값으로
--      `customer_charge_total` 을 **다시 쓴다.** 그대로 두면 **재동기화가
--      할인을 조용히 지워** 원장에는 쓴 기록이 남고 청구서는 제값으로 돌아간다.
--      🔴 같은 커밋에서 고쳤다 — **떼어 놓지 말 것.**
--
-- 🔴 **적용 순서 — DB 가 먼저다.** 코드를 먼저 올리면 없는 컬럼이 select 에
--    실려 42703 이 나고, 정산 상세가 통째로 안 열린다.

-- ── ① 원장에 「운임 할인」 유형을 더한다 ────────────────────────────────────
--
-- 🔴 **폐지하는 값이 없다** — 셋을 그대로 두고 하나를 더한다(3 → 4).
--    빼면 이미 쌓인 행이 제약을 어긴다(PR #176 의 교훈).
-- 🔴 **옛 정의에서 값을 뽑아 새 목록이 모르는 것이 있으면 멈춘다** — 이 CHECK 를
--    누가 손으로 고쳐 놨을 수 있고, 그것을 말없이 덮으면 그 값이 사라진다.
--    🚨 **그리고 `allowed` 는 「최종 목록」이어야 한다**(PR #181 의 교훈) —
--       옛 목록을 적으면 재실행 때 **자기가 넣은 값을 「모르는 값」으로 보고 멈춘다.**

do $$
declare
  v_def     text;
  v_old     text[];
  v_allowed text[] := array['transport_earn','reversal','adjustment','freight_discount'];
  v_unknown text[];
begin
  select pg_get_constraintdef(oid) into v_def
    from pg_constraint
   where conrelid = 'public.reward_ledger'::regclass
     and conname = 'reward_ledger_type_check';

  if v_def is null then
    raise exception 'reward_ledger_type_check 가 없습니다 — 이 표의 모양이 예상과 다릅니다';
  end if;

  raise notice '옛 정의(되돌리기 근거): %', v_def;

  select array_agg(m[1]) into v_old
    from regexp_matches(v_def, '''([^'']+)''', 'g') m;

  select array_agg(x) into v_unknown
    from unnest(coalesce(v_old, '{}')) x
   where x <> all (v_allowed);

  if v_unknown is not null then
    raise exception
      '옛 CHECK 에 이 파일이 모르는 값이 있습니다 %: 덮으면 그 값이 사라집니다 — 목록을 맞춘 뒤 다시 도십시오', v_unknown;
  end if;

  alter table public.reward_ledger drop constraint reward_ledger_type_check;
  alter table public.reward_ledger add constraint reward_ledger_type_check
    check (transaction_type in ('transport_earn','reversal','adjustment','freight_discount'));

  raise notice '원장 유형이 3 → 4 종이 됐습니다 (freight_discount 신설)';
end $$;

-- ── ② 부호 규칙 — 운임 할인은 **쓰는 것이라 음수다** ────────────────────────
--
-- 🔴 `adjustment` 로 때우지 않는 이유 — 「할인으로 썼다」와 「손으로 고쳤다」는
--    되짚을 때 뜻이 전혀 다르다. 화주 안내 문구도 갈린다.
-- 🟢 **정정은 `adjustment` 가 맡는다**(아래 ③ 참고) — 할인액을 바꾸면
--    `freight_discount` 줄은 그대로 두고 **차액만큼 `adjustment` 한 줄**을 더한다.
--    그래야 원장이 append-only 로 남으면서도 담당자가 금액을 고칠 수 있다.

do $$
declare v_def text;
begin
  select pg_get_constraintdef(oid) into v_def
    from pg_constraint
   where conrelid = 'public.reward_ledger'::regclass
     and conname = 'reward_ledger_amount_sign_check';
  raise notice '옛 부호 정의(되돌리기 근거): %', v_def;

  alter table public.reward_ledger drop constraint reward_ledger_amount_sign_check;
  alter table public.reward_ledger add constraint reward_ledger_amount_sign_check
    check ((transaction_type = 'transport_earn'   and amount > 0)
        or (transaction_type = 'reversal'         and amount < 0)
        or (transaction_type = 'freight_discount' and amount < 0)
        or (transaction_type = 'adjustment'       and amount <> 0));
end $$;

-- ── ③ invoices.reward_discount_amount ──────────────────────────────────────
--
-- 🔴 **이 칸은 「깎은 금액」이지 「깎은 뒤 금액」이 아니다.**
--      깎기 전 공급가액 = customer_charge_total + reward_discount_amount
--      깎은 뒤 공급가액 = customer_charge_total          ← 화면이 읽는 값
-- 🔴 **0 이상이다** — 음수면 「할인인데 더 받는다」가 되어 뜻이 무너진다.
-- 🔴 원칙 27번 — 같은 이름이 이미 있으면 `add column if not exists` 가 **조용히
--    아무것도 안 한다**. ㊲-f 가 0개임을 쟀지만, 재실행에서도 맞도록 여기서 다시 본다.

do $$
declare
  t       text;
  had_col boolean;
  n_bad   int;
begin
  select data_type into t
    from information_schema.columns
   where table_schema = 'public' and table_name = 'invoices'
     and column_name = 'reward_discount_amount';
  had_col := t is not null;

  if had_col and t <> 'integer' then
    raise exception
      'invoices.reward_discount_amount 가 이미 있는데 타입이 % 입니다 — 쓰임이 다를 수 있으니 멈춥니다', t;
  end if;
  if had_col then
    raise notice 'reward_discount_amount 가 이미 있습니다 — 그대로 둡니다(재실행)';
  end if;

  alter table public.invoices
    add column if not exists reward_discount_amount integer not null default 0;

  -- 🔴 **동작 유지 단언 — 방금 만든 경우에만 한다.**
  --    나중에 담당자가 할인을 건 뒤 이 파일이 다시 돌면 0 이 아닌 행이 있는 것이
  --    **정상**이다. 고정된 기대값을 그때도 들이대면 멀쩡한 DB 를 멈춰 세운다
  --    (PR #179 에서 실제로 겪었다).
  if not had_col then
    select count(*) into n_bad from public.invoices where reward_discount_amount <> 0;
    if n_bad <> 0 then
      raise exception '새로 만든 칸인데 0 이 아닌 행이 %건 있습니다 — 금액이 조용히 바뀝니다', n_bad;
    end if;
    raise notice '정산 건 전부가 reward_discount_amount = 0 입니다 (지금 청구 금액 그대로)';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.invoices'::regclass
       and conname = 'invoices_reward_discount_nonneg'
  ) then
    alter table public.invoices
      add constraint invoices_reward_discount_nonneg check (reward_discount_amount >= 0);
  end if;
end $$;

comment on column public.invoices.reward_discount_amount is
  '🔴 리워드 적립금으로 **깎은 금액**(0 이상). customer_charge_total 은 이미 이만큼 깎인 값이다 — 깎기 전 공급가액은 둘을 더하면 된다. 🔴 재동기화(resync)는 이 값을 다시 빼야 한다.';

-- ── ④ 확인 ─────────────────────────────────────────────────────────────────

do $$
declare n int;
begin
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'invoices'
     and column_name = 'reward_discount_amount'
     and data_type = 'integer' and is_nullable = 'NO';
  if n <> 1 then
    raise exception 'invoices.reward_discount_amount(integer not null)가 만들어지지 않았습니다: %', n;
  end if;

  -- 🚨 **중복 사용의 최종 방어선은 이미 있는 부분 UNIQUE 다** —
  --    `reward_ledger_source_unique (campaign_id, transaction_type, source_type, source_id)`
  --    에 `transaction_type` 이 들어 있어서, 새 유형이 붙는 순간
  --    **「한 정산 건에 운임 할인 한 줄」**이 저절로 강제된다.
  --    🔴 이 인덱스를 지우지 말 것 — 두 탭·두 번 클릭·재시도가 전부 여기서 걸린다.
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and indexname = 'reward_ledger_source_unique'
  ) then
    raise exception 'reward_ledger_source_unique 가 없습니다 — 중복 사용을 막을 방어선이 사라집니다';
  end if;

  raise notice '🟢 운임 할인 준비 완료 — 원장 4종 · invoices 할인 칸 신설';
end $$;

-- ── 되돌리기 ────────────────────────────────────────────────────────────────
--
--   🔴 **순서가 있다.** 할인이 걸린 건이 있으면 먼저 화면에서 전부 0 으로 되돌린 뒤
--      (그래야 customer_charge_total 이 제값으로 돌아온다) 아래를 돌린다.
--
--   alter table public.invoices drop constraint invoices_reward_discount_nonneg;
--   alter table public.invoices drop column reward_discount_amount;
--   alter table public.reward_ledger drop constraint reward_ledger_type_check;
--   alter table public.reward_ledger add constraint reward_ledger_type_check
--     check (transaction_type in ('transport_earn','reversal','adjustment'));
--   -- 🔴 freight_discount 행이 남아 있으면 위 문장이 실패한다(그것이 맞다 —
--   --    그 줄들을 어떻게 할지 먼저 정해야 한다).
