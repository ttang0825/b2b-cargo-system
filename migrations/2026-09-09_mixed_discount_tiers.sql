-- 혼적 할인 표준값 — 단일 행 → 거리 3구간 (B장)
--
-- 🔴 이 표의 값은 "계산에 쓰이는 할인율"이 아니라 "입력창 기본값"입니다.
--    실제 할인은 건별 저장값(quotes/orders.mixed_discount_percent · _amount)이고,
--    담당자가 고치면 그 값이 이깁니다. C안(= 기본값만 거리별 + 「표준과 다름」 표시)이라
--    applyMixedDiscount()/reverseMixedDiscount() 는 이 마이그레이션과 무관합니다.
--
-- 🔴 값은 계수(0.85)가 아니라 **할인율(%)** 로 저장합니다 — 기존 컬럼명·화면·계산이
--    전부 할인율 기준이라, 계수로 바꾸면 셋이 동시에 뒤집힙니다.
--      ~30km      계수 0.85 → 할인율 15
--      31~250km   계수 0.65 → 할인율 35   🔴 직접 비교 쌍 0쌍인 보간값(담당자 확인 권장)
--      251km 이상 계수 0.45 → 할인율 55
--
-- 🔴 구간 이름을 지시서의 「~30km / 31~250km / 251km 이상」 대신
--    「30km 이내 / 250km 이내 / 250km 초과」로 씁니다 — 매칭이 rate_distance_tiers 와
--    같은 **「상한 이하 첫 구간」**(하한을 조건에 넣지 않음, 원칙 44번)이라, 30.4km 처럼
--    소수 거리가 「31~250km」라는 이름과 어긋나 보이게 됩니다. 하한 컬럼도 만들지 않습니다.
--
-- 되돌리기: 파일 맨 아래 주석 참고

-- ── ① 컬럼 추가 ──────────────────────────────────────────────
alter table public.mixed_loading_discount_settings
  add column if not exists distance_label text;
alter table public.mixed_loading_discount_settings
  add column if not exists distance_to_km numeric;

-- ── ② 착수 단언 ──────────────────────────────────────────────
do $$
declare
  n_unlabeled int;
begin
  select count(*) into n_unlabeled
    from public.mixed_loading_discount_settings
   where distance_label is null;

  -- 구간 없는 행(= 3구간 전환 전의 단일 행)이 2개 이상이면 어느 것을 살릴지
  -- 이 파일이 정할 수 없다. 사람이 확인해야 한다.
  if n_unlabeled > 1 then
    raise exception '구간 미지정 행이 %개입니다 — 단일 행 전제가 깨졌으니 손으로 확인하십시오', n_unlabeled;
  end if;
end $$;

-- ── ③ 기존 행을 중간 구간으로 재활용 ─────────────────────────
-- 새로 3행을 만들고 옛 행을 지우는 대신 재활용한다 — updated_by/updated_at 이력이
-- 보존되고, 이 표를 참조하는 곳이 없어 id 가 바뀌어도 되지만 굳이 바꿀 이유가 없다.
update public.mixed_loading_discount_settings
   set distance_label = '250km 이내',
       distance_to_km = 250
 where distance_label is null;

-- ── ④ 구간 이름 유일성 ───────────────────────────────────────
-- 아래 upsert 의 충돌 대상이자, 같은 구간이 두 줄 생기는 것을 막는 장치.
create unique index if not exists mixed_loading_discount_settings_distance_label_key
  on public.mixed_loading_discount_settings (distance_label);

-- ── ⑤ 3구간 값 반영 (재실행 안전) ────────────────────────────
with upd as (
  insert into public.mixed_loading_discount_settings
    (id, distance_label, distance_to_km, standard_discount_percent, updated_at)
  values
    (gen_random_uuid(), '30km 이내',  30,   15, now()),
    (gen_random_uuid(), '250km 이내', 250,  35, now()),
    (gen_random_uuid(), '250km 초과', null, 55, now())
  on conflict (distance_label) do update
    set distance_to_km            = excluded.distance_to_km,
        standard_discount_percent = excluded.standard_discount_percent,
        updated_at                = now()
  returning 1
)
select count(*) as "반영된 구간 수(3이어야 함)" from upd;

-- ── ⑥ 구간 이름은 이제 필수 ──────────────────────────────────
alter table public.mixed_loading_discount_settings
  alter column distance_label set not null;

-- ── ⑦ 반영 단언 ──────────────────────────────────────────────
do $$
declare
  n_rows        int;
  n_open        int;
  n_dup_to      int;
  p_30          numeric;
  p_250         numeric;
  p_over        numeric;
begin
  select count(*) into n_rows from public.mixed_loading_discount_settings;
  if n_rows <> 3 then
    raise exception '구간이 3행이 아닙니다 — 실제 %행', n_rows;
  end if;

  -- 상한이 열린(무제한) 구간은 정확히 하나여야 한다. 없으면 먼 거리에서 계수가
  -- 조용히 비고, 둘이면 어느 쪽이 걸릴지 정렬 순서에 달리게 된다.
  select count(*) into n_open
    from public.mixed_loading_discount_settings where distance_to_km is null;
  if n_open <> 1 then
    raise exception '상한이 열린 구간이 1개가 아닙니다 — 실제 %개', n_open;
  end if;

  select count(*) into n_dup_to from (
    select distance_to_km from public.mixed_loading_discount_settings
     where distance_to_km is not null
     group by distance_to_km having count(*) > 1
  ) d;
  if n_dup_to > 0 then
    raise exception '상한이 같은 구간이 있습니다 — %건', n_dup_to;
  end if;

  select standard_discount_percent into p_30
    from public.mixed_loading_discount_settings where distance_label = '30km 이내';
  select standard_discount_percent into p_250
    from public.mixed_loading_discount_settings where distance_label = '250km 이내';
  select standard_discount_percent into p_over
    from public.mixed_loading_discount_settings where distance_label = '250km 초과';

  if p_30 is distinct from 15 or p_250 is distinct from 35 or p_over is distinct from 55 then
    raise exception '할인율이 15/35/55 가 아닙니다 — 실제 % / % / %', p_30, p_250, p_over;
  end if;

  -- 먼 구간일수록 할인율이 커야 한다(계수는 작아진다). 역전은 값을 잘못 넣은 것이다.
  if not (p_30 < p_250 and p_250 < p_over) then
    raise exception '거리가 멀수록 할인율이 커지지 않습니다 — % / % / %', p_30, p_250, p_over;
  end if;
end $$;

-- ── ⑧ 결과 ───────────────────────────────────────────────────
select distance_label   as "구간",
       distance_to_km   as "상한(km)",
       standard_discount_percent as "표준 할인율(%)",
       updated_at       as "수정일시"
  from public.mixed_loading_discount_settings
 order by distance_to_km asc nulls last;

-- ─────────────────────────────────────────────────────────────
-- 되돌리기 (단일 행 구조로 복귀)
--
--   delete from public.mixed_loading_discount_settings where distance_label <> '250km 이내';
--   alter table public.mixed_loading_discount_settings alter column distance_label drop not null;
--   drop index if exists mixed_loading_discount_settings_distance_label_key;
--   update public.mixed_loading_discount_settings
--      set distance_label = null, distance_to_km = null, standard_discount_percent = 20;
--   -- 컬럼까지 지우려면:
--   -- alter table public.mixed_loading_discount_settings
--   --   drop column distance_label, drop column distance_to_km;
--
-- 🔴 되돌리면 코드(getMixedLoadingDiscountTiers)가 3행을 전제하므로 함께 되돌려야 합니다.
