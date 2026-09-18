-- ─────────────────────────────────────────────────────────────────────────────
-- 견적관리 「전화응대 매뉴얼」 (2026-09-18)
--
-- 사용자 요청:
--   *"견적관리에서 전화응대 메뉴얼 창이 있으면 좋겠다. 자동계산결과 창아래 따로 창이
--     있어서 마찬가지로 스크롤 따라 가게(모바일버전은 생략). 이 창은 수시로 편집할수
--     있으면 좋겠다. 화주응대시 필요한 요소나 문구를 임의로 그때그때 수정할수 있게.
--     줄칸을 늘릴수 있고 줄일수 있게 설정. 줄칸 앞에 넘버링만 있으면 된다"*
--
-- 사용자 확정(2026-09-18): **전 직원 공유 · 관리자만 편집.**
--   → 읽기는 재직 직원 누구나(RLS 정책), **쓰기는 정책을 아예 안 만든다.**
--     저장은 `app/api/admin/call-script/route.ts`(service_role)가 `role === "admin"`
--     을 확인한 뒤에만 한다(원칙 25번 — 화면단 + 서버단 이중 체크).
--   🔴 **이 표에 insert/update/delete 정책을 만들지 말 것** — 만드는 순간
--      `staff` 롤도 브라우저 콘솔에서 매뉴얼을 통째로 갈아엎을 수 있다.
--
-- ── 구조를 이렇게 잡은 이유 ──────────────────────────────────────────────────
--
--   한 줄 = 한 행(표)   ❌   줄을 늘리고 줄이고 순서가 있는 목록이라 `sort_order` 를
--                           매번 다시 매겨야 하고, 저장이 여러 문장으로 쪼개져
--                           **절반만 반영된 상태**가 생긴다.
--   줄 목록 = jsonb 배열 ✅  저장이 UPDATE 한 문장이라 **원자적**이고, 순서가 곧
--                           배열 순서다. 화면의 넘버링도 배열 인덱스 + 1 이면 된다.
--
-- 🔴 **행은 하나뿐이다**(`id boolean primary key default true` + `check (id)`).
--    원칙 40번의 `insurance_rate_settings` 는 「가장 최근 1행」을 읽는 방식인데,
--    PR #136 이 그 표가 3행이 되면서 **한 행만 읽는 헬퍼가 조용히 틀린 값을 주는**
--    일을 겪었다. 여기는 처음부터 두 행이 될 수 없게 못박는다.
--
-- 🔴 `updated_at` 은 **덮어쓰기 경고의 기준**이다(원칙 28번과 같은 결) — 저장 API 가
--    화면이 불러온 시각과 DB 의 시각을 견줘서, 그 사이 다른 관리자가 저장했으면
--    조용히 덮어쓰지 않고 되돌려 보낸다. 컬럼을 지우지 말 것.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── ① 표 ────────────────────────────────────────────────────────────────────

create table if not exists public.call_script (
  id          boolean primary key default true,
  lines       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.staff_accounts(id) on delete set null,

  -- 🔴 행이 둘이 될 수 없게 한다 — `true` 하나만 들어갈 수 있고 그것이 기본키다.
  constraint call_script_singleton check (id),
  -- 🔴 `lines` 가 배열이 아니면 화면이 `.map()` 에서 통째로 죽는다.
  constraint call_script_lines_is_array check (jsonb_typeof(lines) = 'array')
);

-- 🔴 `updated_by` FK 는 `on delete set null` 이다(원칙 32번) — 글을 쓴 직원이
--    퇴사해 계정이 지워져도 **매뉴얼 본문은 남아야 한다.**

-- ── ② RLS — 읽기만 열고 쓰기는 안 연다 ──────────────────────────────────────

alter table public.call_script enable row level security;

drop policy if exists staff_read_call_script on public.call_script;

-- 🔴 조건은 **`public.is_active_staff()`** 다 — 화주포털 계정도 `authenticated` 라
--    그냥 `to authenticated` 만 주면 화주가 내부 응대 매뉴얼을 통째로 읽는다(19·21차).
create policy staff_read_call_script on public.call_script
  as permissive for select to authenticated
  using (public.is_active_staff());

-- ── ③ 첫 내용 ───────────────────────────────────────────────────────────────
--
-- ⚠️ **이 열 줄은 「스펙」이 아니라 빈 화면을 피하려고 넣은 출발점이다.**
--    견적 폼의 항목 순서(원칙 7번 — 고객구분 → 품목 → 톤수 → 구간 → 일시 →
--    상하차조건 → 차량형태 → 대기·경유 → 특이사항)를 그대로 말로 옮긴 것이고,
--    담당자가 화면에서 언제든 고치고 지우고 더할 수 있다.
-- 🔴 **이 문장들을 근거로 응대 규칙을 추론하지 말 것** — 정본은 DB 의 현재 값이다.
-- 🔴 `on conflict do nothing` 이라 **재실행해도 담당자가 고친 내용을 덮어쓰지 않는다.**

insert into public.call_script (id, lines)
values (
  true,
  jsonb_build_array(
    '안녕하세요, 위캐리 운송입니다. 어떤 화물 상담 도와드릴까요?',
    '기존에 거래하신 적 있으신가요? (상호를 들으면 화주 검색 · 처음이면 연락처부터)',
    '어떤 물품인가요? 파손 주의·냉장 등 조심할 점이 있으면 말씀해 주세요.',
    '무게나 부피가 어느 정도 되나요? (톤수 판단)',
    '출발지와 도착지를 알려주세요. (동까지 들으면 거리 계산이 됩니다)',
    '상차는 언제로 잡을까요? 하차가 당일·내일 도착이면 그렇게 말씀해 주세요.',
    '상하차는 어떻게 하시나요? (지게차 · 수작업 · 호이스트 · 크레인 · 컨베이어)',
    '차량은 카고 · 윙바디 · 탑 중에 필요한 형태가 있으신가요?',
    '대기시간이나 경유지가 생길 것 같으면 미리 알려주세요 — 추가비가 붙습니다.',
    '안내드린 금액은 부가세 별도입니다. 견적서는 문자로 보내드리겠습니다.'
  )
)
on conflict (id) do nothing;

-- ── ④ 단언 — 실제로 읽고 쓸 수 있는지 넣어 보고 되돌린다 ────────────────────
--
-- 🔴 **이 블록을 빼지 말 것.** 제약이나 정책이 잘못 걸리면 화면에서는 「저장이 안 된다」
--    로만 보이고 원인을 짚을 단서가 없다(PR #154 가 겪은 자리다).

do $$
declare
  n bigint;
  saved jsonb;
  saved_at timestamptz;
begin
  -- (1) 행이 정확히 하나여야 한다.
  select count(*) into n from public.call_script;
  if n <> 1 then
    raise exception 'call_script 는 한 행이어야 하는데 %행입니다', n;
  end if;

  -- (2) 두 번째 행이 들어가지 않아야 한다(싱글턴 제약).
  begin
    insert into public.call_script (id, lines) values (false, '[]'::jsonb);
    raise exception 'call_script 에 두 번째 행이 들어갔습니다 — 싱글턴 제약이 안 걸렸습니다';
  exception
    when check_violation or unique_violation then
      null;  -- 기대한 동작
  end;

  -- (3) 배열이 아닌 값이 들어가지 않아야 한다.
  begin
    update public.call_script set lines = '"글자"'::jsonb where id;
    raise exception 'call_script.lines 에 배열이 아닌 값이 들어갔습니다';
  exception
    when check_violation then
      null;  -- 기대한 동작
  end;

  -- (4) 저장(UPDATE)이 실제로 되는지 — 넣어 보고 되돌린다.
  --
  -- 🔴 **되돌림을 「10줄인가」로 재지 말 것.** 재실행 시점에는 담당자가 이미 줄 수를
  --    바꿔 놨을 수 있어서(③ 이 `do nothing` 이라 씨앗은 안 들어간다) 고정 숫자로 재면
  --    **멀쩡한 DB 에서 마이그레이션이 멈춘다.** 실제로 그렇게 짰다가 2회차에서 걸렸다.
  --    견줄 것은 **시험 직전에 떠 둔 값**이다.
  -- 🔴 `updated_at` 도 같이 되돌린다 — 안 되돌리면 시험이 저장 시각을 앞으로 밀어서,
  --    화면이 들고 있던 값과 어긋나 첫 저장이 409(덮어쓰기 경고)로 거절된다.
  select lines, updated_at into saved, saved_at from public.call_script where id;

  update public.call_script
     set lines = jsonb_build_array('마이그레이션 시험'), updated_at = now()
   where id;

  if (select lines->>0 from public.call_script where id) <> '마이그레이션 시험' then
    raise exception 'call_script 저장이 반영되지 않았습니다';
  end if;

  update public.call_script set lines = saved, updated_at = saved_at where id;

  if (select lines from public.call_script where id) is distinct from saved then
    raise exception '시험 뒤 원래 내용으로 되돌아가지 않았습니다';
  end if;
  if (select updated_at from public.call_script where id) is distinct from saved_at then
    raise exception '시험 뒤 최종수정 시각이 되돌아가지 않았습니다';
  end if;
end $$;

-- ── ⑤ 결과 ─────────────────────────────────────────────────────────────────

select
  jsonb_array_length(lines) as 줄수,
  updated_at                as 최종수정,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'call_script') as 정책수
from public.call_script
where id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 되돌리기
--
--   drop table if exists public.call_script;
--
-- 🔴 표를 지우면 담당자가 적어 둔 응대 문구가 통째로 사라진다 — 지우기 전에
--    `select lines from call_script` 결과를 어딘가에 남길 것.
-- ─────────────────────────────────────────────────────────────────────────────
