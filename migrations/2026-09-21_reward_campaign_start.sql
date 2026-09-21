-- 기업고객 리워드 — 캠페인 **시작일을 2026-08-07 로** 옮긴다 (사용자 확정 2026-09-21)
--
-- ── 왜 ────────────────────────────────────────────────────────────────────
--
--   1차 착수 시점(2026-09-18)에 시작일을 **2026-09-01** 로 확정했고
--   `2026-09-20_reward_core.sql` 이 그 값을 넣었다. 그런데 운영을 열어 보니 —
--
--     · 담당자가 **멤버십 적용 시작일을 둘 다 2026-08-07** 로 넣어 두었고
--     · 8월 정산 건(8/25 · 8/31)이 **캠페인 시작일에 먼저 막혀** 있었다
--       (`_verify.sql` ㉝ 실측 · run #152)
--
--   🔴 **멤버십의 `started_at` 만으로는 8월 건이 안 걸린다** — 캠페인 `start_date` 가
--      바닥이라 거기서 먼저 걸러진다. 그래서 캠페인 자체를 옮긴다.
--
-- ── 무엇이 달라지는가 ──────────────────────────────────────────────────────
--
--   🔴 **소급 적립이 아니다.** 이 파일은 원장에 한 줄도 넣지 않는다 —
--      「대상 기간」만 넓힌다. 실제 적립은 여전히 **입금이 확인되는 순간**에만 난다
--      (주선사 수금 건은 `payment_received`, 선착불은 `brokerage_fee_paid`).
--   ⚠️ 앞으로 들어오는 **2026-08-07 이후 생성 정산 건이 계속 대상**이 된다.
--      한 번 넓히는 것이 아니라 **캠페인 정의가 바뀌는 것**이다.
--
-- ── 되돌리기 ──────────────────────────────────────────────────────────────
--
--   🔴 **옛 값은 `2026-09-01` 이다.** 되돌리려면 새 파일로:
--        update public.reward_campaigns set start_date = date '2026-09-01'
--         where active and name = '기업고객 운임 리워드 1차';
--      ⚠️ 되돌리면 그 사이에 쌓인 **8월 건 적립행은 그대로 남는다**(원장은
--         append-only 다). 지우려면 `reversal` 을 사유와 함께 넣어야 한다.

-- ── ① 지금 값을 로그에 남긴다 (되돌리기 근거) ───────────────────────────────
do $$
declare c record;
begin
  for c in select id, name, start_date, earn_end_date, use_end_date, earn_rate, active
             from public.reward_campaigns order by created_at loop
    raise notice '[변경 전] % / %  시작 %  적립마감 %  사용기한 %  요율 %  활성 %',
      left(c.id::text, 8), c.name, c.start_date, c.earn_end_date, c.use_end_date,
      c.earn_rate, c.active;
  end loop;
end $$;

-- ── ② 활성 캠페인이 정확히 하나여야 한다 ────────────────────────────────────
-- 🔴 둘 이상이면 어느 것을 옮길지 이 파일이 정할 수 없다 — 멈춘다.
do $$
declare n int;
begin
  select count(*) into n from public.reward_campaigns where active;
  if n <> 1 then
    raise exception '활성 캠페인이 1개가 아닙니다 (실제 %개) — 어느 것을 옮길지 정할 수 없습니다', n;
  end if;
end $$;

-- ── ③ 옮기기 전 값이 예상대로인가 ──────────────────────────────────────────
-- ⚠️ 이미 8/7 이면(재실행) 건너뛴다 — 멱등.
do $$
declare d date;
begin
  select start_date into d from public.reward_campaigns where active;
  if d not in (date '2026-09-01', date '2026-08-07') then
    raise exception '캠페인 시작일이 예상 밖입니다 (실제 %) — 누군가 손으로 바꿨을 수 있습니다', d;
  end if;
end $$;

-- ── ④ 옮긴다 ───────────────────────────────────────────────────────────────
update public.reward_campaigns
   set start_date = date '2026-08-07'
 where active;

-- ── ⑤ 옮겨졌는가 · 나머지는 그대로인가 ─────────────────────────────────────
-- 🔴 적립마감·사용기한·요율은 **건드리지 않는다** — 바뀌었으면 이 파일의 버그다.
do $$
declare c record;
begin
  select * into c from public.reward_campaigns where active;

  if c.start_date <> date '2026-08-07' then
    raise exception '시작일이 안 옮겨졌습니다: %', c.start_date;
  end if;
  if c.earn_end_date <> date '2027-02-28' then
    raise exception '적립마감이 바뀌었습니다 (2027-02-28 이어야): %', c.earn_end_date;
  end if;
  if c.use_end_date <> date '2027-05-31' then
    raise exception '사용기한이 바뀌었습니다 (2027-05-31 이어야): %', c.use_end_date;
  end if;
  if c.earn_rate <> 0.0500 then
    raise exception '적립률이 바뀌었습니다 (0.05 여야): %', c.earn_rate;
  end if;
  -- 🔴 CHECK 가 이미 막지만, 어긋나면 무엇이 틀렸는지 말해 주는 편이 낫다.
  if not (c.start_date <= c.earn_end_date and c.earn_end_date <= c.use_end_date) then
    raise exception '날짜 순서가 깨졌습니다: % / % / %',
      c.start_date, c.earn_end_date, c.use_end_date;
  end if;

  raise notice '[변경 후] 시작 %  적립마감 %  사용기한 %  요율 %',
    c.start_date, c.earn_end_date, c.use_end_date, c.earn_rate;
end $$;

-- ── ⑥ 이 변경이 실제로 넓힌 범위를 로그에 남긴다 (읽기 전용) ────────────────
-- 🔴 이름은 마스킹한다 — Actions 로그는 로그인 없이 누구나 읽는다(`_verify.sql` ⑪).
do $$
declare n int; total numeric;
begin
  select count(*), coalesce(sum(i.customer_charge_total), 0) into n, total
    from public.invoices i
   where (i.created_at at time zone 'Asia/Seoul')::date
           between date '2026-08-07' and date '2026-08-31';
  raise notice '[넓어진 범위] 8/7~8/31(KST) 생성 정산 건 %건 · 청구총액 합계 %', n, total;
end $$;
