-- 견적서 공유 링크 — 로그인 없이 열리는 견적서의 토큰
--
-- 사용자 지시(2026-09-15): *"견적문자 발송에서 간단한 멘트와 견적서 url을 보낼수
-- 있나? 가급적 (SMS) 문자이면 좋겠다."* → 결정 3건:
--   ① 확인을 한 번 더 받는다(연락처 뒤 4자리)
--   ② 유효기간이 지나면 막는다
--   ③ 기존 견적안내 문자를 대체한다
--
-- 🔴 **왜 필요했나** — 견적서를 볼 수 있는 곳이 `/admin/quotes/[id]`(직원만)와
--    `/customer/quotes/[id]`(포털 계정 있는 화주만) 둘뿐이었다. 전화로 받은
--    **게스트 견적은 계정 자체가 없어** 링크를 줘도 열 수 없었다.
--
-- 🔴 **토큰이 곧 열쇠다** — 이 값이 새면 그 견적서가 열린다(상호·구간·금액).
--    그래서 ① 추측 불가능한 난수여야 하고 ② 연락처 뒤 4자리를 한 번 더 묻고
--    ③ 견적 유효기간이 지나면 막는다. 생성은 `lib/quoteShare.ts` 한 곳이 한다.
--
-- 🔴 **만료 컬럼을 만들지 않았다.** 유효기간은 **견적서 자신의 것**을 쓴다 —
--    「발행일(`created_at`) + 7일」이고 견적서 PDF·엑셀이 이미 그 값을 인쇄한다
--    (`lib/quoteExcel.ts` · print 2종). 별도 컬럼을 두면 **문서에 적힌 유효기간과
--    링크가 막히는 날짜가 갈린다.** 🔴 만료 컬럼을 새로 만들지 말 것 —
--    유효기간 규칙을 바꾸려면 그 규칙 자체(`lib/quoteShare.ts`)를 고칠 일이다.
--
-- 🔴 **`share_token` 은 nullable 이다** — 문자를 보낸 적 없는 견적은 링크가 없다.
--    발급은 견적 문자 미리보기를 만들 때 한 번만 일어나고, 그 뒤로는 같은 값을 쓴다
--    (다시 보낼 때마다 바뀌면 먼저 받은 문자의 링크가 죽는다).

-- ── ① 컬럼 ─────────────────────────────────────────────────────────────────
alter table quotes
  add column if not exists share_token text,
  add column if not exists share_token_issued_at timestamptz;

-- ── ② 유니크 — 🔴 토큰이 겹치면 남의 견적서가 열린다 ────────────────────────
-- 부분 인덱스다(null 은 세지 않는다 — 발급 안 한 견적이 대부분이다).
create unique index if not exists quotes_share_token_key
  on quotes (share_token)
  where share_token is not null;

-- ── ③ 길이 제약 ────────────────────────────────────────────────────────────
-- 🔴 짧은 토큰이 들어오는 것을 DB 에서도 막는다 — 코드만 믿으면 나중에 누가
--    "테스트로 짧게" 넣은 값이 그대로 링크가 된다.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'quotes_share_token_len_check') then
    alter table quotes
      add constraint quotes_share_token_len_check
      check (share_token is null or char_length(share_token) >= 16);
  end if;
end $$;

-- ── ④ 단언 ─────────────────────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n
    from information_schema.columns
   where table_name = 'quotes'
     and column_name in ('share_token', 'share_token_issued_at');
  if n <> 2 then
    raise exception 'quotes 에 공유 토큰 컬럼 2개가 아닙니다: %', n;
  end if;

  -- 🔴 기존 견적에는 토큰이 하나도 없어야 한다(백필하지 않는다) — 백필하면
  --    **보낸 적 없는 견적서의 링크가 생긴다.**
  select count(*) into n from quotes where share_token is not null;
  if n <> 0 then
    raise exception '기존 견적에 토큰이 이미 있습니다(백필 금지): %건', n;
  end if;
end $$;
