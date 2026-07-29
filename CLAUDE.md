# WeCarry 운송 통합 운영 시스템 — 최종 인수인계 문서

> 이 문서는 claude.ai 채팅에서 **Claude Code로 작업 방식을 전환하는 시점**에 작성된
> 최종 버전입니다. 앞으로는 이 문서(또는 `CLAUDE.md`)를 참고해서 Claude Code가
> 작업을 이어갑니다.

**작성일: 2026-07-23** (최종 갱신: 2026-07-29, Claude Code 세션에서 직접 갱신 — 직원 계정
재구조화 1~8단계 전부(스펙 전체) 완료·merge됨 + 수정 스펙 3건(견적 거리 자동계산 /
로그인 정보 표시·본인 비밀번호 변경 / 개인고객 관리) 완료·merge됨 + 페이지 전환 성능
개선(로그인정보/권한체크 캐싱, middleware 최적화, `<a href>` 하드 리로드 버그 수정)
완료·merge됨 + 업체/포털계정 삭제 FK 오류 수정 + 개인고객 삭제 기능 완료·merge됨 +
Enter키 자동제출 방지 완료·merge됨 + 2026-07-28: 배차 프로세스 재설계(접수중→배차확정,
내부차주/외부정보망 배정, 운송오더↔배차관리 연결) 3단계 전부 완료·merge됨 + 전화번호
자동 하이픈 포맷팅 전체 적용 완료·merge됨 + 상하차 방법 표준화(7개 옵션 통일 +
공용 상수 파일화) 완료·merge됨 + 긴급여부 항목 전체 제거 완료·merge됨 + 주소 입력
통일화(`AddressSearch` 공용 컴포넌트) + 광역권/시군구 자동기입 + 화주등록신청 승인
시 주소 자동저장 완료·merge됨(DB 마이그레이션도 사용자가 Supabase에서 직접 실행
완료) + 전체 사이트 톤다운 회색 글씨(`--text-muted`) 가독성 개선 + 화주등록신청
승인 시 출처설명(`manual_source_note`)에 엉뚱한 텍스트가 자동으로 채워지던 버그
수정 완료·merge됨 + 활성 화주 상세 진입 시 상단메뉴 오표시/목록 버튼 오작동 버그
수정 완료·merge됨 + 운임 정산방식(`settlement_type`) 도입 — 견적·오더·배차·정산
4개 화면 + 변경이력 로그, DB 마이그레이션 사용자 실행 확인 완료 완료·merge됨
(작업지시서와 실제 시스템 불일치 2건은 임시 판단 후 진행함, 아래 5번 섹션 참고))

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
  - `/admin/*` — 내부 관리자. **직원별 Supabase Auth 개별 계정 체계로 전환 완료**
    (`staff_accounts` 테이블, role=`admin`/`staff`, middleware.ts가 세션+재직상태 확인).
    공유 `ADMIN_PASSWORD` 방식은 더 이상 안 씀 (env var는 등록만 남아있고 코드에서 미사용)
  - `/customer/*` — 화주포털 (Supabase Auth 개별 계정 + RLS)
  - `/`, `/quote`, `/apply`, `/status` — 완전 공개(비회원), anon INSERT 전용 + 서버 API 조회

### 환경변수 (Vercel)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`KAKAO_REST_API_KEY`. **보류 중(아직 미등록)**: `RESEND_API_KEY` (이메일 발송용 — 아래
6번 참고). `ADMIN_PASSWORD`는 예전 공유 비밀번호 로그인 방식의 흔적으로 Vercel엔 남아있지만
코드에서는 더 이상 참조하지 않음(직원 계정 재구조화로 대체됨).

### npm 의존성 중 특이사항
- `xlsx-js-style`(xlsx 아님! 스타일링 위해 교체함) — 화주포털 엑셀 다운로드용.
- `@supabase/ssr` — 관리자 개별 로그인(Supabase Auth 세션을 쿠키에 저장해서
  `middleware.ts`(서버)와 브라우저가 같은 세션을 공유) 구현에 사용. `lib/supabaseClient.ts`
  (anon, localStorage 기반 데이터 조회/수정용)와는 완전히 다른 용도라 섞어 쓰면 안 됨
  (원칙 24번 참고)

### 최근 추가된 컬럼 (Supabase SQL 편집기에서 수동으로 추가함, 코드 저장소엔 마이그레이션
파일이 없어 여기 기록)
- `customer_applications`: `industry`(업종, 자유텍스트), `preferred_regions`(이용지역,
  REGIONS 다중선택 콤마구분 문자열), `preferred_vehicle`(이용차량, VEHICLE_TYPES 단일값)
- `public_quote_requests`: `quote_id`(uuid, quotes 참조 — 견적전환 연결),
  `processed_by`(text, 답변 처리자 이름)
- `staff_accounts`(신규 테이블): `id`(uuid, Auth 유저 id와 동일), `name`, `email`,
  `role`(`admin`|`staff`), `status`(`active`|`inactive`), `created_at`. RLS: 본인 행은
  `auth.uid() = id`로 조회 가능 + `anon` 전체 조회 정책도 있음(관리자 화면에서 "처리자
  이름" 표시하려면 다른 직원 이름도 조회해야 해서)
- `companies`/`quotes`/`orders`/`dispatches`/`invoices`/`customer_applications`/
  `public_quote_requests` 7개 테이블에 `created_by`/`updated_by`(uuid,
  `staff_accounts(id)` 참조)/`updated_at`(자동 갱신 트리거) 추가 — 원칙 25번 참고
- `invoices.company_id`를 nullable로 변경 — 게스트(비회원) 고객 오더도 정산 등록이
  되도록 하기 위함 (예전엔 NOT NULL이라 게스트 오더는 정산 자동등록이 조용히 실패했음)
- `support_access_logs`(신규 테이블, 8단계): `staff_id`/`staff_name`,
  `company_id`/`company_name`, `customer_account_id`/`customer_email`, `accessed_at`.
  관리자가 화주포털 계정으로 "지원접속"할 때마다 기록. `public_quote_requests`와
  동일하게 anon 정책 없이 RLS만 켜둠 — 서버 API(`SUPABASE_SERVICE_ROLE_KEY`)로만
  읽고 씀
- `individual_customers`(신규 테이블): 비회원(개인) 고객을 전화번호 기준으로
  식별·누적 관리. `id`/`name`/`phone`/`phone_normalized`(하이픈 등 제거된 숫자만,
  unique index)/`email`/`memo`/`created_by`/`updated_by`/`created_at`/`updated_at`.
  `individual_customer_addresses`(신규 테이블, `customer_locations`와 동일한 패턴의
  주소 이력 연결 테이블): `individual_customer_id`/`address`/`location_type`/
  `created_at`. `orders`/`invoices`에 `individual_customer_id`(uuid,
  `individual_customers(id)` 참조) 컬럼 추가. 두 신규 테이블 모두 RLS는 켜되 anon
  전체허용 정책 적용(원칙 2번과 동일한 패턴 — admin이 anon key로 직접 접속하므로)
- `external_networks`(신규 테이블): 전국24시콜/원콜/화물맨 같은 외부 화물정보망
  목록. `id`/`name`/`is_active`/`sort_order`/`created_by`/`updated_by`. RLS는
  anon 전체허용(원칙 2번과 동일 패턴), 쓰기 권한은
  `app/api/admin/external-networks` 서버 API에서 관리자만 가능하도록 체크
- `dispatches.dispatch_status`의 기존 값 `배차대기`(실제로는 코드 어디서도
  할당되지 않던 죽은 상태값이었음)를 `접수중`으로 재활용해서 배차 프로세스에
  새로 도입 — 배차 등록은 항상 이 상태로 시작함. **주의**: `dispatch_status`
  컬럼에 이 값 목록만 허용하는 CHECK 제약조건(`dispatches_dispatch_status_check`)이
  걸려있어서, 상태값 목록을 코드에서 바꿀 때(`lib/dispatchStatusColors.ts`)는
  이 제약조건도 같이 갱신해야 함 — 한 번 빠뜨려서 배차 등록이 막힌 적 있음
- `dispatches`에 배정방식 관련 컬럼 추가: `assignment_type`(`internal`|`external`,
  기본값 `internal`), `requested_network_ids`(uuid 배열, 접수중 상태에서 선택한
  외부정보망 후보), `confirmed_network_id`(uuid, `external_networks(id)` 참조,
  `on delete set null`), `external_driver_name`/`external_driver_phone`/
  `external_vehicle_plate`(외부정보망을 통해 배정된 차주 정보 — 내부 `drivers`
  테이블에 없는 사람이라 자유텍스트로 저장)
- **상하차 방법 표준화**: `rate_surcharges`의 `상하차방식` 카테고리 옵션명을
  7개(기본운송/지게차/수작업/호이스트/크레인/컨베이어/협의필요)로 교체(기존
  1:1 매핑분은 금액 유지, 기사도움/1인수작업/2인수작업은 `수작업`으로 병합되며
  금액 0 초기화, 계단/엘리베이터는 범위 제외로 삭제). `quotes`/`orders`/
  `portal_order_requests`에 저장된 기존 상차·하차 조건 값도 새 이름으로 일괄
  변경. `public_quote_requests.loading_method`(단일 컬럼)를
  `pickup_loading_method`/`dropoff_loading_method` 2개로 분리 — **주의**:
  `quotes`는 상차/하차 조건이 `load_condition`/`unload_condition` 같은 별도
  컬럼이 아니라 `selected_options`(jsonb) 안에 `상차조건`/`하차조건` 한글 키로
  저장됨. `orders`/`portal_order_requests`는 반대로 진짜 flat 컬럼임 — 이
  차이를 몰라서 `quotes`용 마이그레이션 SQL을 잘못 썼다가 재작성한 적 있음
  (원칙 27번과 같은 이유로, 코드에서 실제 저장 방식부터 확인하는 습관 필요)
- **긴급여부 항목 폐지**: `quotes.selected_options`의 `긴급여부` 키,
  `portal_order_requests.urgency` 컬럼은 과거 데이터 보존을 위해 그대로 둠 —
  신규 저장부터만 이 값이 안 생기도록 화면·로직만 제거함. `rate_surcharges`의
  `긴급여부` 카테고리 행도 완전삭제 대신 화면단에서만 숨김
- **주소 입력 통일화 + 광역권/시군구 자동기입**: `components/AddressSearch.tsx`
  (도로명주소 검색+상세주소 공용 컴포넌트) + `lib/useDaumPostcode.ts`(스크립트
  로드 공용 훅) 신규 — `/quote`·`/apply`·`admin/quotes`·`customer/request`에
  각자 구현되어 있던 다음 주소검색을 이 컴포넌트로 통일 교체, `admin/orders`·
  `admin/orders/[id]`·`admin/companies/[id]`(저장된 주소)·`customer/locations`
  (화주포털 배송지)는 기존에 주소검색 없이 텍스트 직접입력만 가능했던 곳이라
  이번에 신규로 적용함. 다음 주소검색 응답의 `sido`/`sigungu`를 함께 저장하도록
  `companies`(`main_pickup_address`/`main_pickup_sido`/`main_pickup_sigungu`/
  `main_dropoff_*` 3종 신규 — 기존 `main_pickup_region`/`main_dropoff_region`
  체크박스 필드와는 별개로 유지), `customer_locations`, `quotes`, `orders`,
  `public_quote_requests`, `customer_applications`(`main_origin`/
  `main_destination`은 이미 있던 컬럼, sido/sigungu만 신규), `portal_order_requests`
  (스펙 원문엔 없었지만 화면이 AddressSearch로 바뀌는 대상이라 함께 추가),
  `individual_customer_addresses`에 `sido`/`sigungu` 컬럼 추가. **DB 마이그레이션은
  코드와 별개로 사용자가 Supabase SQL 편집기에서 직접 실행해야 함** (원칙 8번
  "Claude Code로 넘어가면서 참고할 것" 관례 그대로 — 이 세션에서 SQL 파일을 전달함,
  사용자가 실행 후 8개 테이블 30개 컬럼 전부 생성된 것 확인 완료). 상세주소는
  다른 화면들과 동일하게 별도 컬럼 없이 저장 직전
  도로명주소와 합쳐서 하나의 문자열로 저장(`fullOrigin` 패턴). 화주등록신청 승인
  시(`approve-application/route.ts`) `customer_applications.main_origin`/
  `main_destination`(+sido/sigungu)을 `companies.main_pickup_*`/`main_dropoff_*`에
  매핑하고, `customer_locations`에도 상차지/하차지로 각 1건씩 자동 생성(동일
  주소+타입 조합이 이미 있으면 중복 생성 안 함)
- **운임 정산방식(`settlement_type`)**: `quotes`/`orders`/`dispatches`/`invoices`
  4개 테이블에 `settlement_type text default 'general'`(값:
  `general`/`prepaid`/`postpaid_cod`/`monthly`/`network`, check 제약 4개 테이블
  동일)을 견적 단계 최초 선택 → 오더 → 배차 → 정산까지 승계되는 기준 필드로 추가.
  `settlement_type_change_logs`(신규 테이블: target_table/target_id/before_type/
  after_type/reason/changed_by) — 확정 이후 변경 시 사유를 기록. RLS는 원칙 2번과
  동일하게 anon 전체허용(이 필드를 바꾸는 화면들이 전부 anon 클라이언트로 직접
  쓰는 기존 오더/배차/정산 화면들이라 일관성 유지). `lib/constants.ts`의
  `SETTLEMENT_TYPES`(원칙 39번)가 유일한 정의처

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
   출발지/도착지 → 거리 → 희망 상차/하차일시 → 운송시간(상차일시 기준
   자동추천) → 왕복/편도 → 상차조건/하차조건 → 차량형태 → 대기시간/경유지수 → 특이사항

   단, `긴급여부`는 화면·신규 저장 로직에서 제거된 항목이며, 과거 데이터 보존용 값만 유지한다.
8. **엑셀 내보내기는 `lib/exportExcel.ts` 공용 함수만 사용** (`exportRowsToExcel`,
   `exportMultiSheetExcel`, `buildExportFilename`). 헤더 스타일(굵게+옐로우 배경)+
   1행 틀고정 자동 적용됨. **`xlsx`가 아니라 `xlsx-js-style` import 필수**
9. **화주 개인정보는 계정별로 분리 저장** — `customer_accounts`(계정 개인정보:
   name/contact_position/contact_mobile/email) vs `companies`(회사 대표정보,
   관리자가 관리). 여러 포털 계정이 있는 화주도 서로 안 덮어씀
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
    (`components/ApplicationDetailModal.tsx`의 `REJECT_REASONS`/`HOLD_REASONS`) —
    새로운 사유가 필요하면 이 배열에 추가
17. **Daum 주소검색으로 채워지는 입력창엔 반드시 `autoComplete="off"`** — 브라우저
    자체 자동완성 드롭다운이 뜨면서 입력창에 위/양옆만 테두리가 생기는(아래는 안
    생기는) 버그가 있었음. `quote`/`apply`/`customer/request`/`admin/quotes`의
    출발지·도착지 입력에 전부 적용되어 있음, 새로 주소검색 입력창 만들 때도 반드시
    추가할 것
18. **목록+상세모달 패턴**: 목록에 모든 필드를 다 넣지 말고 핵심 컬럼만(옆스크롤
    없이) 보여준 뒤, 행 클릭 시 별도 모달 컴포넌트에서 전체 정보+처리 버튼을 다루는
    구조. `components/ApplicationDetailModal.tsx`가 참고 예시 (화주등록신청 화면에
    적용됨) — 비슷한 화면 만들 때 이 패턴 재사용
19. **회사(`companies`)나 포털 계정을 삭제할 때는 연결된 Supabase Auth 유저도 반드시
    명시적으로 같이 삭제할 것** — DB 행만 지우면 Auth 쪽 계정이 고아로 남아서, 같은
    이메일로 나중에 재가입할 때 "이미 등록된 이메일" 오류가 남 (Auth는 DB FK cascade
    범위 밖이라 자동으로 안 지워짐). 회사 삭제는 `app/api/admin/delete-company/route.ts`,
    개별 계정 삭제는 `app/api/admin/delete-portal-account/route.ts` 참고. 이미 생긴
    고아 계정은 `/admin/account-cleanup`에서 이메일로 검색해서 정리 가능
20. **상단메뉴 드롭다운은 열려있는 상태에서 바깥 빈 곳을 클릭하면 닫히게** 되어 있음
    (`document`에 `mousedown` 리스너, `TopNav.tsx`·`CustomerPortalShell.tsx` 둘 다
    적용) — 새로운 드롭다운 UI 만들 때도 이 패턴 재사용
21. **관리자용 GET API 라우트(`app/api/admin/*`)는 반드시 `export const dynamic =
    "force-dynamic"` 추가할 것** — 요청 파라미터를 안 읽는 GET 핸들러는 Next.js가
    응답(및 내부 supabase-js fetch 호출)을 캐시해버릴 수 있음. 저장 직후 재조회해도
    캐시된 예전 데이터가 나오는 버그를 실제로 겪었음 (`applications`,
    `public-quote-requests` GET 라우트에서 발견, 새 GET 라우트 만들 때마다 빠뜨리지
    말 것)
22. **anon-locked 테이블(`public_quote_requests`, `customer_applications`)을 anon
    클라이언트로 직접 SELECT하면 에러 없이 조용히 빈 결과만 돌아옴** (RLS가 막지만
    에러를 던지지 않음) — admin 쪽 어느 컴포넌트에서든 이 테이블을 조회할 땐 예외
    없이 서버 API(`SUPABASE_SERVICE_ROLE_KEY`)를 거칠 것. 실제로 견적전환 프리필
    기능에서 이 실수로 데이터가 하나도 안 채워지는 버그가 있었음 (원칙 3번 위반 시
    증상이 바로 이렇게 나타남 — 참고용으로 기록)
23. **알림 배지를 즉시 갱신해야 하면 `lib/notifyBadgeRefresh.ts`의
    `notifyBadgeRefresh()`를 처리 완료 시점에 호출할 것** — anon-locked 테이블은
    Realtime이 안 돼서 `TopNav.tsx`가 15초 폴링에만 의존하는데, 이 함수를 호출하면
    폴링을 기다리지 않고 바로 배지를 재조회함. 새로운 처리 액션(승인/거절/답변저장
    등)을 추가할 때도 이 호출을 빠뜨리지 말 것
24. **관리자 로그인/권한 확인용 클라이언트는 `lib/supabaseAdminAuthClient.ts`
    (`supabaseAdminAuth`, 쿠키 기반 세션) 딱 하나만 사용** — `lib/supabaseClient.ts`(anon,
    localStorage)와 절대 섞지 말 것. "지금 로그인한 직원이 누구/무슨 role인지" 필요할 때는
    새로 만들지 말고 기존 헬퍼 재사용: 클라이언트 컴포넌트는 `lib/currentStaff.ts`의
    `getCurrentStaffId()`(id만)/`getCurrentStaffRole()`(role만, "admin"|"staff"|null),
    서버 API 라우트는 `lib/getCurrentStaff.ts`의 `getCurrentStaff()`(id+name+role+status,
    쿠키 기반)
25. **직원 계정 관련 권한/이력 체크는 반드시 "화면단 + 서버단" 이중 체크**: 화면에서
    버튼을 숨기거나 비활성화하는 것만으로는 브라우저 콘솔에서 직접 fetch를 호출해
    우회할 수 있음. 삭제·운임기준표 수정처럼 관리자 전용이어야 하는 기능은 반드시
    서버 API 라우트에서도 `getCurrentStaff().role === "admin"` 확인 후에만 처리하도록
    구현할 것 (`app/api/admin/delete-record/route.ts`, `app/api/admin/rates/route.ts`,
    `app/api/admin/staff/route.ts`가 이 패턴의 예시). 등록/수정 시 처리자를 자동 기록할
    때도 마찬가지로 클라이언트 컴포넌트는 `getCurrentStaffId()`로 `created_by`/
    `updated_by`를 채우고, 화면에는 `components/ProcessedByFooter.tsx`로 "등록: 이름
    (날짜) · 최종수정: 이름 (날짜)"를 표시
26. **여러 화면의 단순 레코드 삭제는 `app/api/admin/delete-record/route.ts` 공용
    API를 거칠 것** (`{ table, id }` POST, 허용된 테이블 목록으로 제한) — 매번 새
    라우트를 만들지 않아도 되고, 관리자 권한 체크가 한 곳에 모여있어 빠뜨릴 위험이
    적음. 화주(`delete-company`)나 포털계정(`delete-portal-account`)처럼 Auth 유저
    정리 등 부가 로직이 필요한 삭제는 기존처럼 전용 라우트를 쓰되, 그 라우트 안에도
    반드시 관리자 체크를 넣을 것
27. **`alter table X add column if not exists Y ... references Z(id)`는 컬럼이
    이미 존재하면 REFERENCES 절이 조용히 무시됨** — 예전부터 남아있던 레거시 컬럼이
    있으면 새 마이그레이션의 외래키가 실제로는 안 걸려서, 엉뚱한 테이블을 참조하는
    옛날 제약조건이 그대로 남는 버그가 생김 (실제로 `quotes.created_by`가 안 쓰던
    `profiles` 테이블을 참조하고 있어서 `created_by` 자동기록 기능이 FK 위반으로
    막혔던 사고 있었음). 새 컬럼을 추가하는 마이그레이션을 쓰기 전에는 `select
    column_name, data_type from information_schema.columns where table_name = '...'`
    로 그 컬럼이 이미 있는지, `select conname, pg_get_constraintdef(oid) from
    pg_constraint where conname = '..._fkey'`로 기존 제약조건이 뭘 참조하는지 먼저
    확인하는 습관을 들일 것
28. **여러 필드를 한 번에 수정하는 "정보 수정" 폼이 있는 상세화면(화주/오더/배차/
    정산)은 `lib/optimisticUpdate.ts`의 `optimisticUpdate()`로 저장할 것** — 내가
    불러온 시점의 `updated_at`과 실제 DB의 `updated_at`이 다르면(그 사이 다른 직원이
    먼저 저장함) 조용히 덮어쓰지 않고 `components/ConflictWarning.tsx`로 경고 +
    새로고침/그래도 덮어쓰기 선택지를 보여줌. 상태값 하나만 바꾸는 단순 드롭다운
    (예: 견적 상태변경)에는 굳이 적용 안 해도 됨 — 여러 필드를 동시에 편집하는
    화면 위주로 적용
29. **Supabase magic link로 임시 로그인(관리자 지원접속 등)을 구현할 때는
    `admin.auth.admin.generateLink({ type: "magiclink", email })`로 받은
    `properties.hashed_token`을, 클라이언트에서 `auth.verifyOtp({ token_hash, type:
    "magiclink" })`로만 검증할 것 — `email`을 같이 넘기면 "Only the token_hash and
    type should be provided" 에러로 검증이 항상 실패함** (실제로 8단계 지원접속
    기능에서 이 실수로 접속이 전혀 안 되는 버그가 있었음). `app/api/admin/
    support-login/route.ts` + `app/customer/support-verify/page.tsx`가 참고 예시
30. **"본인 계정 정보 수정"처럼 role 상관없이 누구나 접근 가능해야 하는 API는, 수정
    대상 id를 클라이언트가 아니라 반드시 서버에서 `getCurrentStaff()`로 직접 구해서
    사용할 것** — 클라이언트가 `{ id, name }`처럼 id를 같이 보내는 방식은 브라우저
    콘솔에서 다른 직원의 id로 바꿔 보내면 그 사람 정보를 수정할 수 있는 권한 상승
    구멍이 생김. `app/api/admin/my-account/route.ts`가 참고 예시 — 요청 바디에서
    `name`만 받고, 어느 행을 수정할지는 쿠키 세션의 `currentStaff.id`로만 결정함
    (원칙 25번의 "화면단+서버단 이중체크"와는 별개로, role 무관 self-service API는
    애초에 대상 id 자체를 클라이언트 입력값으로 안 받는 방식으로 막을 것)
31. **앱 내부 경로로 이동하는 링크는 반드시 `next/link`의 `<Link href=...>`를 쓸 것 —
    순수 HTML `<a href="/admin/...">`을 쓰면 클라이언트 사이드 전환 대신 브라우저
    전체 새로고침(하드 리로드)이 발생함.** 실제로 `TopNav.tsx`의 드롭다운 메뉴
    항목 전부와 화주포털(`CustomerPortalShell.tsx`) 전체가 이 실수로 페이지
    이동마다 하드 리로드되고 있었고, 그 때문에 TopNav가 매번 처음부터 다시
    마운트되면서 로그인정보 조회가 끝나기 전까지 잠깐 기본값(권한 없음) 상태로
    보이는 깜빡임까지 생겼던 적이 있음(체감 성능 저하의 진짜 원인이었음 — 원칙
    24번 캐싱 최적화만으로는 해결이 안 됐던 이유). `tel:` 링크나 같은 페이지 안의
    `#해시` 앵커(`admin/guide`)처럼 원래 하드 네비게이션이 필요한 경우만 예외.
    새 링크를 추가할 때 `<a href=`로 시작하는 코드를 쓰고 있다면 내부 경로가
    아닌지 반드시 확인할 것
32. **`support_access_logs`처럼 순수 이력(로그) 목적의 테이블이 `companies`/
    `customer_accounts` 등 실제 데이터를 참조할 때는 FK에 `on delete set null`을
    걸고, 표시용 텍스트 스냅샷 컬럼(`company_name`/`customer_email`처럼)을 같이
    저장해둘 것** — `on delete` 옵션 없이(기본 RESTRICT) FK를 걸면, 원본이 삭제될
    때 이 로그 테이블이 참조를 잡고 있다는 이유만으로 업체/계정 삭제 자체가 막혀버림
    (실제로 겪은 버그: 지원접속 이력이 하나라도 있는 업체는 완전삭제가 FK 위반으로
    실패했음). 반대로 `orders`/`quotes`/`invoices`처럼 실제 업무 기록이 있는 테이블은
    이렇게 풀지 말 것 — 그 경우엔 삭제가 막히는 게 의도된 동작(화주 상세화면도
    삭제 전에 관련 견적/오더/정산 건수를 확인해서 있으면 완전삭제를 막고 "거래중단"
    상태변경을 안내함). "이 데이터가 지워질 때 삭제를 막아야 하는지 vs 로그만
    남기고 통과시켜야 하는지"를 테이블 성격에 따라 판단할 것
33. **삭제/저장 등 액션 실패 시 에러를 표시할 state는 페이지 최초 로딩 실패용
    state와 반드시 분리할 것** — 화주 상세화면(`companies/[id]/page.tsx`)이
    `handleDelete()` 실패 시 로딩 실패용 `error` state를 그대로 재사용하고 있어서,
    `if (error || !company) return <전체화면 에러>` 가드에 걸려 이미 불러온 상세
    화면 전체가 "정보를 불러오지 못했습니다"로 덮여버리는 버그가 있었음(개인고객
    상세화면에도 같은 패턴이 있어서 같이 수정함). 액션 실패는 항상 별도 state(예:
    `deleteError`/`actionError`)로 받아서 인라인 에러 배너로만 보여줄 것 — 이미
    로드된 화면 데이터를 오류 메시지로 통째로 덮어쓰면 안 됨
34. **저장/등록 폼(`<form onSubmit={...}>`)에는 `lib/preventEnterSubmit.ts`의
    `handleFormKeyDown`을 `onKeyDown`으로 붙일 것** — 입력 중 습관적으로 누르는
    Enter키가 브라우저 기본 동작으로 폼을 그대로 제출시켜서, 아직 다 작성하지 않은
    정보가 실수로 저장/등록되는 문제를 막기 위함(`textarea`는 줄바꿈 용도라 예외).
    다만 **로그인 폼**(Enter로 로그인은 일반적인 관례)과 **전화번호/이메일로
    조회하는 검색 폼**(`/status`, `/quote/status`, `/apply/status`,
    `/admin/account-cleanup` — 저장이 아니라 단순 조회라 Enter 실행이 자연스러움)은
    예외로 붙이지 않음. 새 등록/수정 폼을 추가할 때도 이 핸들러를 빠뜨리지 말 것
35. **전화번호를 입력받는 `<input>`은 예외 없이 `lib/constants.ts`의
    `formatPhoneNumber()`를 `onChange`에 물려서 입력 즉시 자동으로 하이픈(-)이
    표시되게 할 것** — 대부분의 화면(화주 대표번호, 담당자 연락처, 차주 연락처,
    공개 견적문의/화주등록신청 연락처 등)은 이미 적용되어 있었지만, 개인고객
    상세수정·운송오더/견적 등록의 "개인/신규 고객" 연락처 입력처럼 빠진 곳이
    있었음. 새로 전화번호 입력창을 추가할 때 빠뜨리지 말 것(검색용 입력창도
    사람이 눈으로 확인하기 편하도록 동일하게 적용 — 조회 로직은 어차피 숫자만
    비교하도록 정규화해서 비교하므로 하이픈이 있어도 조회에 지장 없음)
36. **원칙 28번(낙관적 잠금)을 쓰는 상세화면에서, 그 화면 안의 다른 "즉시 저장"
    액션(상태 드롭다운 변경, 체크박스 등)은 DB에 쓴 뒤 반드시 `load()`로 전체를
    다시 불러올 것 — 부분(payload 필드만) 병합으로 로컬 state를 갱신하고 넘어가면
    안 됨.** `updated_at`은 DB 트리거가 자동으로 갱신하는데, 로컬에 남은
    `updated_at`을 안 갱신한 채로 곧이어 낙관적 잠금 저장(`optimisticUpdate`)을
    실행하면 그 차이 때문에 "다른 직원이 방금 수정함"으로 잘못 판단해 경고가 뜸
    (실제로는 같은 사용자 본인이 방금 한 조작인데도). 배차 상세화면의 배차상태
    변경·상차/하차 완료 체크에서 실제로 겪은 버그 — 두 액션 모두 부분 병합을
    `load()` 호출로 바꿔서 해결함
37. **주소(도로명주소+상세주소)를 입력받는 화면은 예외 없이
    `components/AddressSearch.tsx` 공용 컴포넌트를 재사용할 것** — 원칙 12번
    (`PasswordInput`)과 같은 이유. 다음 주소검색 스크립트 로드는
    `lib/useDaumPostcode.ts` 훅이 대신 처리하므로 페이지에서 직접
    `<script id="daum-postcode-script">`를 붙이지 말 것. 이 컴포넌트는 검색으로
    주소를 채우면 `sido`/`sigungu`도 함께 콜백으로 넘겨주고 상세주소를 자동
    초기화함 — 직접 타이핑(수동 수정)한 경우엔 sido/sigungu를 알 수 없으므로
    빈 값으로 넘어오는 게 정상 동작. 상세주소는 별도 컬럼 없이 저장 직전
    도로명주소와 공백으로 합쳐서 하나의 문자열 컬럼에 저장하는 게 이 프로젝트
    전체의 기존 관례(`fullOrigin`/`fullDestination` 패턴) — 새 주소 필드를
    추가할 때도 이 패턴을 따르고, DB에 별도 "상세주소" 컬럼을 새로 만들지 말 것
38. **`TopNav.tsx`처럼 루트 레이아웃(`app/layout.tsx`)에서 전체 사이트에 항상
    렌더링되는 컴포넌트에는 `useSearchParams()`를 직접 쓰지 말 것 — 반드시
    `<Suspense>`로 감싼 얇은 래퍼(`export default`)와 실제 로직을 담은 내부
    컴포넌트로 분리할 것.** 감싸지 않으면 Next.js가 정적 생성 시
    "useSearchParams should be wrapped in a suspense boundary" 오류를 내며
    Vercel 빌드 전체가 실패함 — `admin/quotes`/`admin/orders`처럼 이미
    `Suspense`로 감싸져 있는 목록 페이지들과 달리, TopNav는 사이트 전체에
    영향을 주기 때문에 실수하면 전체 배포가 막힘. 로컬에 Supabase 환경변수가
    없는 개발 환경에서는 대부분 페이지가 그보다 먼저 다른 이유로 실패해서 이
    문제가 가려질 수 있으니, `useSearchParams`를 쓰는 화면을 추가/수정했으면
    실제 Vercel 배포(Preview) 로그로 최종 확인하는 습관을 들일 것
39. **"확정 이후에는 사유를 남겨야만 바꿀 수 있는" 필드는 일반 편집폼
    (`editForm`+`handleSave`)에 섞지 말고, 별도의 즉시저장 컨트롤 + 전용 모달로
    분리할 것.** 여러 필드를 한 번에 묶어 저장하는 일반 폼 안에 넣으면 사유 입력을
    강제할 방법이 없음(다른 필드와 함께 조용히 같이 저장돼버림). `settlement_type`
    (운임 정산방식)이 이 패턴의 첫 사례 — `components/SettlementTypeChangeModal.tsx`
    (사유 미입력 시 저장 버튼 비활성화) + `lib/settlementTypeChangeLog.ts`
    (`settlement_type_change_logs`에 before/after/사유 기록)로 구현. 화면마다
    "확정 전" 자유편집 허용 여부는 그 화면의 실제 상태값 흐름을 보고 판단할 것
    (오더는 `status !== "접수"`, 배차는 `dispatch_status !== "접수중"`일 때부터
    사유 필요 — 정산관리는 아직 확정/잠금 개념 자체가 없어서 일단 항상 사유 필요.
    바뀔 때마다 `load()`로 전체 재조회하는 것도 원칙 36번과 동일하게 지킬 것)

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
- **화주등록신청 화면 목록+상세모달 개편**: 목록은 신청일/회사명/담당자/구간/상태/
  상세보기 6컬럼만(옆스크롤 없음, 모바일 카드도 신규 추가), 승인/거절/보류 전부
  `ApplicationDetailModal.tsx` 안에서 동일한 톤앤매너로 처리 (승인도 더 이상 상단
  prompt 안 뜸)
- **업체/포털 계정 삭제 시 Auth 유저 정리**: 업체 삭제하면 연결된 포털 계정의 Auth
  유저까지 같이 삭제(`delete-company` API). 예전에 생긴 고아 Auth 계정은
  `/admin/account-cleanup`에서 이메일로 검색해 정리 가능
- **관리자 상단메뉴 UX 개선**: 하위메뉴 hover/focus 시 옅은 배경 표시, 하위메뉴별
  알림 배지도 `visibility` 토글 방식으로 통일(레이아웃 안 밀림), 드롭다운 열린 상태서
  바깥 빈 곳 클릭하면 닫힘 (관리자·화주포털 상단메뉴 둘 다)
- **완전공개 폼 정리**: 견적문의(`/quote`)에서 출발지/도착지 상호·연락처·담당부서
  같은 잘 안 쓰이던 선택 입력 6개 제거, 희망 상차일시도 과거 시각 선택 불가하도록
  제한. 주소검색 입력창의 브라우저 자동완성 테두리 버그도 수정
- **공개 견적문의 화면도 목록+상세모달 개편**: `PublicQuoteDetailModal.tsx` 신규
  (원칙 18번 패턴 재사용), 답변 작성 시 처리자 이름 입력(필수) 추가, 저장 시 상태도
  같이 갱신
- **공개 견적문의 → 견적관리 전환**: 상세 모달의 "견적관리로 전환" 버튼으로
  `/admin/quotes?from_quote_request=<id>`로 이동해 문의 내용을 견적 폼에 자동
  프리필(기존 화주 연락처 매칭 시도 포함), 저장 시 원본 문의에 `quote_id` 연결되어
  "연결된 견적 보기"로 바뀜 (발주요청의 기존 승인 연동 패턴과 동일)
- **`/apply` 폼에 업종/이용지역/이용차량 선택 입력 추가**: 승인 시
  `approve-application` API가 이 값들을 `companies.industry` /
  `main_pickup_region`+`main_dropoff_region` / `recommended_vehicle`에 자동
  매핑해서 관리자 이중입력을 줄임
- **알림 배지 즉시 갱신**: `lib/notifyBadgeRefresh.ts` 추가로, 처리 완료 시 15초
  폴링을 기다리지 않고 바로 배지 재조회 (원칙 23번)
- **관리자 GET API 캐싱 버그 수정**: `applications`/`public-quote-requests` GET
  라우트에 `force-dynamic` 추가 — 저장 직후 재조회 시 예전 데이터가 보이던 버그
  해결 (원칙 21번)
- **직원 계정·권한·이력 재구조화 — 스펙 1~8단계 전부 완료·merge됨**:
  - 1단계: `staff_accounts` 테이블 + 초기 관리자 계정 (완료)
  - 2단계: 관리자 로그인을 공유 `ADMIN_PASSWORD`에서 Supabase Auth 개별 계정으로
    전환 (`middleware.ts` 재작성, `lib/supabaseAdminAuthClient.ts` 신규) (완료)
  - 3단계: "직원 계정 관리" 화면(`/admin/staff`, 관리자 전용) — 계정 발급, 역할
    지정, 재직 상태 관리, **이름+이메일 통합 수정 모달**(이메일 변경 시 Auth 계정
    이메일도 함께 갱신) (완료)
  - 4단계: `companies`/`quotes`/`orders`/`dispatches`/`invoices`/
    `customer_applications`/`public_quote_requests` 7개 테이블에 등록/수정 처리자
    자동 기록(`created_by`/`updated_by`) + 각 상세화면에 `ProcessedByFooter`로 표시
    (완료). 이 작업 중 발견/수정한 부수 버그: 게스트(비회원) 오더 정산 등록 안
    되던 문제(`invoices.company_id` nullable로 변경), 정산 목록에 개인고객 이름
    미표시, 배차 없이 오더 상태만 바꾼 경우 청구금액 자동입력 안 되던 문제, 금액
    미입력 상태로 정산 등록되던 문제 — 전부 수정 완료
  - 5단계: 권한 매트릭스(삭제는 관리자만, 운임기준표 수정은 관리자만) —
    화면단+서버단 이중 체크로 구현 (원칙 25, 26번) (완료)
  - 6단계: 견적/화주등록신청/공개문의 처리 시 직접 타이핑하던 "처리자 이름"을
    로그인한 직원 정보로 자동 대체 (`getCurrentStaffName()`) (완료)
  - 7단계: 동시 편집 감지(낙관적 잠금) — 화주/오더/배차/정산 상세화면에서 다른
    직원이 먼저 저장한 경우 경고 + 새로고침/그래도 덮어쓰기 선택지 제공
    (`lib/optimisticUpdate.ts`, `components/ConflictWarning.tsx`, 원칙 28번) (완료)
  - 8단계: 관리자 "고객지원용 접속" — 화주 상세화면에서 활성 포털 계정에 임시
    로그인(magic link 방식), `support_access_logs`에 접속 이력 기록, 조회 화면
    `/admin/support-logs`(관리자 전용) (완료, 원칙 29번)
- **로그인/비밀번호 앞뒤 공백(trim) 자동 처리**: 관리자 로그인, 화주포털 로그인,
  화주포털 비밀번호 변경(최초/평소 구분) 전부 저장 시점·로그인 시점 양쪽에서 앞뒤
  공백을 제거하도록 통일. 문자열 중간 공백은 그대로 유지
- **수정 스펙 3건 완료·merge됨** (PR #24):
  - **견적관리 거리 자동계산**: 출발지/도착지(도로명주소)가 둘 다 채워지면 버튼
    클릭 없이 800ms 디바운스 후 자동으로 거리계산 실행. 상세주소만 바뀐 경우는
    재계산 안 함, "직접 입력한 거리를 사용" 체크박스를 켠 경우엔 자동계산이 덮어쓰지
    않음. 기존 수동 "자동계산" 버튼도 유지
  - **관리자 로그인 정보 표시 + 본인 비밀번호 변경**: 상단메뉴에 로그인한 직원 이름
    표시(`lib/currentStaff.ts`의 `getCurrentStaffInfo()`), 클릭 시 신규 화면
    `/admin/my-account`로 이동 — 본인 이름 수정(이메일 변경은 기존처럼 관리자가
    `/admin/staff`에서 처리), 현재 비밀번호 확인 후 새 비밀번호 변경(trim 적용).
    role 상관없이 관리자·직원 누구나 본인 계정에 대해 사용 가능 (원칙 30번)
  - **개인고객(비회원) 데이터 관리**: `individual_customers`/
    `individual_customer_addresses` 신규 — 전화번호 기준으로 개인고객을
    식별·누적 관리. 운송오더 등록(개인/신규 고객) 시 연락처 입력하면 기존
    개인고객 자동완성+안내, 저장 시 전화번호로 매칭해 연결 또는 신규 생성, 상/하차
    주소는 이력에 자동 누적(중복 방지). 정산도 오더에 연결된 개인고객을 그대로
    이어받음(수동 등록·배차 자동등록 둘 다). 관리자 화면 `/admin/individual-customers`
    신규(목록: 이름/연락처/누적 주문건수/최근 이용일, 상세: 기본정보 수정+주소
    이력+주문/정산 이력 타임라인), TopNav "화주 확보" 그룹에 추가. 이번 범위에서
    개인고객용 포털 기능은 제외
- **페이지 전환 성능 개선 (관리자·화주포털 공통)**:
  - `lib/currentStaff.ts`에 세션 캐시 추가 — 로그인정보/권한 조회가 페이지마다
    중복으로 나가던 것을 세션당 1회로 줄임(본인 정보 수정·role 변경 시
    `refreshCurrentStaffCache()`로 캐시 갱신, 로그아웃 시 `clearCurrentStaffCache()`로
    비움, 변경 시 TopNav가 즉시 반영되도록 이벤트 구독 추가)
  - `TopNav.tsx`의 알림배지 폴링/Realtime 구독이 페이지 이동마다(`pathname` 의존)
    재생성되던 문제 수정 — `isPublicPath` 의존으로 좁힘
  - `app/admin/loading.tsx` 추가 — Next.js App Router의 즉시 로딩 UI로 메뉴 클릭 시
    빈 화면으로 멈춰있는 구간 제거
  - middleware 최적화 — `staff_accounts`의 role/status를 Supabase Auth
    `user_metadata`에 미러링(`app/api/admin/staff/route.ts`)해서, middleware가
    페이지 이동마다 하던 `auth.getUser()` + `staff_accounts` 조회 2회 왕복을
    1회로 줄임 (신선도 손실 없음, 레거시 계정은 자동 폴백)
  - **진짜 원인**: `TopNav.tsx`의 데스크탑 드롭다운 메뉴 항목 전부와 화주포털
    (`CustomerPortalShell.tsx`) 전체가 `next/link`의 `Link` 대신 순수 HTML
    `<a href>`로 되어 있어서 메뉴 클릭마다 브라우저 전체 새로고침(하드 리로드)이
    발생하고 있었음 — 위의 캐싱/최적화 작업들이 체감 속도를 크게 못 바꾼 실제
    이유였음. 전부 `Link`로 교체 (원칙 31번)
- **업체/포털계정 삭제 FK 오류 수정 + 개인고객 삭제 기능**:
  - `support_access_logs.company_id`/`customer_account_id` FK에 `on delete`
    옵션이 없어서, 지원접속 이력이 하나라도 있는 업체/포털계정은 완전삭제가
    FK 위반으로 막히던 버그 수정 — `on delete set null`로 교체(SQL, 원칙 32번).
    `company_name`/`customer_email` 텍스트 스냅샷이 이미 있어 원본이 지워져도
    `/admin/support-logs`의 로그 가독성엔 문제 없음
  - 화주 상세화면(`companies/[id]/page.tsx`)에서 삭제 실패 시 페이지 전체가
    "정보를 불러오지 못했습니다" 오류로 덮이던 버그도 같이 발견해 수정
    (`deleteError`로 상태 분리, 원칙 33번)
  - `/admin/individual-customers/[id]`에 "완전삭제" 버튼 신규(관리자 전용,
    `app/api/admin/delete-record` 공용 API 재사용). `orders`/`invoices`의
    `individual_customer_id` FK를 `on delete set null`로 바꿔서 주문/정산
    이력이 있는 개인고객도 삭제 가능(이력 자체는 남고 연결만 해제, 화면은
    `guest_name` 등 자체 텍스트로 표시하므로 영향 없음)
- **입력 중 Enter키 자동제출 방지**: `lib/preventEnterSubmit.ts`의
  `handleFormKeyDown`을 내부시스템·화주포털·완전공개 전체 등록/수정 폼에 적용
  (원칙 34번). 로그인 폼과 전화번호/이메일 조회용 검색 폼은 의도적으로 제외
- **배차 프로세스 재설계 — 운송오더↔배차관리 연결 + 접수중→배차확정 (3단계
  전부 완료·merge됨)**:
  - 1단계: 외부 정보망(`external_networks`) 관리 테이블 + 관리자 화면
    (`/admin/settings/external-networks`, 운임기준표와 동일한 권한 패턴 —
    직원도 조회 가능, 추가/수정/사용중지는 관리자만)
  - 2단계: 배차는 항상 "접수중"(안 쓰이던 `배차대기`를 재활용) 상태로 시작,
    배정방식(내부차주/외부정보망, 외부는 후보 여러 곳 중복선택 가능) 선택.
    접수중 상태에서는 배정방식 언제든 전환 가능(전환 시 반대쪽만 초기화, 운임은
    유지). "배차확정"은 상세화면의 전용 절차로만 가능(내부차주는 선택 확인,
    외부정보망은 후보 중 확정된 곳 1곳 지정 + 배정 차주 이름/연락처/차량번호
    입력) — 목록/상세의 배차상태 드롭다운에서는 "접수중"을 선택지에서 제외해서
    이 절차를 못 건너뛰게 막음. 배차확정 이후(상차완료→하차완료→운송완료→
    문제발생)와 정산 자동등록은 기존 흐름 그대로 유지
  - 3단계: 운송오더 상세에 "배차관리로 이동"(미배차 시) / "배차 상세보기"(배차
    있음) 버튼, 배차 등록폼은 `?from_order=<id>`로 오더 정보 자동 프리필
    (공개문의→견적관리 전환과 동일한 패턴 재사용). 배차 상세의 "연결된 운송오더
    보기" 링크는 접수중 상태에서도 보이도록 위치 조정
  - 부수 수정: 상차/하차 완료 확인 체크박스가 `dispatch_status`와 연결되어 있지
    않아 체크해도 배차상태·오더상태가 안 바뀌던 버그, 체크 시 "저장" 버튼 없이
    즉시 반영되도록 개선, 낙관적 잠금 오탐 버그(원칙 36번) 수정
- **상하차 방법 표준화 + 긴급여부 항목 전체 제거**:
  - `lib/loadingMethods.ts` 신규 — 실제 화물정보망(24시콜/화물인/배차킹) 표현
    기준 표준 7개 옵션을 한 곳에서 정의, 견적/오더/발주요청/공개견적문의 전부
    이 파일 참조(화면마다 다른 목록 하드코딩 금지). `admin/quotes`/
    `customer/request`의 상차·하차 드롭다운도 운임기준표 데이터에서 끌어오던
    방식 대신 이 공용 상수를 직접 쓰도록 통일(운임기준표엔 옵션 추가/삭제
    기능이 없어 실질적으로 동일)
  - `/quote`(완전공개 견적문의)의 단일 "상하차 방법"을 "상차 방법"/"하차 방법"
    2개로 분리, 공개문의 상세 모달도 두 필드 표시. "공개문의 → 견적관리 전환"
    프리필에 상차/하차 방법이 빠져있던 것도 같이 추가
  - "긴급여부" 항목을 운임기준표/견적관리/화주포털 발주요청에서 전부 제거(화면·
    로직만 없앰, DB 컬럼과 과거 데이터는 보존 — 화주포털 견적 상세의 과거 견적
    표시가 안 깨지도록)
- **주소 입력 통일화 + 광역권/시군구 자동기입 + 화주등록신청 승인 시 주소 자동저장**
  (코드·DB 마이그레이션 전부 완료·merge됨, PR #38):
  - `components/AddressSearch.tsx` + `lib/useDaumPostcode.ts` 신규(원칙 37번).
    기존 4곳(`/quote`, `/apply`, `admin/quotes`, `customer/request`)은 이
    컴포넌트로 교체, 기존에 주소검색이 아예 없던 4곳(`admin/orders`,
    `admin/orders/[id]`, `admin/companies/[id]`의 "저장된 주소" 추가,
    `customer/locations`)은 신규 적용
  - `companies`에 `main_pickup_address`/`main_dropoff_address`(+ 각각
    sido/sigungu) 신규 — 기존 `main_pickup_region`/`main_dropoff_region`(이용지역
    체크박스)과 별개로 유지, 화주 상세화면에서 편집 가능. 승인 시
    `companies.address`(기본정보 최상단 주소칸)도 함께 채움
  - `customer_locations`/`quotes`/`orders`/`public_quote_requests`/
    `customer_applications`/`portal_order_requests`/`individual_customer_addresses`에
    sido/sigungu 컬럼 추가, 저장 시점에 다 함께 기록
  - 화주등록신청 승인(`approve-application/route.ts`) 시
    `customer_applications.main_origin`/`main_destination`을
    `companies.main_pickup_*`/`main_dropoff_*`에 자동 매핑 +
    `customer_locations`에 상차지/하차지로 자동 등록(중복 주소는 재등록 안 함)
  - `AddressSearch`를 사이트 공통 `.field` 클래스 없이 쓰는 화면(화주 상세
    "저장된 주소" 추가, 화주포털 "배송지" 추가)에서 도로명주소 줄만 넓고
    상세주소 칸은 브라우저 기본 폭으로 좁게 나오던 레이아웃 버그 수정 —
    컴포넌트 자체에 `width:100%` 명시. 전체 폭도 카드 끝까지 늘어나던 걸
    `maxWidth: 380px`로 제한
- **전체 사이트 톤다운 회색 글씨 가독성 개선**: `--text-muted`(설명 텍스트,
  TopNav 서브메뉴, 필드 라벨 등에 전부 쓰이는 공용 CSS 변수, admin/portal/랜딩
  전체 공유) 색상을 `#8b95a1`(흰 배경 대비 약 3.0:1, WCAG AA 미달)에서
  `#5f6b78`(약 5.4:1)로 진하게 변경. 화면별 개별 수정이 아니라 `app/globals.css`
  변수 하나만 바꿔서 세 영역 전부 한 번에 적용됨
- **화주등록신청 승인 시 "출처 설명"에 엉뚱한 텍스트가 자동으로 채워지던 버그
  수정**: `companies.manual_source_note`는 출처분류가 "기타"일 때만 쓰는
  "기타 출처 설명" 전용 칸인데, `/apply` 승인 처리(`approve-application/route.ts`)가
  출처분류를 "온라인 등록신청"으로 저장하면서도 이 칸에 "월 예상 운송건수/신청
  메모" 텍스트를 같이 넣고 있었음 — 평소엔 출처분류가 "기타"가 아니라 안 보이다가,
  담당자가 출처분류를 "기타"로 바꾸면 이 엉뚱한 텍스트가 "출처 설명"에 자동으로
  나타나는 것처럼 보였던 것. 이 텍스트는 이제 일반 메모(`companies.notes`)에
  들어가도록 수정(기존에 이미 이렇게 승인된 화주들의 데이터는 코드로 자동
  정리되지 않음 — 정리하려면 별도 SQL 필요, 원한다면 요청할 것)
- **활성 화주 상세 진입 시 상단메뉴 오표시/목록 버튼 오작동 버그 수정**:
  `/admin/companies/[id]`(화주 상세)는 "화주 확보" 그룹의 `/admin/companies`
  (화주 관리·영업)와 "화주 관리" 그룹의 `/admin/customers`(활성 화주 CRM) 두
  목록 모두에서 들어올 수 있는 공용 화면인데, URL이 항상 `/admin/companies/`로
  시작해서 `TopNav.tsx`의 활성메뉴 판정(`pathname.startsWith`)이 출처와 무관하게
  항상 "화주 확보"만 활성표시하고 있었음. `admin/customers/page.tsx`에서 상세로
  이동할 때 `?from=customers`를 붙이고(`?from_order` 패턴과 동일), `TopNav.tsx`의
  `isNavItemActive()`가 이 파라미터를 보고 "화주 관리"/"활성 화주(CRM)"를 대신
  활성표시하도록 수정. 화주 상세의 "목록으로" 링크/삭제 후 이동/에러화면 링크도
  전부 이 출처에 따라 `/admin/customers` 또는 `/admin/companies`로 분기.
  **부수 버그**: `TopNav.tsx`(루트 레이아웃에서 전체 사이트에 항상 렌더링)에
  `useSearchParams()`를 추가하면서 Suspense 경계 없이 그대로 export하고
  있어서, Vercel 빌드가 "useSearchParams should be wrapped in a suspense
  boundary" 오류로 실패했음(로컬 샌드박스는 Supabase 환경변수가 없어 대부분
  페이지가 그보다 먼저 다른 이유로 실패해서 이 문제가 가려져 있었음). `export
  default TopNav`는 `<Suspense>`로 감싼 얇은 래퍼로 남기고 실제 로직은
  `TopNavInner`로 옮겨서 해결 — 원칙 38번 참고
- **운임 정산방식(`settlement_type`) 도입 — "내부운영시스템 보완 설계안 v2"
  2차 세션**: 견적(`admin/quotes`, 고객구분 다음 위치)에 정산방식 드롭다운 신규
  (기본값 `general`), 견적→오더 전환 프리필에 승계, 운송오더 등록/상세에
  드롭다운+표시, 배차 등록 시 오더값 자동 승계+상세에 배지 표시, 정산관리
  목록에 정산방식 필터 추가+배지 표시, 배차 자동완료 시 자동생성되는 정산건도
  배차의 정산방식을 그대로 이어받도록 처리. 확정 이후 변경 시 사유 입력을
  강제하는 `SettlementTypeChangeModal`(원칙 39번) — 오더는 `상태 !== "접수"`,
  배차는 `dispatch_status !== "접수중"`부터 사유 필요, 정산관리는 확정/잠금
  개념이 아직 없어 일단 항상 사유 필요(8차 세션에서 잠금 로직 예정, 코드
  주석으로 남겨둠). **작업지시서와 실제 시스템이 안 맞아서 판단을 내린 부분
  2곳**(다음 세션에서 이어갈 때 재확인 필요):
  1. "견적이 외부 화물정보망 연동으로 이미 등록되는 경우 정산방식 기본값을
     `network`로 자동 제안" — 견적 등록 시점에는 외부정보망 연동 여부를 알 수
     있는 데이터가 시스템에 없음(외부정보망 선택은 배차 등록 단계에만 존재).
     구현하지 않고 건너뜀
  2. "오더 상태가 확정 이후 변경 시 사유 필요" — `ORDER_STATUS_OPTIONS`에
     "확정"이라는 상태값 자체가 없음(접수/배차중/배차완료/운송중/운송완료/취소).
     사용자 확인 질문에 응답이 없어 "접수 이후 전부"(`status !== "접수"`)로
     간주하고 진행함 — 실제 운영 의미와 다르면 조정 필요

---

## 5. 다음 예정 작업 (우선순위 순)

직원 계정·권한·이력 재구조화 스펙(1~8단계)은 전부 완료되었습니다. 다음 우선순위는:

1. 카카오 알림톡 자동화 — 사업자 인증·발신프로필 심사가 필요해 **미리 신청 절차부터
   시작하는 것을 권장** (승인에 시간 걸림)
2. 화주포털 발주요청 2차 기능(화주 직접 오더 입력)
3. 커스텀 도메인 연결, 공개 화면 UX 고도화 — 보류 중
4. 유료 플랜 전환 / 페이지네이션·대시보드

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
- **회사/계정 삭제할 때 Auth 유저 빠뜨리지 말 것** (원칙 19번) — 빠뜨리면 이메일이
  "이미 등록됨"으로 막히는데 관리자 화면 어디에도 원인이 안 보여서 디버깅이 어려움
- **Vercel Preview(PR) 배포에서 로그인이 안 되거나 "서버에 OOO가 설정되어 있지
  않습니다" 에러가 뜨면**: 십중팔구 환경변수가 Production에만 등록되고 Preview에는
  체크가 안 되어 있는 경우임. Vercel 프로젝트 → Settings → Environment Variables에서
  각 변수의 적용 환경에 Preview도 켜져 있는지 확인
- **git push 직후 곧바로 PR을 merge하면 마지막 커밋이 반영 안 될 수 있음** (실제로
  한 번 겪음 — GitHub이 최신 push를 미처 인식하기 전에 merge가 실행된 것으로 추정).
  merge 전에 PR의 head 커밋 sha가 방금 push한 커밋과 일치하는지 확인하고 merge할 것
- **`created_by`/`updated_by` 같은 새 외래키 컬럼을 여러 테이블에 한 번에 추가하는
  마이그레이션을 짤 때**: 그중 한 테이블에 레거시로 남아있던 동명의 컬럼이 있으면
  `add column if not exists`가 조용히 아무것도 안 하고 넘어가서, 새로 의도한
  참조(`staff_accounts`)가 아니라 예전 참조가 그대로 남을 수 있음 (원칙 27번,
  `quotes.created_by`가 실제로 이렇게 `profiles` 테이블을 참조하고 있어서 FK 위반
  에러가 났던 사고 있었음). insert/update가 "FK violates constraint" 에러를 내는데
  값 자체는 멀쩡해 보인다면, `pg_get_constraintdef`로 그 제약조건이 진짜 어디를
  참조하는지부터 확인할 것
- **정산(`invoices`) 관련 화면 작업할 때**: `company_id`는 nullable이라 게스트
  (비회원) 고객 오더도 정산이 가능함 — 화면에서 화주명을 표시할 때
  `companies?.name`만 보지 말고 반드시 `orders.guest_name`도 fallback으로 같이
  처리할 것 (안 그러면 개인고객 정산 건은 목록에 이름이 안 뜸)
- **직원(staff) 권한 관련 기능을 테스트할 때**: 관리자 계정만 테스트하면 권한 체크가
  실제로 걸리는지 확인이 안 됨 — 반드시 role이 `staff`인 계정으로도 로그인해서
  삭제 버튼이 안 보이는지, 운임기준표가 조회 전용인지 등을 같이 확인할 것
- **가끔 `invalid JWT: unable to parse or verify signature ... unrecognized JWT kid
  <nil> for algorithm ES256` 에러가 뜨는 경우**: 이 프로젝트에서 지금까지 두 번
  겪었음(`/admin/account-cleanup` 검색 중 한 번, 화주등록신청 승인 처리 중 한 번) —
  둘 다 **재시도하면 바로 해결됨**. Supabase 프로젝트 쪽 JWT 서명키 검증 과정에서
  생기는 일시적 문제로 보이며, 코드 버그로 보이진 않음. 이 에러가 뜨면 당황하지 말고
  같은 동작을 한 번 더 시도해볼 것 — 계속 반복되면 그때 Supabase 대시보드 →
  Settings → API의 JWT 설정을 확인
- **"페이지 전환/메뉴 클릭이 느리다"는 피드백을 받으면 네트워크 중복 호출부터
  의심하기 쉽지만, 먼저 새로 추가한 링크가 `<a href>`가 아니라 `next/link`의
  `Link`인지부터 확인할 것** (원칙 31번) — `<a href>`로 된 내부 링크 하나만 있어도
  그 링크를 쓰는 화면 전체가 하드 리로드되어 다른 모든 성능 최적화가 무색해짐.
  실제로 이 프로젝트에서 캐싱·middleware 최적화를 다 하고도 체감 개선이 없었던
  이유가 결국 이것이었음
- **삭제 API가 "violates foreign key constraint" 에러를 내는데 화면에 그 이유가
  안 보인다면**: 실제 업무 데이터(견적/오더/정산 등)가 남아있어서 막힌 게 맞는지,
  아니면 `support_access_logs`처럼 순수 이력용 테이블이 `on delete` 옵션 없는
  FK로 걸려있어서 불필요하게 막힌 건지부터 구분할 것 (원칙 32번). 후자라면 로그
  테이블 쪽 FK를 `on delete set null`로 바꾸는 게 맞고, 전자라면 막히는 게
  의도된 동작이니 건드리지 말 것
- **`enum` 같은 상태값 컬럼에 새 값을 추가했는데 insert/update가 "violates check
  constraint" 에러를 내면**: `lib/dispatchStatusColors.ts` 같은 코드 쪽 옵션
  목록만 바꾸고 DB의 CHECK 제약조건은 그대로 둔 경우가 많음. 코드 저장소에
  마이그레이션 파일이 없어서 이런 제약조건의 존재 자체를 놓치기 쉬움 —
  `select conname, pg_get_constraintdef(oid) from pg_constraint where
  conrelid = '테이블명'::regclass`로 그 테이블에 걸린 제약조건을 먼저 확인하는
  습관을 들일 것 (`dispatches.dispatch_status`에 실제로 이 문제가 있었음)
- **낙관적 잠금(원칙 28번) 쓰는 상세화면에서 "방금 내가 한 조작인데 다른 직원이
  수정했다고 뜬다"는 신고를 받으면**: 그 화면 안에 상태 드롭다운·체크박스처럼
  낙관적 잠금 없이 즉시 저장되는 다른 액션이 있는지부터 확인할 것 (원칙 36번).
  그 액션이 로컬 `updated_at`을 안 갱신하고 넘어가면 다음 낙관적 저장이 오탐함
- **`quotes` 테이블의 견적 조건값(상차조건/하차조건/차량형태/물품특성/운송시간/
  왕복편도 등)을 SQL로 직접 수정하려 할 때**: `load_condition`처럼 별도 컬럼이
  있을 거라고 짐작하지 말 것 — 전부 `selected_options`(jsonb) 안에 한글 키로
  묶여서 저장됨. 반면 `orders`/`portal_order_requests`는 반대로 진짜 flat
  컬럼임. 이 둘을 혼동해서 마이그레이션 SQL을 잘못 짜고 재작성한 적 있음 —
  UPDATE 문 쓰기 전에 그 테이블 저장 코드(`.insert()`/`.update()` payload 모양)
  를 먼저 확인할 것
- **`manual_source_note`(화주 상세의 "출처 설명")는 출처분류가 "기타"일 때만
  쓰는 전용 칸** — 다른 승인/등록 흐름에서 임의 텍스트를 저장할 목적으로
  재사용하지 말 것(과거 `/apply` 승인 처리가 이 칸에 신청 메모를 넣었다가,
  출처분류를 "기타"로 바꾸는 순간 엉뚱한 텍스트가 나타나는 버그가 있었음).
  분류에 안 묶이는 자유 메모는 `companies.notes`(일반 메모)에 넣을 것
- **여러 목록 화면이 같은 상세 페이지(`/admin/companies/[id]` 등)를 공유할 때**:
  URL이 항상 같은 접두어로 시작해서, `TopNav.tsx`의 `pathname.startsWith()` 기반
  활성메뉴 판정이 실제로 어느 목록에서 들어왔는지와 무관하게 한쪽 메뉴만 계속
  활성표시할 수 있음(실제로 `/admin/companies/[id]`가 "화주 확보"/`admin/companies`
  쪽으로만 항상 표시되고, "화주 관리"/`admin/customers`에서 들어가도 마찬가지였던
  버그 있었음). 상세 화면을 여러 목록에서 공유한다면 `?from=xxx` 같은 출처
  파라미터(`?from_order` 패턴과 동일)를 목록→상세 이동 시 붙이고, `TopNav.tsx`와
  상세화면의 "목록으로" 링크 둘 다 이 파라미터를 참고하도록 만들 것
- **로컬/샌드박스에서는 `npm run build`가 잘 되는데 Vercel 배포에서만
  실패한다면**: 십중팔구 `NEXT_PUBLIC_SUPABASE_URL` 등 환경변수 차이 때문에
  로컬에서는 도달하지 못했던 코드 경로가 Vercel(진짜 환경변수 있음)에서는
  실행되면서 드러나는 문제임. 실제로 `TopNav.tsx`에 `useSearchParams()`를
  Suspense 없이 추가했을 때, 로컬 빌드는 대부분 페이지가 Supabase 환경변수
  누락으로 그보다 먼저 실패해서 이 문제가 안 보였지만 Vercel에서는 바로
  드러났음(원칙 38번). Vercel 빌드 로그의 정확한 에러 메시지부터 확인할 것 —
  로컬에서 안 나던 에러라고 원인불명 취급하지 말고, "로컬은 조건이 다르다"는
  것부터 의심할 것

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

직원 계정·권한·이력 재구조화 스펙(1~8단계)은 전부 완료되어 main에 merge되었습니다.
Claude Code에서: 저장소를 열고 "인수인계 문서(CLAUDE.md 또는 HANDOFF.md)를 참고해서
5번 "다음 예정 작업" 1번(카카오 알림톡 자동화)부터 이어서 진행해줘" 같은 식으로
시작하면 됩니다.

실제 저장소 코드가 이 문서와 다르면 **저장소가 항상 맞습니다.**
