# WeCarry 운송 통합 운영 시스템 — 최종 인수인계 문서

> 이 문서는 claude.ai 채팅에서 **Claude Code로 작업 방식을 전환하는 시점**에 작성된
> 최종 버전입니다. 앞으로는 이 문서(또는 `CLAUDE.md`)를 참고해서 Claude Code가
> 작업을 이어갑니다.

**작성일: 2026-07-23**

---

## 0. 이 문서를 읽는 방법 (Claude Code에게)

이 프로젝트는 claude.ai 채팅에서 수십 차례에 걸쳐 기능을 만들어왔고, 만들어진 코드는
**항상 사용자가 GitHub 웹 화면에 직접 복사-붙여넣기하는 방식**으로 반영되었다. 즉:

- 이 문서에 적힌 "완료됨" 항목은 **사용자가 실제로 GitHub에 적용했다고 확인한 것**만 표시
- 일부 항목은 "적용 안내는 했지만 사용자의 최종 확인을 못 받은 상태"일 수 있음 — 실제
  저장소 코드가 이 문서 내용과 다르면 **저장소 쪽이 항상 맞다**
- 작업 방식이 이제 Claude Code로 바뀌므로, 앞으로는 직접 파일을 읽고 수정하면 됨
  (더 이상 "파일을 만들어서 보여주고 사용자가 복붙" 하는 방식이 아님)

---

## 1. 서비스 개요

**WeCarry 운송** — B2B 화물운송 주선업 통합 운영 시스템. 화주 CRM, 견적/배차/정산 관리,
화주포털, 완전공개 랜딩페이지·견적문의·화주등록신청까지 포함하는 풀스택 시스템.

## 2. 기술 스택 및 배포 구조

- **Next.js 14 (App Router)** + **Supabase (Postgres, Auth, Realtime)** + **Vercel** 배포
- GitHub 저장소: `ttang0825/b2b-cargo-system` (main 브랜치)
- 4중 구조:
  - `/admin/*` — 내부 관리자 (공유 비밀번호, middleware.ts로 게이트. 아직 직원별 계정 없음)
  - `/customer/*` — 화주포털 (Supabase Auth 개별 계정 + RLS)
  - `/`, `/quote`, `/apply`, `/status` — 완전 공개(비회원), anon INSERT 전용 + 서버 API 조회
  - 향후: 직원 개별 로그인 체계 (아직 미착수, 아래 로드맵 참고)

### 환경변수 (Vercel)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`KAKAO_REST_API_KEY`, `ADMIN_PASSWORD`. **보류 중(아직 미등록)**: `RESEND_API_KEY` (이메일
발송용 — 아래 6번 참고).

### npm 의존성 중 특이사항
`xlsx-js-style`(xlsx 아님! 스타일링 위해 교체함) — 화주포털 엑셀 다운로드용.

---

## 3. 핵심 설계 원칙 (반드시 유지할 것)

1. **admin/customer는 반드시 별도 Supabase 클라이언트** (`lib/supabaseClient.ts` vs
   `lib/supabaseCustomerClient.ts`) — 세션 충돌 방지
2. **RLS 기본**: `companies/quotes/orders/dispatches/invoices` 등 핵심 테이블은
   anon 전체허용(admin이 anon key로 접속하는 구조라서) + authenticated는 본인 회사만
3. **완전공개(비회원) 테이블**(`public_quote_requests`, `customer_applications`)은
   전혀 다른 패턴: **anon INSERT 전용, SELECT 정책 없음.** 관리자 조회·처리는 반드시
   `SUPABASE_SERVICE_ROLE_KEY`를 쓰는 서버 API 라우트(`app/api/admin/*`)를 통해서만.
   방문자 본인 조회(`/status`)도 전화번호로 필터링하는 서버 API를 통해서만 — RLS로
   anon SELECT를 여는 방식은 금지 (다른 사람 정보가 다 보이게 됨)
4. **이 anon-locked 테이블들은 Realtime 구독이 안 됨** (RLS가 realtime broadcast도
   막음). 대신 관리자 화면에서 **15초 폴링**으로 사실상 실시간처럼 보이게 처리함
   (`setInterval` 패턴, `TopNav.tsx`와 각 관리 화면에 이미 구현됨)
5. Realtime 쓰는 새 테이블은 **반드시 `supabase_realtime` publication 등록 확인**
   (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`) — 빠뜨리면 조용히 안 됨
   (announcements 테이블에서 실제로 겪은 버그)
6. **상하차 일시 규칙**: 상차일시는 항상 현재시각 이후만 선택 가능. 하차일시는
   상차일시보다 최소간격 이후만 — **견적 관리만 거리기반(100km당 1h, 2~5h 범위)**,
   운송오더·발주요청은 **고정 2시간**. `components/DateTimePicker.tsx`의
   `minDateTime`/`minDateTimeLabel` prop으로 구현
7. **견적 관리 폼 필드 순서는 전화상담 흐름 고정**: 고객구분 → 품목/물품특성 → 톤수 →
   출발지/도착지 → 거리 → 희망 상차/하차일시 → 긴급여부 → 운송시간(상차일시 기준
   자동추천) → 왕복/편도 → 상차조건/하차조건 → 차량형태 → 대기시간/경유지수 → 특이사항
8. **화주 개인정보는 계정별로 분리 저장** — `customer_accounts`(계정 개인정보:
   name/contact_position/contact_mobile/email) vs `companies`(회사 대표정보,
   관리자가 관리). 여러 포털 계정이 있는 화주도 서로 안 덮어씀
9. **엑셀 내보내기는 `lib/exportExcel.ts` 공용 함수만 사용** (`exportRowsToExcel`,
   `exportMultiSheetExcel`, `buildExportFilename`). 헤더 스타일(굵게+옐로우 배경)+
   1행 틀고정 자동 적용됨. **`xlsx`가 아니라 `xlsx-js-style` import 필수**
10. **탭 제목(metadata)은 각 세그먼트 `layout.tsx`에서 관리.** 클라이언트 컴포넌트는
    metadata export 불가 → 얇은 서버 레이아웃이 클라이언트 컴포넌트를 감싸는 패턴
    (`app/customer/layout.tsx` → `CustomerPortalShell.tsx` 참고)
11. **새 공개 경로(admin도 customer도 아닌 최상위 경로)를 추가하면 반드시
    `components/TopNav.tsx`의 숨김 조건에도 추가할 것** — 안 그러면 관리자 메뉴가
    그 공개 페이지 위에 얹혀서 나타남 (실제로 여러 번 겪은 버그: `/`, `/quote`,
    `/apply`, `/status` 전부 이 조건에 등록되어 있어야 함)
12. **비밀번호 입력창은 `components/PasswordInput.tsx`(표시/숨김 토글) 재사용**
13. **표/카드가 있는 화면은 데스크탑 `<table>`과 모바일 카드가 완전히 별개 JSX** —
    컬럼 추가할 때 양쪽 다 챙길 것 (화주포털 페이지들, `.desktop-only`/`.mobile-only`
    클래스로 전환)
14. **관리자 메뉴는 3개 그룹 드롭다운 구조**: 화주 확보(화주관리·화주신청·공개문의) /
    화주 관리(활성화주CRM·화주요청) / 운송 운영(운임기준표·견적·오더·차주·배차·정산).
    새 관리자 메뉴 추가 시 `TopNav.tsx`의 `NAV_GROUPS`에 적절한 그룹으로 넣을 것
15. **관리자 화면의 알림 배지는 항상 같은 폭을 차지하도록 `visibility` 토글 방식**
    사용 (조건부 렌더링 금지) — 배지 유무로 메뉴 레이아웃이 밀리는 버그 방지
16. **거절/보류 처리에는 표준화된 사유 드롭다운**이 있음
    (`admin/applications/page.tsx`의 `REJECT_REASONS`/`HOLD_REASONS`) — 새로운
    사유가 필요하면 이 배열에 추가

---

## 4. 완료된 주요 기능 (전체 요약)

- 화주 CRM(영업 대상 DB) / 활성 화주(CRM 전환 후) / 운임기준표·자동견적 계산
- 견적 관리(전화상담 흐름 순서, 최종금액 수동수정, PDF 출력, 특이사항/상하차일시)
- 운송오더 / 차주 관리 / 배차 관리(운송완료 시 정산 자동등록) / 정산 관리
- 화주포털 전체: 계정발급(개별 삭제 포함)·비밀번호변경(최초/평소 구분)·발주요청
  (승인 시 견적 자동연결+진행상황 표시)·부가메뉴 8종(견적확인 PDF출력 포함,
  배차조회, 캘린더, 정산확인+발행일/입금일, 월별통계+평균단가/전월대비/자주쓰는구간,
  배송지, 담당자정보, 공지사항+안읽음표시)·엑셀 통합다운로드(운송+정산, 스타일링)·
  실시간 알림·완전 반응형(모바일 카드 전환)
- 디자인: 관리자=토스블루, 화주포털/공개페이지=브랜드 옐로우+블랙(`.portal-theme`)
- **완전공개 3종 세트**: `/quote`(견적문의) → `/apply`(화주 등록신청, 승인 시 회사+
  포털계정 자동생성, 롤백/중복승인 방지 처리됨) → `/status`(통합 조회, 전화번호로
  견적문의+등록신청 둘 다 확인)
- 관리자 메뉴 3그룹 드롭다운 재설계, 화주신청/공개문의/화주요청 전부 기간필터
  (오늘/이번주/이번달/전체) 적용
- 이메일 발송 인프라 구축됨(Resend) — **활성화는 보류 중** (아래 6번)

---

## 5. 다음 예정 작업 (우선순위 순)

1. **직원 계정 · 권한 · 이력** — 가장 큰 재구조화 작업. admin 전체를 공유 비밀번호에서
   Supabase Auth 개별 계정 체계로 전환 + role(관리자/직원) 구분 + 화면별 권한
   (직원은 삭제·운임기준표 수정 불가) + 모든 데이터에 처리자 기록. **별도 설계
   세션으로 진행 권장**
2. 관리자의 화주포털 "고객지원용 접속"(화주 계정으로 임시 로그인) — Supabase Auth
   Admin API의 magic link 방식으로 구현 가능해 보임, 1번과 함께 진행 검토
3. 동시 편집 처리 — 현재는 "나중에 저장한 사람이 이김"(경고 없음). 최소 저장 시점
   경고 정도는 1번과 별개로 먼저 가능
4. 카카오 알림톡 자동화 — 사업자 인증·발신프로필 심사가 필요해 **미리 신청 절차부터
   시작하는 것을 권장** (승인에 시간 걸림)
5. 화주포털 발주요청 2차 기능(화주 직접 오더 입력)
6. 커스텀 도메인 연결, 공개 화면 UX 고도화 — 보류 중
7. 유료 플랜 전환 / 페이지네이션·대시보드

## 6. 보류 중인 작업 (나중에 이어서 진행)

- **Resend 이메일 발송 활성화**: 코드는 이미 만들어져 있음(계정정보 발송, 거절/보류
  사유 안내 발송). resend.com 가입 → API 키 발급 → Vercel에 `RESEND_API_KEY` 환경변수
  등록만 하면 즉시 작동. 관련 파일: `app/api/admin/send-portal-credentials-email/route.ts`,
  `app/api/admin/send-application-status-email/route.ts`
- **사업자등록번호 진위확인**: 국세청 "사업자등록정보 진위확인 및 상태조회" API 필요.
  공공데이터포털(data.go.kr) 가입·신청 절차부터 시작해야 함. 현재는 자동 하이픈
  포맷팅만 되어 있고 실제 진위확인은 안 됨

---

## 7. 자주 막히는 지점 (문제 생기면 여기부터 확인)

- **admin에서 새 anon-locked 테이블(공개문의류) 만들 때**: SELECT 정책 절대 열지
  말 것, 서버 API + 폴링 패턴 재사용 (원칙 3, 4번)
- **화주 회사(`companies`) 테이블 컬럼명 확인 시 주의**: 사업자등록번호는
  `biz_reg_no`(business_reg_no 아님!) — 실제로 잘못된 이름으로 코드를 짰다가
  고친 이력 있음. 컬럼명이 불확실하면 `companies_id_page_final.tsx`의
  `BASIC_FIELDS`/`SALES_REF_FIELDS` 배열을 먼저 확인
- **새 공개 페이지 추가 시 TopNav 숨김조건 누락 주의** (원칙 11번)
- **표/카드 이중관리**: 컬럼 하나 추가할 때 데스크탑/모바일 버전 둘 다 확인
  (원칙 13번)
- **화주신청 승인 API 재실행 방지**: `application.company_id`가 이미 있으면 중복
  승인 차단하는 로직이 `approve-application/route.ts`에 있음 — 이 체크를 실수로
  지우면 중복 화주 생성 버그 재발함

---

## 8. Claude Code로 넘어가면서 참고할 것

- 이 프로젝트는 지금까지 **사용자가 매번 파일을 GitHub 웹 UI에 직접 복사해서
  적용하는 방식**으로 진행되었음. Claude Code부터는 저장소를 직접 읽고 수정하면 됨
- 사용자는 **개발 초보자**임 — 전문 용어를 풀어서 설명하고, 변경사항을 적용하기
  전에 무엇을 왜 하는지 간단히 설명해주는 게 좋음
- 중요한 변경(특히 DB 스키마, 결제/계정 관련 로직)은 **바로 main에 반영하지 말고
  검토받을 것을 권장**
- 이 문서를 프로젝트 저장소 루트에 `CLAUDE.md`라는 이름으로도 저장해두면, Claude
  Code가 세션 시작 시 자동으로 읽어서 참고함

---

## 9. 새 세션에서 이어가는 방법

Claude Code에서: 저장소를 열고 "인수인계 문서(CLAUDE.md 또는 HANDOFF.md)를 참고해서
5번(직원 계정·권한·이력)부터 이어서 진행해줘" 같은 식으로 시작하면 됩니다.

실제 저장소 코드가 이 문서와 다르면 **저장소가 항상 맞습니다.**
