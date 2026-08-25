-- 14차 — 동의 기록 테이블 신설
--
-- 배경: 그 전까지 `/quote`·`/apply`의 동의 체크박스는 **제출 버튼을 막는 용도로만** 쓰였고
-- 동의 사실이 어디에도 저장되지 않았다(42차 사전조사에서 코드·DB 양쪽으로 확정).
-- 법적 동의는 입증 책임이 있어서, 화면에서 받는데 기록이 없으면 받지 않은 것과 다르지 않다.
--
-- 🔴 설계 결정 — 바꾸기 전에 이유를 먼저 볼 것
--
--   FK 없음          폴리모픽(subject_type + subject_id)이라 걸 수 없고, 원본이 삭제돼도
--                    동의 이력은 남아야 한다(원칙 32번의 결).
--   INSERT만         철회는 `agreed = false` 행을 **추가**한다. UPDATE로 덮어쓰면 이력이 사라진다.
--   RLS on + 정책 0개  `sms_logs`·`support_access_logs`와 같은 방식. 서버 API(service_role)로만
--                    접근하므로 anon/authenticated 정책을 만들지 않는다.
--                    ⚠️ anon에게 GRANT가 있는 것은 Supabase 기본값이고 실제 게이트는 RLS다 —
--                    정책을 하나라도 만들면 그 순간 anon에게 열린다.
--   CHECK 없음       값 목록은 `lib/consent.ts` 상수로 관리한다. 나중에 'phone'·'marketing'을
--                    추가할 때 제약까지 같이 고쳐야 하는 부담을 지지 않으려는 것이며,
--                    이 저장소는 `dispatch_status` CHECK 때문에 배차 등록이 막힌 전례가 있다.
--   subject_id text   지금은 uuid 문자열만 담지만, 마케팅 동의를 담당자(연락처) 단위로 붙일 때
--                    정규화된 전화번호를 그대로 담기 위해 text로 둔다.
--
-- ⚠️ 이 파일은 사용자가 Supabase SQL Editor에서 직접 실행한다(이 저장소의 관례).

create table if not exists consents (
  id            uuid        primary key default gen_random_uuid(),
  -- 'quote_request' | 'application'   (나중에 'phone')
  subject_type  text        not null,
  -- 대상 행의 uuid 문자열     (나중에 정규화된 연락처)
  subject_id    text        not null,
  -- 'privacy' | 'terms'              (나중에 'marketing')
  consent_type  text        not null,
  -- lib/legalInfo.ts의 PRIVACY_POLICY_VERSION / TERMS_VERSION 값을 그대로 저장
  version       text        not null,
  agreed        boolean     not null,
  agreed_at     timestamptz not null default now(),
  -- 동의를 받은 화면 경로. '/quote' | '/apply'
  source        text
);

-- 관리자 화면이 "이 신청서/문의에 어떤 동의가 있나"로 조회한다. 지금 필요한 인덱스는 이것뿐이며,
-- 다른 조회 패턴이 생기면 그때 추가한다(과도한 설계 방지).
create index if not exists consents_subject_idx on consents (subject_type, subject_id);

alter table consents enable row level security;
-- 🔴 정책을 만들지 않는다. 정책 0개 + RLS on = service_role 전용.
