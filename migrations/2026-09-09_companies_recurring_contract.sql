-- 33차 A장 — companies 에 정기계약 5개 컬럼
--
-- 무엇을 왜
--   이 사업의 핵심은 **반복 운송이 발생하는 화주를 확보하는 것**인데, 지금 시스템에는
--   어떤 화주가 정기계약인지 적을 자리가 없다.
--
-- 🔴 `companies.status`(거래 상태)에 「정기계약」을 값으로 추가하지 않는다 — 축이 다르다.
--    상태는 「지금 어느 단계인가」이고 정기계약은 「어떤 관계인가」다. 같은 칸에 넣으면
--    **「정기계약 화주인데 지금 새 견적을 협의 중」** 을 표현할 수 없게 되고, 기존 상태
--    필터·이력·`STATUS_OPTIONS`(lib/statusColors.ts) 를 쓰는 화면 5곳이 전부 걸린다.
--    ⚠️ 실측하니 `status` 값 목록에 **「반복화주」·「월정산화주」가 이미 있다** — 상태 축에
--    관계 개념이 섞여 있다는 뜻이고, 그래서 별도 컬럼이 더욱 맞다. **그 값들은 안 건드린다.**
--
-- 🔴 기존 `repeat_customer`(재거래 여부) 를 재사용하지 않는다 — 실측 결과 그 컬럼은
--    정산 저장(`app/admin/invoices/page.tsx`)이 **`총 오더수 > 1` 이면 자동으로 덮어쓰는
--    실적 파생값**이다. 계약 여부를 거기 담으면 담당자가 켠 값이 다음 정산에서 조용히
--    사라진다. **두 항목은 화면에 나란히 보이는 것이 정상이다.**
--
-- 🔴 이 저장소는 public 이다 — 아래 출력에 실제 화주명·사업자등록번호·담당자 연락처를
--    쓰지 않는다. **세는 것만 남긴다**(Actions 로그는 누구나 본다).

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. 사전 확인 — 원칙 27번
--    `add column if not exists` 는 컬럼이 이미 있으면 조용히 아무것도 안 한다.
--    레거시로 같은 이름이 다른 타입으로 있으면 그대로 넘어가므로 먼저 막는다.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select column_name, data_type
      from information_schema.columns
     where table_schema = 'public' and table_name = 'companies'
       and column_name in ('is_recurring_contract', 'recurring_contract_started_on',
                           'recurring_contract_ended_on', 'recurring_contract_frequency',
                           'recurring_contract_note')
  loop
    if r.column_name = 'is_recurring_contract' and r.data_type <> 'boolean' then
      raise exception 'companies.% 가 이미 있는데 타입이 boolean 이 아닙니다: %',
        r.column_name, r.data_type;
    elsif r.column_name in ('recurring_contract_started_on', 'recurring_contract_ended_on')
          and r.data_type <> 'date' then
      raise exception 'companies.% 가 이미 있는데 타입이 date 가 아닙니다: %',
        r.column_name, r.data_type;
    elsif r.column_name in ('recurring_contract_frequency', 'recurring_contract_note')
          and r.data_type <> 'text' then
      raise exception 'companies.% 가 이미 있는데 타입이 text 가 아닙니다: %',
        r.column_name, r.data_type;
    end if;
  end loop;

  -- 🔴 status 값 목록을 건드리지 않았음을 이 마이그레이션 안에서 못박는다.
  --    누가 나중에 「정기계약」을 상태 값으로 넣으면 이 단언이 잡아준다.
  if exists (
    select 1 from companies where status = '정기계약'
  ) then
    raise exception 'companies.status 에 「정기계약」 값이 들어가 있습니다 — 축이 다릅니다(별도 컬럼을 쓰십시오)';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. 컬럼 5개
-- ─────────────────────────────────────────────────────────────────────────────
alter table companies
  add column if not exists is_recurring_contract boolean not null default false;

alter table companies
  add column if not exists recurring_contract_started_on date;

-- 비어 있으면 「기한 없음」이다(종료일 미정). 🔴 not null 을 걸지 말 것.
alter table companies
  add column if not exists recurring_contract_ended_on date;

-- 운송 주기 — 주 N회 / 월 N회 / 격주 / 수시 중 하나(화면 드롭다운).
-- 🔴 CHECK 제약을 걸지 않았다 — 값 목록의 유일한 정의처는 `lib/companyFields.ts` 의
--    `RECURRING_FREQUENCY_OPTIONS` 다(consents 표와 같은 판단: 목록이 늘어날 때
--    마이그레이션을 또 돌려야 하는 것을 피한다).
alter table companies
  add column if not exists recurring_contract_frequency text;

alter table companies
  add column if not exists recurring_contract_note text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. 필터용 부분 인덱스
--    「정기계약만 보기」가 전체 스캔을 하지 않게 한다. 정기계약 화주는 소수라
--    부분 인덱스가 전체 인덱스보다 훨씬 작다.
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists companies_recurring_contract_idx
  on companies (id) where is_recurring_contract;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. 단언
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'companies'
     and column_name in ('is_recurring_contract', 'recurring_contract_started_on',
                         'recurring_contract_ended_on', 'recurring_contract_frequency',
                         'recurring_contract_note');
  if n <> 5 then
    raise exception '정기계약 컬럼 5개가 다 만들어지지 않았습니다: %개', n;
  end if;

  select count(*) into n
    from pg_indexes
   where schemaname = 'public' and indexname = 'companies_recurring_contract_idx';
  if n <> 1 then
    raise exception '정기계약 부분 인덱스가 만들어지지 않았습니다';
  end if;

  -- 신규 컬럼이므로 이 시점에 정기계약인 화주는 0명이어야 한다.
  select count(*) into n from companies where is_recurring_contract;
  if n <> 0 then
    raise exception 'is_recurring_contract 가 true 인 화주가 %건 있습니다(신규 컬럼인데)', n;
  end if;

  -- 🔴 `repeat_customer`(재거래 여부)는 이 차수가 건드리지 않는 별개 컬럼이다.
  --    없어졌으면 누가 정기계약으로 대체한 것이므로 막는다.
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'companies'
       and column_name = 'repeat_customer'
  ) then
    raise exception 'repeat_customer 컬럼이 없어졌습니다 — 정기계약과 별개 항목입니다(정산이 자동 갱신합니다)';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. 결과 — 🔴 세는 것만. 화주명·사업자번호·연락처를 찍지 말 것.
-- ─────────────────────────────────────────────────────────────────────────────
select
  count(*)                                          as 전체_화주,
  count(*) filter (where is_recurring_contract)      as "정기계약_0이어야",
  count(*) filter (where repeat_customer)            as 재거래_기존항목,
  count(distinct status)                             as 쓰이는_상태값_종류
from companies;

-- ─────────────────────────────────────────────────────────────────────────────
-- 🔴 되돌리기 (필요할 때만, 손으로)
--
--   drop index if exists companies_recurring_contract_idx;
--   alter table companies
--     drop column if exists is_recurring_contract,
--     drop column if exists recurring_contract_started_on,
--     drop column if exists recurring_contract_ended_on,
--     drop column if exists recurring_contract_frequency,
--     drop column if exists recurring_contract_note;
--
--   ⚠️ 코드가 이미 배포된 뒤에 되돌리면 화주 등록·수정 저장이 통째로 실패한다
--      (등록 폼이 이 컬럼들을 payload 에 담는다) — 코드를 먼저 이전 커밋으로
--      되돌린 다음에 실행할 것.
-- ─────────────────────────────────────────────────────────────────────────────
