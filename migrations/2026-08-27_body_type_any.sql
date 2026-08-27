-- PR #103 리뷰 — 차량형태에 `차종무관` 추가 (드롭다운 **제일 하단**)
--
-- 실행: GitHub Actions → "DB 마이그레이션" → dry-run 으로 확인 후 apply.
--
-- ══ 🔴 앞 파일(`2026-08-27_body_types_expand.sql`)의 판단을 뒤집는다 ══════════
--
--    그 파일은 *"차종무관은 `특수/협의`(0/0)가 이미 그 역할을 한다"* 며 일부러 뺐다.
--    **틀린 판단이었다.** 둘은 뜻이 정반대다 —
--
--      특수/협의  위 목록에 없는 차가 필요하다  → 배차가 **어려워진다**
--      차종무관   아무 차나 괜찮다              → 배차가 **쉬워진다**
--
--    같은 0/0 이라도 담당자가 보는 의미가 반대라 합칠 수 없다. 사용자 확정 2026-08-27.
--
--    🔴 **앞 파일을 고치지 않았다**(47차 (C)③) — 이미 `_migrations` 에 적용된 파일의
--    SQL 을 나중에 고치면 DB 엔 옛 내용, 파일엔 새 내용이 되어 어긋난다. 그래서 이
--    파일이 앞 파일의 ④ 단언("DB 에는 있는데 코드에 없는 차종")을 21종 기준으로
--    다시 건다. ⚠️ 앞 파일을 다시 돌리면 그 단언이 `차종무관` 을 잡아 멈춘다 —
--    이미 적용됐으므로 워크플로가 다시 실행하지 않는다(정상이다).
--
-- ══ 가산 0/0 인 이유 ═══════════════════════════════════════════════════════
--
--    "아무 차나 괜찮다"는 **선택지가 가장 넓은** 요청이다. 조합형을 `min()` 으로
--    잡은 규칙(`카고/윙` = min(카고, 윙바디) = 0.00)의 연장이며, 전체 중 최솟값이
--    카고의 0.00 이므로 0/0 이 맞다.
--    🔴 여기에 값을 붙이면 화주가 **범위를 넓혀줬는데 더 비싸지는** 이상한 표가 된다.
--
-- 🔴 **코드와 같은 커밋에 있어야 한다** — `lib/vehicleBodyTypes.ts` 의
--    `QUOTE_BODY_TYPES` 와 이름이 하나라도 어긋나면 견적 계산이 문자열 완전일치로
--    매칭한 뒤 못 찾고 `continue` 한다(예외도 경고도 없이 가산만 빠진다, 48차 `도크`).

-- ① 착수 전 확인 — 앞 파일이 반영된 20행 상태(또는 이미 반영된 21행)여야 한다
do $$
declare v_cnt int;
begin
  select count(*) into v_cnt from rate_surcharges where category = '차량형태';
  if v_cnt not in (20, 21) then
    raise exception '차량형태가 20행(반영 전) 또는 21행(반영 후)이 아니다: %행 — 2026-08-27_body_types_expand.sql 이 먼저 반영돼야 한다', v_cnt;
  end if;
end $$;

-- ② `차종무관` 1행 — 재실행 안전(이미 있으면 안 넣는다)
with ins as (
  insert into rate_surcharges (category, option_name, rate_pct, flat_amount)
  select '차량형태', '차종무관', 0.00, 0
   where not exists (
     select 1 from rate_surcharges
      where category = '차량형태' and option_name = '차종무관'
   )
  returning 1
)
select count(*) as 반영된_행수 from ins;

-- ③ 총 21행 · `차종무관` 이 최저가여야 한다
do $$
declare v_cnt int; v_pct numeric; v_flat numeric; v_bad int;
begin
  select count(*) into v_cnt from rate_surcharges where category = '차량형태';
  if v_cnt <> 21 then
    raise exception '차량형태가 21행이 아니다: %행', v_cnt;
  end if;

  select rate_pct, coalesce(flat_amount, 0) into v_pct, v_flat
    from rate_surcharges where category = '차량형태' and option_name = '차종무관';
  if v_pct <> 0.00 or v_flat <> 0 then
    raise exception '차종무관이 0/0 이 아니다: % / % — 범위를 넓혀준 요청이 더 비싸지면 안 된다', v_pct, v_flat;
  end if;

  -- 🔴 `차종무관` 보다 싼 차종이 생기면 화주가 그 쪽을 골라 범위가 좁아진다
  select count(*) into v_bad from rate_surcharges
   where category = '차량형태'
     and (rate_pct < 0.00 or coalesce(flat_amount, 0) < 0);
  if v_bad > 0 then
    raise exception '차량형태에 음수 가산이 있다: %개', v_bad;
  end if;
end $$;

-- ④ 🔴 코드(`lib/vehicleBodyTypes.ts` QUOTE_BODY_TYPES 21종)와 라벨 완전일치
do $$
declare v_missing text; v_extra text;
begin
  select string_agg(name, ', ') into v_missing
    from (values
      ('카고'),('카고/윙'),('호로'),('탑차'),('윙바디/탑'),('윙바디'),('윙플러스'),
      ('리프트'),('카고리프트'),('초장축'),('호로리프트'),('탑리프트'),('냉장탑'),
      ('리프트윙'),('냉장윙'),('냉동탑'),('냉동탑리프트'),('냉장윙리프트'),('무진동'),
      ('특수/협의'),('차종무관')
    ) as code(name)
   where not exists (
     select 1 from rate_surcharges r where r.category='차량형태' and r.option_name = code.name
   );
  if v_missing is not null then
    raise exception '코드에는 있는데 DB 에 없는 차종: % — 견적 계산이 조용히 가산을 빠뜨린다', v_missing;
  end if;

  select string_agg(option_name, ', ') into v_extra
    from rate_surcharges
   where category = '차량형태'
     and option_name not in ('카고','카고/윙','호로','탑차','윙바디/탑','윙바디','윙플러스',
       '리프트','카고리프트','초장축','호로리프트','탑리프트','냉장탑','리프트윙','냉장윙',
       '냉동탑','냉동탑리프트','냉장윙리프트','무진동','특수/협의','차종무관');
  if v_extra is not null then
    raise exception 'DB 에는 있는데 코드에 없는 차종: % — 드롭다운 맨 뒤에 붙어 순서가 어색해진다', v_extra;
  end if;
end $$;

select option_name, rate_pct, flat_amount
  from rate_surcharges where category = '차량형태'
 order by rate_pct, flat_amount, option_name;

-- ── 되돌리기 ────────────────────────────────────────────────
-- delete from rate_surcharges where category = '차량형태' and option_name = '차종무관';
