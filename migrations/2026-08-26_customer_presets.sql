-- 20차 3-2 — customer_presets 신설 ("자주 쓰는 화물" · "자주 쓰는 요청")
--
-- 실행: GitHub Actions → "DB 마이그레이션" → dry-run 으로 확인 후 apply.
--
-- 🔴 **테이블을 둘로 나누지 말 것.** 시안에 저장·불러오기가 두 종류(화물/요청) 있지만
--    `preset_type` 한 컬럼으로 가른다. 이 저장소는 "과도한 설계 방지"를 여러 번 적용했다
--    (로드맵① 8단계 세분화 폐기, 14차 `consents` 최소 스키마).
--
-- 🔴 **`payload` 를 정규화된 컬럼으로 펼치지 말 것.** 프리셋은 **폼에 채워넣기 용도**이지
--    집계 대상이 아니다. 이렇게 두면 프리셋 종류가 늘어도 테이블을 안 늘린다.
--
-- payload 예시 (구현은 21차, 여기서는 형태만 고정)
--   preset_type = 'cargo'
--     { "vehicle_type":"1톤", "body_type":"카고", "item":"택배박스 20개",
--       "item_condition":"박스/포장재", "load_condition":"수작업", "unload_condition":"수작업" }
--   preset_type = 'request'
--     { "body":"상차 시 지게차 필요, 하차지 야간 불가" }
--
-- ⚠️ payload 안의 `vehicle_type`·`item_condition` 등은 **저장 시점 문자열 스냅샷**이다.
--    나중에 옵션 이름이 바뀌면 프리셋이 안 맞을 수 있으니, 불러올 때 **현재 목록에 없는
--    값은 조용히 버리고 나머지만 채우도록** 21차에서 처리한다.

create table if not exists customer_presets (
  id           uuid        primary key default gen_random_uuid(),
  company_id   uuid        not null references companies(id) on delete cascade,
  preset_type  text        not null check (preset_type in ('cargo','request')),
  name         text        not null,
  payload      jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists customer_presets_company_idx
  on customer_presets (company_id, preset_type);

alter table customer_presets enable row level security;

-- 🔴 정책은 `customer_locations` 와 **똑같은 두 개**다(2026-08-26 실제 DB에서 확인한 전문).
--    ① anon 전체허용 — 관리자가 anon 키로 접속하는 구조이기 때문(원칙 2번)
--    ② authenticated 는 본인 회사 것만 — `is_active = true` 조건까지 동일하게 맞췄다.
--       🔴 이 조건을 빼지 말 것: 계정이 비활성화된 뒤에도 프리셋을 읽고 쓸 수 있게 된다.
drop policy if exists admin_full_access_customer_presets on customer_presets;
create policy admin_full_access_customer_presets on customer_presets
  for all to anon using (true) with check (true);

drop policy if exists customer_manage_own_presets on customer_presets;
create policy customer_manage_own_presets on customer_presets
  for all to authenticated
  using (
    company_id in (
      select customer_accounts.company_id from customer_accounts
       where customer_accounts.auth_user_id = auth.uid()
         and customer_accounts.is_active = true
    )
  )
  with check (
    company_id in (
      select customer_accounts.company_id from customer_accounts
       where customer_accounts.auth_user_id = auth.uid()
         and customer_accounts.is_active = true
    )
  );

comment on table customer_presets is
  '화주포털 "자주 쓰는 화물/요청" 프리셋. payload(jsonb)는 폼에 채워넣기 용도이며
   집계 대상이 아니다 — 정규화 컬럼으로 펼치지 말 것(20차 3-2).';

-- ═══ 검증 ═══
do $$
declare
  n int;
begin
  -- ① 테이블과 RLS
  select count(*) into n from pg_class
   where relname = 'customer_presets' and relrowsecurity = true;
  if n <> 1 then raise exception 'customer_presets 가 없거나 RLS 가 꺼져 있습니다'; end if;

  -- ② 정책 2개가 customer_locations 와 같은 구성인가
  select count(*) into n from pg_policies where tablename = 'customer_presets';
  if n <> 2 then raise exception '정책이 2개가 아닙니다: %', n; end if;

  select count(*) into n from pg_policies
   where tablename = 'customer_presets' and 'authenticated' = any(roles);
  if n <> 1 then raise exception 'authenticated 정책이 1개가 아닙니다: %', n; end if;

  -- ③ 🔴 preset_type CHECK 이 두 값만 허용하는가 (완료조건 4)
  --    제약 정의를 직접 읽는다. 실제로 insert 해보는 방식은
  --    `exception when others` 가 **내 단언까지 삼켜서** 시험이 무력화된다.
  select count(*) into n
    from pg_constraint
   where conrelid = 'customer_presets'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) like '%preset_type%'
     and pg_get_constraintdef(oid) like '%cargo%'
     and pg_get_constraintdef(oid) like '%request%';
  if n < 1 then
    raise exception 'preset_type CHECK 제약(cargo/request)이 없습니다';
  end if;

  -- ④ company_id FK 가 companies 를 가리키는가 (원칙 27번 — 엉뚱한 참조 방지)
  select count(*) into n
    from pg_constraint
   where conrelid = 'customer_presets'::regclass
     and contype = 'f'
     and confrelid = 'companies'::regclass;
  if n <> 1 then raise exception 'company_id FK 가 companies 를 가리키지 않습니다: %', n; end if;
end $$;
