-- 화주 「견적 승인」 흔적 — `quotes` 에 nullable 2컬럼
--
-- 실행: GitHub Actions → "DB 마이그레이션" → dry-run 으로 확인 후 apply.
--
-- 🔴 **왜 필요한가.** 27차가 화주 「견적 승인」 버튼을 만들면서 `quotes.status` 를
--    `견적제출 → 수주` 로 바꾸게 했는데, **담당자가 손으로 `수주` 로 바꾼 건과 DB 상
--    구분되지 않는다**(27차 ③, 28차 §5-1 실측). `quotes` 에서 승인 흔적이 될 수 있는
--    컬럼은 `created_by`·`updated_by` 둘뿐이고 **둘 다 `staff_accounts` 참조**이며,
--    이력 표 7개 어디에도 화주의 상태 변경을 남기는 곳이 없다.
--
-- 🔴 **`updated_by` 를 재사용하지 말 것** — `staff_accounts` 참조라 화주 계정 id 를
--    넣으면 **FK 위반**이다(27차가 이미 확인했다). 그래서 별도 컬럼을 만든다.
--
-- 🔴 **둘 다 nullable 이고 기존 행을 채우지 않는다.**
--    `approved_by_customer_at is null` = 담당자가 바꾼 것. 과거 건에 값을 넣으면
--    **화주가 승인한 적 없는 건이 화주 승인으로 둔갑한다**(49차가 약관 동의를 소급
--    INSERT 하지 않은 것과 같은 이유 — 없는 사실을 기록하면 그 기록이 거짓이 된다).
--
-- 🔴 **FK 는 `on delete set null` 이다.** 포털 계정 삭제는 정상 운영 동작이고
--    (`delete-portal-account`·`delete-company`), 기본값인 RESTRICT 로 두면 **승인 이력이
--    있는 화주는 계정 삭제 자체가 FK 위반으로 막힌다**(원칙 32번 — `support_access_logs`
--    에서 실제로 겪은 사고). 계정이 지워져도 `approved_by_customer_at` 은 남으므로
--    「화주가 승인했다」는 사실 자체는 보존된다.
--
-- 🔴 **배지(`TopNav`)는 손대지 않는다.** 배지는 「오더를 만들어야 하는 건」의 개수이고,
--    화주가 승인했든 담당자가 바꿨든 할 일은 같다. 둘로 쪼개면 담당자가 합계를 다시
--    머릿속으로 더해야 한다.
--
-- ⚠️ **적용 순서: DB 가 먼저다**(이번도 "더하기"다). 컬럼만 먼저 생겨도 아무 화면도
--    그 값을 쓰지 않으므로 무해하다. 반대로 코드가 먼저 가면 승인 UPDATE 가 통째로
--    실패해서 화주가 승인 자체를 못 한다.
--
-- 🟢 착수 전 실측(2026-08-29, verify): `quotes` **53컬럼**, 두 컬럼 다 **없음**.
--    `customer_accounts` PK 는 **`id` uuid**. `quotes` 에 컬럼 단위 GRANT 는 **없다**
--    (anon·authenticated 둘 다 53컬럼 전체 = 테이블 단위 GRANT) — 신규 2컬럼도 그대로
--    포함되므로 GRANT 를 따로 손댈 필요가 없다.

alter table quotes
  add column if not exists approved_by_customer_at timestamptz;

alter table quotes
  add column if not exists approved_by_account_id uuid
    references customer_accounts(id) on delete set null;

do $$
declare
  v_type text;
  v_nullable text;
  v_fk text;
  v_bad int;
begin
  -- ① approved_by_customer_at — timestamptz · nullable
  select data_type, is_nullable into v_type, v_nullable
    from information_schema.columns
   where table_schema = 'public' and table_name = 'quotes'
     and column_name = 'approved_by_customer_at';
  if v_type is null then
    raise exception 'quotes.approved_by_customer_at 이 만들어지지 않았다';
  end if;
  if v_type <> 'timestamp with time zone' then
    raise exception 'quotes.approved_by_customer_at 이 timestamptz 가 아니다: %', v_type;
  end if;
  if v_nullable <> 'YES' then
    raise exception 'quotes.approved_by_customer_at 이 nullable 이 아니다';
  end if;

  -- ② approved_by_account_id — uuid · nullable
  select data_type, is_nullable into v_type, v_nullable
    from information_schema.columns
   where table_schema = 'public' and table_name = 'quotes'
     and column_name = 'approved_by_account_id';
  if v_type is null then
    raise exception 'quotes.approved_by_account_id 가 만들어지지 않았다';
  end if;
  if v_type <> 'uuid' then
    raise exception 'quotes.approved_by_account_id 가 uuid 가 아니다: %', v_type;
  end if;
  if v_nullable <> 'YES' then
    raise exception 'quotes.approved_by_account_id 가 nullable 이 아니다';
  end if;

  -- ③ 🔴 FK 가 실제로 `customer_accounts` 를 가리키는가 (원칙 27번)
  --    `add column if not exists` 는 컬럼이 이미 있으면 references 절을 조용히 무시한다.
  --    옛 동명 컬럼이 남아 있었다면 엉뚱한 표를 참조한 채로 통과했을 것이다.
  select pg_get_constraintdef(c.oid) into v_fk
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
   where c.conrelid = 'public.quotes'::regclass
     and c.contype = 'f'
     and a.attname = 'approved_by_account_id'
   limit 1;
  if v_fk is null then
    raise exception 'quotes.approved_by_account_id 에 외래키가 없다 — 컬럼이 이미 있어 references 절이 무시됐을 수 있다(원칙 27번)';
  end if;
  if v_fk not like '%customer_accounts%' then
    raise exception 'quotes.approved_by_account_id 의 외래키가 customer_accounts 가 아니다: %', v_fk;
  end if;
  if v_fk not like '%ON DELETE SET NULL%' then
    raise exception 'quotes.approved_by_account_id 의 외래키가 ON DELETE SET NULL 이 아니다: %', v_fk;
  end if;

  -- ④ 🔴 기존 행을 채우지 않았는가 — 하나라도 값이 있으면 소급 기록이다
  select count(*) into v_bad
    from quotes
   where approved_by_customer_at is not null or approved_by_account_id is not null;
  if v_bad > 0 then
    raise exception '기존 견적에 승인 흔적이 채워져 있다: %건 (소급 기록 금지)', v_bad;
  end if;
end $$;

select count(*) as 총_견적,
       count(*) filter (where status = '수주')                    as 수주,
       count(*) filter (where approved_by_customer_at is not null) as 화주승인
  from quotes;

-- ── 되돌리기 ────────────────────────────────────────────────
-- alter table quotes drop column if exists approved_by_customer_at;
-- alter table quotes drop column if exists approved_by_account_id;
