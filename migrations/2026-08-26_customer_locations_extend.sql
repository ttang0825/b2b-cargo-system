-- 20차 3-1 — customer_locations 컬럼 추가 (배송지에 담당자·상세주소 저장)
--
-- 실행: GitHub Actions → "DB 마이그레이션" → dry-run 으로 확인 후 apply.
-- 🔴 Supabase SQL Editor에 붙여넣지 말 것(47차). 파일 전체가 한 트랜잭션으로 돌아간다.
--
-- ═══ 🔴 지시서 표와 다르다. 사용자 확인(2026-08-26)을 받고 정한 것이다. ═══
--
-- 20차 지시서 3-1은 `name`·`address_detail`·`contact_name`·`contact_phone`·`note`
-- 다섯 개를 추가하라고 했으나, **실제 테이블에 이미 같은 뜻의 컬럼이 둘 있었다.**
--
--   지시서의 `name` → 🔴 이미 `location_name` 이 있다
--   지시서의 `note` → 🔴 이미 `notes` 가 있다
--
-- 🔴 `location_name` 은 죽은 컬럼이 아니다 — `app/admin/companies/[id]/page.tsx` 와
--    `app/admin/quotes/page.tsx` 가 **이미 조회하고 있다.** 여기에 `name` 을 새로
--    만들면 관리자 화면은 `location_name` 을, 화주포털은 `name` 을 쓰게 되어
--    **같은 배송지에 이름이 두 개** 생긴다(원칙 27번이 경고한 사고).
--
-- 그래서 **기존 두 컬럼을 재사용하고 없는 3개만 추가한다.**
-- 🔴 나중에 지시서 표만 보고 `name`·`note` 를 추가하지 말 것 — 아래 단언이 막는다.

alter table customer_locations add column if not exists address_detail text;
alter table customer_locations add column if not exists contact_name   text;
alter table customer_locations add column if not exists contact_phone  text;

-- ⚠️ 전부 nullable 이다. 기존 12행에 값이 없고, 필수 검증은 화면단에서 한다(21·22차).
--    NOT NULL 을 걸면 기존 행이 깨진다.

comment on column customer_locations.address_detail is
  '상세주소. 🔴 이 저장소의 기존 관례(fullOrigin 패턴)는 도로명주소와 합쳐 address 한 컬럼에
   넣는 것이었다. 배송지는 저장해두고 재사용하는 대상이라 나중에 도로명만 바꿔 끼울 수 있게
   분리해 둔 것이며, 20차 지시서가 지정한 컬럼이다.';
comment on column customer_locations.contact_name is
  '현장 담당자 이름. 🔴 제3자 개인정보다 — 배차된 차주에게 제공되며 동의 절차는 20차 3-4 참고.';
comment on column customer_locations.contact_phone is
  '현장 담당자 연락처. 🔴 제3자 개인정보다.';

-- ═══ 검증 — 어긋나면 아무것도 반영되지 않고 워크플로가 멈춘다 ═══
do $$
declare
  n int;
begin
  -- ① 추가하려던 3개가 실제로 생겼는가
  select count(*) into n from information_schema.columns
   where table_name = 'customer_locations'
     and column_name in ('address_detail','contact_name','contact_phone');
  if n <> 3 then
    raise exception '컬럼 3개가 생기지 않았습니다: %', n;
  end if;

  -- ② 🔴 재사용하기로 한 기존 두 컬럼이 그대로 있는가
  select count(*) into n from information_schema.columns
   where table_name = 'customer_locations'
     and column_name in ('location_name','notes');
  if n <> 2 then
    raise exception 'location_name / notes 가 사라졌습니다. 재사용 대상입니다: %', n;
  end if;

  -- ③ 🔴 뜻이 겹치는 중복 컬럼이 생기지 않았는가 (지시서 표를 그대로 따랐을 때의 사고)
  select count(*) into n from information_schema.columns
   where table_name = 'customer_locations' and column_name in ('name','note');
  if n <> 0 then
    raise exception
      '중복 컬럼이 있습니다(name/note). location_name/notes 를 재사용하기로 했습니다: %', n;
  end if;

  -- ④ 새 컬럼이 전부 nullable 인가
  select count(*) into n from information_schema.columns
   where table_name = 'customer_locations'
     and column_name in ('address_detail','contact_name','contact_phone')
     and is_nullable = 'NO';
  if n <> 0 then
    raise exception 'nullable 이 아닌 새 컬럼이 있습니다: %', n;
  end if;
end $$;
