# WeCarry 운송 통합 운영 시스템 — 최종 인수인계 문서

> 이 문서는 claude.ai 채팅에서 **Claude Code로 작업 방식을 전환하는 시점**에 작성된
> 최종 버전입니다. 앞으로는 이 문서(또는 `CLAUDE.md`)를 참고해서 Claude Code가
> 작업을 이어갑니다.

**작성일: 2026-07-23** (최종 갱신: 2026-08-07, Claude Code 세션에서 직접 갱신 — 21차
세션: "화주포털 로그인 아이디 체계 변경" — 작업지시서(1-1~1-7 사전조사 → 사용자
확인 → addendum으로 확정사항 반영 → 구현) 흐름으로 진행. 화주포털 로그인을
이메일 기반에서 시스템 발급 고유 아이디(`we`+발급일(YYMMDD, KST 기준)+2자리
순번, 예: `we26080701`) 기반으로 전환. 기존 화주 포털 계정이 사용자 확인으로
이미 전부 삭제(`customer_accounts` 0건, 라이브 SQL로 재확인)된 상태라 별도
마이그레이션(기존 계정 이관) 없이 신규 발급분부터만 적용. 인증 시스템 자체는
새로 만들지 않고 기존 Supabase Auth 그대로 유지 — 화면은 "아이디"를 받되
내부적으로 `{아이디}@wecarry-portal.internal`(실제 존재하지 않는 합성 도메인)
이메일로 Auth에 등록(`lib/portalAccountCredentials.ts`의 `syntheticLoginEmail()`).
**사전조사에서 드러난 핵심 사실 — 이번 기능의 뼈대 상당 부분이 이미 구현돼
있었음**: 화주 상세화면의 "비밀번호 재설정" 버튼(`reset-portal-password` API)이
이미 존재했고, `must_change_password` 플래그를 재발급 시점에 다시 세우는
로직까지 이미 있었음 — 이번 작업은 "신규 기능"이 아니라 **기존
`reset-portal-password` 확장(admin 전용 권한 체크 추가 + 6자리 숫자 비번으로
통일) + 신규 로그인 체계 도입**으로 봐야 함(다음에 헷갈리지 않도록 명시).
다만 기존 버튼은 `isAdmin` 조건 없이 `staff`도 클릭 가능했고 서버 API에도 권한
체크가 없었음 — 이번에 화면단(`isAdmin &&`)+서버단(`getCurrentStaff().role
!== "admin"` 체크) 이중으로 막음(원칙 25번과 동일 패턴). 임시비밀번호는 최초
"4자리 숫자"로 시작했으나 Supabase Auth 프로젝트 전역 최소 비밀번호 길이
정책(직원 계정 로그인과 공유되는 설정이라 낮추면 영향범위가 넓음)과 충돌할
위험이 있어 사용자가 "6자리 랜덤 숫자"로 확정(정책 자체는 건드리지 않음).
`randomPassword()`가 `create-portal-account`/`approve-application`/
`reset-portal-password` 3곳에 중복 구현돼 있던 것을 `lib/
portalAccountCredentials.ts`의 `generateTempPassword()`/`issuePortalAccount()`/
`reissueTempPassword()`로 통합(`staff_accounts`용 4번째 사본은 별개 도메인이라
그대로 둠). 아이디 순번은 "먼저 조회해서 없으면 insert" 원칙대로
`customer_accounts.login_id` UNIQUE 제약 + insert 시 23505(유니크 위반) 캐치 후
재시도로 동시발급 충돌을 처리(원칙 그대로 재사용, 신규 원칙 추가 안 함).
`/apply` 승인 모달(`ApplicationDetailModal.tsx`)의 "포털 계정 로그인용
이메일" 수동입력 필드는 완전히 제거 — 신청서에 이미 담당자 이메일
(`contact_email`)이 있어서 이걸 그대로 "연락처 이메일"(선택, 로그인과 무관)로
넘겨받으면 되므로 관리자가 입력할 필요 자체가 없어짐(`approve-application`
API도 `portal_email` 파라미터 완전히 제거). 연락처 이메일이 없는 신청 건은
"메일 발송" 버튼 자체를 숨김(수신 대상이 없으므로). 화주 상세화면의 계정발급
폼도 이메일을 "담당자 이메일"(필수)에서 "연락처 이메일 (선택)"로 전환, 계정
목록 표시도 이메일 대신 아이디를 기본 표시로 변경. 로그인 화면
(`app/customer/login/page.tsx`)은 입력 라벨 "이메일"→"아이디"
(`type="text"`, `autoComplete="username"`), "아이디 저장" 체크박스 신규
(체크 시 아이디만 `localStorage`에 저장 — 비밀번호는 어떤 방식으로도 저장
안 함, 기존 저장/불러오기 패턴 자체가 프로젝트에 전혀 없어 신규로 만듦),
"비밀번호를 잊으셨나요? 위캐리로 문의해주세요" 안내 문구 신규 추가. 이
안내 문구와 랜딩페이지·`CustomerPortalShell.tsx`에 이미 하드코딩돼 있던
"고객센터 1588-0000"을 이번에 `lib/contactInfo.ts`(`COMPANY_SUPPORT_PHONE`/
`COMPANY_SUPPORT_HOURS`)로 공용 상수화해서 세 곳이 값 하나를 같이 참조하도록
정리 — **1588-0000은 사용자가 확인한 자리표시자(placeholder)이며 실제
대표번호가 아직 정해지지 않음**, 지금은 이 값을 그대로 쓰고 나중에 실제
번호가 정해지면 이 상수 하나만 바꾸면 세 곳이 한 번에 갱신됨(실제 번호 교체는
이번 범위 밖). 미실행 상태(RESEND_API_KEY 없음)인
`send-portal-credentials-email`도 나중에 Resend 활성화 시 잘못된 안내가
발송되는 걸 미리 막기 위해 안내 문구를 "이메일: {합성이메일}"에서 "아이디:
{login_id}"로 선제 수정. `npx tsc --noEmit`/`npm run build` 확인 완료.
DB 마이그레이션(`customer_accounts.login_id` UNIQUE NOT NULL 컬럼 추가,
`email` NOT NULL 해제)은 사용자가 Supabase SQL Editor에서 직접 실행할 것 —
잔존 행 0건을 이미 확인했으므로 백필 없이 바로 제약조건 적용 가능.
**PR #70 실사용 리뷰 라운드**: (1) 화주 상세화면 계정발급 폼의 "연락처
이메일(선택)" 입력을 "담당자 전화번호(선택)"로 교체 — `issuePortalAccount()`가
이미 지원하던 `contact_mobile` 파라미터를 실제로 폼·API에 연결(DB 변경
없음), 계정 목록도 전화번호가 있으면 전화번호를 우선 표시하고 없으면(과거
이메일로 발급된 계정) 이메일로 폴백. (2) 로그인 화면의 "비밀번호를
잊으셨나요? 위캐리로 문의해주세요(1588-0000)" 안내가 화면 폭에 따라
줄바꿈 위치가 들쭉날쭉하던 것을 `<br />`로 "비밀번호를 잊으셨나요?" /
"위캐리로 문의해주세요(1588-0000)" 2줄로 고정. (3) 내부시스템(관리자)
로그인 화면(`app/admin/login/page.tsx`)에도 화주포털과 동일한 방식(이메일만
localStorage 저장, 비밀번호는 저장 안 함)으로 "이메일 저장" 체크박스
신규 추가. (4) `/apply` 폼의 "업종(선택)" placeholder 예시가 입력창
폭에 잘려 뒷부분이 안 보이던 문제 — placeholder는 짧게 줄이고 전체
예시 6개(제조업/유통업/건설업/식품업/전자상거래/물류업)는 입력창 아래
캡션 텍스트로 이동(줄바꿈되어 항상 전부 보임). "이용 차량(선택)"은
"주 이용 차량(선택)"으로 라벨 변경 + "!" 아이콘 신규 — 처음엔 네이티브
`title` 속성으로 구현했다가 브라우저 기본 호버 지연(약 1초) 때문에
늦게 뜬다는 피드백을 받아, `onMouseEnter`/`onMouseLeave`로 즉시 뜨는
커스텀 툴팁으로 교체(`VEHICLE_TYPES` 배열을 그대로 안내 문구에 써서
목록이 바뀌면 자동으로 맞춰짐). (5) 화주등록신청 승인완료 화면
(`ApplicationDetailModal.tsx`)에서 아이디·임시비밀번호를 드래그로
선택하면 브라우저/확장프로그램이 불필요한 선택 팝업(마크+계정 썸네일)을
띄운다는 신고 — 저희 코드가 그리는 요소가 아니라 팝업 자체는 없앨 수
없어서, 대신 값 텍스트에 `user-select: none`을 걸어 드래그 선택 자체를
막고 화주 상세화면 "포털 계정 발급" 결과와 동일한 "복사" 버튼(클립보드
API)을 아이디·임시비밀번호 각각에 추가. **임시 비밀번호를 최초 비밀번호
변경 전까지 계속 표시(현재는 1회성 React state라 창을 벗어나면
사라짐)해달라는 요청은, DB에 평문으로 저장해야 하고 이 프로젝트의
`customer_accounts`가 anon 전체허용 RLS 구조라 그 방식대로 구현하면
브라우저에 노출되는 anon key만으로 모든 미로그인 화주의 임시비밀번호를
열람할 수 있는 보안 구멍이 생길 수 있다는 트레이드오프를 설명 —
사용자가 "지금 이대로 유지"(창을 벗어나면 사라지고, 필요하면 "비밀번호
재발급" 버튼으로 즉시 재발급)로 확정, 구현하지 않음.** `/apply` 폼의
"담당자 이메일 *" 필수 조건을 선택 입력으로 풀지 여부도 리뷰 중 물어본
상태에서 아직 답변을 못 받아 이번 PR 범위에서는 그대로 둠(다음 세션에서
확인 필요). `npx tsc --noEmit` 매 라운드 통과 확인. PR #70 merge됨. 20차
세션: "배차관리 배정방식 기본값을 외부정보망으로 변경" — 초기 운영은 자체
차주풀 없이 외부정보망 이용이 대부분일 것으로 예상되어, 배차 등록/상세의
"배정방식" 선택 버튼 순서를 외부정보망이 먼저 오도록 바꾸고, 배차 등록 폼의
초기 선택값(`assignmentType` state)도 `'internal'`에서 `'external'`로 변경.
DB 컬럼(`assignment_type`) 기본값은 그대로 `'internal'`로 유지 — 배차
생성 경로가 `app/admin/dispatches/page.tsx` 단 한 곳뿐이고 그 경로가 매번
`assignment_type`을 명시적으로 insert에 담아 보내서 DB 기본값에 의존하는
코드가 없음을 확인했고, 순수 UI 변경 건이라 굳이 사용자가 Supabase SQL을
추가로 실행하지 않아도 되게 보수적으로 판단(값 자체(`internal`/`external`
문자열)나 기존 저장된 배차의 값은 손대지 않음). `npx tsc --noEmit`/
`npm run build`(42페이지 프리렌더 실패, 기존 베이스라인과 동일) 통과. 19차
세션: "운영 대시보드 도입(로드맵⑥, 로드맵 전체 완료)" — 작업지시서(1-1~1-7
사전조사 → 사용자 확인 → 구현) 흐름으로 진행. **이번 로드맵은 지금까지와 달리
DB 마이그레이션이 전혀 없음** — 신규 테이블·컬럼 없이 기존 데이터(`invoices`/
`orders`/`dispatches`/`dispatch_extra_charges`/`claims`/`staff_accounts`)를
조회·집계해서 보여주는 화면. 사전조사에서 확정된 4가지 결정사항: (1) 포함
지표 4개 전부(전사 월별 매출·마진 추이/담당자별 영업 성과/화주별 수익성
순위/클레임·현장추가비 통계), (2) 집계 방식은 화주포털 월별통계(`app/customer/
stats/page.tsx`)와 동일한 클라이언트 JS 집계(새 DB 뷰·함수 없음), (3) 시각화는
기존 `<div>`+막대폭 스타일 재사용(신규 차트 라이브러리 도입 안 함), (4) 접근권한은
`role='admin'`만(담당자별 영업성과 등 민감정보 포함) — `staff`는 메뉴 비노출은
물론 라우트 자체도 서버에서 차단. 사전조사 중 라이브 SQL로 확인한 사실: `invoices.
billing_period`는 실제로 전부 `"YYYY-MM"` 포맷(예외 없음), 클레임은 전체 1건뿐이며
그 1건이 `처리완료`+`compensation_amount` 존재로 설계 필터 조건과 정확히 일치,
최근 12개월 데이터 규모가 극히 작아(invoices 단 몇 건) 클라이언트 집계 성능은
전혀 문제 없음(다만 화면 자체는 당분간 휑하게 보임). 신규 파일:
`lib/dashboardExtraChargeAgg.ts`(`attributeActiveExtraCharges()` — 로드맵③에서
정산관리 목록·상세/화주포털/월정산묶음 4곳에 이미 각자 인라인으로 구현되어 있던
"invoice 총액+활성 현장추가비 표시시점 합산"의 3규칙(active만/`correction_
invoice_id` 없는 것만/그 오더의 가장 최근 invoice 생성일 이후 것만)을 그대로
지키되, "최근 12개월 전체 invoice"를 한 번에 훑는 대량 집계 용도로 별도
재구현 — 기존 4곳 코드를 그대로 재사용하지 않고 신규 작성했지만 규칙은 100%
동일, 원칙51 신규 참고), `app/api/admin/dashboard-stats/route.ts`(GET, 관리자
전용, `SUPABASE_SERVICE_ROLE_KEY`로 최근 12개월 원본 데이터 조회 후 반환 —
실제 월별/담당자별/화주별 그룹핑·합산은 클라이언트 페이지가 수행해 결정사항
(2)를 지킴), `app/admin/dashboard/page.tsx`(4개 섹션: 전사 월별 매출·마진 추이/
담당자별 영업 성과/화주별 수익성 순위(TOP 10)/클레임·현장추가비 통계). 매출은
`customer_charge_total`+표시시점 합산 추가비, 마진은 `lib/vat.ts`의
`calcInclusiveAmount()`로 부가세 포함 환산 후 지급액 차감(13차 세션 마진 계산
버그와 동일한 함수 재사용 — 새 계산식 만들지 않음). 담당자별 영업 성과는
`orders.created_by`("오더 처리 담당자") 기준으로 확정(견적 상담·정산 등록
담당자와 다를 수 있음을 화면에 문구로 명시) — `staff_accounts`는 삭제 기능
자체가 없는 테이블이라 퇴사한 직원도 `id` 조인만으로 이름이 그대로 표시됨(별도
스냅샷 컬럼 불필요). 화주별 수익성은 `companies.total_revenue` 등 CRM 수동입력
필드를 참고하지 않고 `orders`→`invoices`(`order_id` 조인)로 직접 재계산, 게스트
(`guest_name`)·개인고객(`individual_customer_id`) fallback 포함. 클레임 배상액
합계는 `status='처리완료'`+`compensation_amount` not null인 건만 집계(청구액은
상태 무관 참고용 보조지표로 별도 작게 표시). 접근 제어는 2중 구조 — (a)
`middleware.ts`의 기존 admin 전용 경로 체크(`/admin/staff`, `/admin/support-logs`)에
`/admin/dashboard`를 추가해 페이지 자체를 서버에서 차단, (b) **미들웨어는
`/api/admin/*` 라우트에는 적용되지 않는다는 사실**(middleware.ts 자체 주석에
이미 명시돼 있었음)을 사전조사로 재확인해서, 신규 API 라우트에도 운임기준표
API와 동일한 `getCurrentStaff().role !== "admin"` 패턴을 별도로 적용(원칙52
신규 참고). TopNav 메뉴는 작업지시서 초안의 "운송 운영" 그룹이 아니라, 조사
결과 이미 admin에게만 노출되는 `ADMIN_ONLY_GROUP`("시스템" 그룹, 직원 계정
관리·지원접속 이력과 동일 그룹)에 추가하는 것으로 사용자 확인 후 조정.
**구현 중 작업지시서의 "각 섹션 독립적으로 로딩"을 문자 그대로 구현하지
않고 단일 API 호출+단일 로딩 상태로 단순화함** — 4개 섹션이 공통으로
`invoices`/`orders`/현장추가비 귀속 결과를 재사용하는 구조라 API를 4개로
쪼개면 같은 원본 테이블을 중복 조회해야 하고, 현재 데이터 규모가 극히
작아 한 번의 호출이 지연될 우려도 없어 실용적으로 판단(데이터가 커지면
섹션별 API 분리를 재검토할 것). `npx tsc --noEmit` 통과, `npm run build`는
42페이지 프리렌더 실패(기존 41페이지 베이스라인 + 신규 `/admin/dashboard`
1페이지 — 전부 이 빌드 환경에 Supabase 환경변수가 없어서 나는 동일한 원인,
새로운 종류의 실패 아님). DB 마이그레이션이 없는 로드맵이라 사용자가 Supabase에서
따로 실행할 것이 없음. **로드맵①~⑥ 전체 완료.** 18차
세션: "클레임·사고 도입(로드맵⑤)" — 작업지시서(1-1~1-5 사전조사 → 사용자
확인 → 구현) 흐름으로 진행. 지금까지 클레임 관련해서 있던 건
`dispatches.issue_occurred`(체크박스)+`issue_notes`(자유텍스트), 차주 상세의
`claim_history`(자유텍스트)뿐이었는데(0단계 사전점검 9차 세션에서 이미 확인),
이번에 금액·증빙·처리이력을 관리하는 구조화된 `claims` 테이블+화면을 신규
도입. 확정된 3가지 결정사항(사전 확인 완료): (1) 클레임 증빙사진은
로드맵④(POD·인수증) 업로드 인프라를 그대로 재사용 — `dispatch_photos`에
`claim_id`(nullable FK)와 `category` 값 `'claim'` 추가, 신규 Storage
버킷·signed URL 체계는 다시 만들지 않음(원칙 49번 그대로 적용). (2) 클레임
배상금은 1차로는 기록만 — `invoices`/`dispatch_extra_charges`에 자동
반영하지 않음(필요 시 관리자가 별도로 정산관리에서 수동 반영, 배상액 입력
필드 옆에 "정산 자동 반영 안 됨" 안내 문구로 명시). (3) 화주포털에는 노출
안 함 — admin 전용(책임소재 등 민감정보 포함이라 1차는 내부관리용으로 한정).
사전조사(1-1~1-5) 결과 사용자가 전부 권장안대로 확정: (1-1) `dispatch_photos`의
`category` CHECK(`'dropoff','pod'`)·`storage_path` UNIQUE가 실제 DB에도
정확히 반영돼 있음을 라이브 SQL로 재확인(로드맵④의 멱등성 처리가 실제로
안전하게 작동함을 재검증한 셈). (1-2) 클레임 카테고리는 다른 두 카테고리와
달리 배차상태 게이트 없이 항상 업로드 가능해야 해서, `upload-url`/`finalize`
API에 `category === 'claim'`이면 `isDispatchReadyForPhotoUpload()` 호출
자체를 건너뛰고 대신 `claim_id`가 그 배차 소속인지만 확인하는 분기를 추가
(기존 dropoff/pod 게이트는 그대로 유지, 함수 시그니처도 안 건드림 — 호출부
분기로만 처리해 기존 동작에 회귀 위험 없음). 이 조사 과정에서 **화주포털
목록 API(`app/api/customer/dispatch-photos/list/route.ts`)가 카테고리
필터를 전혀 안 걸고 있어서, `claim` 카테고리를 추가하는 것만으로 클레임
사진 메타데이터가 화주포털에 조용히 새어나갈 뻔한 지점을 발견** — 화주포털
list/signed-url 두 API 모두에 `PORTAL_VISIBLE_DISPATCH_PHOTO_CATEGORIES`
(dropoff/pod만 담긴 허용목록) 필터를 명시적으로 추가해서 막음(원칙 25번과
같은 이중체크 정신 — list가 애초에 photo_id를 안 내려주지만 signed-url API
자체도 한 번 더 카테고리를 확인). (1-3) `issue_occurred`/`issue_notes`는
완전히 독립 유지(자동연동 없음) — 원칙 45번(역방향 동기화 금지)과 같은
이유로, `claims`와 얽으면 두 값이 서로 다른 시점에 어긋나는 경합이 생길
위험이 있어 그대로 별개의 빠른 플래그로 남겨둠. (1-4) 차주 상세의
`claim_history`(자유텍스트)는 그대로 두고, `claims.driver_id` 같은 직접
컬럼은 추가하지 않음 — 외부정보망 배정 건은 애초에 `drivers` 테이블 행
자체가 없어서(차주 정보가 자유텍스트로만 존재) 어느 연결 방식을 쓰든 외부
차주는 못 엮이는 게 동일한 한계라, 굳이 컬럼을 늘릴 이유가 없다고 판단
(필요해지면 `dispatches.driver_id` 조인으로 내부차주 클레임 이력만 조회하는
뷰를 추가하는 방식 — 이번 1차 범위에서는 화면까지는 만들지 않음). (1-5)
"클레임·사고" 섹션 노출조건은 "배차확정 이후 전체"(`dispatch_status !==
'접수중'`) — 사고는 상차 전(예: 오배정)에도 발생할 수 있어 "현장 추가비"
(상차완료 이상)·"POD·인수증"(하차완료 이상)보다 넓게 열어둠, 배치 위치도
그래서 두 섹션보다 앞(배차 상세에서 "현장 추가비" 바로 위)으로 확정.
`claims` 테이블(카테고리 8종이 아니라 유형 6종 — 파손/분실/지연/오배송/
사고/기타, 상태 4단계 — 접수/조사중/처리완료/기각)은 삭제 기능 자체를
두지 않음(법적·분쟁 대응 근거자료 성격 — 로드맵③ `dispatch_extra_charges`가
취소 상태로만 이력을 남기는 것과 같은 결). 처리완료/기각으로 종결되는
시점에 `resolved_at`/`resolved_by`를 자동으로 채워서(재확정 시 최초 종결
시점은 덮어쓰지 않음, 종결 전으로 되돌리면 초기화) 이 컬럼들이
`invoices.receivable_amount`/`payable_amount`처럼 아무도 안 채우는 죽은
컬럼이 되지 않도록 함. 클레임 CRUD는 정산 금액을 직접 건드리지 않아
로드맵③ 수준의 SECURITY DEFINER 함수까지는 과하다고 판단해, 일반 업무
테이블 관례(anon 전체허용 RLS, admin 화면에서 직접 CRUD, 원칙 2번과 동일한
패턴)를 그대로 따름 — 신규 서버 API 라우트는 만들지 않음. 배차 상세에
"클레임·사고" 섹션 신규(위 1-5 결과대로 "현장 추가비" 바로 위), 클레임
카드마다 상태 드롭다운(즉시 저장)+증빙사진 업로드(`claim_id`로 연결, 카테고리당
최대 10장 한도를 클레임 건별로 독립 적용 — 한 배차에 클레임이 여러 건이어도
서로의 사진 개수가 서로를 갉아먹지 않게). POD·인수증 사진 확대보기 모달이
"POD·인수증" 섹션 안에 갇혀 있어서 그 섹션이 안 보이는 상태(예: 아직
하차완료 전)에서는 클레임 사진 확대 클릭이 안 먹히던 구조적 문제를 발견해,
모달을 컴포넌트 최상단(항상 마운트)으로 옮겨서 두 섹션이 공용으로 씀.
`npx tsc --noEmit`/`npm run build`(41페이지 프리렌더 실패, 기존
베이스라인과 동일) 통과. `claims` 테이블 마이그레이션과 `dispatch_photos`
확장(`category` CHECK에 `'claim'` 추가, `claim_id` 컬럼+연결 제약)은
사용자가 Supabase SQL Editor에서 직접 실행 완료. **PR #67 실사용 리뷰
라운드**: (1) 배차 상세 진입 시 즉시 크래시("Application error: a
client-side exception has occurred") 신고 — "POD·인수증" 섹션이
`DISPATCH_PHOTO_CATEGORIES` 전체(dropoff/pod/claim 3종)를 순회하는데
사진 목록 state(`photos`)는 dropoff/pod 2종 키만 가지고 있어서
`category==='claim'` 차례에 `photos['claim']`이 `undefined`가 되어
`.length` 접근에서 런타임 에러가 난 것이 원인 — 이 섹션은 dropoff/pod만
순회하도록 좁혀서 수정(`claim`은 별도 "클레임·사고" 섹션에서 이미 관리
중이라 원래도 이 섹션이 다룰 대상이 아니었음, strict 모드가 아니라
`tsc`가 이 타입 불일치를 못 잡아냈음 — 원칙 50번 신규, 아래 참고).
(2) 화주포털 배차·운송조회 "사진보기"도 같은 원인의 동일한 크래시 —
`components/DispatchPhotosPanel.tsx`도 `DISPATCH_PHOTO_CATEGORIES` 전체를
순회하고 있어서 같은 패턴으로 수정(화주포털은 애초에 클레임 사진을 API가
안 내려주므로 이 수정으로 완전히 해소됨). (3) "화주포털에 클레임 알림이
없다"는 지적은 버그가 아니라 결정사항 3(화주포털 비노출)에 따른 의도된
동작임을 설명 후 사용자 확인. (4) "클레임·사고"/"현장 추가비" 두 섹션
모두 "자주 발생하는 일이 아닌데 배차 상세 레이아웃을 너무 크게 차지한다"는
피드백으로 접이식으로 전환 — 기본 접힘 상태로 제목+건수 배지만 보이고
"▼ 펼치기" 버튼을 눌러야 등록폼·목록이 나타남. 사용자가 Preview에서
클레임 등록·상태변경·증빙사진 업로드까지 실사용 테스트 완료 후 merge됨
(PR #67). 17차
세션: "POD·인수증 도입(로드맵④)" — 운송 완료 후 하차지 사진·인수증(서명 등)을
배차 단위로 여러 장 업로드·보관하는 기능(둘 다 선택사항, 카테고리는 이 2종만).
최초 설계(v1)는 "admin 라우트가 로그인으로 보호되니 anon 키로 Storage에 직접
쓰는 것도 안전하다"고 판단했으나, anon 키는 브라우저 번들에 그대로 노출되는
값이라 로그인 화면을 거치지 않고도 그 키만 알면 누구나 Storage API를 직접
호출할 수 있다는 문제가 지적되어(일반 내부 업무 테이블 anon insert와 달리
Storage anon insert는 실제 저장·대역폭 비용 발생+임의 파일 호스팅 악용
위험이 있음) v2로 전면 재설계 후 그 설계로 구현(원칙 49번 신규 — 자세한
내용은 원칙 49번 참고). 서버가 재직 직원 인증 후 Signed Upload URL을
발급하면 클라이언트가 그 URL로 Storage에 파일 바이트를 직접 업로드(Vercel
서버 경유 없음), 이후 finalize API가 Storage에 실제로 올라간 객체를
재조회해서 크기·MIME을 검증하고 `dispatch_photos` 행을 생성하는 3단계
흐름. 배차상태만으로는 하차가 실제로 끝났는지 보장이 안 돼서(`문제발생`은
상차완료/하차완료 체크 흐름과 무관하게 상태 드롭다운으로 언제든 직접 선택
가능) `dispatch_status`뿐 아니라 `dispatches.delivery_confirmed`도 함께
확인하는 `isDispatchReadyForPhotoUpload()`(하차완료·운송완료, 또는
하차확인된 문제발생만 허용)로 업로드 가능 시점을 판정 — 이 조건을 upload-url
발급 직전과 finalize 직전 양쪽에서 매번 fresh 재조회로 검증함. `dispatch_photos`
테이블은 anon/authenticated 접근 정책을 아예 만들지 않아(RLS는 켜두고 정책
0개) 서버 API(service_role)를 거치지 않으면 어떤 클라이언트도 직접 접근할
수 없고, 열람은 항상 `photo_id`만 받아 서버가 `storage_path`를 조회해서
signed URL을 새로 발급(클라이언트가 storage_path 자체를 다루는 지점 없음).
업로드는 재직 직원이면 role 무관 누구나 가능하지만 삭제(soft delete)는
관리자만 사유 입력 후 가능(Storage 상의 실제 파일은 증빙자료라 즉시 물리
삭제하지 않고 보존, `deleted_at`이 있으면 목록·신규 signed URL 발급 모두
제외). `app/api/admin/dispatch-photos/*`(upload-url/finalize/list/
signed-url/delete) 5개 + `app/api/customer/dispatch-photos/*`(list/
signed-url) 2개 서버 API 신규, `lib/dispatchPhotos.ts`(카테고리·제한값·
에러 라벨 유일 정의처)/`lib/uploadDispatchPhoto.ts`(3단계 업로드 클라이언트
헬퍼) 신규. 배차 상세(`admin/dispatches/[id]/page.tsx`)에 "POD·인수증"
섹션을 "현장 추가비" 섹션과 "진행 체크" 섹션 사이에 신규 추가(노출조건은
현장 추가비의 상차완료 이상보다 좁게, 하차 이후로 한정), JPEG/PNG/WebP는
썸네일 미리보기·HEIC/HEIF는 파일카드로 구분 표시. 화주포털은 사전조사에서
확정된 "목록 펼침" 방식대로 배차·운송조회(`customer/dispatches`) 목록의
각 행에 "사진 보기" 토글을 추가해 펼치면 `components/DispatchPhotosPanel.tsx`가
같은 방식으로 사진을 보여줌(신규 상세페이지 없이 기존 목록 화면만 확장).
`npx tsc --noEmit`/`npm run build`(41페이지 프리렌더 실패, 기존
베이스라인과 동일) 통과. `dispatch_photos` 테이블 마이그레이션과
`dispatch-photos` private Storage 버킷(10MB 제한 + 허용 MIME 5종) 설정은
사용자가 Supabase SQL Editor에서 직접 실행 완료(PR #66), Vercel Preview에서
실제 업로드·열람·삭제까지 실사용 확인 후 merge됨.
`files`/`profiles` 테이블은 이번에도 코드 전체 재확인 결과 앱 코드 어디서도
참조되지 않는 무관한 레거시 테이블로 재확인됨(손대지 않음).
**PR #66 실사용 리뷰 라운드**: (1) 사진·인수증 삭제 시 체감 속도가 느리다는
피드백 — 삭제 후 `loadPhotos()`로 전체 목록을 다시 불러오면서 남아있는
사진들의 signed URL(썸네일)까지 매번 전부 재발급받고 있었음(delete 자체는
빠른 단일 UPDATE인데, 그 뒤에 붙는 전체 재조회가 병목이었음) — 삭제된
항목만 로컬 state에서 제거하고 나머지는 이미 불러온 상태를 그대로
재사용하도록 수정. (2) 화주포털에서 사진 클릭 시 새 탭으로 열려서 명시적인
닫기 버튼이 없다는 피드백 — 페이지 안 모달(우측 상단 ✕ 버튼 + 배경 클릭으로
닫힘)로 교체, 이미 썸네일용으로 받아둔 signed URL을 그대로 재사용해서 별도
API 호출도 없앰(admin 배차 상세에도 동일하게 적용). (3) "업로드·로딩이
전반적으로 느리다"는 피드백 — 근본 원인은 목록 API가 `photo_id`만 반환하고
프론트가 사진마다 signed-url API를 개별 호출(각 호출마다 인증 확인부터
재조회까지 전부 다시 거침)하던 구조였음 — 목록 API 자체가 Storage의
`createSignedUrls()`(여러 경로를 한 번의 호출로 묶어 발급)로 미리보기
가능한 사진(JPEG/PNG/WebP)의 signed URL을 처음부터 함께 내려주도록
변경(admin/화주포털 list API 둘 다), 사진이 몇 장이든 왕복 1회로 줄어듦.
admin 다중 파일 업로드도 순차 처리(파일마다 업로드-URL 발급→업로드→확정을
차례로 기다림)에서 병렬 처리로 변경(각 파일의 3단계가 서로 독립적이라 안전).
파일 1장 자체의 전송 시간(크기·네트워크에 좌우)은 구조상 그대로 남음.
16차
세션: "현장 추가비 도입(로드맵③)" — 작업지시서(1-1~1-10 사전조사 → 사용자
7개 결정사항 확정 → 구현) 흐름으로 진행. 운송 진행/완료 후 현장에서 추가로
발생하는 비용(대기료/회차비/야간·주말·공휴일 할증/수작업 상하차/계단 운반/
경유지 추가/주차료·통행료/기타 8종)을 배차 단위로 등록·취소하는 기능.
`collection_method='driver_direct'` 건은 범위 밖(0번 배경 결정). 확정된
7개 결정사항: (1-2) `receivable_amount`/`payable_amount` 재사용 안 함,
표시 시점 합산 채택. (1-4) "현장 추가비" 섹션은 상차완료 이상만 노출(기존
"차주 운임 상세 계산" 섹션의 배차확정 이상 조건보다 좁음 — 서로 다른 의미라
다르게 둠). (1-6) confirmed/발행·입금완료 묶음에 담긴 건에 추가비 발생 시
별도 신규 "정정청구" invoice를 자동 생성해 다음 묶음에 담기게 함(기존 확정
묶음 금액은 절대 불변). (1-7) 화주 청구액/차주 지급액 금액 분리 채택(안 B).
(1-8) 차주 지급 추가비엔 산재보험료 미적용. (1-10) 8종 운영, 차량 변경은
재견적 절차로 별도 분리. (2-5) 화주포털 미노출, admin 전용 1차 시작
**(PR #65 리뷰 중 사용자가 재확정 — 아래 "2-5 재확정" 항목 참고, 최종
결정은 화주포털에도 항목별 내역으로 노출함)**.
**핵심 설계 원칙(3-1)**: `invoices.customer_charge_total`/`driver_payout_total`은
정산 건 생성 시점 1회성 스냅샷이라는 기존 성질을 그대로 유지하고 **절대
직접 수정하지 않음** — 대신 화면에 보여줄 때만 이 값 + 그 이후 등록된 활성
추가비 합계를 실시간으로 더해서 표시(확정 청구액/추가비 합계/총 청구액(참고)
3단 표시). `dispatch_extra_charges` 테이블(배차별 로그, 삭제 없이
`status='active'/'cancelled'`+취소 정보로만 이력 보존) 신규,
`register_dispatch_extra_charge`/`cancel_dispatch_extra_charge` SECURITY
DEFINER 함수 신규(월정산 묶음 함수들과 동일 아키텍처 — Next.js는 인증만
확인 후 RPC 1회 호출). **구현 중 스펙 문서에 명시적으로 없어서 직접 채운
보정 3가지**(전부 7개 결정사항과 3-1 원칙을 위반하지 않는 선에서 채움,
CLAUDE.md 원칙 47번 신규 참고): (1) `refresh_item_snapshot`(로드맵②-B에서
이미 만들어졌지만 실제로는 어느 화면에도 연결 안 돼 있던 죽은 함수였음—
프론트에 "새로고침" 버튼을 이번에 신규로 만들어 연결)의 계산식을
"invoice.customer_charge_total 그대로 재복사"에서 "그 값 + 이 invoice
생성 이후 등록된 활성 추가비 합계"로 변경(3-1 원칙상 customer_charge_total
자체는 안 바꾸므로, 안 바꾸면 새로고침 버튼이 있어도 실제로는 아무 값도
안 바뀌는 죽은 기능이 됨). (2) 한 오더에 정정청구 invoice가 추가로 생길 수
있어 "가장 최근 invoice"를 기준으로 케이스 판정. (3)
`dispatch_extra_charges.correction_invoice_id`(nullable FK) 신규 추가 —
어떤 추가비가 어느 정정청구 invoice를 만들었는지 연결(정정청구 배지 표시,
이미 정정청구가 생성된 항목 취소 차단에 필요, 스펙 2-1 표에는 없던 컬럼).
배차 상세(`admin/dispatches/[id]/page.tsx`)에 "현장 추가비" 섹션 신규,
정산관리 목록·상세에 추가비 합계 캡션+정정청구 배지 표시, 월정산 묶음
화면(`MonthlyBillingBatchPanel.tsx`)의 draft 항목에 "새로고침 필요" 배지+
버튼 신규 추가(위 죽은 함수를 실제로 연결). 정산 자동생성 3개 지점
(목록/상세 드롭다운, 정산관리 수동등록) 전부 최초 스냅샷에 등록된 활성
추가비를 포함하도록 반영. `npx tsc --noEmit`/`npm run build`(41페이지
프리렌더 실패, 기존 베이스라인과 동일) 통과. DB는 사용자가 Supabase SQL
Editor에서 직접 실행. **PR #65 리뷰 중 2-5 재확정(화주포털 노출) 및
addendum 구현** — 화주가 PR에서 "화주포털에서는 현장추가비 표시가 안
되는것 같다"고 지적, 처음엔 결정사항 2-5(미노출)를 그대로 따른 의도된
동작이라고 답했으나 사용자가 노출로 재확정하며 3가지를 함께 확정: 노출
수준은 캡션이 아니라 항목별 내역(카테고리+금액), 정정청구 invoice도
일반 invoice와 동일하게 노출(구분 배지만 추가), 취소된 항목은 미노출.
**추가 제약**: `driver_payout_amount`(차주 지급액)는 화주포털에 절대
노출 금지 — 프론트 코드에서 안 보여주는 수준이 아니라 DB 권한 자체를
column-level `GRANT`로 제한(`authenticated` 롤에서 `dispatch_extra_charges`
테이블의 기본 전체컬럼 SELECT 권한을 `REVOKE`하고, 노출 가능한 컬럼만
다시 `GRANT`) — 프론트가 실수로 이 필드를 조회에 넣어도 Postgres가 권한
오류로 쿼리 자체를 막아서 조용히 새는 경로가 원천 차단됨. 행 단위 접근도
`customer_accounts.auth_user_id = auth.uid()` → `company_id` 일치 조건의
RLS 정책으로 본인 회사 소속 건만 제한(기존 원칙 2번과 동일 패턴).
`lib/portalInvoiceFields.ts`에 `PORTAL_DISPATCH_EXTRA_CHARGE_FIELDS`
신규 상수(안전 컬럼만) + `PORTAL_INVOICE_FIELDS`에 `order_id` 추가(추가비
조회 조인에 필요). `customer/invoices` 목록(데스크탑 표+모바일 카드
둘 다, 별도 상세 페이지가 없는 화면이라 행 펼치기 방식으로 항목별 내역
표시)에 admin과 동일한 "가장 최근 invoice에만 트레일링 추가비 표시"
로직을 화주포털 안전 필드로 재구현. `npx tsc --noEmit`/`npm run build`
재확인 통과. DB 마이그레이션(column GRANT/REVOKE + RLS 정책)은 사용자가
Supabase SQL Editor에서 직접 실행. 15차
세션: "월정산 묶음 후보 자격조건 단일 함수 통합"(로드맵 ②-B 후속, PR #64
merge 후 리팩터링 세션) — 사용자가 "`customer_billing_batch_candidates` 뷰를
`add_item_to_billing_batch`/`validate_billing_batch`/`confirm_billing_batch`
3개 함수가 실제로 재사용하는지, 조건을 각자 따로 넣어서 어긋날 위험이
남아있는지" 재확인 요청 — 조사 결과 뷰는 화면 조회 전용이고 4곳 모두 같은
자격조건을 각자 인라인으로 재작성한 구조였음(이번 마감일 변경까지는 로직이
어긋난 곳은 없었지만 구조적 위험은 실재). `is_billing_batch_candidate(invoices)`
SQL 함수 신규(IMMUTABLE, 묶음/기간과 무관한 정산 건 1건의 기본 자격만 판정) —
뷰는 이 함수를 WHERE로 직접 사용, `validate_billing_batch`/
`confirm_billing_batch`는 완전히 동일하게 복붙되어 있던 재검증 블록을 이
함수 호출로 교체(반환값 100% 동일, 순수 리팩터링). `add_item_to_billing_batch`는
조건별로 서로 다른 사유 코드를 반환해야 해서 개별 체크는 전부 그대로 두고
(반환값 보존), 마지막에 이 함수를 최종 안전장치로만 추가(조건이 어긋나면
기존 `invoice_no_longer_eligible` 사유로 막아줌). 앱 코드(프론트엔드/API
라우트)는 전혀 안 건드림 — `npx tsc --noEmit`/`npm run build`(41페이지
프리렌더 실패, 기존 베이스라인과 동일)로 회귀 없음 확인, DB 함수 자동화
테스트가 없어 조건 동치성은 코드 대조로 직접 검증. DB 변경은 사용자가
Supabase SQL Editor에서 직접 실행. 14차
세션: "화주 월정산 묶음 청구 도입(로드맵 ②-B)" — `collection_method='broker'`+
`billing_cycle='monthly'`(주선사 정산·월정산) 건을 화주+기간(월 단위)으로 묶어
한 번에 청구·확정하는 기능. DB(`customer_billing_batches`/
`customer_billing_batch_items` 테이블, `invoices.customer_side_locked` 컬럼,
SECURITY DEFINER 함수 11개, RLS)는 사용자가 사전에 직접 실행 완료, 이번 세션은
그 이후 화면+서버 API 반영 단계. `app/api/admin/billing-batches/*` 서버 API
11개 + `components/MonthlyBillingBatchPanel.tsx`(정산관리 "월정산 묶음" 탭)
신규, 정산 상세는 묶음에 포함된(`customer_side_locked=true`) 건의 화주 측
필드를 비활성화하고 묶음 화면으로 안내. PR #64 실사용 리뷰 다수 라운드 반영
— 화주 검색방식 교체, 묶음 해제 후 재묶음 안 되던 버그, 삭제 가능 범위 확장
(draft/cancelled), "전체 묶음 후보" 자동표시 + 확정 후 "보충 묶음" 기능,
화주별 정산 마감일(`billing_cutoff_day`) 지원(CLAUDE.md 원칙 46번 신규 —
나중에 바뀔 수 있는 설정을 기준으로 과거 레코드를 "정확히 일치 비교"로
재조회하면 안 됨), draft 상태 "포함된 정산 건" 표의 오더번호가 링크가 아니라
상세 진입이 안 되던 버그, 화주의 정산 마감일을 묶음 생성 이후 바꾸면 기존
묶음을 못 찾던 버그(같은 원칙 46번), 확정+입금완료 처리까지 된 묶음도
관리자가 사유와 함께 완전삭제할 수 있는 예외 경로(`force_delete_billing_batch`)
추가(테스트 기록 정리 목적, 정상 "묶음 해제" 흐름의 안전장치는 그대로 유지).
사용자 SQL 실행+실사용 확인 후 완료·merge됨(PR #64). 상세 내용은 아래 "완료된
주요 기능" 섹션 참고. 13차
세션: "정산방식 구조 도입(로드맵 ②-A)" — 기존 `settlement_type`(단일 5개 값 enum)
대신 수금방식(`collection_method`: `broker`/`driver_direct`)과 청구주기
(`billing_cycle`: `per_order`/`monthly`) 두 축으로 이원화, 선불/착불은 "선착불"
하나로 통합 표시하되 내부적으로만 `direct_collection_point`(`pickup`/`dropoff`/
`undecided`)로 구분, 외부 정보망 내부 정산방식(`network_settlement_type`)은
화주포털 비노출 내부 운영 전용 축으로 분리(DB 마이그레이션은 사용자가 사전에
직접 실행 완료, 이번 세션은 그 이후 화면 반영 단계). `lib/settlementLabels.ts`
신규(라벨 함수 + 신규→구형 단방향 호환 매핑 `mapToLegacySettlementType()`,
CLAUDE.md 원칙 45번 신규 — 구형 필드를 역방향 동기화하지 않고 읽기전용으로
얼려두는 패턴), `settlement_field_change_logs` 전용 서버 API+헬퍼, 견적(등록+
상세수정)→운송오더(등록+상세)→배차(등록+상세)→정산관리(목록+상세) 전체에
신규 필드 입력·표시·승계 반영, 배차확정 시점 검증(선착불인데 지급조건
미정이면 확정 차단), 화주포털은 `lib/portalInvoiceFields.ts` 화이트리스트로
주선수수료·정보망 관련 필드는 애초에 조회하지 않도록 처리, 부수 버그 수정
(배차 목록화면 정산 자동생성 경로에서 `settlement_type`이 누락되던 기존
버그). 완료·merge됨(PR #63, 실사용 리뷰 피드백 2라운드 반영 후 merge — (1)
정산관리 상세 "수수료(마진)"이 화주 청구금액(공급가액, 부가세 별도)과 차주
지급금액(계산기를 거친 경우 부가세 포함·산재보험료 차감된 최종금액)을 기준
없이 그냥 빼고 있어 항상 부가세 10%만큼 과소계산되던 구조적 버그 발견 —
청구금액을 부가세 포함가로 환산한 뒤 차감하도록 통일(정산관리 수동/자동
등록 3곳 + 배차 상세 "단순마진(참고)" 표시), 기존 저장된 `commission_total`
값은 소급 재계산하지 않음. (2) 정산관리 목록에서 "부가세 포함·산재보험료
차감됨"/"선착불(차주 직접수금)" 같은 설명 문구가 `white-space: nowrap`으로
강제 한 줄 처리되며 셀이 계속 넓어져 오더번호·화주 컬럼이 눌리던 레이아웃
버그 — 캡션을 명시적 2줄 구성으로 고정(리뷰 1차), "산재보험료 차감됨"→
"산재보험료 차감" 축약 + 화주 컬럼 최소폭(108px) 확보로 추가 조정(리뷰
2차)). 로드맵 ②-B(화주 월정산 묶음)는 지시대로 이번 PR 범위에 포함하지
않음. **PR #63 merge 후 사용자가 사전조사 5개 결정사항을 다시 확인하는
과정에서, 결정사항 1번(`total_freight_amount` 컬럼 — `customer_charge_total`이
WeCarry 실수금액만 의미해서 선착불 건의 전체운송료 정보가 사라지던 문제
해결용)이 DB/입력/승계/상세표시까지는 전부 반영돼 있었지만 정산관리
목록에는 빠져있던 것을 발견 — 목록의 "선착불(차주 직접수금)" 셀 아래에
전체 운송료 금액 캡션을 추가로 반영, 사용자 확인 후 PR 없이 `main`에
직접 fast-forward merge(원칙 8번 "중요 변경은 PR 검토 권장"의 예외 —
사용자가 매번 명시적으로 즉시 merge를 지시함)**. 12차
세션: "정산 마감·확정·잠금(로드맵 ①)" — `invoices.status`에 차주지급완료/정산확정
2개 값 추가(기존 5개+2=7개), `locked`/`confirmed_at`/`confirmed_by` 컬럼과
`invoice_amendment_logs`(확정 후 예외수정 이력) 테이블 신규. 서버단 권한 체크가
전혀 없던 정산관리 저장 경로(원칙 25번 위반 상태였음, 9차 세션에서 이미 지적됨)를
이번에 해소 — 신규 API 라우트 2개(`app/api/admin/invoices/confirm/route.ts`:
관리자 전용 정산확정, `app/api/admin/invoices/save/route.ts`: 메인 저장 경로를
anon 클라이언트 직접 update에서 서버 API로 이전, 저장 직전 `locked`를 항상
fresh 조회해서 확정된 건은 관리자+사유입력만 허용). 화면: 잠금 배지
(`components/LockedBadge.tsx`, 목록+상세) 및 "정산확정" 버튼(관리자 전용,
확인 다이얼로그) 추가, 확정된 건은 상태/세금계산서/입금/지급/정산방식 필드
전부 비활성화(관리자는 예외— `components/AmendmentReasonModal.tsx` 사유입력
후 수정 가능). 로드맵 ②(정산방식별 수금·지급 구조 세분화)는 지시대로 이번
세션에 포함하지 않음. CLAUDE.md 원칙 44번 신규(확정/잠금 레코드는 저장
시점에 서버가 fresh 재조회로 확인). DB 변경 사용자 실행 확인 완료. 완료·merge됨
(PR #61, 실사용 테스트 중 발견된 버그 — 화주입금+차주지급 둘 다 체크되면
상태를 자동으로 "입금완료"로 맞추는 기존 로직이 확정된 건에도 적용돼서
정산확정 후 상세 재진입 시 화면상 상태가 "입금완료"로 잘못 보이던 문제 —
수정 반영 후 merge). 11차
세션: "화주포털 세션 B: 목록 검색·정렬 기능" — 견적확인/배차·운송조회/정산확인/
공지사항/배송지 5개 화면에 검색(대소문자·공백 무관 포함검색) + 정렬(데스크탑
컬럼헤더 클릭, 카드/모바일은 드롭다운) 추가. admin에 재사용 가능한 기존 패턴이
없어 신규 공용 훅 `lib/useListSearchSort.ts`(원칙 43번) 도입 — 화면마다 필드명이
달라도 재사용 가능한 범용 설계, 나중에 admin으로 확장 가능. 페이지네이션은
범위 밖(별도 로드맵 항목), 배송지는 "배송지명" 별도 필드가 없고 이미 짧은
목록이라 검색만 추가·정렬은 생략(사용자에게 물었으나 응답이 없어 표시된
추천안대로 진행). PR 실사용 리뷰 피드백 반영해 (1) admin에 이미 있던
기간필터(오늘/이번주/이번달/전체, `components/DateRangeFilter.tsx`)를
견적확인/배차·운송조회/정산확인에도 재사용 추가(포털은 클라이언트단에서
`created_at` 기준으로 한 번 더 필터링하는 방식), (2) 정산확인 목록에
상태·정산방식 정렬 옵션 추가, (3) 세션 B 범위 밖이었던 화주포털
발주요청(`customer/request`) "내 요청 내역"에도 동일한 검색·정렬·기간필터
신규 적용까지 전부 완료·merge됨(PR #58). DB 변경 없음(전부 프론트
필터링·정렬만). 10차
세션: "화주포털 표시 개선 세션 A" — admin에는 이미 있었는데 화주포털에는 빠져있던
표시 6건을 보강함(혼적가능 배지를 포털 견적확인/배차·운송조회/정산확인 3개
목록에 추가, 견적 최종금액에 부가세 포함가 병기를 포털+admin 견적관리 둘 다
적용, 포털 배차·운송조회 목록에 품목 컬럼 추가, 포털 캘린더 날짜 클릭 시
뜨는 팝업에 품목·차량·금액·혼적가능 정보 보강, 포털 정산확인 목록에 부가세
별도/포함 병기, 사용자 확인 후 범위추가된 정산방식 배지를 포털 배차·운송조회/
정산확인 목록에 추가) + CLAUDE.md에 새 원칙 42번(admin↔화주포털 데이터
동기화 확인 습관) 추가 완료·merge됨(PR #56, 리뷰 라운드에서 부가세 포함가
표시 라벨을 "포함"→"부가세 포함"으로 명확화하는 수정 1건 반영 후 merge).
DB 변경 없음(표시만
추가, 기존 컬럼만 조회).
9차
세션: "0단계: 실제 저장소 및 DB 구조 사전 점검"(조사 전용, 코드·DB 변경 없음) —
정산방식/차주운임·산재보험료/정산관리/POD·인수증/현장추가비/클레임·사고/혼적/
최근 UI변경사항 8개 항목을 코드+DB 양쪽으로 전수 재검증(자세한 내용은 아래
"4-1. 0단계 사전 점검 결과" 참고). CLAUDE.md와 다른 점 2건 발견 — (1) 견적
상세·수정 화면(`admin/quotes/[id]/page.tsx`)에는 `settlement_type`이 전혀
없어 등록 시 1회 입력만 가능하고 이후 조회·수정 불가함(기존 "견적·오더·
배차·정산 4개 화면 전부"라는 서술은 부정확), (2) `invoices.receivable_amount`/
`payable_amount` 컬럼이 매번 저장은 되지만 어느 화면에서도 조회되지 않는
죽은 컬럼으로 확인됨. 나머지 항목(부가세 토글 폐지, `mixed_executed` 완전삭제,
산재보험료 계산식, `margin` 생성컬럼 여부, 각종 CHECK 제약조건, 산재보험료
요율 메뉴 위치, 화주포털 하위메뉴 배지, `MixableBadge` 일관성, 견적서 PDF
혼적 문구)는 전부 문서 내용과 실제 코드·DB가 정확히 일치함을 확인함. 8차
세션: 배차정산정보 단순화 + 혼적가능 표시 개선(v2) — 부가세 포함/별도 토글
완전 폐지(입력값은 항상 공급가액으로 고정) + "혼적 실행" 체크박스 완전 삭제
(대신 운송오더/배차관리/정산관리 목록·상세에 `components/MixableBadge.tsx`
신규로 "혼적가능" 배지를 눈에 띄게 표시) + 관련 DB 컬럼 5개(부가세 토글
4개 + `mixed_executed`) 삭제, 사용자 실행 확인 완료(PR #53) 후, 실사용
리뷰 피드백을 반영해 정산관리 목록·상세에 "부가세 별도"(화주 청구금액,
항상 고정)/"부가세 포함 · 산재보험료 차감됨"(차주 지급금액, 배차 계산기를
거친 건만) 캡션을 다시 추가 + 운송오더/배차관리/정산관리 목록 레이아웃
정리(구간 컬럼 주소 간략표시 `lib/shortAddress.ts` 공용화, 상차일 2행
분리, 여러 컬럼 한 줄 고정, 혼적가능 배지 위치 조정, 정산관리 컬럼명
명확화) 전부 완료·merge됨(PR #53). 7차
세션: 화주포털 하위메뉴 알림 배지 표시(관리자 TopNav의 `visibility` 토글 배지
패턴을 `components/NavCountBadge.tsx`로 공용화해서 화주포털에도 적용, 발주요청
알림 신규 추가 + 견적확인/배차조회/정산확인/공지사항은 기존 boolean 방식에서
localStorage 기반 실제 안읽음 개수로 교체, DB 마이그레이션 없음) 완료·merge됨
(PR #51).
6차
세션: 산재보험료 요율 설정 메뉴를 운임기준표 화면 탭으로 이동 + 혼적 옵션(견적
1회 수집 → 오더 승계 → 배차 실행여부 플래그) 도입(PR #49) 후, 실사용 리뷰
피드백을 반영해 견적 상세에 내용 수정 기능 신규 추가 + 견적/운송오더 희망
상차·하차 일시 저장 시 시간대(timezone)가 밀리던 버그 수정 + **혼적 할인
반영 시점을 배차 단계에서 견적 단계로 재조정**(정보망에 두 가지 가격을
따로 올리지 않는다는 실사용 피드백에 따라, 견적 최종금액 자동계산 시점에
할인을 바로 반영하고 배차의 "혼적 실행" 체크박스는 순수 기록용 플래그로
전환 — 아래 참고) 전부 완료·merge됨(PR #49) — 3차
세션 보정: 산재보험료 계산 로직을 "포함/별도 토글+임의 요율입력" 방식에서 실제
제도(주선사·차주 50%씩 공동부담, 차주부담분 원천징수)에 맞춘 정확한 계산으로 교체,
요율은 관리자 수정 가능한 설정 테이블(`insurance_rate_settings`)로 분리 + PR 실사용
테스트 피드백 반영(부가세 토글 기본값 false로 조정, 배차 금액 입력 콤마 표시,
정산관리 부가세 표시 추가 및 계산기-정산관리 간 부가세 표시 불일치 버그 수정, 목록
레이아웃 정리) 전부 완료·merge됨(PR #47) + 4차 세션: 산재보험료 요율 설정 화면을
독립 경로에서 운임기준표 화면의 탭으로 이동 완료 + 혼적 옵션(견적 단계 1회
수집 → 오더 승계 → 배차는 실행여부 플래그 1개, 표준 혼적 할인율 운임기준표
연동) 완료 + 직원 계정
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
(작업지시서와 실제 시스템 불일치 2건은 임시 판단 후 진행함, 아래 5번 섹션 참고)) +
오더 정산방식 변경 임계값을 "접수 이후 전부"에서 "배차완료 이상"으로 사용자 확인
후 조정 완료 + 차주 수금/지급 운임 표시 구조(부가세·산재보험료 계산기) 도입 —
배차 상세 "정산 정보" 접이식 섹션 + 목록 마진율 컬럼, DB 마이그레이션 사용자
실행 확인 완료 완료·merge됨(작업지시서 원안의 신규 컬럼 중 2개는 기존 컬럼
재사용으로 판단, 그중 `margin`은 실제로는 PostgreSQL 생성 컬럼이라 직접
UPDATE가 안 되던 버그를 사용자 실사용 테스트로 발견해 수정 완료, 아래 5번
섹션 참고)) + 4차 세션: 산재보험료 요율 설정 메뉴를 운임기준표 화면 탭으로
이동 + 혼적 옵션(적재구분: 독차/혼적가능, 견적 단계 1회 수집 → 오더 승계 →
배차는 "혼적 실행" 플래그 1개) 도입(PR #49). 5차 세션(PR #49 실사용 리뷰
라운드): 라디오그룹 가로배치/체크박스 CSS 뭉개짐 수정, 혼적 주의사항 예시
문구 추가, **혼적 할인 적용 방식 변경(1차)** — 최초엔 화주 청구운임 입력값은
그대로 두고 마진계산·정산등록에만 할인 반영 금액을 내부적으로 대입하는
"계산에만 반영" 방식이었으나, "체크해도 청구운임 숫자 자체가 안 바뀐다"는
실사용 피드백에 따라 "혼적 실행" 체크박스가 `dispatches.customer_charge`
값 자체를 직접 갱신(체크 시 할인 차감, 해제 시 역산 복원)하는 방식으로
교체 + 견적 상세에 내용 수정 기능 신규 추가(원칙 28번 낙관적 잠금 적용,
기본운임·가산 항목은 자동 재계산하지 않고 최종금액만 직접 조정) + **희망
상차·하차 일시 저장 시 시간대(timezone) 버그 수정** — 견적/운송오더의
`DateTimePicker` 값("YYYY-MM-DDTHH:mm", 오프셋 없음)을 오프셋 없이 그대로
Supabase에 저장하면 `timestamptz` 컬럼이 이를 UTC로 오인식해 실제 저장
시각이 KST 기준 최대 9시간 밀리고 날짜까지 바뀌는 버그가 있었음(저녁 상차+
익일 아침 하차처럼 자정을 넘는 조합에서 특히 눈에 띔) — `lib/localDateTime.ts`
신규(원칙 41번 참고)로 견적/운송오더/화주포털 발주요청/공개 견적문의 전체
저장·불러오기 지점을 일괄 수정 + 견적 상세 수정폼의 `DateTimePicker`에
빠져있던 `minDateTime` 제약(원칙 6번)도 함께 추가. 6차 세션: **혼적 할인
적용 방식 변경(2차, 최종)** — "실제 정보망에 올릴 때 혼적/비혼적 두 가지
가격을 따로 올리지 않는다"는 실사용 피드백에 따라, 5차 세션에서 만든
"배차 단계에서 체크박스가 청구운임을 직접 갱신"하는 방식을 다시 교체함:
이제 **견적 등록 화면의 운임 자동계산이 혼적가능+화주동의+할인조건 조건을
만족하면 최종 견적금액에 할인을 즉시 반영**(가산내역에도 "혼적 할인" 음수
항목으로 표시)하고, 이 금액이 오더 → 배차 청구운임까지 그대로 승계되므로
배차 상세의 "혼적 실행" 체크박스는 더 이상 금액을 건드리지 않는 **순수
기록용 플래그**로 되돌림. 정산관리 배지 문구도 "혼적할인 적용/미적용"에서
"혼적 실행됨/미실행"으로 변경, 견적서 출력의 "조건부 할인" 문구는 제거(더
이상 조건부가 아니라 이미 반영된 금액이므로)

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
- **차주 수금/지급 운임 표시 구조**: `dispatches`에 `driver_base_fare`(차주
  기본운임)/`driver_vat_included`(부가세 포함여부, 기본 true)/
  `industrial_insurance_applicable`(산재보험료 적용대상 여부, 기본 true,
  3차 세션 보정에서 `industrial_insurance_included`에서 rename — 아래
  참고)/`industrial_insurance_rate`(계산 시점에 실제 적용된 요율%의 스냅샷,
  더 이상 사용자가 직접 입력하지 않음) 컬럼 신규. **주의**: 작업지시서 원안은
  최종 계산 총액을 담을 `driver_total_payout` 컬럼도 신규로 만드는 것이었으나,
  `dispatches`에 이미 이 용도로 쓰이던 `driver_payout`(차주 지급운임, 배차
  등록/목록/상세/정산 자동등록 전체에서 사용 중) 컬럼이 있어서 원칙 27번
  지침대로 새로 만들지 않고 그 컬럼을 그대로 재사용함(계산기 저장 시 이
  컬럼에 최종값을 덮어씀). "주선사 마진"은 `dispatches.margin`이라는 기존
  컬럼이 있길래 처음엔 이것도 재사용하려 했으나, 실제로 값을 넣어보니
  PostgreSQL 생성 컬럼(generated column — `customer_charge - driver_payout`
  자동계산)이라 직접 UPDATE가 안 되는 걸 뒤늦게 발견함(`column "margin" can
  only be updated to DEFAULT` 에러) — 그냥 `driver_payout`만 갱신하고
  `margin`은 DB가 알아서 재계산하도록 둠(별도 저장 코드 없음, 배차 목록의
  "마진"/"마진율" 컬럼은 이 DB `margin` 값 기준 — 아래 3차 세션 보정에서
  도입된 "실질마진(정산기준)"과는 다른 값)
- **차주 수금/지급 운임 표시 구조 — 3차 세션 보정(산재보험료 계산 로직
  수정)**: 3차 세션에서 처음 구현했던 "산재보험료 포함/별도 토글 + 임의
  요율 직접입력" 방식이 실제 제도(화물차주 '노무제공자' 산재보험 — 주선사·
  차주 절반씩(50%) 공동부담, 차주부담분은 원천징수)와 다르다는 게 확인되어
  계산 로직을 교체함. `dispatches`에 `industrial_insurance_base_amount`
  (월보수액)/`industrial_insurance_driver_share`(차주부담분, 원천징수액)/
  `industrial_insurance_broker_share`(주선사부담분, 비용) 3개 컬럼과
  `customer_charge_vat_included`(화주청구금액 부가세 포함여부, 기본 false —
  실질마진을 공급가액 기준으로 계산하려면 필요) 컬럼 신규 추가. 필요경비공제율
  (기본 49.9%)/산재보험료율 총계(기본 1.76%)는 고용노동부가 매년 재고시하는
  값이라 코드에 하드코딩하지 않고 신규 테이블 `insurance_rate_settings`
  (관리자가 운임기준표 화면의 "산재보험료 요율" 탭에서 수정 가능, 원칙 40번 —
  최초엔 `/admin/settings/insurance-rate` 독립 경로였으나 4차 세션에서
  운임기준표 화면 탭으로 이동, 아래 참고)에서
  가장 최근 1행을 읽어서 계산. 사전확인 결과 이 구조를 실사용한 배차 건이
  0건이라(3차 세션 배포 이후 얼마 안 돼서 바로 보정) 기존 데이터 재계산 없이
  바로 구조를 교체함. `lib/settlementCalc.ts`(공급가액 환산/산재보험료
  계산/차주 최종 수금액/실질마진 계산, 6차 세션에서 추가비 반영 예정 주석
  포함)가 유일한 계산 로직처. 배차 상세 "정산 정보"의 "단순마진(참고)"(기존
  DB `margin` 기준)과 "실질마진(정산기준)"(신규, 공급가액 기준+주선사부담
  산재보험료 반영)은 서로 다른 값이므로 화면에서 라벨로 명확히 구분함
- **차주 수금/지급 운임 표시 구조 — 3차 세션 보정 PR 리뷰 라운드**: PR #47
  실사용 테스트 중 나온 피드백을 반영해 세부 조정함. (1) `customer_charge_vat_included`/
  `driver_vat_included` 기본값을 true→false(체크해제)로 변경(DB 컬럼
  default도 함께 변경, 기존 저장값도 일괄 리셋 — 실사용 0건 확인 후 진행).
  (2) 배차 등록/상세의 청구운임·지급운임·차주 기본운임 입력창에 1,000단위
  콤마가 보이도록 `components/MoneyInput.tsx`(값은 순수 숫자 문자열로 관리,
  화면 표시만 콤마 포맷) 신규 — `<input type="number">`는 콤마 표시가
  불가능해서 `type="text"` 기반으로 교체. (3) `invoices`에도
  `customer_charge_vat_included`/`driver_vat_included` 컬럼 추가 —
  배차에서 자동/수동 정산등록 시 승계, 정산관리 목록·상세에 청구금액/
  지급금액 아래 "부가세 포함"/"부가세 별도" 캡션으로 표시. **버그**: 계산기의
  "부가세 포함" 토글은 입력값 해석 방식만 나타낼 뿐, 계산된 `driver_payout`은
  토글 상태와 무관하게 항상 부가세 포함 금액으로 산출되는데(공급가액 계산 후
  부가세를 가산하는 계산식 구조상), 정산관리로 값을 넘길 때 이 결과 금액이
  아니라 입력용 토글을 그대로 복사해서 "부가세 별도"로 잘못 표시되던 문제
  발견·수정 — 계산기를 거친 금액(`driver_base_fare`가 있는 배차)은 항상
  "포함"으로 고정. (4) 정산관리 목록 레이아웃 정리 — 정산월~상태 컬럼은
  `whiteSpace: nowrap`으로 한 줄 고정, 정산방식 배지는 CSS auto-wrap 대신
  라벨의 "/" 위치에서 명시적으로 한 번만 줄바꿈("일반오더/주선사정산"만
  2줄, 나머지는 한 줄)
- **혼적 옵션(4차 세션)**: 동의·할인조건은 견적 단계에서 1회만 수집하고,
  배차 단계는 "실제 혼적됐는지" 실행여부 플래그 1개로 단순화하는 구조.
  `quotes`/`orders`에 각각 `loading_type`(`exclusive`|`mixable`, 기본
  `exclusive`)/`mixed_shipper_consent`(화주동의여부)/`mixed_discount_type`
  (`amount`|`percent`|null)/`mixed_discount_amount`/`mixed_discount_percent`/
  `mixed_note`(주의사항) 동일 6개 컬럼 신규(오더는 견적에서 그대로 승계),
  `dispatches`에는 `mixed_executed`(boolean, 기본 false) 1개만 신규. 혼적
  할인 중 **율(%) 방식만** 회사 자체 정책 기본값을 두는 신규 테이블
  `mixed_loading_discount_settings`(`standard_discount_percent`, 원칙
  40번과 동일한 관리자 수정 가능 단일값 설정 테이블 패턴이나 정부 고시값이
  아니라 회사 정책값이라는 점만 다름 — `/admin/rates` "가산기준" 탭에서
  수정)를 두고, 견적에서 "혼적가능"+"할인유형: 율" 선택 시 이 값을 입력창
  기본값으로만 채움(담당자가 건별 수정 가능, 저장되는 값이 아님). 금액(정액)
  방식은 거리·중량마다 달라지는 게 당연해서 표준값 없이 항상 수동 입력만
  지원. `lib/settlementCalc.ts`의 `applyMixedDiscount()`/`reverseMixedDiscount()`
  (역연산)가 유일한 할인 계산 로직 — `loading_type==='mixable' && mixed_executed`일
  때만 할인이 적용되고, 독차로 실제 운행됐으면(`mixed_executed=false`) 할인
  미적용. **PR #49 실사용 피드백으로 방식 변경**: 최초 구현은 배차의
  화주 청구운임 입력값은 그대로 두고 마진 계산·정산 등록에만 할인 반영
  금액을 몰래 대입하는 방식이었으나, "체크해도 청구운임 숫자 자체가 안
  바뀐다"는 피드백에 따라 **"혼적 실행" 체크박스 자체가 화주 청구운임
  값을 직접 갱신**하도록 변경함 — 체크 시 `applyMixedDiscount()`로 할인을
  차감해 `dispatches.customer_charge`에 바로 저장, 체크 해제 시
  `reverseMixedDiscount()`로 역산해 원래 금액으로 되돌림. 이후 마진
  계산·정산(invoices) 자동/수동 등록은 이 값을 그대로 사용(별도 변환 없음).
  **7차 세션에서 이 문단 전체가 다시 대체됨** — `dispatches.mixed_executed`
  컬럼과 "혼적 실행" 체크박스 자체가 완전히 삭제되고, 대신 운송오더/배차
  목록·상세에 "혼적가능" 배지를 표시하는 방식으로 교체됨. 아래 section 4
  "배차정산정보 단순화 + 혼적가능 표시 개선(v2)" 참고 — 이 항목이 최신 동작 기준

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
    사용 (조건부 렌더링 금지) — 배지 유무로 메뉴 레이아웃이 밀리는 버그 방지.
    `components/NavCountBadge.tsx`가 이 패턴의 공용 구현체(관리자 TopNav +
    화주포털 `CustomerPortalShell.tsx` 둘 다 재사용) — 새로운 메뉴 배지가
    필요하면 새로 만들지 말고 이 컴포넌트를 가져다 쓸 것
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
    (오더는 `["배차완료","운송중","운송완료"].includes(status)`일 때부터 —
    접수·배차중은 화주와 세부조율 중이라 자유 수정 허용, 배차는
    `dispatch_status !== "접수중"`일 때부터 사유 필요 — 정산관리는 아직
    확정/잠금 개념 자체가 없어서 일단 항상 사유 필요. 바뀔 때마다 `load()`로
    전체 재조회하는 것도 원칙 36번과 동일하게 지킬 것)
40. **정부 고시로 매년 바뀌는 요율(산재보험료율, 필요경비공제율 등)은 코드에
    하드코딩하지 말고 관리자가 수정 가능한 설정 테이블로 저장할 것.**
    `insurance_rate_settings`(`expense_deduction_rate`/`insurance_rate_total`)가
    이 패턴의 첫 사례 — `lib/insuranceRateSettings.ts`의
    `getLatestInsuranceRateSettings()`로 항상 최신 1행만 조회해서 계산에 쓰고,
    수정 화면(운임기준표 `/admin/rates` 화면의 "산재보험료 요율" 탭 — 4차
    세션에서 독립 경로에서 이 탭으로 이동, 아래 참고)은 조회는 누구나, 수정은
    관리자만(원칙 25번 이중 체크) 가능하도록 구현. 비슷하게 "이 값은 언젠가
    법령/고시가 바뀔 수 있다"는 값을 새로 다룰
    때는 상수 파일에 넣지 말고 이 패턴을 재사용할 것
41. **`components/DateTimePicker.tsx`가 다루는 "YYYY-MM-DDTHH:mm"(타임존
    오프셋 없음) 문자열은, Supabase에 저장/조회할 때 절대 그대로 주고받지
    말고 `lib/localDateTime.ts`의 `localInputToISOString()`(저장 시)/
    `toLocalDateTimeInput()`(불러오기 시)로 반드시 변환할 것.** 오프셋 없는
    문자열을 그대로 insert/update하면, 대상 컬럼이 `timestamptz`일 때
    Postgres/PostgREST가 이를 UTC로 오인식해서 실제 저장 시각이 KST 기준
    최대 9시간 밀리고(날짜가 바뀌는 경우도 있음), 반대로 DB에서 읽은 값을
    `.slice(0, 16)`처럼 그냥 잘라서 input에 넣으면 UTC 시각이 로컬 시각인 것처럼
    잘못 표시됨 — 실제로 견적 희망 상차·하차 일시가 "오늘 저녁 상차 + 내일
    아침 하차"처럼 자정을 넘는 조합일 때 저장 직후 목록/상세에 다른 시각으로
    보이는 버그로 나타났음(5차 세션에서 발견·수정). 새로운 datetime 저장
    지점을 추가할 때도 이 두 헬퍼를 거칠 것 — `new Date(v)`가 오프셋 없는
    문자열을 브라우저 로컬 시각으로 해석한다는 점을 이용해 정확히 변환함
42. **화주포털과 admin이 같은 데이터(견적/오더/배차/정산)를 다루는 화면을
    만들거나 계산 로직을 바꿀 때는, 반대쪽 화면에도 동일하게 반영해야
    하는지 항상 확인할 것 — 한쪽에만 적용하고 넘어가면 두 화면이 서서히
    어긋난다.** 단, 차주 지급운임·산재보험료·마진처럼 애초에 화주에게
    노출되면 안 되는 내부 정산 정보는 예외(화주포털에는 처음부터 의도적으로
    뺄 것 — 무엇을 빼야 하는지는 그 정보가 "화주가 알아도 되는 정보인지"로
    판단, 원칙 3·9번과 같은 결의 문제). 실제로 혼적가능 배지(`MixableBadge`)/
    최종금액 부가세 포함가 병기/배차·운송조회 품목 표시가 admin에는 이미
    있었는데 화주포털 견적확인·배차조회·정산확인 화면에는 빠져있던 사례가
    있었음(9차 세션 "0단계 사전점검" 이후 화주포털 표시 개선 세션에서
    발견·수정, 아래 완료된 주요 기능 참고). 새 기능을 admin에 추가할 때마다
    "이거 화주포털에도 보여줘야 하는 정보인가?"를 습관적으로 자문할 것
43. **목록형 화면에 검색·정렬이 필요하면 `lib/useListSearchSort.ts` 공용
    훅을 재사용할 것** — 화면마다 로컬로 검색 필터링·정렬 로직을 새로
    구현하지 말 것(원칙 12·37번의 `PasswordInput`/`AddressSearch`와 같은
    공용화 패턴). `searchFields`(포함검색 대상 필드를 뽑는 함수)/
    `sorters`(정렬 키별로 비교값을 뽑는 함수 맵)/기본 정렬키를 인자로
    받는 범용 설계라 화면마다 필드명이 달라도 그대로 재사용 가능(11차
    세션에서 화주포털 5개 화면에 최초 적용, admin으로 확장할 때도 같은
    훅을 그대로 가져다 쓸 것 — 새로 만들지 말 것). **페이지네이션은
    다루지 않음** — "다음 예정 작업"의 별도 로드맵 항목이므로, 이미
    불러온 배열 전체에 대해 프론트에서 검색·정렬만 적용하는 용도로만
    쓸 것
44. **레코드를 "확정"해서 잠그는 기능(정산확정 등)을 만들 때는, 저장
    시점에 클라이언트가 들고 있는 잠금 상태(`locked`)를 그대로 믿지 말고
    서버가 매번 최신 값을 다시 조회해서 확인할 것.** 클라이언트 state는
    페이지를 새로고침하기 전까지 오래된 값일 수 있어서, 그 값만으로
    "잠겼는지"를 판단하면 이미 확정된 건도 우회해서 저장할 수 있는 구멍이
    생김. `invoices.locked` 도입(로드맵 ① 정산 마감·확정·잠금, 12차
    세션)이 이 패턴의 첫 사례 — `app/api/admin/invoices/save/route.ts`가
    저장 직전 `select("*")`로 fresh 조회 후 `locked`면 관리자+사유입력
    (`components/AmendmentReasonModal.tsx`, 원칙 39번과 같은 결)만 허용
    하고, `invoice_amendment_logs`에 수정 전/후 스냅샷을 남김. 확정
    자체는 별도 관리자 전용 API(`app/api/admin/invoices/confirm/route.ts`)
    로만 가능하고, 그 API가 쓰는 필드(`locked`/`confirmed_at`/
    `confirmed_by`)는 일반 저장 API의 화이트리스트에서 빠져 있어 일반
    저장 경로로는 건드릴 수 없음(원칙 25번과 같은 이중체크 정신). 앞으로
    다른 화면에 비슷한 "확정/잠금" 기능이 필요하면 이 구조를 그대로
    재사용할 것
45. **기존 필드를 새 구조로 대체할 때, 구형 필드가 다른 코드에서 여전히
    필요할 수 있다면 완전히 지우지 말고 "읽기 전용으로 얼려두기 +
    신규→구형 단방향 호환 매핑"만 적용할 것 — 절대 구형 값에서 신규
    필드로 역방향 동기화하지 않는다.** 역방향 동기화를 만들면 두 값이
    서로 다른 시점에 서로를 덮어쓰는 경합이 생겨 어느 쪽이 진짜 값인지
    알 수 없어짐. `settlement_type`(5개 값 enum) → `collection_method`
    (수금방식: `broker`/`driver_direct`) + `billing_cycle`(청구주기:
    `per_order`/`monthly`) + `direct_collection_point`(선착불 지급조건:
    `pickup`/`dropoff`/`undecided`) 이원화(로드맵 ②-A, 13차 세션)가 이
    패턴의 첫 사례 — `lib/settlementLabels.ts`의
    `mapToLegacySettlementType()`이 신규 필드 조합을 구형 값으로 변환
    가능한 경우에만(표현 불가능한 조합은 매핑하지 않고 구형 값을 그대로
    둠) 저장 시점에 같이 써주는 방식으로 구현. 신규 필드를 저장하는 모든
    지점(견적/오더/배차/정산 등록·수정, 오더→배차, 배차→정산 자동생성)에서
    이 함수를 한 번씩 호출해 구형 필드가 조용히 낡은 값으로 남지 않게 할
    것 — 다만 매핑이 안 되는 조합이면 구형 필드는 손대지 않고 그대로
    둔다(기존 DEFAULT 값 유지, 억지로 채우지 않음)
46. **화주별로 나중에 바뀔 수 있는 설정값(정산 마감일 등)을 기준으로 과거에
    저장된 레코드를 다시 찾을 때는, "현재 설정으로 역산한 값"과 정확히
    일치하는지 비교하지 말 것 — 설정이 바뀌면 과거 레코드를 영영 못 찾게
    된다.** 대신 그 레코드가 가진, 설정 변경과 무관하게 항상 참인 성질로
    찾을 것. 월정산 묶음(로드맵 ②-B, 14차 세션)이 이 패턴의 첫 사례 —
    화주의 정산 마감일(`billing_cutoff_day`)을 나중에 지정하면, 마감일
    미설정 상태(달력월 기준)로 만들어졌던 과거 묶음을 조회할 때 "화주의
    현재 마감일로 역산한 `period_start`/`period_end`"와 그 묶음에 실제
    저장된 값이 서로 어긋나 영영 못 찾는 버그가 있었음(확정건을 클릭해도
    상세가 안 뜨고, 그 안의 세금계산서 발행 버튼도 같이 사라져 보였음 —
    사실 둘 다 같은 원인). `period_end`는 마감일 설정과 무관하게 항상 그
    정산월 라벨과 같은 달력월 안에 온다는 성질(기간 계산 방식상 불변)을
    이용해, 정확한 기간 일치 비교 대신 "`period_end`가 이 달력월 범위
    안에 있는지"로 기존 묶음을 찾도록 고쳐서 해결 — 찾은 묶음이 있으면
    그 묶음 고유의 저장된 기간을 그대로 쓰고, 없을 때만(신규 생성용)
    현재 마감일 설정 기준으로 기간을 계산한다
47. **정산 건 생성 시점 스냅샷으로 얼려둔 금액 필드(`invoices.customer_charge_total`/
    `driver_payout_total`)에 나중에 발생하는 추가 금액(현장 추가비 등)을
    반영해야 할 때는, 그 스냅샷 필드 자체를 직접 UPDATE하지 말 것 — 대신
    별도 로그 테이블에 원본을 남기고, 화면에 보여줄 때만 스냅샷 + 로그
    합계를 실시간으로 더해서 표시할 것.** 현장 추가비(로드맵③, 16차 세션)가
    이 패턴의 첫 사례 — `invoices.customer_charge_total`은 1-2 조사에서
    이미 "생성 후에는 앱의 어떤 화면·API로도 수정할 방법이 없는 상태"임이
    확인됐고, 이 상태를 깨지 않기로 결정함(3-1 원칙). 다만 이 원칙을 지키면
    "이미 확정된 화면 요소(월정산 묶음의 항목 스냅샷 등)가 새 추가비를
    반영하도록 새로고침하는 기능"도 동일하게 "스냅샷 자체는 안 바꾸고 표시만
    다시 계산" 방식으로 만들어야 한다는 게 뒤늦게 드러남 — 기존
    `refresh_item_snapshot` 함수가 "invoice의 현재 값을 그대로 재복사"하는
    방식이라, invoice 값 자체가 원칙상 절대 안 바뀌는 한 이 함수를 몇 번을
    호출해도 새로 등록된 추가비가 전혀 반영되지 않는(화면엔 "새로고침"
    버튼이 있지만 실제로는 아무 것도 안 바뀌는) 죽은 기능이 될 뻔했음 —
    함수의 계산식 자체를 "invoice 값 + 그 이후 등록된 로그 합계"로 고쳐서
    해결. 비슷하게 스냅샷+로그 조합을 설계할 때는 "새로고침/재계산" 기능이
    실제로 로그 쪽 변화를 반영하는지 끝까지 따라가서 확인할 것
48. **`invoices.order_id`가 지금까지 "한 오더 = 정산 건 최대 1개"라는
    암묵적 UI 관례(정산관리 "신규 정산 등록" 드롭다운이 이미 정산 건 있는
    오더를 후보에서 제외)로 사실상 유일했더라도, DB 유니크 제약은 아니므로
    앞으로 예외가 생길 수 있다는 것을 잊지 말 것.** 현장 추가비(로드맵③,
    16차 세션)의 "정정청구 invoice"가 이 예외의 첫 사례 — 확정된 월정산
    묶음에 이미 담긴 건에 새 추가비가 생기면, 기존 확정 금액은 절대 안
    바꾸고 같은 `order_id`로 새 invoice를 하나 더 만들어 다음 묶음에
    담기게 함. 이후로 `invoices` 테이블을 `order_id` 기준으로 조회하는
    코드에서 `.maybeSingle()`을 쓰면 2행 이상일 때 에러를 던지므로(기존
    자동정산등록 함수 2곳이 실제로 이 패턴이었음), 존재 여부만 확인하려면
    `.limit(1)` + 배열 길이 확인으로 바꿀 것 — 앞으로 `invoices`를
    `order_id`로 조회하는 새 코드를 짤 때도 "이 오더에 정산 건이 2개
    이상일 수 있다"는 전제를 깔고 짤 것
49. **대용량 private 파일은 서버 인증 후 Signed Upload URL을 발급하고,
    파일 바이트는 클라이언트가 Storage로 직접 업로드한다. 메타데이터 확정과
    signed download URL 발급은 반드시 서버 API(service_role)가 처리하며,
    anon 키로 파일 스토리지에 직접 쓰거나 메타데이터 테이블에 직접 쓰는
    방식은 (일반 내부 업무 테이블과 달리) 실제 비용·악용 위험이 있으므로
    허용하지 않는다.** POD·인수증(로드맵④, 17차 세션)이 이 패턴의 첫 사례 —
    당초 "admin 라우트가 로그인으로 보호되니 anon 키로 Storage에 직접
    쓰는 것도 안전하다"고 설계했다가, anon 키 자체가 브라우저 번들에
    노출되는 값이라 로그인 화면을 거치지 않고도 그 키만으로 Storage API를
    직접 호출할 수 있다는 점이 뒤늦게 지적되어 전면 재설계함(일반 테이블
    anon insert는 유출돼도 저장비용 문제가 없지만, Storage anon insert는
    실제 저장·대역폭 비용이 발생하고 임의 파일 호스팅에 악용될 수 있어
    위험 성격이 다름). 업로드는 upload-url API(재직 직원이면 role 무관
    가능, 배차상태+파일크기+MIME+개수를 매 요청 fresh 재조회로 검증) →
    클라이언트가 그 URL로 Storage에 직접 업로드 → finalize API(Storage에
    실제로 올라간 객체의 크기·MIME을 재조회해서 요청값이 아니라 그 값을
    진실로 사용, `dispatch_photos` 행 생성)의 3단계로 구현.
    `dispatch_photos`는 anon/authenticated 전부 RLS로 막혀있고(정책 자체를
    안 만듦) service_role 서버 API로만 접근, 클라이언트는 `storage_path`를
    직접 다루지 않고 항상 `photo_id`로만 열람용 signed URL을 요청함(4번
    참고, 임의 경로로 다른 배차 파일에 접근하는 것 방지)
50. **카테고리·상태값처럼 "허용값 목록" 상수를 확장할 때는, 그 상수를
    순회하며 컴포넌트별 state 객체를 인덱싱하는 모든 곳을 찾아서 그 state가
    새로 추가된 값까지 키로 갖고 있는지 확인할 것 — 이 프로젝트는 strict
    모드가 아니라서 `tsc`가 이 불일치를 잡아주지 못하고 런타임에서만
    크래시로 드러난다.** 클레임·사고(로드맵⑤, 18차 세션 PR #67 리뷰)에서
    실제로 겪은 사고 — `DISPATCH_PHOTO_CATEGORIES`를 `["dropoff","pod"]`
    2종에서 `["dropoff","pod","claim"]` 3종으로 늘렸는데, 이 상수를
    `.map()`으로 순회하며 사진을 카테고리별로 보여주는 화면 2곳
    (`admin/dispatches/[id]/page.tsx`의 "POD·인수증" 섹션,
    `components/DispatchPhotosPanel.tsx`)이 여전히 dropoff/pod 2종 키만
    가진 `photos` state를 그대로 인덱싱하고 있어서, `category==='claim'`
    차례에 `photos['claim']`이 `undefined`가 되고 그 `.length`를 읽으려다
    "Application error: a client-side exception has occurred"로 배차
    상세·화주포털 배차조회 양쪽 다 즉시 크래시났음(빌드는 두 번 다 정상
    통과했었음 — 인덱스 키 타입이 상수보다 좁아도 에러를 안 내는 프로젝트
    설정 때문에 `tsc`가 못 잡아냄). 이런 상수를 확장할 때는 (1) 그 상수를
    `.map()`/`.forEach()`로 순회하는 모든 곳을 찾고, (2) 그중 새로 추가된
    값을 다루면 안 되는 화면(예: 특정 카테고리는 별도 섹션에서 전용으로
    관리)이 있다면 그 상수 전체가 아니라 실제로 다뤄야 할 값만 담은
    로컬 배열(`["dropoff","pod"] as const`)로 순회 대상을 명시적으로
    좁힐 것 — "상수 하나 늘렸을 뿐인데 그 상수를 참조하는 모든 곳이
    자동으로 안전하게 확장될 것"이라고 가정하지 말 것
51. **화면에 이미 인라인으로 구현된 "표시시점 합산/재계산" 로직을, 이번엔
    여러 레코드를 한 번에 훑는 대량 집계 용도로도 써야 할 때는 기존 코드를
    그대로 복붙하지 말고, 같은 규칙을 지키는 별도 함수로 새로 분리해서 만들
    것 — 단, 그 규칙 자체(어떤 걸 포함하고 어떤 걸 제외하는지)는 절대
    바뀌면 안 된다.** 운영 대시보드(로드맵⑥, 19차 세션)의 매출·마진 집계가
    이 패턴의 첫 사례 — 현장 추가비(로드맵③) "invoice 총액+활성 추가비
    표시시점 합산" 로직은 이미 정산관리 목록·상세/화주포털/월정산묶음 4곳에
    각자 인라인으로 구현돼 있었지만, 그 4곳은 전부 "화면에 로드된 소수
    invoice 1건씩"을 다루는 형태라 "최근 12개월 전체 invoice"를 한 번에
    집계하는 대시보드 용도로는 쿼리 형태 자체가 안 맞았음. 그래서
    `lib/dashboardExtraChargeAgg.ts`에 3규칙(active만 / `correction_invoice_id`
    없는 것만 / 그 오더의 가장 최근 invoice 생성일 이후 것만)을 그대로
    지키는 신규 함수를 작성 — 기존 코드는 재사용하지 않았지만 규칙은 100%
    동일하게 맞춰서, 나중에 원본 로직이 바뀌면 이 신규 함수도 같이 바뀌어야
    한다는 점을 놓치지 않도록 함(원칙47 "표시시점 합산" 정신의 대량집계 버전)
52. **admin 화면의 접근 제어를 `middleware.ts`에만 추가하고 끝내면 안 된다 —
    `middleware.ts`의 matcher(`/admin/:path*`)는 `/api/admin/*` 서버 API
    라우트에는 전혀 적용되지 않는다(파일 자체에 이미 이 사실이 주석으로
    명시돼 있음).** 페이지 라우트를 미들웨어로 막아뒀다고 해서 그 페이지가
    호출하는 API까지 자동으로 보호되는 게 아니므로, 관리자 전용 화면을
    만들 때는 (a) `middleware.ts`의 admin 전용 경로 체크에 새 페이지 경로를
    추가하는 것과 별개로 (b) 그 화면이 쓰는 API 라우트 각각에도 원칙25·30번과
    동일한 `getCurrentStaff().role !== "admin"` 서버단 체크를 반드시 넣을
    것 — 운영 대시보드(로드맵⑥, 19차 세션)에서 `/admin/dashboard` 페이지와
    `/api/admin/dashboard-stats` API 양쪽에 이 이중 체크를 적용한 것이 이
    패턴의 첫 명시적 사례(그 전에도 원칙25번 정신 자체는 지켜지고 있었지만,
    "미들웨어와 API가 서로 다른 두 개의 방어선"이라는 사실 자체를 이번에
    처음 문서화함)

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
  강제하는 `SettlementTypeChangeModal`(원칙 39번) — 오더는
  `["배차완료","운송중","운송완료"].includes(status)`(접수·배차중은 화주와
  세부조율 중이라 자유 수정 가능, 배차완료부터 사유 필요 — 사용자 확인 후
  2026-07-29에 조정 완료, 최초엔 `상태 !== "접수"`로 임시 처리했었음), 배차는
  `dispatch_status !== "접수중"`부터 사유 필요, 정산관리는 확정/잠금 개념이
  아직 없어 일단 항상 사유 필요(8차 세션에서 잠금 로직 예정, 코드 주석으로
  남겨둠). **작업지시서와 실제 시스템이 안 맞아서 판단을 내린 부분**(2026-07-28
  세션): "견적이 외부 화물정보망 연동으로 이미 등록되는 경우 정산방식 기본값을
  `network`로 자동 제안" — 견적 등록 시점에는 외부정보망 연동 여부를 알 수 있는
  데이터가 시스템에 없음(외부정보망 선택은 배차 등록 단계에만 존재). 구현하지
  않고 건너뜀(계속 보류 중)
- **차주 수금/지급 운임 표시 구조 — "내부운영시스템 보완 설계안 v2" 3차 세션**:
  배차 상세에 "정산 정보" 접이식 하위섹션(기본 접힘) 신설 — 차주 기본운임 입력
  → 부가세 포함/별도 토글 → 산재보험료 포함/별도 토글(+별도 시 요율%) →
  계산된 차주 수금/지급 총액·주선사 마진 실시간 미리보기(마진 음수면 경고색)
  → 저장. `lib/settlementCalc.ts`가 계산하고, 저장 시 `dispatches.driver_payout`에
  최종값을 스냅샷으로 고정 — 이후 요율이 바뀌어도 과거 배차 건의 저장된 값은
  안 바뀜. **배차확정 이후에만 노출**(`dispatch_status !== "접수중"`, 원칙 39번과
  동일 기준). 새 배차의 "정산 정보" 섹션을 처음 열 때 부가세/산재보험 설정값이
  비어있으면(`driver_base_fare`가 null인 경우), 가장 최근에 저장된 다른 배차
  건의 부가세/산재보험 설정을 자동으로 기본값으로 채워줌(스마트 디폴트, 매번
  토글을 새로 누르지 않아도 되게 — 별도 설정 테이블 없이 쿼리로 구현).
  배차 목록에는 마진액(기존 컬럼) 옆에 마진율(%) 컬럼을 신규로 추가.
  **작업지시서와 실제 시스템이 안 맞아서 판단을 내린 부분**(2026-07-29 세션):
  작업지시서 원안의 신규 컬럼 `driver_total_payout` 대신 기존 `driver_payout`
  컬럼을 재사용 — 사전확인 쿼리로 이미 존재하는 걸 확인하고 판단, 사용자 확인
  완료(임의 판단이 아니라 사전에 안내하고 진행함). **버그 수정**: `margin`도
  같은 방식으로 재사용하려 했으나, 저장 시도 시 `column "margin" can only be
  updated to DEFAULT` 에러 발생 — 알고 보니 `margin`은 일반 컬럼이 아니라
  PostgreSQL 생성 컬럼(generated column, 아마 `customer_charge - driver_payout`
  기반 자동계산)이라 직접 UPDATE로 값을 넣을 수 없었음. `driver_payout`만
  갱신하도록 수정하고 `margin`은 DB가 알아서 재계산하도록 둠(원칙 27번 사전확인
  쿼리가 "컬럼 존재 여부"는 잡아냈지만 "generated column인지"까지는 안 잡아냈던
  사례 — 비슷한 재사용 판단을 할 땐 `is_generated`/`generation_expression`도
  같이 확인하는 습관이 필요함)
- **차주 수금/지급 운임 표시 구조 — 3차 세션 보정(산재보험료 계산 로직 수정)**:
  위 3차 세션에서 구현했던 "산재보험료 포함/별도 토글 + 임의 요율 직접입력"
  방식이 실제 제도와 다르다는 게 배포 직후 확인되어(화물차주는 '노무제공자'
  신분으로 산재보험료를 주선사·차주가 절반씩(50%) 공동부담하고, 차주부담분은
  차주가 받을 금액에서 원천징수함 — 단순 가산이 아님) 계산 로직을 정확한
  방식으로 교체함. 계산 순서: 공급가액(부가세 제외 기본운임) → 월보수액
  (공급가액 × (1−필요경비공제율)) → 차주부담분/주선사부담분(월보수액 ×
  산재보험료율÷2, 각각). 기존 "포함/별도" 토글은 "산재보험료 적용대상 여부"
  토글로 의미 변경(`industrial_insurance_included` →
  `industrial_insurance_applicable` rename), 요율 직접입력 필드는 제거하고
  대신 관리자가 수정 가능한 전역 설정 테이블(`insurance_rate_settings`,
  원칙 40번)에서 매번 최신값을 읽어와 자동 계산 후 스냅샷으로 저장. 배차 상세
  "정산 정보"에 화주청구금액 부가세 포함 토글(`customer_charge_vat_included`)
  신규 추가, "실질마진(정산기준)"(공급가액 기준, 주선사부담 산재보험료 반영)을
  새로 표시하고 기존 DB `margin` 기준 표시는 "단순마진(참고)"로 라벨을 구분함.
  관리자 전용 요율 설정 화면(`/admin/settings/insurance-rate`, TopNav "운송
  운영" 그룹)도 신규 추가(원칙 25번 화면단+서버단 이중체크 — **4차 세션에서
  독립 경로를 폐지하고 운임기준표 화면의 탭으로 이동함, 아래 "3차 세션 보정
  — 메뉴 위치 변경" 참고**). **사전확인
  결과**: 이 구조를 실제로 저장한 배차 건이 0건이라(3차 세션 배포 직후 바로
  보정 진행) 기존 데이터 재계산 없이 안전하게 구조를 교체함
- **차주 수금/지급 운임 표시 구조 — 3차 세션 보정 PR 리뷰 라운드**: PR #47
  실사용 테스트 중 나온 피드백을 반영해 세부 조정함. (1) `customer_charge_vat_included`/
  `driver_vat_included` 기본값을 true→false(체크해제)로 변경(DB 컬럼
  default도 함께 변경, 기존 저장값도 일괄 리셋 — 실사용 0건 확인 후 진행).
  (2) 배차 등록/상세의 청구운임·지급운임·차주 기본운임 입력창에 1,000단위
  콤마가 보이도록 `components/MoneyInput.tsx`(값은 순수 숫자 문자열로 관리,
  화면 표시만 콤마 포맷) 신규 — `<input type="number">`는 콤마 표시가
  불가능해서 `type="text"` 기반으로 교체. (3) `invoices`에도
  `customer_charge_vat_included`/`driver_vat_included` 컬럼 추가 —
  배차에서 자동/수동 정산등록 시 승계, 정산관리 목록·상세에 청구금액/
  지급금액 아래 "부가세 포함"/"부가세 별도" 캡션으로 표시. **버그**: 계산기의
  "부가세 포함" 토글은 입력값 해석 방식만 나타낼 뿐, 계산된 `driver_payout`은
  토글 상태와 무관하게 항상 부가세 포함 금액으로 산출되는데(공급가액 계산 후
  부가세를 가산하는 계산식 구조상), 정산관리로 값을 넘길 때 이 결과 금액이
  아니라 입력용 토글을 그대로 복사해서 "부가세 별도"로 잘못 표시되던 문제
  발견·수정 — 계산기를 거친 금액(`driver_base_fare`가 있는 배차)은 항상
  "포함"으로 고정. (4) 정산관리 목록 레이아웃 정리 — 정산월~상태 컬럼은
  `whiteSpace: nowrap`으로 한 줄 고정, 정산방식 배지는 CSS auto-wrap 대신
  라벨의 "/" 위치에서 명시적으로 한 번만 줄바꿈("일반오더/주선사정산"만
  2줄, 나머지는 한 줄). **7차 세션에서 부가세 포함/별도 토글 자체가 완전히
  폐지됨** — `driver_vat_included`/`customer_charge_vat_included` 컬럼
  (dispatches/invoices 4개) 전부 삭제, 계산은 항상 "부가세 별도"(입력값=
  공급가액)로 고정. 아래 "배차정산정보 단순화 + 혼적가능 표시 개선(v2)"
  항목이 최신 동작 기준
- **차주 수금/지급 운임 표시 구조 — 3차 세션 보정 메뉴 위치 변경(4차 세션)**:
  산재보험료 요율 설정 화면을 `/admin/settings/insurance-rate` 독립 경로 +
  TopNav "운송 운영" 그룹 메뉴 항목에서, 운임기준표(`/admin/rates`) 화면
  안의 탭으로 이동함 — 운임기준표가 원래 "이 사업의 모든 요율/기준값을
  모아두는 화면"이라는 성격이고 원칙 40번 패턴(정부 고시로 바뀌는 값)의
  설정값이 앞으로도 늘어날 수 있어 매번 새 메뉴를 만들지 않기 위함.
  `app/admin/rates/page.tsx`에 탭 3개(기본운임/가산기준/산재보험료 요율)
  도입, `InsuranceRateTab` 서브 컴포넌트로 기존 폼 로직 그대로 이동. 독립
  라우트(`app/admin/settings/insurance-rate/`)와 TopNav 메뉴 항목은 삭제.
  API 라우트(`app/api/admin/insurance-rate-settings/route.ts`)는 그대로 유지
- **혼적 옵션(4차 세션)**: 동의·할인조건을 견적 단계에서 1회만 수집(적재구분
  독차/혼적가능 라디오, 화주동의 체크, 할인유형(금액/율) 라디오+입력값,
  주의사항)하고, 오더는 견적에서 그대로 승계+수정 가능(원칙 25번과 무관하게
  일반 편집폼에 포함 — 확정 이후 사유 필요 패턴은 적용 안 함, 정산방식과
  달리 이 항목은 "협의 조건"이라 언제든 자유 수정), 배차는 "혼적 실행"
  체크박스 1개(오더 `loading_type`이 `mixable`인 건에만 노출)로 실제
  혼적 여부만 판단하는 구조로 구현. 할인 중 율(%) 방식은
  `/admin/rates` "가산기준" 탭의 "표준 혼적 할인율" 설정값이 견적 입력창
  기본값으로 자동 제안됨(담당자가 건별 수정 가능), 금액(정액) 방식은 표준값
  없이 항상 수동 입력. `lib/settlementCalc.ts`의 `applyMixedDiscount()`/
  `reverseMixedDiscount()`가 계산 로직 — **PR #49 실사용 피드백으로 수정**:
  최초엔 화주 청구운임 입력값은 그대로 두고 마진 계산·정산 등록 시에만
  할인 반영 금액을 내부적으로 대입했으나, "체크해도 청구운임 숫자가 안
  바뀐다"는 피드백에 따라 "혼적 실행" 체크박스가 `dispatches.customer_charge`
  값 자체를 직접 갱신하도록 변경(체크 시 차감, 해제 시 역산으로 복원).
  견적서 출력(PDF)에는 혼적가능+화주동의 건에 "혼적 조건부 할인: OO%
  (실제 혼적 시 적용)" 문구 표시(이건 견적 단계라 실제 실행 여부가
  아직 없어 계속 조건부 안내로만 유지), 정산관리 목록·상세에는 배차의
  `mixed_executed` 여부를 참고해 "혼적할인 적용"/"혼적가능(미적용)" 배지
  표시(invoices는 dispatches와 직접 FK가 없어 order_id로 별도 조회 후
  맵으로 연결)
- **견적 상세 수정 기능(PR #49 실사용 피드백)**: 견적 상세(`/admin/quotes/[id]`)가
  기존엔 진행상태 변경만 가능하고 나머지는 전부 조회 전용이었는데("견적을
  제시한 다음 수정할 일이 생긴다"는 요청으로), 구간/거리/톤수/차량형태/
  물품특성/품목/희망 상차·하차일시/운송시간/왕복편도/상차·하차조건/
  대기시간/경유지수/특이사항/최종견적금액/혼적옵션(적재구분+할인조건+
  주의사항)을 한 번에 수정할 수 있는 편집모드를 추가함. 여러 필드를 한 번에
  묶어 저장하는 화면이라 원칙 28번(낙관적 잠금)의 `optimisticUpdate()` +
  `ConflictWarning` 적용. **기본운임·가산 항목별 내역(`base_fare`/
  `quote_items`)은 자동 재계산하지 않음** — "최종 견적금액"을 직접 조정하는
  방식(화면에 안내 문구 표시)으로 단순하게 구현, 견적 생성 화면의 운임기준표
  기반 자동계산 엔진을 상세화면에 다시 들여오는 건 범위 밖으로 판단
- **희망 상차·하차 일시 타임존(timezone) 저장 버그 수정(PR #49 실사용
  피드백)**: "견적을 저녁 상차+익일 아침 하차로 작성해서 저장하면 목록/상세의
  일시가 저장 전과 다르게 나온다"는 신고로 발견. `DateTimePicker`가 다루는
  "YYYY-MM-DDTHH:mm"(오프셋 없음) 문자열을 그대로 Supabase에 저장하면,
  `timestamptz` 컬럼이 이를 UTC로 오인식해서 KST 기준 최대 9시간 밀리고
  자정을 넘는 조합에선 날짜까지 바뀌는 문제였음(반대로 불러올 때
  `.slice(0, 16)`로 그냥 자르던 곳들도 같은 이유로 틀린 값을 보여주고
  있었음). `lib/localDateTime.ts` 신규(`localInputToISOString()`/
  `toLocalDateTimeInput()`, 원칙 41번) — 견적 등록/수정(`admin/quotes`,
  `admin/quotes/[id]`, 공개문의·발주요청 프리필 포함), 운송오더 등록/수정
  (`admin/orders`, `admin/orders/[id]`, 견적 프리필 포함), 화주포털
  발주요청(`customer/request`), 완전공개 견적문의(`/quote`) 전체의 저장·
  불러오기 지점에 적용해 일괄 수정. 견적 상세 수정폼의 `DateTimePicker`
  2개에 빠져있던 `minDateTime`/`minDropoffDateTime`(원칙 6번, 상차는
  현재시각 이후·하차는 거리기반 최소간격 이후)도 이번에 함께 추가(견적
  등록 폼에는 이미 있었으나 수정 폼 신규 추가 시 누락되어 있었음)
- **혼적 할인 반영 시점 재조정(PR #49 실사용 피드백, 6차 세션)**: 바로 위
  4차 세션 항목에서 도입한 "배차 상세 '혼적 실행' 체크박스가 화주
  청구운임을 직접 갱신"하는 방식을, 실사용 피드백("정보망에 올릴 때
  혼적/비혼적 두 가지 가격을 따로 올리지 않는다")에 따라 다시 한번
  교체함 — **할인 반영 시점을 배차 단계에서 견적 단계로 앞당김**. 견적
  등록 화면(`admin/quotes/page.tsx`)의 운임 자동계산 로직(`calc` useMemo)이
  적재구분=혼적가능 + 화주동의 + 할인조건이 설정되면 `applyMixedDiscount()`를
  즉시 호출해 최종 견적금액에서 할인을 바로 차감하고, 가산내역 목록에도
  "혼적 할인(OO%)" 항목을 음수 금액으로 추가해 견적서(PDF)·상세화면
  어디서나 이미 할인된 금액이 보이도록 함(수동조정 스위치로 최종금액을
  직접 덮어쓰는 경우엔 그 값을 그대로 존중 — 자동계산 결과에만 적용).
  할인이 이미 견적 단계에서 최종금액에 녹아든 채로 오더 → 배차 청구운임까지
  그대로 승계되므로, 배차 상세의 "혼적 실행" 체크박스는 더 이상
  `customer_charge`를 건드리지 않고 **실제로 혼적 운행됐는지만 기록하는
  순수 플래그**로 되돌림(`applyMixedDiscount()`/`reverseMixedDiscount()`
  호출 코드 제거). 정산관리 목록·상세의 배지 문구도 "혼적할인 적용"/
  "혼적가능(미적용)"(가격에 영향을 준다는 오해를 살 수 있음)에서 "혼적
  실행됨"/"혼적 미실행"(순수 기록)으로 변경. 견적서 출력(PDF)의 "혼적
  조건부 할인: OO% (실제 혼적 시 적용)" 안내 문구도 제거 — 이제 조건부가
  아니라 이미 반영된 금액이라 가산내역의 "혼적 할인" 항목 자체가 안내
  역할을 함. (참고: 4차 세션 도입 당시 문서에 남아있던 "체크 시 할인 차감,
  해제 시 역산 복원" 설명은 이번 변경으로 더 이상 유효하지 않음 — 실제
  동작 기준은 이 항목이 최신임)
- **화주포털 하위메뉴 알림 배지(7차 세션)**: 대메뉴에는 배지가 뜨는데
  하위메뉴 중 정확히 어디에 새 내용이 있는지는 안 보이던 문제 — 관리자
  TopNav의 "하위메뉴별 알림 배지" 패턴(원칙 15번)을 화주포털
  `CustomerPortalShell.tsx`에도 그대로 적용. 사전 조사 결과 기존
  `notified` 상태가 이미 항목별로 분리는 되어 있었지만 (1) 발주요청은
  아예 추적 대상에 없었고 (2) 단순 boolean(Realtime 이벤트로만 켜짐 —
  탭을 껐다 켜면 신호가 사라짐)이라 "확인 안 하면 놓칠 수 있는 항목"이라는
  목표에 못 미쳤고 (3) 데스크탑 드롭다운 안에서는 항목별 표시가 아예
  없었음(모바일에만 있었음) — 이 세 가지를 전부 고쳐서 새로 구현:
  - `components/NavCountBadge.tsx` 신규 — 관리자 TopNav가 쓰던 숫자 배지를
    공용 컴포넌트로 분리해서 화주포털과 공유(원칙 15번 갱신 참고)
  - `lib/portalNotifications.ts` 신규 — "마지막 확인 시각"을 localStorage에
    저장해두고 그 이후 변경된 행 수를 세는 방식(`getLastSeen`/`markSeen`).
    공지사항 페이지가 이미 이 방식(안읽음 = `created_at` > 마지막 확인
    시각)을 쓰고 있어서 그 키(`wecarry_announcements_last_seen`)를 그대로
    export해서 재사용 — 새 키로 바꾸지 않아 기존에 저장된 값이 끊기지 않음.
    견적확인/배차·운송조회/정산·세금계산서는 각 테이블의 `updated_at`
    (원칙 25번 자동 갱신 트리거가 이미 붙어있는 컬럼)과 비교해서 카운트
  - 발주요청만 예외: 화주 본인이 직접 등록도 하는 테이블이라 시각 비교만
    쓰면 방금 등록한 대기중 건까지 안읽음으로 잡힘 — 대신 "대기중에서
    벗어났는데(승인/반려) 아직 확인 안 한 id" 집합을 localStorage에 기록
    하는 방식(`getAcknowledgedRequestIds`/`acknowledgeRequestIds`)으로 처리.
    새 DB 컬럼·마이그레이션 없이 기존 `status`/`company_id`만으로 구현됨
  - 대메뉴 배지는 하위 항목 배지의 합산(관리자 TopNav와 동일한
    `groupTotal` 계산)
  - 실시간 갱신: 기존 Realtime 채널(`customer_layout_notifications`)에
    `portal_order_requests` 테이블만 새로 추가 구독, 나머지는 그대로 재사용
    — 이벤트가 오면 boolean을 세우는 대신 카운트를 다시 계산(`loadCounts`)
  - 지금 보고 있는 화면의 배지는 렌더 시점에 0으로 눌러서 표시(현재 페이지에
    있는데 실시간 이벤트로 배지가 다시 뜨는 것 방지) — 페이지를 벗어나면
    다음 로드부터는 저장된 마지막 확인 시각/확인 id 기준으로 정확히 계산됨
  - DB 마이그레이션 없음(기존 컬럼·테이블만 사용)
- **배차정산정보 단순화 + 혼적가능 표시 개선(v2, 7차 세션)**: 실사용 리뷰로
  "부가세 포함/별도 토글이 계산에만 쓰이고 혼적 실행 여부를 기록할 실익이
  없다"는 피드백을 받아, 관련 UI·계산 로직·DB 컬럼을 전부 정리함(이전에
  전달됐던 "작업지시서_배차정산정보_단순화.md"를 이 v2가 완전히 대체).
  - **부가세 포함/별도 토글 완전 폐지**: 차주 기본운임·화주청구금액 입력은
    이제 항상 "부가세 별도"(입력값=공급가액)로 고정. `dispatches`/`invoices`의
    `driver_vat_included`/`customer_charge_vat_included` 컬럼 4개 전부
    삭제(사전확인 결과 기본값과 다른 값이 저장된 적 없음을 확인 후 진행,
    원칙 27번). `lib/settlementCalc.ts`의 `toSupplyAmount()` 변환 함수도
    함께 제거 — 입력값이 이제 항상 공급가액이라 변환 자체가 불필요해짐
  - **"혼적 실행" 체크박스 완전 삭제**: 차주에게 오더를 전달하는 시점에
    이미 "혼적가능 오더"라는 사실과 할인 반영된 가격을 함께 제시하므로,
    실제로 혼적됐는지 별도 기록할 실익이 없다는 판단. `dispatches.mixed_executed`
    컬럼도 삭제(사전확인 중 1건이 `true`로 저장되어 있었으나, 정책상 이
    값 자체가 무의미해졌으므로 백업 없이 컬럼과 함께 삭제하기로 사용자
    확인 후 진행). `applyMixedDiscount()`/`reverseMixedDiscount()`는 견적
    등록 화면의 자동계산에서 계속 쓰이므로(6차 세션 참고) 그대로 유지
  - **"혼적가능" 표시를 대신 눈에 띄게 개선**: `components/MixableBadge.tsx`
    신규(오렌지 톤 `#FFEDD5`/`#C2410C` — 앰버 `#FEF3C7`/`#B45309`는 이미
    "보류"/"배차중"/"지연" 등 상태 배지가 쓰고 있어 겹치지 않게 구분)를
    운송오더 목록/상세, 배차관리 목록/상세, 정산관리 목록/상세 전체에
    재사용. 목록은 오더번호/청구금액 셀 아래에 작게, 상세는 페이지
    상단 제목 옆에 크게 — 배차 상세의 "정산 정보" 섹션 안에는 중복
    표시하지 않음(상단에서 이미 확인 가능하므로)
  - **견적서(PDF) 출력**: 기존 "혼적 조건부 할인: OO% (실제 혼적 시 적용)"
    문구는 6차 세션에서 이미 제거된 상태였으므로, 이번엔 "🔀 혼적가능 화물
    (할인 반영된 운임입니다)"라는 단정적 안내 문구를 새로 추가(할인 전
    금액은 표시하지 않음 — 이미 확정된 최종금액 하나만 보여줌)
  - **정산관리**: 기존에 배차의 `mixed_executed`를 참조해 표시하던 "혼적
    실행됨"/"혼적 미실행" 배지를 완전히 없애고, 오더의 `loading_type`만
    보고 판단하는 "혼적가능" 배지로 교체(4-2와 동일 컴포넌트 재사용).
    부가세 포함/별도 캡션도 함께 제거
  - DB 마이그레이션(부가세 토글 4개 + `mixed_executed` 1개, 총 5개 컬럼
    삭제) 사용자 실행 확인 완료
  - **PR #53 실사용 리뷰 피드백으로 정산관리 캡션 일부 복원**: "정산관리
    목록에 부가세 포함/별도가 명시되어야 하고, 차주지급금액이 산재보험료
    차감된 금액이면 그것도 표시되면 좋겠다"는 요청 — 위에서 제거한 캡션을
    무조건 되살리는 대신, 이제 토글이 없어져 값의 성격이 고정되었다는
    점을 반영해 다시 설계함. 화주 청구금액은 계산 로직상 항상 공급가액
    (부가세 별도)이므로 조건 없이 "부가세 별도"를 고정 표시. 차주
    지급금액은 배차 상세 "차주 운임 상세 계산" 계산기를 거친 건(해당
    배차의 `driver_base_fare`가 not null)만 "부가세 포함"(계산기 결과는
    항상 부가세 포함으로 산출됨) + 산재보험료 적용대상이면 "· 산재보험료
    차감됨"을 추가로 표시하고, 계산기 없이 직접 입력한 값은 부가세·
    산재보험료 반영 여부를 시스템이 알 수 없으므로 캡션을 붙이지 않음.
    정산관리 목록은 order_id 기준으로 dispatches를 한 번에 조회해 맵으로
    연결(원칙 4번과 동일한 이유로 invoices와 dispatches가 직접 FK로
    안 묶여 있음), 상세는 단건 조회. DB 마이그레이션 없음(기존
    `driver_base_fare`/`industrial_insurance_applicable` 컬럼만 사용)
  - **PR #53 리뷰 2라운드 — 목록 레이아웃 정리**: (1) 운송오더 목록
    (`admin/orders`)이 여러 컬럼에서 줄바꿈으로 두 줄씩 차지해 스캔하기
    불편하다는 피드백 — 오더번호/고객/차량/배차상태/등록일 셀에
    `whiteSpace: nowrap` 적용해 한 줄로 고정. 구간 컬럼은 저장된 전체
    주소(`fullOrigin` 패턴, 도로명주소+상세주소) 대신 "시/도 시/군/구
    도로명"까지만 간략히 보여주는 `shortAddress()`(정규식으로 "로"/"길"로
    끝나는 첫 토큰까지만 추출, 매칭 안 되면 원본 그대로 폴백 — 지번주소
    등 100% 정확하진 않음) 신규 도입 + 출발지 1행/도착지 2행으로 분리하고
    컬럼 폭을 170px로 제한. 상차일도 월/일 1행·시:분 2행으로 분리. (2)
    정산관리 목록(`admin/invoices`)은 "혼적가능" 배지를 청구금액 셀에서
    오더번호 셀 아래로 이동(오더번호+배차/운송오더 목록과 배치 일관성
    맞춤), 헤더 라벨을 "청구금액"/"지급금액"에서 "화주 청구금액"/"차주
    지급금액"으로 명확화(상세 페이지는 이미 이 라벨을 쓰고 있어서 목록도
    맞춤). (3) 같은 정리를 배차관리 목록(`admin/dispatches`)에도 동일
    적용 — 오더번호/고객/배정/청구운임/지급운임/마진/마진율/배차상태 각
    셀 한 줄 고정, 구간 컬럼 간략표시+2행분리+폭제한. `shortAddress()`는
    운송오더와 배차관리 두 화면에서 같이 쓰이게 되어 `lib/shortAddress.ts`
    공용 파일로 추출(원래 `admin/orders/page.tsx`에 로컬 함수로 있던 것을
    이동)
- **화주포털 표시 개선 세션 A(10차 세션)**: 9차 세션(0단계 사전점검)에서
  정리된 로드맵과 별개로, "admin에는 이미 있는데 화주포털에는 없는 표시"
  6건을 보강한 세션. 전부 표시 추가 위주라 DB 변경은 없음(기존 컬럼만
  추가로 조회).
  - **혼적가능 배지**: 포털 견적확인(`customer/quotes`, `quotes.loading_type`
    기준)/배차·운송조회(`customer/dispatches`, 오더에 연결된
    `orders.loading_type` 기준)/정산확인(`customer/invoices`,
    `invoices.order_id`로 이미 조회 중인 `orders(...)` 임베드에
    `loading_type`만 추가) 3개 목록에 `MixableBadge` 재사용 — admin 목록과
    같은 패턴(식별번호 셀 아래)으로 배지 위치 통일
  - **부가세 포함가 병기**: 최종 견적금액은 3차 세션 이후 공급가액(부가세
    별도)으로 저장되므로, `×1.1` 반올림값을 별도 컬럼 저장 없이 매번 즉시
    계산해서 "부가세 포함 ₩OOO"로 보조 표시. 포털 견적확인(목록+상세)과
    admin 견적관리(`admin/quotes` 등록화면 계산 미리보기+목록,
    `admin/quotes/[id]` 상세) 총 4곳에 동일하게 적용
  - **배차·운송조회 품목 표시**: `orders.item`(견적과 동일한 품목 컬럼)을
    목록에 추가, 길면 말줄임 처리
  - **캘린더 클릭 시 상세정보 보강**: 날짜 클릭 시 뜨는 팝업이 오더번호·
    구간·시간·상태만 보여주던 것을, 품목·차량형태·금액(연결된 견적의
    `final_amount`, `orders.quote_id` → `quotes(final_amount)` 임베드로
    추가 쿼리 없이 조회)·혼적가능 배지까지 보이도록 보강
  - **정산확인 부가세 별도/포함 병기**: admin 정산관리(PR #53)의 "화주
    청구금액은 항상 부가세 별도 고정 표시" 로직과 동일하게, 포털 청구금액
    아래에도 "부가세 별도 (포함 ₩OOO)" 캡션 추가. 차주 지급금액 쪽 정보는
    애초에 화주포털에 노출하지 않으므로 이 항목과 무관
  - **CLAUDE.md 원칙 42번 신규**: 위 5건이 전부 "admin에는 있는데 포털에는
    없던" 사례였던 걸 계기로, "admin↔화주포털 데이터 동기화 확인" 습관을
    새 원칙으로 명문화(자세한 내용은 원칙 42번 참고)
  - **정산방식(settlement_type) 배지 추가(사용자 확인 후 범위에 포함)**:
    원칙 42번 점검 중 발견한 후보(admin 오더·배차·정산관리에는 정산방식
    배지/필터가 이미 있는데 포털엔 없음)를 사용자에게 보고 후 "이번 PR에
    바로 추가"로 확인받아 반영. 화주포털 배차·운송조회(`orders`에서
    조회, `settlement_type`은 오더 값을 그대로 씀 — 배차 자체 컬럼은
    안 씀)와 정산확인(`invoices.settlement_type` 직접 조회) 목록에
    "정산방식" 컬럼 추가, admin 정산관리 목록의 `SettlementBadgeLabel`
    (`lib/constants.ts`의 `getSettlementTypeLabel()` + "/" 위치에서
    줄바꿈하는 헬퍼)과 동일한 방식으로 각 파일에 로컬 재구현. 견적확인은
    이번 범위에 포함하지 않음(사용자 확인 범위가 "배차조회·정산확인"
    이었음)
  - **범위에서 제외**: 검색·정렬 개선(작업지시서 6번 항목)은 별도 세션
    B로 분리, 이번 세션에서 다루지 않음
- **화주포털 세션 B: 목록 검색·정렬 기능(11차 세션)**: 세션 A에서 분리해둔
  6번 항목. 사전확인 결과 부가메뉴 8종 중 실제로 검색·정렬이 의미 있는
  화면은 견적확인/배차·운송조회/정산확인/공지사항 4개로 확정(캘린더·
  담당자정보·월별통계는 작업지시서 판단대로 제외). 배송지는 작업지시서
  예상과 실제 구조가 달라서(별도 "배송지명" 필드 없이 주소 하나뿐이고
  이미 상차지/하차지로 그룹핑 표시 중, `created_at`도 화면에서 미조회)
  주소 텍스트 검색만 추가하고 정렬은 넣지 않음. admin 쪽을 확인해보니
  검색은 여러 화면(화주관리/견적관리/차주관리 등)이 각자 로컬로 구현
  중이었고, 컬럼 헤더 클릭 정렬은 admin 어디에도 구현된 곳이 없어(전부
  최신순 고정) 재사용할 기존 패턴 자체가 없었음 — 이번에 신규로
  `lib/useListSearchSort.ts` 공용 훅(원칙 43번)을 만들어 5개 화면(위 4개
  + 배송지)에 적용. 페이지네이션은 admin도 아직 없는 별도 로드맵 항목이라
  범위에 넣지 않고, 지금처럼 이미 불러온 배열(각 화면 `limit(100)` 등
  기존 제한 그대로) 안에서 프론트 검색·정렬만 적용. 데스크탑은 `<table>`
  컬럼 헤더 클릭 정렬(정렬 중인 컬럼에 ▲/▼ 표시), 카드형 화면(견적확인)과
  모바일 카드 뷰는 정렬기준 선택 드롭다운으로 대체(원칙 13번과 같은
  이유로 모바일에서 헤더클릭 UX가 안 맞음). 검색·정렬 대상: 견적확인
  (견적번호/구간/품목 검색, 견적일·금액 정렬) / 배차·운송조회(오더번호/
  구간/품목/배차상태 검색, 상차예정일·배차상태 정렬 — 차량번호는
  화주포털에 애초에 노출 안 되는 정보라 검색 대상에서 제외) / 정산확인
  (오더번호/정산월/상태 검색, 정산월·청구금액 정렬) / 공지사항(제목
  검색만, 정렬은 기존 최신순 유지) / 배송지(주소 검색만). 검색·정렬
  상태는 화면 이탈 시 초기화(URL 파라미터 유지 안 함, 과도한 설계 방지).
  DB 마이그레이션 없음(전부 클라이언트단 필터링·정렬)
  - **PR #58 리뷰 피드백 반영**: (1) admin에 이미 있던 기간필터(오늘/이번주/
    이번달/전체, `components/DateRangeFilter.tsx`+`getDateRange()`)를
    견적확인/배차·운송조회/정산확인 3개 화면에 재사용 추가 — admin은
    Supabase 쿼리에 `.gte()` 조건을 걸어 서버단에서 다시 조회하는 방식이지만,
    포털은 이미 `limit(100)`으로 불러온 배열을 검색·정렬과 동일하게
    클라이언트단에서 `created_at` 기준으로 한 번 더 필터링하는 방식으로
    구현(추가 쿼리 없음). (2) 정산확인 목록에 상태·정산방식 정렬 옵션 추가
    (정산방식은 `getSettlementTypeLabel()` 라벨 기준으로 정렬). (3) 세션 B
    작업지시서 범위 밖이었던 화주포털 발주요청(`customer/request`) "내 요청
    내역"에도 동일한 검색·정렬·기간필터를 신규 적용(`lib/useListSearchSort.ts`
    재사용) — 검색은 구간/차량/상태, 정렬은 상차예정일·상태
- **정산 마감·확정·잠금(로드맵 ①, 12차 세션)**: 9차 세션(0단계 사전점검)에서
  확인된 "정산관리 저장 경로에 서버단 권한 체크가 전혀 없다"는 문제(원칙
  25번 위반 상태)를 해소하면서 정산확정 기능을 도입. v2 설계안 원안의
  8단계/보류플래그 세분화 구상은 이번엔 적용하지 않고(과도한 설계 방지),
  실제 확인된 5개 상태값에 2개만 추가하는 최소 확장으로 진행.
  - **DB**: `invoices.status` CHECK 제약조건에 `차주지급완료`/`정산확정`
    2개 값 추가(기존 5개 → 7개), `locked boolean default false`/
    `confirmed_at timestamptz`/`confirmed_by uuid references
    staff_accounts(id)` 컬럼 신규, `invoice_amendment_logs`(확정 후
    예외수정 이력: invoice_id/staff_id/before_json/after_json/reason)
    테이블 신규. 사전확인 결과 이 컬럼들이 정말 없었음을 라이브 SQL로
    재확인 후 진행(9차 세션 당시엔 "0행 확인"이라고 코드 근거로만 추정
    했었는데, 이번에 실제 조회로 다시 확인함)
  - **API**: `app/api/admin/invoices/confirm/route.ts`(신규) — 관리자
    전용, `status='정산확정'`+`locked=true`+`confirmed_at`/`confirmed_by`
    갱신. `app/api/admin/invoices/save/route.ts`(신규) — 정산관리 상세의
    메인 저장(상태/세금계산서/입금/차주지급)을 anon 클라이언트 직접
    `update()`에서 이 서버 API로 이전. **핵심은 저장 직전 서버가
    `locked` 값을 매번 fresh 조회**한다는 것(클라이언트가 들고 있는
    값은 안 믿음, 원칙 44번 신규) — 잠긴 건이면 관리자만, 그것도 사유
    입력 후에만 저장 가능하고 `invoice_amendment_logs`에 수정 전/후
    스냅샷 기록. 잠기지 않은 일반 건은 기존과 동일한 낙관적 잠금
    (`updated_at` 일치 확인) 로직을 서버 쪽으로 그대로 옮겨서 유지.
    수정 가능 필드는 화이트리스트로 제한해서 `locked`/`confirmed_*`
    같은 필드는 이 API로 못 바꾸게 막음(확정 자체는 반드시 별도 API로만)
  - **화면**: `components/LockedBadge.tsx`(🔒 정산확정, 목록+상세 재사용) 신규,
    정산관리 상세에 "정산확정" 버튼(관리자 전용, 이미 확정된 건엔 안 보임,
    클릭 시 확인 다이얼로그 — 청구완료·입금완료·차주지급완료 상태인지
    확인해달라는 리마인더 안내만 하고 강제 검증은 아님) 추가. 확정된
    건은 상태 드롭다운/세금계산서·입금·차주지급 체크박스+날짜/정산방식
    변경 버튼 전부 비활성화(관리자만 예외, `components/
    AmendmentReasonModal.tsx` 신규 — 원칙 39번과 같은 "즉시저장+사유모달
    분리" 패턴). 정산관리 목록에도 잠금 배지 표시, 상태 필터는
    `INVOICE_STATUS_OPTIONS` 배열에 값만 추가하면 자동으로 반영되는
    기존 구조라 별도 수정 불필요
  - **범위 밖으로 명시적으로 남긴 것**: 정산방식 변경(`handleSettlementTypeChange`)
    저장 경로는 이번에 서버 API로 옮기지 않음(화면단에서 잠긴 건이면
    버튼 자체를 비활성화하는 것으로 최소 대응, 서버단 잠금 체크는 아직
    없음 — 우회 가능성이 남아있는 잔여 위험으로 기록). 로드맵 ②
    (정산방식별 수금·지급 구조 세분화)는 지시대로 다음 세션으로 분리,
    이번에 같이 만들지 않음. "검토중"/"청구예정" 같은 세분화된 중간상태나
    "보류" 전용 플래그도 만들지 않음(기존 "지연" 상태를 그대로 재사용)
  - **PR #61 실사용 테스트 버그 수정**: 화주 입금완료+차주 지급완료가 둘 다
    체크되면 상태를 자동으로 "입금완료"로 맞추는 기존 useEffect가 확정
    (잠금)된 건에도 그대로 동작해서, 정산확정 후 상세를 다시 열면 화면상
    상태가 즉시 "입금완료"로 덮어써져 보이는 버그 발견(DB 값 자체는 저장
    전까지 "정산확정"으로 유지되고 있었음 — 표시만 그런 것). 이 자동
    동기화 로직이 `invoice.locked`인 건은 건드리지 않도록 수정
- **정산방식 구조 도입(로드맵 ②-A, 13차 세션)**: 기존 `settlement_type`(단일
  5개 값 enum)을 수금방식(`collection_method`: `broker`/`driver_direct`)과
  청구주기(`billing_cycle`: `per_order`/`monthly`) 두 축으로 이원화, 선불/
  착불은 "선착불" 하나로 통합 표시하되 내부적으로만
  `direct_collection_point`(`pickup`/`dropoff`/`undecided`)로 구분,
  외부 정보망 내부 정산방식(`network_settlement_type`)은 화주포털에 노출
  안 되는 내부 운영 전용 축으로 분리. DB 마이그레이션은 사용자가 사전에
  Supabase SQL Editor에서 직접 실행 완료, 이 세션은 그 이후 화면 반영
  단계만 진행.
  - `lib/settlementLabels.ts` 신규 — 라벨 함수 + 신규→구형 단방향 호환
    매핑 `mapToLegacySettlementType()`(원칙 45번 신규 — 표현 가능한 조합만
    구형 `settlement_type`에 같이 써주고, 표현 불가능한 조합은 구형 값을
    손대지 않고 그대로 둠. 구형 값에서 신규 필드로의 역방향 동기화는
    절대 만들지 않음)
  - `settlement_field_change_logs` 전용 서버 API + 클라이언트 헬퍼(INSERT/
    SELECT 전부 서비스 롤 서버 API로만 처리), `components/
    CollectionMethodInput.tsx`/`SettlementFieldsChangeModal.tsx` 신규
    (기존 `SettlementTypeChangeModal` 패턴을 신규 필드 3종 기준으로 대체)
  - 견적(등록+상세수정) → 운송오더(등록+상세) → 배차(등록+상세) → 정산관리
    (목록+상세) 전체에 신규 필드 입력·표시·승계 반영, 배차확정 시점 검증
    (선착불인데 지급조건 미정이면 확정 차단), `network_settlement_type`/
    선착불 금액(차주직접수금액·주선수수료·지급자, 면제 시 0 고정) 입력 섹션
  - 정산관리 상세: `collection_method`로 자동상태동기화·정산확정 조건·저장
    화면 분기(주선사 정산은 기존 화주입금+차주지급 흐름 유지, 선착불은
    주선수수료 입금 단일 흐름), 정산방식 변경 저장 경로를
    `app/api/admin/invoices/save`로 통합해 원칙 44번(정산확정 잠금검증)
    패턴 재사용
  - 화주포털: `lib/portalInvoiceFields.ts` 화이트리스트 신규(주선수수료
    금액/지급자·정보망 관련 필드는 애초에 조회하지 않음), 배차조회·
    정산확인 라벨을 전부 공용 함수로 교체
  - 부수 수정: 배차 목록화면(`admin/dispatches/page.tsx`)의 정산 자동생성
    경로에서 `settlement_type`이 누락되던 기존 버그도 함께 수정
  - 로드맵 ②-B(화주 월정산 묶음)는 지시대로 이번 PR 범위에 포함하지 않음
  - **PR #63 실사용 리뷰 피드백(2라운드) 반영 후 merge**:
    1. **"수수료(마진)" 계산 기준 통일**: 정산관리 상세의 "수수료(마진)"이
       화주 청구금액(`customer_charge_total`, 항상 공급가액·부가세 별도)과
       차주 지급금액(`driver_payout_total`, 계산기를 거친 경우 부가세 포함·
       산재보험료 차감된 최종금액)을 기준 없이 그냥 뺀 값이라, 실제보다
       항상 부가세 10%만큼 과소계산되던 구조적 버그였음 — 청구금액을
       `lib/vat.ts`의 `calcInclusiveAmount()`로 부가세 포함가 환산한 뒤
       차감하도록 통일(정산관리 수동 등록, 배차완료 시 자동 정산등록
       상세/목록 양쪽 경로 총 3곳 + 배차 상세 "단순마진(참고)" 표시).
       이미 저장된 과거 정산 건의 `commission_total` 값은 소급
       재계산되지 않음(필요 시 별도 SQL 요청 필요)
    2. **정산관리 목록 레이아웃**: "부가세 포함 · 산재보험료 차감됨"/
       "선착불(차주 직접수금)" 같은 설명 문구가 `white-space: nowrap`으로
       강제 한 줄 처리되면서 그 셀들이 계속 넓어져 오더번호·화주 컬럼이
       눌리던 문제 — 캡션들을 명시적 2줄 구성으로 고정(리뷰 1차). 이후
       "산재보험료 차감됨"→"산재보험료 차감"으로 축약해 캡션이 애매하게
       한 줄 더 늘어나는 것도 방지하고, 화주 컬럼에 최소폭(108px)+한 줄
       고정을 줘서 "(주)디자인에그" 정도 길이의 회사명이 한 줄에 들어오게
       조정(리뷰 2차)
  - **PR #63 merge 후 후속 보강 — `total_freight_amount` 목록 노출 누락**:
    사용자가 사전조사 5개 결정사항을 다시 확인하는 과정에서, 결정사항
    1번(`total_freight_amount` 컬럼 — `customer_charge_total`이 WeCarry
    실수금액만 의미해서 선착불 건의 전체운송료 정보가 사라지던 문제
    해결용)의 실제 반영 여부를 요청받아 코드 전 구간(DB→배차 등록/상세
    입력→정산 자동/수동 등록→정산 상세 표시)을 재검증함 — 전부 정상
    반영돼 있었으나 **정산관리 목록**의 `.select()`와 화면 렌더링에만
    빠져있던 것을 발견. 목록의 "선착불(차주 직접수금)" 셀 아래에 전체
    운송료 금액 캡션을 추가. 사용자가 이번 건과 앞선 CLAUDE.md 갱신 커밋
    둘 다 PR 없이 `main`에 직접 fast-forward merge하도록 명시적으로
    지시해서 그대로 진행함(둘 다 순수 표시 추가/문서 변경이라 저위험
    판단, 원칙 8번의 "중요 변경은 PR 검토 권장" 원칙의 예외 사례로 기록)
- **화주 월정산 묶음 청구 도입(로드맵 ②-B, 14차 세션)**: `collection_method=
  'broker'` + `billing_cycle='monthly'`(주선사 정산·월정산) 건을 화주+기간
  (월 단위) 단위로 묶어서 한 번에 청구·확정하는 기능. `driver_direct`+
  `monthly` 전용 묶음, 화주포털 노출 확장은 지시대로 이번 범위에 포함하지
  않음(차주 지급은 기존처럼 건별로 계속 진행). DB(`customer_billing_batches`/
  `customer_billing_batch_items` 테이블, `invoices.customer_side_locked`
  컬럼, SECURITY DEFINER 함수 11개, RLS 정책)는 사용자가 사전에 Supabase
  SQL Editor에서 직접 실행 완료, 이 세션은 그 이후 화면+서버 API 단계.
  - `app/api/admin/billing-batches/*` 서버 API 11개(전부 `getCurrentStaff()`
    인증 확인 후 service_role로 DB 함수 RPC 호출, 클라이언트 직접 RPC
    호출 금지) + `components/MonthlyBillingBatchPanel.tsx`(정산관리
    "월정산 묶음" 탭 신규 — 화주+기간 선택 → 후보 조회/항목 추가·제거
    (draft) → 확정 전 미리보기 → 확정(관리자) → 세금계산서 발행/입금완료
    처리 → 해제(관리자, 사유 필수)) + `lib/billingBatchReasons.ts`(DB
    함수 reason 코드 → 한국어 안내문 매핑)
  - `app/admin/invoices/[id]/page.tsx`: `customer_side_locked=true`인
    건은 정산상태/정산방식/세금계산서/화주입금 필드를 비활성화하고
    월정산 묶음 화면으로 안내(차주지급 필드는 계속 활성화). `app/admin/
    invoices/page.tsx`: `?tab=monthly&company=&month=` 쿼리로 묶음
    탭에 딥링크 가능(원칙 38번에 따라 `Suspense`로 감쌈)
  - 사전조사 중 발견한 부수 이슈: `invoices.payment_received`를 개별
    건 단위로 직접 읽어 통계를 내는 화면 3곳(화주포털 홈 "미입금 건수",
    화주포털 월별통계, `admin/invoices`의 `companies.outstanding_amount`/
    `total_revenue` 자동 재계산)이 묶음 처리된 건을 계속 "미입금"으로
    잘못 카운트하는 문제 — 화면 3곳을 각각 고치는 대신 묶음 "입금완료
    처리" DB 함수(`mark_billing_batch_payment_received`) 안에서 대상
    invoice들의 `payment_received`/`status`와 `companies.outstanding_amount`를
    함께 동기화(원칙 45번과 동일한 단방향 동기화 패턴)해 기존 화면
    수정 없이 정확성 유지
  - **PR #64 실사용 리뷰 라운드(merge 전 다수)**: (1) 화주 선택이 전체
    `<select>` 스크롤이라 불편하다는 피드백 — `admin/orders`(운송오더
    등록)에서 쓰던 이름검색 방식(250ms 디바운스 이름 포함검색, 결과
    클릭선택)으로 교체 + "묶음 후보가 되는 조건 보기" 접이식 안내 추가.
    (2) 묶음 해제 후 같은 화주·기간으로 재묶음이 안 되던 버그 — 화면
    (`loadBatchFor`)이 해제(cancelled)된 묶음도 "현재 묶음"으로 취급해
    후보 조회 자체를 건너뛰던 문제, draft/confirmed만 "진행 중"으로
    취급하고 cancelled는 참고용으로 보여주며 후보를 같이 조회하도록
    수정. (3) 삭제 기능 확장 — draft는 누구나, cancelled는 관리자만
    삭제 가능(DB 함수 `delete_billing_batch`가 상태별 판단), "최근
    묶음" 목록에도 행별 삭제 버튼 추가. (4) "최근 묶음 30건" 제한에
    도달하면 "화주·정산월을 직접 선택해서 확인해달라"는 안내 문구
    추가(admin 전체에 페이지네이션이 없는 별도 로드맵 항목이라 목록
    자체는 확장하지 않음). (5) 화주를 하나씩 찾지 않아도 조건에 맞는
    후보 전체가 한눈에 보이는 "전체 묶음 후보" 표 추가(선택 시 그
    화주·정산월로 바로 이동) + 확정된 묶음에 새로 정산등록된 건이
    생기면 같은 화주·정산월로 "보충 묶음"을 추가로 만들 수 있는 기능
    (확정된 묶음 자체는 draft 때만 항목 추가 가능하다는 원래 설계를
    유지하되, DB에는 "같은 화주·기간에 draft는 1개만"이라는 제약만
    있고 "확정 묶음이 있으면 새 draft 금지" 제약은 없어서 화면만
    추가). (6) **화주별 정산 마감일(cutoff day) 지원** — "정산일이
    화주마다 다를 수 있다"는 피드백에 3개 대안(현행유지/화주별 마감일
    자동계산/기간 직접입력) 중 화주별 마감일 자동계산으로 확정 —
    `companies.billing_cutoff_day`(1~28일, 미설정 시 기존처럼 달력월)/
    `invoices.settlement_reference_date`(정산 기준일, 이 건이 어느
    마감주기에 속하는지 판단하는 실제 날짜 — 기존 `billing_period`
    자유텍스트로는 "7/16~8/15" 같은 화주별 임의 주기를 표현 못 해서
    후보 판정 기준을 이 컬럼으로 교체) 신규, "묶음 기간은 반드시
    달력월"이라는 기존 CHECK 제약을 제거하고 검증 로직을 `create_
    billing_batch` 함수 내부로 이전(화주별 마감일 조회가 필요해
    CHECK로는 불가능), `add_item_to_billing_batch` 매칭 로직도 함께
    교체(별도 SQL로 전달). (7) 확정건을 "최근 묶음" 목록에서 클릭해도
    상세가 안 뜨던 버그(1차) — `period_start`(마감일 있는 화주는 전월에
    걸쳐있음) 기준으로 월을 구해서 다른 주기로 계산되던 문제,
    `period_end` 기준으로 구하도록 수정. (8) 화주 상세의 "결제조건"
    (`payment_terms`, 이번 PR과 무관한 기존 자유텍스트 메모 필드)을
    드롭다운으로 바꿔달라는 요청 — 옵션 목록·기존 값 처리 방침 확인
    질문만 남기고 이번 PR 범위에서는 보류(사용자가 명시적으로 다시
    요청하지 않음)
  - **PR 재검증(merge 요청 직전) 중 발견한 버그 2건 추가 수정**: (9)
    draft 상태의 "포함된 정산 건" 표는 오더번호가 plain text라 상세로
    진입이 안 됐음(confirmed 상태 표만 링크가 있었음) — draft 표도
    동일하게 `Link`로 교체. (10) 화주의 정산 마감일 설정을 묶음 생성
    "이후"에 바꾸면 그 화주의 기존 묶음을 다시 못 찾는 버그(원칙 46번
    신규 참고) — 조회 조건을 "현재 마감일로 역산한 기간과 정확히 일치"
    대신 "`period_end`가 그 정산월의 달력월 범위 안에 있는지"로 변경,
    찾은 묶음은 저장된 고유 기간을 그대로 쓰고 새 묶음 생성용 기간
    계산에만 현재 마감일 설정을 사용
  - **관리자 전용 완전삭제 기능 추가**: "확정+입금완료 처리된 묶음도
    테스트 기록 정리를 위해 삭제할 수 있어야 한다"는 요청 — 기존
    "묶음 해제"(세금계산서 발행/입금 처리가 시작되면 막히는 안전장치)는
    그대로 유지하고, 그 제약과 무관하게 쓸 수 있는 별도의 관리자 전용
    "완전삭제(테스트 정리용)" 경로(`force_delete_billing_batch` DB
    함수 신규, 사유 입력 필수)를 추가 — 삭제 시 담긴 정산 건들은 개별
    정산(정산대기, 세금계산서·입금 상태 초기화)으로 되돌아가고 화주
    미수금도 재계산됨. 확정 화면 버튼 + "최근 묶음" 목록 삭제 버튼
    양쪽에서 사용 가능
  - 로드맵 ②-B 중 "화주 월정산 묶음"(broker+monthly) 부분은 이 세션에서
    완료·merge됨. `driver_direct`+`monthly` 전용 묶음, 화주포털에
    월정산 묶음 노출 등은 여전히 범위 밖(추후 로드맵)
- **월정산 묶음 "후보 자격조건" 단일 함수 통합(로드맵 ②-B 후속, 15차 세션)**:
  PR #64 merge 후 사용자가 "`customer_billing_batch_candidates` 뷰와
  `add_item_to_billing_batch`/`validate_billing_batch`/`confirm_billing_batch`
  3개 함수가 정말 이 뷰를 재사용하는지, 아니면 조건을 각자 따로 넣어서
  나중에 어긋날 위험이 있는지"를 재확인 요청 — 코드 조사 결과 뷰는 화면
  조회 전용이고 4곳(뷰+함수 3개) 모두 같은 자격조건을 각자 인라인으로
  다시 적어둔 구조였음(로직 자체는 이번 v3 마감일 변경까지는 일관되게
  맞아있었지만, 구조적으로는 한 곳만 고치면 나머지가 어긋날 수 있는
  상태). 이를 해소하기 위해 순수 DB 리팩터링 진행(앱 코드 변경 없음,
  API 반환값·reason 코드 전부 기존과 동일하게 유지).
  - `is_billing_batch_candidate(p_invoice invoices) returns boolean` 신규
    (SQL/IMMUTABLE) — 특정 묶음·기간과 무관하게 정산 건 1건 자체가
    갖춰야 하는 기본 자격(수금방식=broker·청구주기=monthly·상태=정산대기·
    화주측잠금 없음·정산잠금 없음·청구금액 확정·화주 존재)만 담음.
    "이미 다른 묶음에 담겨있는지"는 일부러 여기 안 넣음 —
    validate/confirm이 재검증하는 항목은 정의상 "지금 이 묶음에 이미
    담긴" 항목이라 그 조건을 넣으면 매번 자기 자신 때문에 부적격
    판정되는 버그가 생기기 때문(뷰와 `add_item_to_billing_batch`에서만
    의미가 있어 그 두 곳에서는 계속 별도로 유지)
  - `customer_billing_batch_candidates` 뷰: WHERE 조건을
    `is_billing_batch_candidate(i)`(+ 기존처럼 별도의 "다른 묶음에 이미
    담겼는지" NOT EXISTS)로 교체 — 컬럼 목록·순서는 그대로 유지
  - `validate_billing_batch`/`confirm_billing_batch`: 두 함수에 토씨
    하나 안 틀리고 복붙되어 있던 `ineligible_items` 재검증 OR-조건
    블록을 `is_billing_batch_candidate(i)` 호출로 교체 — 두 함수 모두
    원래도 개별 사유가 아니라 `'ineligible_items'`라는 단일 사유로
    묶어서 반환하고 있었기 때문에 이 치환은 반환값이 100% 동일한 순수
    리팩터링(동작 변화 없음)
  - `add_item_to_billing_batch`: 이 함수는 조건별로 서로 다른 사유
    코드(`not_monthly_broker`/`invoice_status_not_eligible`/
    `already_customer_side_locked`/`invoice_locked`/`amount_not_finalized`
    등)를 반환해서 화면에 각각 다른 안내 문구를 보여주는데,
    `is_billing_batch_candidate`는 단일 boolean이라 "어떤 조건이
    위반됐는지"까지는 알려줄 수 없음 — 그래서 **개별 사유 체크는 전부
    그대로 남겨 반환값을 100% 보존**하고, 그 마지막에
    `is_billing_batch_candidate(v_invoice)` 최종 안전장치만 추가.
    정상 흐름에서는 위 개별 체크가 이미 다 걸러내므로 평소엔 이 게이트가
    작동할 일이 없지만, 나중에 누군가 `is_billing_batch_candidate`의
    조건만 고치고 이 함수의 개별 체크는 안 고치는 실수를 하더라도 여기서
    확실히 막아줌(반환 사유는 기존에 이미 있던 `invoice_no_longer_eligible`
    재사용 — `refresh_item_snapshot`이 쓰던 것과 같은 문구라
    `lib/billingBatchReasons.ts` 수정도 필요 없었음)
  - 순수 DB 함수/뷰 리팩터링이라 프론트엔드·API 라우트 코드는 전혀
    안 건드림(반환값·reason 코드가 기존과 완전히 동일하므로 화면 쪽
    회귀 위험 없음) — `npx tsc --noEmit` 통과, `npm run build` 41페이지
    프리렌더 실패(기존 베이스라인과 동일, 신규 실패 없음)로 회귀 없음
    확인. DB 함수 자체를 검증하는 자동화 테스트는 이 저장소에 없어서
    (`package.json`에 test 스크립트 없음), 위 조건 동치성은 코드 대조로
    직접 검증함. DB 변경은 사용자가 Supabase SQL Editor에서 직접 실행
- **화주포털 로그인 아이디 체계 변경(21차 세션)**: 화주포털 로그인을 이메일에서
  시스템 발급 고유 아이디(`we`+발급일(YYMMDD, KST)+2자리 순번)로 전환. 기존
  화주 포털 계정이 이미 전부 삭제된 상태(`customer_accounts` 0건, 라이브 SQL
  재확인)라 이관 없이 신규 발급분부터만 적용. 인증 시스템은 그대로 Supabase
  Auth 유지, 화면은 "아이디"를 받되 내부적으로 `{아이디}@wecarry-portal.internal`
  합성 이메일로 Auth에 등록(`lib/portalAccountCredentials.ts`). **사전조사에서
  드러난 사실 — "비밀번호 재설정" 버튼(`reset-portal-password`)이 이미 있었음**:
  이번 작업은 신규 기능이 아니라 그 기존 버튼/API를 admin 전용 권한 체크(원칙
  25번 패턴, 화면단+서버단 이중)+6자리 숫자 임시비번으로 확장한 것. 임시비번은
  최초 "4자리"로 논의됐으나 Supabase Auth 전역 최소길이 정책(직원 계정과 공유)과
  충돌할 위험이 있어 "6자리 랜덤 숫자"로 확정(정책 자체는 안 건드림).
  `randomPassword()` 중복 3곳(`create-portal-account`/`approve-application`/
  `reset-portal-password`)을 `lib/portalAccountCredentials.ts`의
  `generateTempPassword()`/`issuePortalAccount()`/`reissueTempPassword()`로
  통합(`staff_accounts`용 4번째 사본은 별개 도메인이라 안 건드림). 아이디
  순번은 "먼저 조회해서 없으면 insert" 원칙대로 `login_id` UNIQUE + insert
  23505 캐치 후 재시도로 동시발급 충돌 처리. `/apply` 승인 모달의 "포털 계정
  로그인용 이메일" 수동입력 필드는 완전히 제거(신청서의 `contact_email`을
  "연락처 이메일"(선택)로 자동 승계, 관리자 입력 불필요 — 없으면 "메일 발송"
  버튼 자체를 숨김). 화주 상세화면 계정발급 폼도 이메일을 "연락처 이메일
  (선택)"로 전환, 계정 목록도 아이디를 기본 표시로 변경. 로그인 화면은
  라벨 "이메일"→"아이디"(`type="text"`, `autoComplete="username"`), "아이디
  저장" 체크박스 신규(아이디만 `localStorage` 저장, 비밀번호는 절대 저장
  안 함 — 기존에 이런 패턴 자체가 없어 신규 구현), "비밀번호를 잊으셨나요?
  위캐리로 문의해주세요" 안내 문구 신규. 이 안내 문구 + 랜딩페이지·
  `CustomerPortalShell.tsx`에 이미 하드코딩돼 있던 "고객센터 1588-0000"을
  `lib/contactInfo.ts`(`COMPANY_SUPPORT_PHONE`/`COMPANY_SUPPORT_HOURS`)로
  공용 상수화(세 곳이 값 하나 참조) — **1588-0000은 자리표시자이며 실제
  번호 미확정, 지금은 그대로 쓰고 나중에 이 상수만 바꾸면 세 곳 동시 갱신**.
  미실행 상태(`RESEND_API_KEY` 없음)인 `send-portal-credentials-email`도
  나중에 Resend 활성화 시 잘못된 문구가 나가지 않도록 "이메일: {합성이메일}"→
  "아이디: {login_id}"로 선제 수정. `npx tsc --noEmit`/`npm run build` 확인
  완료. DB 마이그레이션(`customer_accounts.login_id` UNIQUE NOT NULL 추가,
  `email` NOT NULL 해제)은 사용자가 Supabase SQL Editor에서 직접 실행할 것 —
  잔존 행 0건 확인됨(백필 불필요). **PR #70 실사용 리뷰 라운드**: (1) 화주
  상세화면 계정발급 폼의 "연락처 이메일(선택)" 입력을 "담당자 전화번호
  (선택)"로 교체 — `issuePortalAccount()`가 이미 지원하던 `contact_mobile`
  파라미터를 실제로 폼·API에 연결(DB 변경 없음), 계정 목록도 전화번호가
  있으면 전화번호를 우선 표시하고 없으면(과거 이메일로 발급된 계정)
  이메일로 폴백. (2) 로그인 화면의 "비밀번호를 잊으셨나요? 위캐리로
  문의해주세요(1588-0000)" 안내를 `<br />`로 2줄 고정. (3) 내부시스템
  (관리자) 로그인 화면(`app/admin/login/page.tsx`)에도 화주포털과 동일한
  방식(이메일만 localStorage 저장)으로 "이메일 저장" 체크박스 신규 추가.
  (4) `/apply` 폼의 "업종(선택)" placeholder 예시가 입력창 폭에 잘려
  뒷부분이 안 보이던 문제 — placeholder는 짧게 줄이고 전체 예시는 입력창
  아래 캡션 텍스트로 이동. "이용 차량(선택)"은 "주 이용 차량(선택)"으로
  라벨 변경 + "!" 아이콘 신규 — 네이티브 `title` 속성은 브라우저 기본
  호버 지연(약 1초) 때문에 늦게 뜬다는 피드백으로, `onMouseEnter`/
  `onMouseLeave` 기반 즉시표시 커스텀 툴팁으로 교체. (5) 화주등록신청
  승인완료 화면(`ApplicationDetailModal.tsx`)에서 아이디·임시비밀번호
  드래그 선택 시 브라우저/확장프로그램이 불필요한 선택 팝업을 띄운다는
  신고 — 팝업 자체는 저희 코드 밖의 요소라 없앨 수 없어서, 값 텍스트에
  `user-select: none`을 걸어 드래그 선택 자체를 막고 화주 상세화면과
  동일한 "복사" 버튼(클립보드 API)을 추가. **임시 비밀번호를 최초 변경
  전까지 계속 표시해달라는 요청은, DB 평문 저장이 필요하고
  `customer_accounts`가 anon 전체허용 RLS 구조라 브라우저 anon key만으로
  모든 미로그인 화주의 임시비밀번호를 열람할 수 있는 보안 구멍이 생길 수
  있다는 트레이드오프를 설명한 뒤, 사용자가 "지금 이대로 유지"(필요하면
  "비밀번호 재발급" 버튼으로 즉시 재발급)로 확정 — 구현하지 않음.**
  `/apply` 폼의 "담당자 이메일 *" 필수 조건을 선택 입력으로 풀지 여부는
  리뷰 중 물어봤으나 아직 답변을 못 받아 이번 PR 범위에서는 그대로 둠
  (다음 세션에서 확인 필요)
- **운영 대시보드 도입(로드맵⑥, 19차 세션 — 로드맵 전체 완료)**: `/admin/dashboard`
  신규(관리자 전용, TopNav "시스템" 그룹). **DB 마이그레이션 없음** — 기존
  `invoices`/`orders`/`dispatches`/`dispatch_extra_charges`/`claims`/
  `staff_accounts`를 최근 12개월 기준으로 조회해서 클라이언트 JS로 집계하는
  화면(화주포털 월별통계와 동일한 패턴, 신규 DB 뷰·함수 없음). 4개 섹션: (1)
  전사 월별 매출·마진 추이 — 매출은 `customer_charge_total`+표시시점 합산
  활성 현장추가비, 마진은 `calcInclusiveAmount()`(`lib/vat.ts`)로 부가세 포함
  환산 후 지급액 차감. (2) 담당자별 영업 성과 — `orders.created_by`("오더
  처리 담당자") 기준 귀속, 화면에 이 기준을 명시(견적 상담·정산 등록 담당자와
  다를 수 있음). (3) 화주별 수익성 순위(TOP 10) — `companies.total_revenue`
  등 CRM 수동입력 필드는 참고하지 않고 `orders`→`invoices` 조인으로 직접
  재계산, 게스트(`guest_name`)·개인고객 fallback 포함. (4) 클레임·현장추가비
  통계 — 클레임 배상액은 `status='처리완료'`+`compensation_amount` not null인
  건만 합산(청구액은 상태 무관 참고용 보조지표). 신규 `lib/dashboardExtraChargeAgg.ts`
  (`attributeActiveExtraCharges()` — 로드맵③의 "표시시점 합산" 3규칙을 대량
  집계용으로 재구현, 원칙51 신규 참고), `app/api/admin/dashboard-stats/route.ts`
  (GET, 관리자 전용 — `middleware.ts`는 `/api/admin/*`에 적용되지 않으므로
  API 라우트 자체에도 별도 `getCurrentStaff().role==="admin"` 체크 필요,
  원칙52 신규 참고). 사전조사 라이브 SQL 확인 결과 `billing_period` 예외
  포맷 없음, 클레임 1건만 존재하며 필터 조건과 정확히 일치, 데이터 규모가
  극히 작아(invoices 단 몇 건) 집계 성능 문제 없음(다만 화면은 당분간
  휑하게 보임). 작업지시서 원안의 "섹션별 독립 로딩"은 4개 섹션이 같은
  원본 데이터(`invoices`/`orders`/현장추가비 귀속)를 공유해서 API를 4개로
  쪼개면 중복 조회가 생기고 현재 데이터 규모상 이득이 없어, 단일 API
  호출+단일 로딩 상태로 단순화(데이터가 커지면 재검토 필요 — 아래 "다음에
  참고" 성격으로 남겨둠). `npx tsc --noEmit` 통과, `npm run build`는
  42페이지 프리렌더 실패(기존 41페이지 베이스라인 + 신규 페이지 1개,
  원인은 이 빌드 환경에 Supabase 환경변수가 없는 동일한 이유 — 새로운
  종류의 실패 아님). DB 변경이 없어 사용자가 Supabase에서 별도로 실행할
  것 없음. **PR #68 실사용 리뷰 라운드**: Preview에서 "대시보드가 어딨는지
  모르겠다"는 문의 — 코드 자체는 정상이었고, 메뉴가 작업지시서 초안(운송
  운영 그룹)이 아니라 조사 후 조정된 "시스템" 그룹(`ADMIN_ONLY_GROUP`,
  기존엔 직원 계정 관리·지원접속 이력만 있던 곳)에 들어가 있어서 못 찾은
  것으로 확인 — 코드 수정 없이 PR 댓글로 위치(상단메뉴 → 시스템 → 운영
  대시보드) + `role=admin` 계정에서만 보이는 의도된 동작임을 안내. 사용자
  확인 후 merge됨
- **클레임·사고 도입(로드맵⑤, 18차 세션)**: 금액·증빙·처리이력을 관리하는
  구조화된 `claims` 테이블+화면 신규(기존 `dispatches.issue_occurred`/
  `issue_notes`, 차주 상세 `claim_history`는 완전히 독립적으로 그대로 유지 —
  원칙 45번과 같은 이유로 역방향 동기화 안 함). 클레임 증빙사진은 로드맵④
  업로드 인프라 재사용(`dispatch_photos.category`에 `'claim'` 추가 +
  `claim_id` nullable FK, 배차상태 게이트 없이 항상 업로드 가능하도록
  `upload-url`/`finalize` API에 분기 추가). 배상금은 정산에 자동 반영하지
  않고 기록만(입력창 옆에 안내 문구), 화주포털에는 비노출(화주포털
  `dispatch-photos` list/signed-url API에 카테고리 허용목록 필터를 명시
  추가해서 이중으로 차단 — 이 조사 과정에서 필터가 없어 새어나갈 뻔했던
  지점을 발견·수정). 삭제 기능 없음(상태를 "기각"으로 전환하는 것으로만
  종결), 처리완료/기각 시 `resolved_at`/`resolved_by` 자동 기록. 배차
  상세에 "클레임·사고" 섹션 신규("현장 추가비" 바로 위, 배차확정 이후 전체
  노출 — 사고는 상차 전에도 발생 가능해 다른 두 섹션보다 넓게 열어둠).
  POD·인수증 사진 확대보기 모달이 그 섹션 안에 갇혀 있던 구조적 문제를
  발견해 컴포넌트 최상단으로 옮겨 클레임 섹션과 공용으로 사용하도록 수정.
  `npx tsc --noEmit`/`npm run build`(41페이지 프리렌더 실패, 기존
  베이스라인과 동일) 통과. DB(`claims` 테이블 + `dispatch_photos` 확장)는
  사용자가 Supabase에서 직접 실행 완료. **PR #67 실사용 리뷰 라운드**:
  (1) 배차 상세 진입 시 client-side exception 크래시 — "POD·인수증"
  섹션이 `DISPATCH_PHOTO_CATEGORIES`(이번에 3종으로 늘어남) 전체를
  순회하는데 `photos` state는 dropoff/pod 2종 키만 가지고 있어서
  `claim` 차례에 `undefined.length`로 크래시(dropoff/pod만 순회하도록
  수정, 원칙 50번 신규 참고). (2) 화주포털 배차·운송조회 "사진보기"도
  `components/DispatchPhotosPanel.tsx`에 동일한 패턴의 버그가 있어서
  같은 방식으로 수정. (3) "화주포털에 클레임 알림이 없다"는 지적은
  결정사항 3(화주포털 비노출)에 따른 의도된 동작임을 설명. (4) "클레임·
  사고"/"현장 추가비" 두 섹션 모두 "자주 발생하지 않는데 레이아웃을 너무
  차지한다"는 피드백으로 접이식 전환(기본 접힘, 제목+건수 배지만 노출,
  "▼ 펼치기" 버튼으로 열람). 사용자가 Preview에서 클레임 등록·상태변경·
  증빙사진 업로드까지 실사용 테스트 완료 후 merge됨(PR #67)
- **POD·인수증 도입(로드맵④, 17차 세션)**: 운송 완료 후 하차지 사진·인수증을
  배차 단위로 여러 장 업로드·보관하는 기능(둘 다 선택사항). 최초 anon 직접
  업로드 설계가 보안상 부적절함이 지적되어(anon 키는 브라우저 노출값이라
  로그인 화면 없이도 Storage에 직접 쓸 수 있음) Signed Upload URL 방식으로
  전면 재설계 후 구현(원칙 49번 신규, 자세한 내용은 상단 17차 세션 요약과
  원칙 49번 참고). `app/api/admin/dispatch-photos/*`(upload-url/finalize/
  list/signed-url/delete) + `app/api/customer/dispatch-photos/*`(list/
  signed-url) 서버 API, `dispatch_photos` 테이블(anon/authenticated 접근
  정책 없음, service_role 서버 API 전용), `dispatch-photos` private Storage
  버킷 신규. 배차 상세에 "POD·인수증" 섹션(현장 추가비~진행 체크 사이,
  하차완료 이상 + `delivery_confirmed` 확인된 문제발생만 노출), 화주포털은
  배차·운송조회 목록 펼침 방식으로 열람. DB/버킷 설정은 사용자가 Supabase
  SQL Editor에서 직접 실행 완료. **PR #66 실사용 리뷰 라운드**: 삭제 시
  체감 속도가 느리던 문제(삭제 후 전체 목록+모든 썸네일 signed URL을 매번
  재조회하던 것을 삭제된 항목만 로컬에서 제거하도록 수정), 화주포털 사진
  확대 시 닫기 버튼이 없던 문제(새 탭 열기 → 페이지 내 모달+명시적 닫기
  버튼으로 교체), 업로드·로딩이 느리던 문제(목록 API가 사진마다 개별
  signed-url 호출을 유발하던 구조를 `createSignedUrls()` batch 발급으로
  교체해서 왕복 1회로 축소, admin 다중 파일 업로드도 순차→병렬 처리로 변경)
  전부 반영 후 merge됨(PR #66)
- **현장 추가비 도입(로드맵③, 16차 세션)**: 운송 진행/완료 후 현장에서
  추가로 발생하는 비용(대기료·회차비·야간주말공휴일할증·수작업상하차·
  계단운반·경유지추가·주차료통행료·기타 8종)을 배차 단위로 등록·취소하는
  기능. 견적 단계 사전 산정 가산요금(`rate_vehicle_extra_fees`, "가산기준")과는
  다른 개념. `collection_method='driver_direct'` 건은 범위 밖. 작업지시서
  1-1~1-10 사전조사 → 사용자 7개 결정사항 확정 → 구현 흐름으로 진행(자세한
  결정 내용은 위 16차 세션 상단 요약 참고).
  - **핵심 설계 원칙**: `invoices.customer_charge_total`/`driver_payout_total`은
    정산 건 생성 시점 1회성 스냅샷이라는 기존 성질 그대로 유지하고 절대
    직접 수정하지 않음(원칙 47번 신규) — 화면에는 스냅샷 + 그 이후 등록된
    활성 추가비 합계를 표시 시점에 실시간으로 더해서 "확정 청구액/현장
    추가비 합계/총 청구액(참고)" 3단으로 보여줌
  - `dispatch_extra_charges` 테이블 신규(배차별 로그, 삭제 없이
    `status='active'/'cancelled'`+취소자·취소사유로만 이력 보존) +
    `register_dispatch_extra_charge`/`cancel_dispatch_extra_charge`
    SECURITY DEFINER 함수 2개(월정산 묶음 함수들과 동일 아키텍처) +
    서버 API 2개(`app/api/admin/dispatch-extra-charges/*`, 인증만 확인 후
    RPC 1회 호출)
  - 배차 상세(`admin/dispatches/[id]/page.tsx`)에 "현장 추가비" 하위섹션
    신규(상차완료 이상만 노출 — 기존 "차주 운임 상세 계산" 섹션의 배차확정
    이상 조건보다 좁게, 이 기능의 실제 의미에 맞춤), 8종 항목+화주 청구액/
    차주 지급액(분리 입력, 안 B)+메모 입력, 등록 목록+취소
  - `app/admin/dispatches/page.tsx`/`[id]/page.tsx`의 정산 자동생성 함수 2곳
    + `app/admin/invoices/page.tsx` 수동 등록(프리필 단계) — 정산 건 최초
    생성 시점에 이미 등록된 활성 추가비를 스냅샷에 포함해서 얼림
  - 정산관리 목록·상세: 화주 청구금액/차주 지급금액 아래에 "현장 추가비
    +N건 (₩OOO)" 표시시점 합산 캡션 + "총 청구액(참고)" 표시, 정정청구
    invoice는 별도 배지로 구분
  - **구현 중 스펙 문서에 명시적으로 없어서 직접 채운 보정 3가지**(전부
    7개 확정 결정사항과 핵심 설계 원칙을 위반하지 않는 선에서 채움):
    1. `refresh_item_snapshot`(로드맵②-B에서 이미 만들어졌지만 실제로는
       어느 화면에도 연결 안 돼 있던 함수 — 이번에 처음으로
       `MonthlyBillingBatchPanel.tsx`의 draft 항목에 "새로고침 필요" 배지+
       버튼을 신규로 만들어 연결)의 계산식을 "invoice 값 그대로 재복사"에서
       "invoice 값 + 그 이후 등록된 활성 추가비 합계"로 변경(원칙 47번
       참고 — 안 그러면 새로고침 버튼이 있어도 실제로는 죽은 기능이 됨)
    2. 확정된 묶음에 담긴 건에 추가비가 발생하면 새 "정정청구" invoice를
       자동 생성하는데(같은 `order_id`), 한 오더에 invoice가 2개 이상일
       수 있게 되므로 "가장 최근 invoice"를 기준으로 케이스(무묶음/draft/
       confirmed)를 판정하도록 규칙을 정함(원칙 48번 참고)
    3. `dispatch_extra_charges.correction_invoice_id`(nullable FK) 신규
       추가 — 어떤 추가비가 어느 정정청구 invoice를 만들었는지 연결해야
       정정청구 배지 표시 + "이미 정정청구가 생성된 항목은 취소 불가"
       규칙을 구현할 수 있어서 필요했음(스펙 2-1 표에는 없던 컬럼)
  - `npx tsc --noEmit`/`npm run build`(41페이지 프리렌더 실패, 기존
    베이스라인과 동일) 통과. DB 마이그레이션은 사용자가 Supabase SQL
    Editor에서 직접 실행
  - **PR #65 리뷰 중 2-5 재확정(화주포털 노출) 및 addendum**: 화주가 PR
    코멘트로 화주포털에 현장 추가비가 안 보인다고 지적 — 결정사항 2-5를
    그대로 따른 의도된 동작이라고 답했으나, 사용자가 이 자리에서 2-5를
    "화주포털 노출함(항목별 내역 수준)"으로 재확정. 함께 확정된 3가지:
    노출 수준은 캡션이 아니라 카테고리+금액 항목별 내역, 정정청구 invoice도
    일반 invoice와 동일하게 노출(구분 배지만 추가), 취소(`cancelled`)
    항목은 미노출(`active`만).
    - **`driver_payout_amount`(차주 지급액) 화주포털 노출 금지 — DB
      권한 자체를 제한**: 프론트 코드에서 안 보여주는 수준으로는 부족하다는
      지시에 따라, `authenticated` 롤의 `dispatch_extra_charges` 기본
      전체컬럼 SELECT 권한을 `REVOKE`하고 노출 가능한 컬럼만
      column-level `GRANT`로 다시 부여 — 프론트가 실수로 이 필드를
      조회에 넣어도 Postgres가 권한 오류로 쿼리 자체를 막음(조용히
      누락되는 게 아니라 바로 드러남). 행 단위 접근은
      `customer_accounts.auth_user_id = auth.uid()` → `company_id`
      일치 조건의 RLS 정책으로 본인 회사 소속 건만 제한(원칙 2번과
      동일 패턴)
    - `lib/portalInvoiceFields.ts`에 `PORTAL_DISPATCH_EXTRA_CHARGE_FIELDS`
      신규(안전 컬럼만), `PORTAL_INVOICE_FIELDS`에 `order_id` 추가(추가비
      조인에 필요)
    - `customer/invoices` 목록(별도 상세 페이지가 없는 화면이라 행
      펼치기 방식으로 항목별 내역 표시, 데스크탑 표+모바일 카드 둘 다)에
      admin과 동일한 "가장 최근 invoice에만 트레일링 추가비 표시" 로직을
      화주포털 안전 필드로 재구현
    - `npx tsc --noEmit`/`npm run build` 재확인 통과. DB 마이그레이션
      (column GRANT/REVOKE + RLS 정책)은 사용자가 Supabase SQL Editor에서
      직접 실행

---

## 4-1. 0단계 사전 점검 결과 (9차 세션 — 조사 전용, 코드·DB 변경 없음)

로드맵의 다음 단계(정산 마감·확정·잠금 등)를 시작하기 전에, CLAUDE.md 내용을
맹신하지 않고 실제 코드·DB를 기준으로 8개 항목(정산방식/차주운임·산재보험료/
정산관리/POD·인수증/현장 추가비/클레임·사고/혼적/최근 UI변경)을 전수
재검증한 결과. 코드 조사(Read/Grep)와 사용자가 Supabase SQL Editor에서 직접
실행한 확인용 SELECT 쿼리 결과를 함께 반영함 — 코드 수정·DB 마이그레이션은
전혀 진행하지 않음.

**문서와 실제가 정확히 일치한 것** (재확인 완료): settlement_type 허용값
(`general`/`prepaid`/`postpaid_cod`/`monthly`/`network`, 4개 테이블 CHECK
제약조건까지 DB로 확인), `dispatches.margin`이 실제로 PostgreSQL 생성 컬럼
(`is_generated=ALWAYS`, 식 `customer_charge - driver_payout`, DB로 확인),
`invoices.status`(정산대기/청구완료/입금완료/지연/거래중단) 및
`dispatches.dispatch_status`(접수중/배차확정/상차완료/하차완료/운송완료/
문제발생) CHECK 제약조건, `mixed_executed` 컬럼이 코드·DB 어디에도 완전히
삭제되어 있음(DB `information_schema.columns` 조회 결과 0행), 부가세 포함/
별도 토글 관련 코드(`toSupplyAmount()` 등)도 저장소 전체에서 0건, 산재보험료
계산식(`lib/settlementCalc.ts`)이 문서에 적힌 공식과 정확히 일치, 산재보험료
요율 탭이 운임기준표 화면 안에 있고 TopNav에 독립 메뉴가 없음, 화주포털
하위메뉴 배지가 `NavCountBadge`+`localStorage` 기반으로 항목별로 구현됨,
`MixableBadge`가 운송오더/배차관리/정산관리 목록·상세 6개 화면 전부에
일관되게 재사용됨, 견적서 PDF에 "🔀 혼적가능 화물 (할인 반영된 운임입니다)"
문구가 실제로 존재함.

**문서와 다르거나 문서에 없던 내용** (이번에 새로 확인):
1. **견적 상세/수정 화면(`admin/quotes/[id]/page.tsx`)에 `settlement_type`이
   전혀 없음** — 견적 등록 화면에서 1회 입력만 되고, 이후 견적 상세에서는
   조회도 수정도 불가능함. 기존 문서의 "견적·오더·배차·정산 4개 화면 전부
   구현"이라는 서술은 부정확했음(오더/배차/정산 3개 화면만 실제로 조회+
   확정후 사유입력 수정이 가능).
2. **`invoices.receivable_amount`/`payable_amount` 죽은 컬럼**: 배차 자동
   정산등록(`autoCreateInvoiceIfNeeded`)과 수동 정산등록 둘 다
   `customer_charge_total`/`driver_payout_total`과 동일한 값을 이 두
   컬럼에도 같이 저장하지만, 어느 화면의 조회(`.select()`)에도 포함되지
   않아 실제로 읽히는 곳이 없음. 앞으로 두 쌍의 값이 어긋나는 사고를 막기
   위해 정리 후보로 기록.
3. **정산관리(`invoices`) 상세 저장에 서버단 권한 체크가 없음** — 상태·
   금액·정산방식 수정이 anon 클라이언트로 직접 `update()`되고,
   `isAdmin`은 삭제 버튼 노출 여부에만 쓰임. 지금은 "직원 누구나 정산을
   처리할 수 있어야 한다"는 의도된 설계로 보이나, 향후 정산 확정/잠금
   기능을 만들 때는 원칙 25번(화면단+서버단 이중체크)을 새로 적용해야 함.
4. `settlement_type_change_logs`/`insurance_rate_settings`/
   `mixed_loading_discount_settings` 3개 테이블은 FK 제약조건이 전혀 없음
   (DB `pg_constraint` 조회로 확인) — 로그·설정성 테이블이라 문제는 아니나
   문서에 없던 세부사항.
5. **POD·인수증, 운송완료 후 현장 추가비, 구조화된 클레임 관리 — 전부
   미구현 확정**(코드·DB 양쪽 0건). 클레임 관련해서는 배차 상세의
   `issue_occurred`(체크박스)+`issue_notes`(자유텍스트), 차주 상세의
   `claim_history`(자유텍스트 메모)만 얕게 존재함 — 금액·증빙·처리이력을
   관리하는 별도 시스템은 없음. 현장 추가비와 혼동하면 안 되는 "견적 단계
   가산요금"(`rate_vehicle_extra_fees`의 대기료/경유지비, 운임기준표
   "가산기준")은 이미 구현되어 있으나 이건 운송완료 후 현장에서 발생하는
   추가비와는 다른 개념임.
6. **정산관리 "확정/잠금" 기능은 미구현 확정** — 코드 주석("8차 세션(월정산
   마감/확정)에서 정산 건 잠금 로직이 생기면...")으로 로드맵 예정 상태임이
   명시돼 있고, DB에도 `locked`/`confirmed_at` 류 컬럼이 없음(0행 확인).

다음 로드맵 후보 순서(사용자 확정 필요, 아직 시작 안 함): ① 정산 마감·확정·
잠금 → ② 정산방식별 수금·지급 구조 세분화 → ③ 현장 추가비 → ④ POD·인수증 →
⑤ 클레임·사고 → ⑥ 운영 대시보드. 각 단계의 예상 수정 파일·신규 테이블
후보·충돌 위험은 이 조사 세션에서 사용자에게 별도로 보고함(다음 작업 시작
시 다시 상세 설계 필요).

> **진행 현황 갱신(19차 세션 기준)**: ①은 12차 세션(정산 마감·확정·잠금)에서
> 완료. ②는 지시대로 A/B로 쪼개져, ②-A(수금방식/청구주기 이원화)는 13차
> 세션에서 완료·merge됨(PR #63), ②-B(화주 월정산 묶음, `broker`+`monthly`
> 대상)도 14차 세션에서 완료·merge됨(PR #64) — `driver_direct`+`monthly`
> 전용 묶음, 화주포털에 월정산 묶음 노출 등 ②-B 자체 확장은 여전히
> 범위 밖. ③(현장 추가비)도 16차 세션에서 완료됨(아래 참고). ④(POD·인수증)도
> 17차 세션에서 완료·merge됨(PR #66, 아래 참고). ⑤(클레임·사고)도 18차
> 세션에서 완료·merge됨(PR #67, 아래 참고). **⑥(운영 대시보드)도 19차
> 세션에서 완료됨(아래 "운영 대시보드 도입" 참고) — 이 조사 세션(9차)에서
> 잡았던 로드맵 ①~⑥ 전체가 완료됨.**

---

## 5. 다음 예정 작업 (우선순위 순)

직원 계정·권한·이력 재구조화 스펙(1~8단계)은 전부 완료되었습니다. 0단계 사전점검
(9차 세션)에서 잡았던 로드맵 ①~⑥(정산 마감·확정·잠금 → 정산방식별 수금·지급
구조 → 현장 추가비 → POD·인수증 → 클레임·사고 → 운영 대시보드)도 19차 세션까지
전부 완료되었습니다. 다음 우선순위는:

1. 카카오 알림톡 자동화 — 사업자 인증·발신프로필 심사가 필요해 **미리 신청 절차부터
   시작하는 것을 권장** (승인에 시간 걸림)
2. 화주포털 발주요청 2차 기능(화주 직접 오더 입력)
3. 커스텀 도메인 연결, 공개 화면 UX 고도화 — 보류 중
4. 유료 플랜 전환 / 페이지네이션
5. 운영 대시보드(로드맵⑥) 고도화 — 현재는 최근 12개월 고정 조회+4개 핵심 지표만
   있는 1차 버전. 기간 선택 UI, 차트 라이브러리 도입, 섹션별 API 분리(데이터
   규모가 커질 경우) 등은 필요성이 확인되면 추가 검토

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
- **기존 컬럼을 재사용하려고 `update()`했는데 "column ... can only be updated
  to DEFAULT" 에러가 나면**: 그 컬럼이 PostgreSQL 생성 컬럼(generated column —
  다른 컬럼으로부터 자동 계산되는 컬럼)이라 직접 값을 못 넣는 것임. 원칙 27번
  사전확인 쿼리(`information_schema.columns`)는 컬럼이 "존재하는지"는 잡아내지만
  "생성 컬럼인지"까지는 안 알려줌 — 이 에러를 실제로 만난 적 있음
  (`dispatches.margin`을 재사용하려다가 발견, 알고 보니
  `customer_charge - driver_payout` 자동계산 컬럼이었음). 의심되면
  `select column_name, is_generated, generation_expression from
  information_schema.columns where table_name = '...'`로 먼저 확인하고, 생성
  컬럼이면 그 컬럼은 update 대상에서 빼고 원인이 되는 컬럼만 갱신하면 DB가
  알아서 재계산함
- **날짜/시간 입력창(`DateTimePicker`) 값을 저장했는데 목록/상세에서 다른
  시각으로 보인다면**: 십중팔구 오프셋 없는 로컬 문자열을 그대로
  Supabase에 넘겨서 생기는 타임존 버그임(원칙 41번) — 새 datetime 저장
  코드를 짤 때 `lib/localDateTime.ts`의 `localInputToISOString()`(저장)/
  `toLocalDateTimeInput()`(불러오기)를 거치지 않고 값을 그대로 넣거나
  `.slice(0, 16)`처럼 문자열을 잘라서 쓰고 있는지부터 확인할 것. 실제로
  견적/운송오더의 희망 상차·하차일시가 이 문제를 겪었고, 자정을 넘는
  일시 조합(저녁 상차+익일 아침 하차)일 때 날짜까지 바뀌어서 특히 눈에
  띄었음
- **정산방식(`settlement_type`) 관련 화면 작업할 때**: 오더/배차/정산 3개
  화면에만 조회·수정 UI가 있고, **견적 상세/수정 화면에는 없음**(등록 시
  1회 입력만 가능) — "4개 화면 전부 있다"고 가정하고 코드를 찾으면 헛수고임
  (0단계 조사, 9차 세션에서 확인)
- **`invoices.receivable_amount`/`payable_amount`는 죽은 컬럼**임 — 저장은
  되지만 어느 화면도 이 값을 읽지 않음. 실제 화면에 쓰이는 값은
  `customer_charge_total`/`driver_payout_total`이므로, 정산 금액을 다루는
  코드를 새로 짤 때 이 두 컬럼 이름과 헷갈리지 말 것(0단계 조사, 9차 세션)
- **정산관리(`invoices`) 상세 저장 중 메인 저장(상태/세금계산서/입금/
  차주지급)은 12차 세션(정산 마감·확정·잠금)부터 서버 API
  (`app/api/admin/invoices/save/route.ts`)를 거치도록 바뀜** — 저장
  직전 `locked`를 fresh 조회해서 확정된 건은 관리자+사유입력만 허용함
  (원칙 44번). **다만 정산방식 변경(`handleSettlementTypeChange`)은
  여전히 anon 클라이언트 직접 update**임 — 화면단에서 잠긴 건이면
  버튼을 비활성화해두긴 했지만 서버단 잠금 체크는 아직 없어서, 브라우저
  콘솔로 직접 호출하면 확정된 건의 정산방식을 우회해서 바꿀 수 있는
  잔여 위험이 있음(0단계 조사 9차 세션에서 처음 발견, 12차 세션에서
  메인 저장 경로만 해소하고 이 경로는 범위 밖으로 남겨둠 — 필요해지면
  같은 패턴으로 서버 API화할 것)
- **"먼저 조회해서 없으면 insert" 패턴을 쓸 때**: 애플리케이션 레벨의
  사전조회만으로는 완전히 동시에 들어오는 두 요청(true race)을 못 막음 —
  반드시 대상 컬럼에 DB UNIQUE 제약을 걸고, insert가 유니크 위반 에러
  (Postgres 코드 `23505`)를 던지면 그걸 잡아서 다시 조회 후 기존 행을
  반환하는 이중 처리로 만들 것. `dispatch_photos`의 finalize API(로드맵④,
  17차 세션 — `storage_path` UNIQUE + `23505` 캐치)가 이 패턴의 실제 구현
  사례. 사전조회만 하고 DB 유니크 제약을 빠뜨리면, 평소엔 문제없다가 네트워크
  재시도 등으로 같은 요청이 거의 동시에 두 번 들어오는 드문 상황에서만
  중복 행이 생기는 재현하기 어려운 버그가 됨
- **admin·화주포털이 같이 읽는 공용 테이블(`dispatch_photos` 등)에 화주포털
  노출 금지인 새 카테고리·값을 추가할 때**: "화주포털 화면이 이 값을 안
  보여주니 안전하다"고 넘기지 말고, 그 테이블을 읽는 화주포털 서버 API가
  이미 카테고리·타입 필터 없이 통째로 조회하고 있는지부터 확인할 것.
  `dispatch_photos`에 `claim` 카테고리를 추가하려던 로드맵⑤(18차 세션)
  사전조사에서, 화주포털 list API(`app/api/customer/dispatch-photos/
  list/route.ts`)가 `dispatch_id`로만 필터하고 카테고리는 전혀 안 거르고
  있어서 `claim`을 추가하는 순간 API 응답 자체에 클레임 사진 메타데이터가
  그대로 실려 나갈 뻔했음(화면이 그 필드를 안 보여주는 것과, API가 애초에
  안 주는 것은 완전히 다른 방어선 — 원칙 3·9번과 같은 결). 새 값을 추가하기
  전에 화주포털 쪽 조회 지점부터 훑어보고, 없다면 허용목록(allow-list) 필터를
  명시적으로 추가할 것 — 금지목록(deny-list)보다 나중에 카테고리가 하나 더
  늘어도 자동으로 안전한 허용목록 쪽이 더 안전함

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
