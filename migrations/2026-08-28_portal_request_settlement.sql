-- PR #105 리뷰 4라운드 — `portal_order_requests` 에 정산방식 2컬럼 + 하차 도착구분 1컬럼
--
-- 실행: GitHub Actions → "DB 마이그레이션" → dry-run 으로 확인 후 apply.
--
-- 🔴 **왜 필요한가.** 13차(50차 세션)에 `quotes`/`orders`/`dispatches`/`invoices` 는
--    정산방식을 수금방식(`collection_method`) + 청구주기(`billing_cycle`) +
--    지급조건(`direct_collection_point`) 세 축으로 갖게 됐는데, **화주가 고를 자리가
--    한 곳도 없었다.** 담당자가 발주 요청을 견적으로 옮길 때마다 되물어야 했다.
--    적재구분(`loading_type`, 2026-08-27)과 정확히 같은 결의 누락이다.
--
-- 🔴 **`billing_cycle` 은 만들지 않는다**(사용자 확정 A안, 2026-08-28). 화주가 고르는
--    것은 **주선사 정산 / 선착불** 둘뿐이고, 월정산 여부는 화주별 계약 사항이라
--    (`companies.billing_cutoff_day`) 담당자가 정한다. 화주에게 물으면 답할 수 없는
--    질문이 되고, 답한 값이 계약과 어긋나면 담당자가 매번 고쳐야 한다.
--    🔴 **나중에 "축이 하나 빠졌다"며 여기에 `billing_cycle` 을 더하지 말 것.**
--
-- 🔴 **`direct_collection_point` 는 선착불일 때만 채운다**(C안). 주선사 정산이면
--    지급조건이라는 개념 자체가 없다 — `CollectionMethodInput` 이 관리자 화면에서
--    같은 규칙으로 동작한다(선착불이 아니면 null 로 지운다).
--
-- 🔴 **`dropoff_arrival_type` — 24시콜의 「당착/내착」이다.**
--    당착(`same_day`) = 상차 당일 도착 · 내착(`next_day`) = 다음 날 도착이며 **시각은
--    무관하다**(사용자 확인 2026-08-28).
--    ⚠️ **이 컬럼이 값의 정본이고 `requested_dropoff_at` 의 시각은 자리 채움이다.**
--    화면은 이 컬럼이 있으면 시각 대신 「당착」/「내착」을 그려야 한다 — 그러지 않으면
--    담당자가 자리 채움 시각(23:59)을 화주가 원한 도착 시각으로 읽는다.
--    🔴 **`requested_dropoff_at` 을 null 로 두는 방식으로 바꾸지 말 것** — 그러면
--    도착 날짜 자체가 사라져 관리자 목록·견적 프리필이 빈칸이 된다(원칙 42번).
--
-- 🔴 **적용 순서: DB 가 먼저다**(적재구분 때와 같다 — 이번도 "더하기"다).
--    컬럼만 먼저 생겨도 아무 화면도 그 값을 쓰지 않으므로 무해하다. 반대로 코드가
--    먼저 가면 insert 가 통째로 실패한다.
--
-- ⚠️ 세 컬럼 다 **nullable · 기본값 없음**이다. 기존 행(실측 3건)은 null 로 남고
--    화면은 "-" 로 그린다 — 화주가 고른 적이 없다는 것이 사실이기 때문이다.
--    `loading_type` 과 달리 기본값을 박지 않은 이유가 이것이다.

alter table portal_order_requests
  add column if not exists collection_method text;

alter table portal_order_requests
  add column if not exists direct_collection_point text;

alter table portal_order_requests
  add column if not exists dropoff_arrival_type text;

do $$
declare
  v_missing text;
  v_bad int;
  v_notnull int;
begin
  -- ① 세 컬럼이 전부 text 로 만들어졌는가
  select string_agg(c, ', ') into v_missing
    from unnest(array['collection_method', 'direct_collection_point', 'dropoff_arrival_type']) as c
   where not exists (
     select 1 from information_schema.columns
      where table_name = 'portal_order_requests'
        and column_name = c
        and data_type = 'text'
   );
  if v_missing is not null then
    raise exception 'portal_order_requests 에 text 로 안 만들어진 컬럼이 있다: %', v_missing;
  end if;

  -- ② 🔴 nullable 이어야 한다 — 기존 행에 값이 없는 것이 정상이다
  select count(*) into v_notnull
    from information_schema.columns
   where table_name = 'portal_order_requests'
     and column_name in ('collection_method', 'direct_collection_point', 'dropoff_arrival_type')
     and is_nullable = 'NO';
  if v_notnull > 0 then
    raise exception '세 컬럼 중 NOT NULL 인 것이 있다: %건', v_notnull;
  end if;

  -- ③ 🔴 값은 quotes/orders 와 같은 문자열만 — 라벨(주선사 정산/선착불)을 저장하지 말 것
  select count(*) into v_bad
    from portal_order_requests
   where collection_method is not null
     and collection_method not in ('broker', 'driver_direct');
  if v_bad > 0 then
    raise exception 'collection_method 가 broker/driver_direct 가 아닌 행이 있다: %건', v_bad;
  end if;

  select count(*) into v_bad
    from portal_order_requests
   where direct_collection_point is not null
     and direct_collection_point not in ('pickup', 'dropoff', 'undecided');
  if v_bad > 0 then
    raise exception 'direct_collection_point 값이 pickup/dropoff/undecided 가 아닌 행이 있다: %건', v_bad;
  end if;

  select count(*) into v_bad
    from portal_order_requests
   where dropoff_arrival_type is not null
     and dropoff_arrival_type not in ('same_day', 'next_day');
  if v_bad > 0 then
    raise exception 'dropoff_arrival_type 값이 same_day/next_day 가 아닌 행이 있다: %건', v_bad;
  end if;

  -- ④ 🔴 주선사 정산인데 지급조건이 남아 있으면 안 된다(관리자 화면과 같은 규칙)
  select count(*) into v_bad
    from portal_order_requests
   where collection_method = 'broker' and direct_collection_point is not null;
  if v_bad > 0 then
    raise exception '주선사 정산인데 지급조건이 남아 있는 행이 있다: %건', v_bad;
  end if;
end $$;

select count(*) as 총_발주요청,
       count(*) filter (where collection_method = 'broker') as 주선사정산,
       count(*) filter (where collection_method = 'driver_direct') as 선착불,
       count(*) filter (where collection_method is null) as 미선택,
       count(*) filter (where dropoff_arrival_type = 'same_day') as 당착,
       count(*) filter (where dropoff_arrival_type = 'next_day') as 내착
  from portal_order_requests;

-- ── 되돌리기 ────────────────────────────────────────────────
-- alter table portal_order_requests drop column if exists collection_method;
-- alter table portal_order_requests drop column if exists direct_collection_point;
-- alter table portal_order_requests drop column if exists dropoff_arrival_type;
