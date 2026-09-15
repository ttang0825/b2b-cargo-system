-- 배송지에 **상호**를 따로 담는다 (사용자 지시 2026-09-15)
--
-- 신고 — *"화주포털에서 배송지화물관리에서 배송지에 상호까지 넣을수 있는 옵션이 있어야
--        한다"* · *"화주포털의 저장된 배송지 정보는 내부시스템 활성화주 상세 항목에
--        자동등록되어야 한다. 현재 화주 상세 항목이 이와 상이한 구조로 되어 있는 부분은
--        맞추자. 기존 정보들을 건드려서라도 맞추자."*
--
-- 🔴 **무엇이 어긋나 있었나** — 견적·오더·발주요청에는 상호가 **제 컬럼**으로 있는데
--    (`origin_company_name`/`destination_company_name`) `customer_locations` 에는 없어서,
--    포털 발주 폼이 상호를 **`location_name` 에 밀어 넣고 있었다**:
--
--        location_name: form.origin_company_name.trim() || form.origin.trim()
--
--    그래서 ① 상호와 배송지 이름이 한 칸을 다퉜고 ② 관리자 화주 상세는 그 칸을
--    「주소 이름」으로만 읽어 **상호가 어디에도 안 보였다.**
--
-- 🔴 **`location_name` 을 없애지 않는다** — 배송지 **별칭**(「본사 창고」 같은)은 상호와
--    다른 것이고, 관리자 화면 2곳이 이미 읽는다(20차가 같은 자리에서 `name` 을 새로
--    만들지 말라고 못박았다). 상호만 제 칸으로 뺀다.
--
-- ⚠️ **기존 행을 건드린다**(사용자가 명시적으로 허용했다). 다만 **덮어쓰지 않고 옮겨
--    적기만 한다** — `company_name` 이 비어 있고 `location_name` 이 주소와 **다를 때만**
--    그것을 상호로 본다. 주소와 같으면 그건 「이름이 없어서 주소를 넣어둔 것」이라
--    상호가 아니다(포털 폼의 `|| form.origin.trim()` 갈래가 그것이다).
-- 🔴 **`location_name` 은 지우지 않는다** — 옮겨 적은 뒤에도 그대로 둔다. 지우면
--    되돌릴 방법이 없고, 별칭으로 쓰던 화주의 표시가 통째로 바뀐다.

alter table customer_locations add column if not exists company_name text;

comment on column customer_locations.company_name is
  '배송지의 상호(업체명). 🔴 `location_name`(배송지 별칭)과 다른 것이다 — 2026-09-15 이전에는
   포털이 상호를 location_name 에 밀어 넣었고, 그래서 관리자 화면에 상호가 안 보였다.
   견적·오더의 origin_company_name / destination_company_name 과 같은 뜻이다.';

-- ═══ 백필 — 옮겨 적기만 한다(덮어쓰지 않는다) ═══
with moved as (
  update customer_locations
     set company_name = btrim(location_name)
   where company_name is null
     and location_name is not null
     and btrim(location_name) <> ''
     and btrim(location_name) <> btrim(coalesce(address, ''))
  returning 1
)
select count(*) as 상호로_옮긴_행 from moved;

-- ═══ 검증 — 어긋나면 아무것도 반영되지 않고 워크플로가 멈춘다 ═══
do $$
declare
  n int;
begin
  -- ① 컬럼이 실제로 생겼는가
  select count(*) into n from information_schema.columns
   where table_name = 'customer_locations' and column_name = 'company_name';
  if n <> 1 then
    raise exception 'company_name 컬럼이 생기지 않았습니다: %', n;
  end if;

  -- ② 🔴 `location_name` 을 지우지 않았는가 — 이 마이그레이션은 **옮겨 적기만** 한다
  select count(*) into n from customer_locations
   where company_name is not null and location_name is null;
  if n > 0 then
    raise exception 'location_name 이 비워진 행이 % 건 있습니다 — 옮겨 적기만 해야 합니다', n;
  end if;

  -- ③ 🔴 주소를 상호로 잘못 옮기지 않았는가
  select count(*) into n from customer_locations
   where company_name is not null
     and btrim(company_name) = btrim(coalesce(address, ''));
  if n > 0 then
    raise exception '주소와 같은 값이 상호로 들어간 행이 % 건 있습니다', n;
  end if;
end $$;

\echo ''
\echo '--- 배송지 현황 (상호 분리 후) ---'
select count(*)                                             as 배송지_전체,
       count(*) filter (where company_name is not null)      as 상호_있음,
       count(*) filter (where location_name is not null)     as 별칭_있음,
       count(*) filter (where contact_name is not null)      as 담당자_있음,
       count(*) filter (where address_detail is not null)    as 상세주소_있음
  from customer_locations;
