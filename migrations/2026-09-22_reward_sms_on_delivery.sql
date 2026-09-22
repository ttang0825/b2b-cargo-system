-- 리워드 — 「운송완료 확인창」만 따로 끄는 스위치 (2026-09-22)
--
-- 배경(사용자 2026-09-22): *"운송완료 확인창만 따로 끄는 스위치 만들어줘."*
--   3차(PR #182)가 보고하고 답을 못 받은 채 남겨 둔 항목이다(HANDOFF §7 ·
--   *「지금은 `sms_notification_enabled` 하나가 리워드 문자 **셋**을 다 제어한다 —
--   건건이 뜨는 것이 번거로우면 그때 가르는 것이 맞다」*).
--
-- ── 🚨 왜 칸을 새로 만드는가 ────────────────────────────────────────────────
--
--   지금은 `reward_memberships.sms_notification_enabled` **하나**가 리워드 문자
--   **셋**을 다 제어한다 — `reward_earned`(쌓였다) · `reward_deducted`(썼다) ·
--   `reward_status`(쌓일 것이다). 그래서 **배차를 운송완료로 바꿀 때마다 뜨는
--   확인창**을 끄려면 **적립·차감 안내까지 같이 꺼야** 했다. 그 둘은 사건이
--   날 때만 뜨는 문자라 번거로울 일이 없는데도 같이 죽는 것이다.
--
--   🔴 **그래서 「문자를 보내는가」가 아니라 「무엇이 창을 띄우는가」를 가른다.**
--      부모는 그대로 `sms_notification_enabled` 이고, 이 칸은 그 아래
--      **운송완료 자리 하나만** 끄는 자식 스위치다.
--
--        sms_notification_enabled = false  →  셋 다 안 나간다 (이 칸과 무관)
--        sms_notification_enabled = true
--          + sms_on_delivery_enabled = true   →  지금과 같다 (운송완료마다 확인창)
--          + sms_on_delivery_enabled = false  →  적립·차감은 그대로, 운송완료만 조용
--
--   🔴 **화주 상세의 수동 「적립 안내 문자」 버튼은 이 칸을 보지 않는다.**
--      끈 뒤에도 담당자가 원할 때 같은 문자를 보낼 수 있어야 한다 — 그것이
--      이 스위치를 **「안 보낸다」가 아니라 「자동으로 뜨지 않는다」**로 만드는
--      이유다. 🔴 수동 버튼에 이 칸을 걸지 말 것.
--
-- ── 🔴 기본값이 true 인 이유 — 실측이 정했다 ────────────────────────────────
--
--   착수 전 실측(`_verify.sql` ㉞-a · 2026-09-22):
--
--       화주id   적립켬  포털노출  지급방식  문자안내
--       4f7b121f   t       t       manual      t
--       7eaa1fde   t       f       giftcard    t
--       ba996ff9   t       f       manual      t
--
--   🚨 **세 화주가 전부 `sms_notification_enabled = true` 다.** 기본값을 false 로
--      두면 이 마이그레이션이 도는 순간 **세 화주의 운송완료 안내가 조용히
--      멈춘다** — 아무도 끄지 않았는데 꺼지는 것이고, 화면에 증상이 0이다.
--      🔴 **그래서 `default true` 이고, 끄는 것은 담당자가 화면에서 한다.**
--
--   ⚠️ 그리고 3차가 *「문자가 주(主)다」*로 확정한 자리다 — 실측상 화주 7eaa1fde 는
--      **포털 계정이 0개**라(㉞-b) 그 화주에게는 문자 말고 볼 길이 없다.
--      🔴 **「번거로우니 기본을 끄자」로 뒤집지 말 것.**
--
-- 🔴 **적용 순서 — DB 가 먼저다.** 코드를 먼저 올리면 `select` 에 없는 컬럼이
--    실려 PostgREST 가 42703 을 돌려주고, 그 조회가 실패하면
--    `buildRewardStatusSmsPreview` 는 **`null` 을 돌려주므로 확인창이 통째로
--    안 뜬다**(그 함수 전체가 try/catch 다 · 2차에 같은 자리를 겪었다).
--
-- 🔴 **기존 행을 한 건도 UPDATE 하지 않는다** — `default true` 가 채운다.

-- ── ① reward_memberships.sms_on_delivery_enabled ────────────────────────────
--
-- 🔴 원칙 27번 — 같은 이름이 이미 있으면 `add column if not exists` 가 **조용히
--    아무것도 안 한다**. 있는지부터 보고, 있으면 타입까지 확인한다.

do $$
declare
  t         text;
  had_col   boolean;
  n_total   int;
  n_true    int;
begin
  select data_type into t
    from information_schema.columns
   where table_schema = 'public' and table_name = 'reward_memberships'
     and column_name = 'sms_on_delivery_enabled';

  had_col := t is not null;

  if had_col and t <> 'boolean' then
    raise exception
      'reward_memberships.sms_on_delivery_enabled 가 이미 있는데 타입이 % 입니다 — 쓰임이 다를 수 있으니 멈춥니다', t;
  end if;

  if had_col then
    raise notice 'sms_on_delivery_enabled 가 이미 있습니다 — 그대로 둡니다(재실행)';
  end if;

  alter table public.reward_memberships
    add column if not exists sms_on_delivery_enabled boolean not null default true;

  -- 🔴 **동작 유지 단언 — 방금 만든 경우에만 한다.**
  --    나중에 담당자가 일부를 끈 뒤 이 파일이 다시 돌면 「전부 true」가 아닌 것이
  --    **정상**이다. 고정된 기대값을 그때도 들이대면 멀쩡한 DB 를 멈춰 세운다
  --    (PR #179 의 「재실행 시점에도 그 숫자인가」 · 그때 실제로 겪었다).
  if not had_col then
    select count(*), count(*) filter (where sms_on_delivery_enabled)
      into n_total, n_true
      from public.reward_memberships;
    if n_total <> n_true then
      raise exception
        '새로 만든 칸인데 true 가 아닌 행이 있습니다 (전체 % · true %) — 동작이 조용히 바뀝니다', n_total, n_true;
    end if;
    raise notice '멤버십 %건이 모두 sms_on_delivery_enabled = true 로 채워졌습니다(지금 동작 그대로)', n_total;
  end if;
end $$;

comment on column public.reward_memberships.sms_on_delivery_enabled is
  '🔴 「운송완료 확인창」만 끄는 자식 스위치. 부모는 sms_notification_enabled 이고, 그것이 꺼지면 이 값과 무관하게 셋 다 안 나간다. 🔴 화주 상세의 수동 「적립 안내 문자」 버튼은 이 칸을 보지 않는다.';

-- ── ② 확인 — 칸이 실제로 생겼는가 ───────────────────────────────────────────

do $$
declare n int;
begin
  select count(*) into n
    from information_schema.columns
   where table_schema = 'public' and table_name = 'reward_memberships'
     and column_name = 'sms_on_delivery_enabled'
     and data_type = 'boolean'
     and is_nullable = 'NO';
  if n <> 1 then
    raise exception 'sms_on_delivery_enabled(boolean not null)가 만들어지지 않았습니다: %', n;
  end if;

  -- 🔴 **설정 칸은 이제 다섯이다**(enabled · portal_visible · reward_method ·
  --    sms_notification_enabled · sms_on_delivery_enabled). 각각 독립이고
  --    **하나로 묶지 말 것**(reward_core.sql ③ 의 「넷은 각각 독립이다」를 잇는다).
  raise notice '리워드 멤버십 설정 칸이 넷 → 다섯이 됐습니다';
end $$;

-- ── 되돌리기 ────────────────────────────────────────────────────────────────
--
--   alter table public.reward_memberships drop column sms_on_delivery_enabled;
--
--   ⚠️ 지우면 담당자가 꺼 둔 화주도 **다시 운송완료마다 확인창이 뜬다**(코드가
--      칸을 못 찾으면 조회가 실패해 창 자체가 안 뜨므로, 🔴 **코드를 먼저
--      되돌린 뒤에** 이 문장을 돌릴 것).
