-- PR #103 리뷰 6번 — `portal_order_requests` 에 적재구분(`loading_type`) 추가
--
-- 실행: GitHub Actions → "DB 마이그레이션" → dry-run 으로 확인 후 apply.
--
-- 🔴 **왜 필요한가.** 4차 세션에 `quotes`/`orders` 는 `loading_type`(`exclusive`/`mixable`)
--    을 갖게 됐는데 **화주가 고를 자리가 한 곳도 없었다.** 담당자가 발주 요청을 견적으로
--    옮길 때마다 화주에게 전화로 되물어야 했다. 화주포털 발주 폼에 그 선택지를 넣으면서
--    받은 값을 담을 컬럼을 여기서 만든다.
--
-- 🔴 **값은 `quotes`/`orders` 와 같은 문자열이어야 한다** — 발주 요청 → 견적 프리필이
--    이 값을 그대로 넘긴다. 라벨(`독차`/`혼적가능`)을 저장하지 말 것.
--
-- 🔴 **적용 순서: DB 가 먼저다**(21차·22차의 판단 기준 그대로 — 이번은 "더하기"다).
--    컬럼만 먼저 생겨도 아무 화면도 그 값을 쓰지 않으므로 무해하다. 반대로 코드가 먼저
--    가면 insert 가 실패한다 — 그래서 서버 API 에 "컬럼 없으면 그 값만 빼고 재시도"
--    방어를 넣어뒀지만(35차 `sms_logs.sender_phone` 방식), 그건 배포 간극용 임시 경로다.
--
-- ⚠️ 기존 행은 `default 'exclusive'` 로 채워진다 — 지금까지 접수된 발주 요청은 전부
--    독차 전제로 처리됐으므로 사실과 맞다.

alter table portal_order_requests
  add column if not exists loading_type text not null default 'exclusive';

do $$
declare
  v_type text;
  v_default text;
  v_bad int;
begin
  select data_type, column_default into v_type, v_default
    from information_schema.columns
   where table_name = 'portal_order_requests' and column_name = 'loading_type';

  if v_type is null then
    raise exception 'portal_order_requests.loading_type 이 만들어지지 않았다';
  end if;
  if v_type <> 'text' then
    raise exception 'loading_type 타입이 text 가 아니다: %', v_type;
  end if;
  if v_default is null or v_default not like '%exclusive%' then
    raise exception 'loading_type 기본값이 exclusive 가 아니다: %', coalesce(v_default, '(null)');
  end if;

  -- 🔴 `quotes`/`orders` 와 같은 값만 들어가야 한다
  select count(*) into v_bad
    from portal_order_requests
   where loading_type is null or loading_type not in ('exclusive', 'mixable');
  if v_bad > 0 then
    raise exception 'loading_type 이 exclusive/mixable 이 아닌 행이 있다: %건', v_bad;
  end if;
end $$;

select count(*) as 총_발주요청,
       count(*) filter (where loading_type = 'exclusive') as 독차,
       count(*) filter (where loading_type = 'mixable') as 혼적가능
  from portal_order_requests;

-- ── 되돌리기 ────────────────────────────────────────────────
-- alter table portal_order_requests drop column if exists loading_type;
