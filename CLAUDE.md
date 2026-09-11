# WeCarry 운송 통합 운영 시스템 — 최종 인수인계 문서

> 이 문서는 claude.ai 채팅에서 **Claude Code로 작업 방식을 전환하는 시점**에 작성된
> 최종 버전입니다. 앞으로는 이 문서(또는 `CLAUDE.md`)를 참고해서 Claude Code가
> 작업을 이어갑니다.

> ### 🔴 새 세션은 `HANDOFF.md` 를 먼저 읽으십시오
>
> 저장소 루트에 **`HANDOFF.md`** 가 있습니다. 두 문서는 **역할이 다릅니다.**
>
> | 문서 | 성격 | 언제 |
> |---|---|---|
> | **`HANDOFF.md`** | **지금 시점의 정돈된 스냅샷** | 🔴 **새 세션이 먼저 읽는 입구** |
> | `CLAUDE.md`(이 문서) | 세션별 축적 기록 — **왜 그렇게 했는지의 근거** | 특정 결정의 배경을 되짚을 때 |
>
> 🔴 **`HANDOFF.md` 는 `CLAUDE.md` 의 대체가 아니라 입구입니다.** **이 문서를 요약해서
> 줄이지 마십시오** — 되돌리면 안 되는 결정의 근거가 여기에만 있습니다.
>
> ⚠️ **세션 기록은 2026-09-09 에 `docs/history/` 로 옮겼습니다**(약 65만 자 → 약 14만 자).
> 어느 파일에 무엇이 있는지는 **§0 의 「이력 찾는 법」** 표를 보십시오.
>
> 🔴 **파일명은 고정입니다.** 갱신할 때 `HANDOFF_v21.md` 같은 새 파일을 만들지 말고
> **그 파일의 내용만 교체**하십시오. 버전은 문서 첫머리에만 적습니다 — 파일명을 바꾸면
> 이 안내와 §9 의 읽는 순서가 깨집니다.

## 0. 이 문서를 읽는 방법 (Claude Code에게)

이 프로젝트는 claude.ai 채팅에서 수십 차례에 걸쳐 기능을 만들어왔고, 만들어진 코드는
**항상 사용자가 GitHub 웹 화면에 직접 복사-붙여넣기하는 방식**으로 반영되었다. 즉:

- 이 문서에 적힌 "완료됨" 항목은 **사용자가 실제로 GitHub에 적용했다고 확인한 것**만 표시
- 일부 항목은 "적용 안내는 했지만 사용자의 최종 확인을 못 받은 상태"일 수 있음 — 실제
  저장소 코드가 이 문서 내용과 다르면 **저장소 쪽이 항상 맞다**
- 작업 방식이 이제 Claude Code로 바뀌므로, 앞으로는 직접 파일을 읽고 수정하면 됨
  (더 이상 "파일을 만들어서 보여주고 사용자가 복붙" 하는 방식이 아님)

---

### 🔴 이력 찾는 법 — 세션 기록은 `docs/history/` 에 있습니다

2026-09-09 에 세션 기록 56건과 §4 를 옮겼습니다. **한 글자도 지우지 않았습니다.**
🔴 **이 문서(루트)에는 세션 기록을 쓰지 않습니다** — 새 기록은 `current.md` 맨 위에 쌓습니다.

| 파일 | 담는 범위 | 크기 |
|---|---|---:|
| `docs/history/history-01.md` | 6차 #49  →  36차 #84   (6건) | 76,804자 |
| `docs/history/history-02.md` | 37차  →  52차 #101   (14건) | 79,603자 |
| `docs/history/history-03.md` | 53차  →  59차 #106 2026-08-29   (7건) | 72,123자 |
| `docs/history/history-04.md` | 60차 #107 2026-08-31  →  65차 #112 2026-09-02   (6건) | 69,724자 |
| `docs/history/history-05.md` | 66차 #113 2026-09-03  →  #122 2026-09-07   (12건) | 79,171자 |
| `docs/history/history-06.md` | #123 2026-09-07  →  #128 2026-09-08   (6건) | 49,584자 |
| `docs/history/history-07.md` | #129 2026-09-08  →  #134 2026-09-09   (6건) | 71,022자 |
| `docs/history/history-08.md` | #135 2026-09-09  →  문서 정합 정리 2026-09-09   (3건) | 32,637자 |
| `docs/history/current.md` | 32차 #137 2026-09-09  →  견적 폼 배지 옐로 #145 2026-09-11   (9건) | 55,481자 |
| `docs/history/features.md` | 완료된 주요 기능 전체 요약 · 0단계 사전 점검(9차 세션) | 57,219자 |

```bash
# 근거를 찾을 때는 루트와 아카이브를 함께 훑는다
grep -rn "PR #113" docs/history/ CLAUDE.md
```

🔴 **한쪽만 grep 하면 「없앴다」인지 「옮겨졌다」인지 구분되지 않습니다.**

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
  - `/`, `/quote`, `/apply` + 법적 문서 3종(`/terms`·`/privacy`·`/email-policy`) —
    완전 공개(비회원). `/quote`·`/apply` 는 anon INSERT 전용이고 조회는 서버 API 로만.
    🔴 **`/status` 는 62차(PR #109)에 라우트·조회 API·처리방침 행까지 통째로 삭제됐다** —
    비회원 조회 경로는 이제 없다. **되살리지 말 것**(§5 「31차」 항목).
    ⚠️ **§3 원칙 3·11·34 에 남아 있는 `/status` 표기는 일부러 그대로 뒀다** — 그 원칙들이
    말하는 규칙 자체는 유효하고, 원칙 번호·본문을 건드리면 참조가 통째로 깨진다

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
  코드와 별개로 사용자가 Supabase SQL 편집기에서 직접 실행해야 함** (§8
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
  "배차정산정보 단순화 + 혼적가능 표시 개선(v2)" 참고 — 이 항목이 최신 동작 기준.
  🔴 **`mixed_loading_discount_settings` 는 2026-09-09 에 단일 행이 아니라 거리
  3구간이 됐다**(`distance_label`/`distance_to_km` 신설, 3행 · 15/35/55%) —
  위 "단일값 설정 테이블" 설명은 그때까지의 것이다. 한 행만 읽는 헬퍼를 다시
  만들지 말 것(자세한 것은 §5 로드맵의 「운임기준표 v11 B장」)

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
21. **서비스롤 GET API 라우트는 `export const dynamic = "force-dynamic"` 과
    `lib/supabaseServiceClient.ts` 의 `createServiceClient()` 가 **둘 다** 필요하다.**
    🔴 **`force-dynamic` 만으로는 안 막힌다** — 그 지시자는 *라우트 렌더링*만 동적으로
    만들 뿐이고, 라우트 안에서 **supabase-js 가 내부적으로 쓰는 `fetch` 는 그대로
    Next 의 Data Cache 를 탄다.** 55차에 프로덕션 빌드로 재현했다 — DB 를 4종에서
    20종으로 바꾸고 서버를 재시작하지 않았더니 API 가 **세 번 연속 4종**을 내려줬다.
    `createServiceClient()` 가 `global.fetch` 에 `cache: "no-store"` 를 주입해서
    막는다(서비스롤 GET 라우트 11개 전환 완료). 클라이언트에서 그 API 를 부를 때도
    `fetch(url, { cache: "no-store" })` 를 붙일 것.
    ⚠️ **이 원칙은 55차 이전에 "force-dynamic 만 붙이면 된다"로 적혀 있었고 그게
    틀렸다** — 그 시절에 만든 라우트는 전부 이 버그를 갖고 있었다(문자 이력·직원
    목록·공개문의·대시보드가 저장 직후 옛 값을 보여줄 수 있는 상태였다).
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
24. **관리자 로그인/로그아웃은 `lib/supabaseAdminAuthClient.ts`(`supabaseAdminAuth`)
    로만 부를 것.** ⚠️ **19차(50차 세션)에 이 원칙의 전제가 바뀌었다** — 그전에는
    `lib/supabaseClient.ts`가 anon·localStorage라 "절대 섞지 말 것"이었지만, 지금은
    **둘 다 `createBrowserClient`(쿠키 세션)이고 브라우저에서 모듈 싱글턴이라 같은
    인스턴스**다. 그래도 이름은 갈라 둔다 — 이름이 곧 용도 표시라 데이터 조회 코드에서
    `auth`를 만지지 않게 막아준다. "지금 로그인한 직원이 누구/무슨 role인지" 필요할 때는
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
    이 훅이 다루지 않는다** — 🟢 **그것은 `lib/useListPagination.ts` 가 맡는다**
    (PR #144 신설, 원칙 43번과 같은 결의 공용 부품이다). 이 훅으로 걸러·정렬한
    배열을 그 훅에 넘겨 자르는 순서이고, 화면마다 새로 만들지 말 것
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
53. **클라이언트가 anon 키로 직접 테이블을 update하는 기존 화면(상태
    드롭다운·체크박스 등)에, 서버 비밀키가 필요한 부가기능(SMS 발송 등)을
    나중에 추가해야 할 때는, 그 update가 일어나는 모든 지점을 서버 API로
    옮기는 대규모 리팩터링을 하지 말 것.** 대신 DB update가 성공한 직후
    client가 "그 결과를 다시 조회해서 처리하는" 가벼운 서버 API를
    fire-and-forget(await 없이 호출, 응답을 기다리거나 실패를 처리하지
    않음 — 실패해도 원래 액션엔 전혀 영향 없어야 함)으로 추가 호출하는
    방식을 쓸 것. SMS 발신 연동(23차 세션, 배차확정/상차완료/하차완료)이
    이 패턴의 첫 사례 — `dispatch_status`를 바꾸는 지점이 실제로는 배차
    상세의 확정버튼·상태드롭다운·체크박스, 배차 목록의 상태드롭다운까지
    4곳에 흩어져 있었는데(사전조사로 처음 확인됨), 이 4곳을 전부 서버
    API로 옮기는 대신 각 지점 끝에 `lib/notifyDispatchSms.ts`의
    `notifyDispatchStatusSms()` 한 줄만 추가 — 이 함수가 부르는
    `/api/admin/notify-dispatch-status`가 dispatch를 다시 조회해서
    (client 값을 안 믿고) 수신자·문구를 정하고 발송함. "이 필드가 바뀌는
    지점이 한 곳뿐일 것"이라고 가정하지 말고, 실제로 몇 곳에서 그 필드를
    바꾸는지 먼저 grep으로 전부 찾아본 뒤 이 패턴을 적용할 것 — 실제로도
    이 프로젝트는 같은 상태값을 여러 화면(목록+상세)이 각자 update하는
    구조가 흔해서(원칙 46·48번 등에서도 비슷한 다중 진입점 이슈가 있었음),
    "자동 트리거를 건다"고 하면 먼저 그 트리거 대상 필드를 바꾸는 코드가
    정말 한 곳뿐인지부터 확인하는 습관이 필요함
54. **사진 위에 글자를 얹어야 할 때, 가독성용 어두운 덮개(그라데이션)는 화면 전체가
    아니라 "사진 요소 자신" 위에 얹을 것 — 정지점을 %로 주고 전체에 깔면 뷰포트 폭이
    바뀔 때마다 글자와 사진의 관계가 달라진다.** 랜딩 히어로(37차)가 이 패턴의 첫
    사례 — 덮개를 히어로 전체에 깔고 `linear-gradient(90deg, … 34%, … 80%)`처럼 주었더니
    정지점이 뷰포트 폭 기준이라, 1280에서는 멀쩡하던 것이 1920에서는 본문 끝과 사진
    시작이 맞물려 **트럭이 제목 위로 올라오고 차체 로고가 글자 뒤로 비쳤음**(텍스트는
    가운데 정렬된 컨테이너에 묶여 있고 사진은 뷰포트 오른쪽에 붙어 있어서, 둘이 서로 다른
    기준으로 움직였기 때문). 덮개를 사진 위에만 얹어 사진 왼쪽 끝이 배경색으로 녹아들게
    하면 **본문은 항상 단색 배경 위에 놓이므로 어떤 사진이 와도 읽힌다.**
    ⚠️ 이런 문제는 **이미지 자리가 회색 상자인 자리표시자 상태에서는 눈에 띄지 않는다** —
    사진이 들어올 자리에 대표 이미지를 임시로 넣고 여러 폭(최소 1280·1920·800)에서
    렌더링해 보는 것이 유일하게 확실한 확인 방법이다(37차에 실제로 이 방법으로 발견함,
    임시 이미지는 커밋 전 삭제)
55. **조회가 실패했을 때 "빈 목록"으로 보이는 코드를 쓰지 말 것 — `error` 를 반드시
    받아서 화면에 띄운다. 그리고 정렬·필터를 컬럼 이름에 기대지 말 것.**
    `const { data } = await supabase...` 는 조회가 실패하면 `data` 가 null 이라
    **조용히 빈 배열**이 되고, 화면은 "저장된 것이 없습니다"를 보여준다 — **저장은
    성공했는데 목록에 안 나타나는** 상태가 되어 원인을 짚을 단서가 하나도 안 남는다.
    55차에 실제로 겪었다: `customer_locations` 에 없는 `created_at` 으로 `.order()` 를
    걸어 PostgREST 가 `42703` 을 돌려줬는데 그 에러를 버려서 **배송지 목록이 통째로
    비었다.** 같은 표를 읽는 다른 4곳은 `order` 절이 없어 멀쩡했고, 그래서 화면 하나만
    비는 형태로 나타났다. 🔴 컬럼 이름이 확실하지 않으면 **정렬은 불러온 뒤 코드에서**
    하고, 스키마는 `_verify.sql` 의 컬럼 목록으로 **실측부터** 볼 것(짐작 금지).
56. **검증용 목(mock)은 실제 DB 보다 **더 엄격하거나 최소한 같아야** 한다 — 헐거우면
    "내 시험이 통과했다"가 "동작한다"를 뜻하지 않게 된다.**
    55차에 한 세션에서 세 번 걸렸다 — 목이 (1) 모르는 컬럼으로 정렬해도 무시하고
    통과시켰고(원칙 55번 버그를 못 잡음) (2) `limit` 을 통째로 무시했고("최근 N건만"을
    못 잼) (3) `gt` 를 항상 참으로 통과시켰다("안 읽은 수"를 못 잼). 셋을 실제 DB
    수준으로 고치고 나서야 버그가 400 으로 재현됐고 검증이 의미를 가졌다.
    🔴 **새 질의 방식(연산자·페이징·헤더)을 처음 쓸 때는 목이 그것을 진짜로 흉내내는지
    먼저 확인할 것.** 흉내내지 못하면 그 검증 결과는 근거가 아니다.
57. **화주포털(`.portal-v2`) 폼에는 네이티브 `<select>` 와 `<input type="date">` 를 쓰지
    않는다 — `components/pv2/Pv2Select.tsx` · `Pv2DatePicker.tsx` 를 쓸 것.**
    네이티브 요소의 **펼친 목록과 달력은 브라우저·OS 가 그린다** — 항목 높이·모서리·hover
    색·빈칸 문구(`연도-월-일`)를 CSS 로 바꿀 수 없어서, 트리거만 시안 모양이고 속은 옛
    모양인 상태가 된다(25차가 실제로 그랬고 26차 지적 5·6·7·8·9번이 전부 이것이다).
    🔴 **열림은 화면 전체에서 하나뿐이어야 하므로 두 컴포넌트가 같은 레지스트리
    (`pv2Popover.ts`)를 쓴다** — 따로 두면 달력을 여는 순간 드롭다운이 열린 채 겹친다.
    🔴 **접근성을 직접 넣었으니 지우지 말 것**(`role="listbox"`·`aria-expanded`·↑↓·Enter·
    Space·Esc·Home·End) — 네이티브를 버리면 브라우저가 주던 키보드 조작이 통째로 사라진다.
    🔴 **폭·flex 같은 바깥 레이아웃은 트리거가 아니라 래퍼(`wrapClassName`/`wrapStyle`)에
    준다** — 트리거에 남기면 절대 배치된 팝오버의 기준이 어긋난다.
    ⚠️ 이 원칙은 **포털 한정**이다. 관리자·공개 화면은 네이티브 `select` 그대로 두며,
    포털 안에서도 27·28차가 새로 그리는 화면에 네이티브를 다시 넣지 말 것.
58. **`box-shadow` 는 그 요소의 border-box 를 따라간다 — 체크박스·라디오에 글로우를 걸면
    원형이어도 사각형이 그려진다. 그리고 특성도가 같은 규칙끼리는 선언 순서가 이기므로,
    레이아웃이 어긋날 때 규칙 순서를 바꿔 고치지 말 것.**
    26차에 둘 다 실제로 겪었다. (a) `.portal-v2 input:focus` 에 옐로 3px 글로우를 걸었더니
    **17px 원형 라디오에 옅은 노랑 사각박스**가 생겼다 — 선택자에서
    `:not([type="checkbox"]):not([type="radio"])` 를 빼지 말고, 그 둘에는 `:focus-visible`
    로 **둥근 outline 링**을 줄 것(키보드 접근성은 유지해야 한다). (b) `.pv2-selectwrap`
    (0,0,1,0) 과 `.pv2-load-slot`(0,0,1,0) 의 특성도가 같아 뒤에 온 쪽이 이겨서 버튼 폭이
    시안과 달랐다 — 🔴 **순서로 고치면 다음에 누가 정렬할 때 조용히 되돌아간다.**
    `.pv2-selectwrap.pv2-load-slot` 처럼 **두 클래스로 특성도를 올려서** 고칠 것.

---

## 4. 완료된 주요 기능 · 4-1. 0단계 사전 점검

🔴 **`docs/history/features.md` 로 옮겼습니다.** 절 번호는 참조가 깨지지 않게 그대로 둡니다.

## 5. 다음 예정 작업 (우선순위 순)

직원 계정·권한·이력 재구조화 스펙(1~8단계)은 전부 완료되었습니다. 0단계 사전점검
(9차 세션)에서 잡았던 로드맵 ①~⑥(정산 마감·확정·잠금 → 정산방식별 수금·지급
구조 → 현장 추가비 → POD·인수증 → 클레임·사고 → 운영 대시보드)도 19차 세션까지
전부 완료되었습니다. **현재 진행 중인 트랙은 "랜딩페이지 공개 준비"**이며(1차 사전조사 →
2차 긴급 안전 수정 → 3차 로고·파비콘 → 4차 용어·메뉴·신규 페이지 → 5차 법적 문서+푸터 →
6차 스티키 헤더·법적 문서 모달·견적서 엑셀 → 7차 확정 문구 교체 → 8차 대표번호·SMS·견적서
용어 → 9차 약관 배상 조항·보험 제거 → 10차 담당자별 발신번호·견적안내 LMS →
11차 레이아웃 전면 개편·헤더 옐로 → 12차 정합성·상수·진입경로·이미지 구조 →
13차 랜딩 섹션 신설(운송관리·안전책임) → 14차 동의 절차 →
15차 거리 구간 매칭 버그 수정 →
16차 운임 기준 교체 →
17차 차급 9종 확장 → 20차 전체(3-1·3-2·3-3·3-4) → 18차 이용약관 동의 →
19차 anon RLS 정리 ① → 21차 anon RLS 정리 ②+④ → 22차 운임 매트릭스 보정 + 차급 11종 →
23차 화주포털 사전조사 → 24차 화주포털 화면 ① → 25차 화면 ②(발주 흐름) →
26차 시안 정합 → **27차 견적 흐름까지 완료**.
🔴 **차수 순서가 한 번 바뀌었다** —
20차 지시서가 *"시행일 2026-09-07이 확정되면서 약관 동의가 유일한 Go-Live 차단 코드 작업이
되어 18차로 올라갔고 가산기준은 19차로 밀렸다"*고 확정했다. 그래서 **18차=약관 동의 /
19차=가산기준 / 20차=화주포털 DB·법적 기반**이며, 20차 중 3-4만 먼저 처리했다.
그 사이 **차수 없는 작업 2건**이 있었다 — 41차 "랜딩 진입 경로"(히어로 CTA 2개 + 로그인
화면 계정 신청 링크)와 **47차 "SQL 마이그레이션 GitHub Actions 자동화"**),
사용자가 작업지시서를 차수별로 전달하는 방식으로 진행 중입니다.
**작업지시서 차수와 세션 차수가 다르므로 헷갈리지 말 것**
(1차=25차 세션, 2차=26차, 3차=27차, 4차=28차, 5차=30차, 6차=31차, 7차=32차, 8차=33차,
9차=34차, 10차=35차, 11차=37차, 12차=39차, 13차=40차, 14차=43차, 15차=44차, 16차=45차, 17차=46차, 20차 3-4=47차, 20차 3-1·3-2·3-3=48차, 18차=49차, 19차=50차, 21차=51차,
**22차=52차 · 23차=53차 · 24차=54차 · 25차=55차 · 26차=56차 · 27차=57차 · 28차=58차 ·
29차=60차 · 30차=61차** 세션(🔴 **53·54차는 같은 세션이다** —
조사를 먼저 하고 이어서 구현했다. 🔴 **59차는 차수를 쓰지 않은 P0 선행 작업이다**) — 29차는
별첨 미전달로 5차 사전조사만 수행한 세션, 36차는 지시서 없이 사용자 요청으로 진행한 문자 이력 화면,
41차는 차수 없는 소수정, **38차·42차는 각각 12차·14차의 사전조사 전용 세션(코드·DB 무변경)**.
15차 사전조사·보완조사 2회도 차수를 쓰지 않았다).
⚠️ **동의 절차가 두 번 밀렸다.** 원래 11차로 예약돼 있었는데 11차 지시서가 레이아웃 개편으로
와서 12차로, 12차 지시서가 정합성 작업으로 와서 다시 **14차**로 밀렸다. 실행 순서대로 다시
붙인 결과가 아래이며, **17차 · 20차 전체 · 18차 · 19차 · 21차 · 22차 · 23차 · 24차 · 25차 ·
26차 · 27차 · 28차 · 29차까지 끝났다** —
🟢 **Go-Live 차단이던 이용약관 동의가 49차에 해소됐다**(시행일 2026-09-07).
🔴 **19차는 가산기준이 아니라 anon RLS 정리 ①이 됐고, 21차가 ②+④(실제로 잠그기)였다**
(사용자 확정 2026-08-26). **가산기준은 미정으로 밀렸다.**
🟢 **가산기준은 22차에 대부분 처리됐다**(18톤 하향 · 8·15톤 신설 · 물품특성 2행).
🔴 **화주포털 화면 개편은 다섯 번 밀린 끝에 24·25차가 됐다** — 21·22 → 22·23 → 23·24 →
**24·25**. 23차가 화면이 아니라 사전조사가 되면서 한 번 더 밀린 것이다. 실행 순서대로 번호를
붙이는 원칙 때문이니, **예고 번호가 아니라 실제 실행 순서**를 기준으로 볼 것.
🔴 **차수가 또 밀렸다 — 일곱 번째다.** 55차 로드맵은 *"다음은 26차(견적 흐름)"* 라고
적었는데 실제 26차 지시서는 **시안 정합**이었고, 27차가 견적 흐름이 되면서 **관리자 연동
조사가 28차, 조회 흐름이 29차**로 확정됐다(사용자 결정 2026-08-28).
🔴 **예고 번호가 아니라 실제 실행 순서를 기준으로 볼 것.**
```
  27차  화주포털 견적 흐름          ✅ 완료 (57차 세션, PR #105 merge `5dbead2`)
  28차  내부관리시스템 연동 조사     ✅ 완료 (58차 세션, 보고서 547줄 · 코드 0)
  ——   P0 선행 (차수 없음)     ✅ 완료 (59차 세션 — 41차·47차와 같은 처리)
  29차  화주포털 조회 흐름          ✅ 완료 (60차 세션 — 🔴 **시안은 처음부터 있었다**)
  30차  랜딩페이지 교체              ✅ 완료 (61차 세션 — 이미지 32종 · Go-Live 차단 해소)
  31차  폼 3화면 (/quote·/apply·/customer/login)  ✅ 완료 (62차 세션, PR #109 merge
        `7d88930` — DB 변경 0 · 실사용 리뷰 **3라운드**)
  ——   도메인 확정 반영 (차수 없음)   ✅ 완료 (63차 세션, PR #110 merge `cfbcdc5`)
  ——   랜딩 소수정 + 요금 가이드 (차수 없음)  ✅ 완료 (64차 세션, PR #111 merge `83691b1`
        — 기준가 DB 실시간 연동 · 게시 6행 · 설명글 3줄 · WHY 순서 · 푸터)
  ——   랜딩 2차 개편 + 법적 문서 (차수 없음)  ✅ 완료 (65차 세션, PR #112 merge
        `284c776` — 이사 제외 · 법적 문서 모달 색 · 사업자정보 모달 · 보험 상수 ·
        WHY 아코디언 · /admin/rates 확인 창 · 실사용 리뷰 **4라운드**)
  ——   이용약관 개정 (차수 없음)     ✅ 완료 (66차 세션, PR #113 merge `c953ddc` —
        보험 보통약관 대조 · 제19조 항 7 → 8 · 면책 호 7 → 9 · TERMS_VERSION v2 ·
        🔴 **실사용 리뷰 2라운드에 「차주·보험자 1차 + 회사 중재」로 방향 전환**)
  ——   고정화물 배차 카드 사진 (차수 없음)  ✅ 완료 (68차 세션, PR #114 merge `44144b8` —
        원본 3:2 → **왼쪽 171px 잘라 576×432(4:3)** · `lib/landingImages.ts` 에 `fixed`
        키 신규 · `app/page.tsx` 의 `s.img &&` 분기는 **남겼다**)
  ——   메일 서명 로고 PNG (차수 없음)  ✅ 완료 (67차 세션, PR #115 merge `3451259` —
        `public/email/` 2종 · 🔴 **코드 변경 0**(정적 자산만) · SVG 는 메일에서 안 뜬다)
  ——   대표메일 교체 (차수 없음)      ✅ 완료 (69차 세션, PR #116 merge `1362a44` —
        `biz@wecarrylogis.co.kr` · `PRIVACY_POLICY_VERSION` v2 ·
        SiteFooter 통합(65차 ⑥ 이행) · 🔴 **DB 0**)
  ——   랜딩 WHY + 모바일 (차수 없음)  ✅ 완료 (70차 세션, PR #117 merge `3c1991d` —
        WHY 문구 4건 + 접힘/펼침 역할 분리 · 펼침을 카드에서 이어지는 본문으로 ·
        화살표를 설명글 아래로 · 모바일 여백 −816px · 차량 자동 슬라이드 32px/s ·
        🔴 **DB 0** · 실사용 리뷰 **3라운드**)
  ——   네이버 서치어드바이저 등록 (차수 없음)  ✅ 완료 (2026-09-04 — 사용자가 `main` 에
        직접 올림 `50d6c8b` · 🔴 **코드 변경 0, 세션은 서빙 확인만** ·
        🔴 `public/naverd2a4fd031fc1d5c8e06b2ca3aace4eb8.html` **절대 지우지 말 것**)
  ——   SEO 메타 보강 (차수 없음)     ✅ 완료 (PR #118 merge `887f6ff` — `lib/structuredData.ts`
        신규(Organization JSON-LD) · description 4곳 80자 이내 · `buildPageMetadata` 길이 가드 ·
        🔴 **DB 0 · 화면에 보이는 변화 0** · 🔴 「WeCarry」·`LocalBusiness` 쓰지 말 것)
  ——   카피라이트 + 랜딩 모바일 이미지 (차수 없음)  ✅ 완료 (PR #119 merge `4580959` —
        카피라이트에 `CompanyNameMark` 재사용(「(주)디자인에그 │ 위캐리 운송」) ·
        첫 서비스 사진 `eager` 로 팝인 371ms → 0 · 랜딩 이미지 10.9MB → 5.5MB ·
        🔴 **DB 0** · 🔴 `CompanyNameMark` 기본값·둘째 카드 `lazy` 를 바꾸지 말 것)
  ——   무료 대기시간 단위 확정 (차수 없음)     ✅ 완료 (2026-09-04 — 🔴 **코드 0 · DB 0**.
        25차부터 답을 기다리던 「초과 시 30분당」 단위를 **현행 유지로 확정**.
        🔴 문구와 동작이 이미 일치한다 — 계산식이 실제로 `/30` 이라 문구만 고치면 틀려진다.
        🔴 단위만 20분으로 줄이면 **대기료가 최대 2배**가 된다(그래서 안 했다))
  ——   불러온 프리셋 이름 표시 (차수 없음)     ✅ 완료 (PR #120 merge `77e8f29` — 🔴 **DB 0**.
        26차부터 답 대기하던 항목. 불러오기 드롭다운 옆에 이름을 보조로 띄운다.
        🔴 **고쳐도 지우지 않는다**(라벨이 저장·제출되지 않는 순수 표시라서) ·
        🔴 색은 `--pv2-text-2`(5.66:1) — 더 흐린 토큰은 AA 미달 ·
        🔴 모바일은 `@media` 안에 **두 클래스 규칙**이 있어야 100%가 된다(원칙 58번))
  ——   담당자 정보 화면 시안 정합 (차수 없음)  ✅ 완료 (PR #121 merge `ae8ddfb` —
        🔴 **DB 0 · 관리자·공개 화면 0**. 🟢 **이것으로 화주포털 8개 화면이 전부 pv2
        스코프가 됐다** — 54·55·56차가 「남은 것은 profile 뿐」이라 적어둔 항목이 닫혔다.
        🔴 이름은 행이 아니라 **카드 머리**(원형 아바타 + 상호 + 「수정」) ·
        🔴 `.pv2-qkv` 로 바꾸지 말 것(고정폭 라벨 + 왼쪽 정렬이라 이메일이 눌린다) ·
        🔴 수정 폼은 **데스크탑 2열 · 저장은 옐로 · 버튼은 글자 폭**(리뷰 1라운드) ·
        🔴 라벨의 `*` 는 **제출 직전 JS 검증으로 실제로 막는다**(네이티브 `required` 는
        React 핸들러보다 먼저 걸려 에러 문구가 안 뜬다) ·
        🔴 모바일 저장 폭은 `@media` 안에 **두 클래스 규칙**이라야 걸린다(원칙 58번))
  ——   보유기간 만료 파기 장치 (차수 없음)  ✅ 완료 (PR #122 merge `4010940` —
        🔴 **DB 변경 있음**(`processed_at` 컬럼 + `retention_purge_logs` 표, `_migrations` 23행) ·
        🟢 화면 변경 0. 처리방침 제3조가 고지하는 「견적 문의 1년 · 미승인 신청 6개월」을
        지우는 경로가 코드·스케줄러·DB 어디에도 없던 것을 메웠다(43차 미결 1번).
        🔴 **파기는 마이그레이션이 아니다** — `scripts/purge-expired.sql` +
        `.github/workflows/purge.yml`(매일 03:10 KST) ·
        🔴 `quote_id is null`·`company_id is null`·`status <> '승인됨'` 세 조건을 빼지 말 것
        (거래 기록 5년까지 지운다. 실측에서 **승인됨인데 company_id 가 null 인 6건**이
        나와 status 조건이 실제로 값어치를 했다) ·
        🔴 기산점은 `processed_at` 이고 `updated_at` 을 쓰지 말 것 · 백필 안 함 ·
        🔴 상한 500건 가드를 빼지 말 것)
  ——   랜딩 모션 (차수 없음)          ✅ 완료 (PR #123 merge `1375d3d` — 🔴 **DB 0 ·
        globals.css 0 · lib/ 0 · 관리자·화주포털 0** · 실사용 리뷰 **2라운드**.
        스크롤 진입 리빌 34개 · 아코디언 높이 전환 · 모달 등장 · 헤더 상태 전환.
        🔴 스코프는 `.landing-page` 다(`.landing-root` 는 없다) ·
        🔴 `useReveal` 을 인라인 스타일로 되돌리지 말 것(토큰·stagger·noscript 가 전부
        성립하지 않고 첫 페인트가 깜빡인다) · 🔴 JS 실패 대비 두 겹(noscript + try/catch)은
        **막는 경우가 서로 다르다** · 🔴 히어로는 리빌 대상이 아니다 ·
        🔴 **차량 트랙 안쪽에 리빌·`--i`·transition 금지**(70차 자동 슬라이드의 소수
        transform 을 덮어써 덜덜거림이 되돌아온다) · 🔴 아코디언 래퍼는 두 겹이어야 한다 ·
        🔴 `--mo-rise` 26px 은 지시서 상한(20px)을 넘긴 **의도한 값**이다(리뷰 1라운드) ·
        🔴 재생은 **C안**(한 화면 넘게 벗어나야 리셋) — 지시서 「한 번만 재생」은 뒤집혔고
        `farObs` 의 `rootMargin` 을 줄이면 그대로 B안이 된다)
  ——   화주포털 월별 통계 (차수 없음)  ✅ 완료 (PR #124 merge `06880e1` — 기간 프리셋
        버그 + 엑셀 보기. 이 세션과 **병행**했고 파일이 한 개도 안 겹쳤다)
  ——   이용약관 면책 보강 (차수 없음)   ✅ 완료 (PR #125 merge `cd20bfb` — 🔴 **DB 0 ·
        화면 코드 0** · `lib/legal/terms.ts` · `lib/legalInfo.ts` 둘뿐 · 실사용 리뷰 **4라운드**.
        **terms-v2 → terms-v3.** 회사가 스스로 배상을 약속하던 문장을 걷어내고
        책임 귀속을 제4조 3항·제18조 1항의 **첫 문장**으로 올렸다. 면책은 새 항·새 호 없이
        개별 호 문구만 조였다(「발생하**거나 확대된**」이 9개 호 전부에 걸린다).
        🔴 **제19조 1항의 「회사가 배상책임을 지는 경우」 조건절을 지우지 말 것** — 지우면
        제18조 1항과 모순이 되고 모순은 작성자 불이익 원칙(약관규제법 제5조 2항)으로
        고객에게 유리하게 해석된다 ·
        🔴 **「1차적으로」를 되살리지 말 것**(1·2라운드 주석이 3라운드 지시로 뒤집혔다) ·
        🔴 **「일체의 책임을 지지 않습니다」류로 더 밀지 말 것**(제7조 2호로 그 항이 통째로
        무효가 되고 지금 얻은 문장까지 잃는다 — 지금이 한계선이다) ·
        🔴 **제19조 마지막 항(고의·중과실 예외, 제2~6항)은 유일한 방어선이다** ·
        ⚠️ **항 번호가 밀렸다** — 제19조 8항 → 7항 · 제18조는 3→1·1→2·2→3 ·
        🔴 **merge = 게시가 아니다** — 제3조 3항이 **적용일 30일 전 공지**를 요구하고
        `terms-v1` 동의가 **3건** 실재한다)
  ——   설치형 앱(PWA) 전환 (차수 없음)  ✅ 완료 (PR #126 merge `e0be57c` — 🔴 **DB 0 ·
        신규 의존성 0 · 랜딩 0줄**. 화주 운송관리·내부관리를 홈 화면에 설치되는 앱으로.
        🔴 **세그먼트별 manifest 는 프레임워크가 막는다** — `public/` 정적 파일 2개 +
        `metadata.manifest` · 🔴 **middleware matcher 가 `/admin/` 아래 정적 파일을
        가로채고 있었다**(`apple-icon.png` 가 307 로 로그인 화면을 돌려줬다) —
        `PUBLIC_PATHS` 3개, **줄이지도 늘리지도 말 것** · 🔴 **캐시는 화이트리스트**
        (offline.html · `/_next/static/` · `/icons/`) — **화면·API 0건, 넓히면 화주가
        낡은 금액을 본다** · 🔴 **iOS 는 눌러서 설치되지 않는다**(안내가 유일) ·
        🔴 서비스워커 `scope` 를 주지 않는다(스크립트 위치가 곧 구역) ·
        🔴 포털 설치 버튼 CSS 는 색이 리터럴이다(`--pv2-*` 는 `.portal-theme` 에 없다))
  ——   설치형 앱 후속 수정 (차수 없음)  ✅ 완료 (PR #127 merge `48c14e5` — 🔴 **DB 0 ·
        랜딩 0줄**. PR #126 의 결함 셋을 고쳤다. 🔴 **manifest 구역에 끝 슬래시를 붙이면
        안 된다** — Next 가 `/admin/` 을 `/admin` 으로 308 로 보내는데 구역 판정이 문자열
        접두 비교라 앱이 켜지자마자 구역 밖으로 나갔다(주소 띠의 원인) · 🔴 같은 이유로
        **서비스워커가 홈을 못 맡아 홈에서는 오프라인 안내가 안 떴다** —
        `Service-Worker-Allowed` 헤더 + 등록 `scope` 로 넓혔고 **둘은 한 벌이다** ·
        🔴 **설치 신호를 하이드레이션 뒤에 들으면 놓친다** — 인라인 스크립트로 먼저 잡고,
        신호가 없어도 설치 방법을 안내한다(지운 뒤 다시 설치할 길이 없던 자리) ·
        🔴 설치 버튼은 제목 줄 오른쪽 끝 · `margin-left: auto` 를 빼지 말 것)
  ——   모바일 로그인 + 카톡 브라우저 (차수 없음)  ✅ 완료 (PR #128 merge `7a850f0` —
        🔴 **DB 0 · 신규 파일 0 · 랜딩 0줄**. 신고 두 건.
        🔴 **「로그인 화면이 확장되서 움직인다」의 원인은 `100vh` 다** — 모바일의 `100vh`
        는 주소창이 숨겨졌을 때의 큰 높이라 처음엔 넘쳐서 스크롤이 생기고, 스크롤하면
        주소창이 접히며 화면이 늘었다 줄었다 한다. `.screen-fit`(`100vh` 폴백 + `100dvh`)
        으로 교체했고 **두 줄은 한 벌이라 인라인 style 로 되돌리면 폴백을 못 둔다** ·
        🔴 **운송관리 로그인에 같은 로고가 두 번 그려지고 있었다**(12차 공용 헤더 81px +
        31차 시안 자체 헤더 66px) — 자체 헤더가 있는 화면은 공용 헤더를 얹지 않는다
        (`PATHS_WITH_OWN_HEADER`, **`PUBLIC_PATHS` 자체는 건드리지 말 것**) ·
        🔴 **모바일 한 화면 맞춤**(사용자 지시) 1,316 → **726px** — 푸터를 모바일에서만
        감추고 설치 버튼과 「← 홈으로」를 한 줄로, 여백을 조였다. **문구는 푸터 말고
        하나도 안 지웠고 여백은 더 뺄 곳이 없다** · ⚠️ **한 줄 배치와 그 `nowrap` 은
        PR #129 에 없어졌다**(「홈으로」가 헤더로 올라갔고, 그 `nowrap` 이
        안내창까지 상속되어 가로로 끌리고 있었다) ·
        🔴 **카톡 자체 브라우저에는 「홈 화면에 추가」가 없는데 UA 는 아이폰/크로미움으로
        잡혀서 있지도 않은 메뉴를 안내하고 있었다** — in-app 판정을 **맨 앞에** 두고
        카톡은 `kakaotalk://web/openExternal` 로 넘긴다(다른 앱은 표준이 없어 주소 복사) ·
        🔴 자동 전환 금지 · 🔴 버튼 문구가 모바일에서 「홈 화면에 추가」다)
  ——   모바일 입력창 확대 + 상단 뒤로가기·로그아웃 (차수 없음)  ✅ 완료
        (PR #129 merge `a71ceae` — 🔴 **DB 0 · 신규 파일 0 · 랜딩 0줄**. 신고 7건 +
        실사용 리뷰 **3라운드**.
        🔴 **입력창 확대의 원인은 16px 미만이다** — 아이폰 사파리는 확대한 뒤 스스로
        되돌리지 않아 **로그인해서 들어간 뒤에도 커진 채로 남는다.** `≤700px` 에서
        `input`·`select`·`textarea` 를 **16px `!important`** 로 올렸다.
        **`!important` 를 빼지 말 것** — 요소 선택자라 클래스(`.pv2-input`)와
        **인라인 style**(`/admin/orders` 12.5px)에 그냥 진다(빼고 실측해 확인) ·
        🟢 데스크탑 13화면에 16px 초과 입력창 0건이라 줄어드는 곳은 없다 ·
        🔴 **상단 「←」는 홈에서 그리지 않는다**(갈 곳이 없다). 설치형 앱에는
        브라우저 뒤로가기가 아예 없어서 필요한 것이다 ·
        🔴 **로그인 성공 경로에서 `setLoading(false)` 를 부르지 말 것**(단추가
        되돌아갔다 이동해 「안 눌린다」로 읽힌다) · **`router.refresh()` 를 되살리지
        말 것**(포털 세션은 localStorage 라 서버가 다시 그릴 것이 없다) ·
        🔴 **안내창 가로 끌림의 원인은 내가 넣은 `white-space: nowrap` 상속이었다** —
        모달은 색·정렬·**줄바꿈**을 자기가 선언해야 한다(65·66차와 같은 자리) ·
        🔴 **점 세 개는 `···`(가운뎃점 3개)다 — `⋯`(U+22EF)는 네모 상자로 보인다** ·
        🔴 **카톡→브라우저·사파리→앱 창 세션은 넘길 수 없다**(저장 공간이 별개다.
        주소에 실으면 계정이 샌다) — 대신 **키체인 자동 채우기 속성**을 4개 화면에
        붙였고 **변경 화면 2곳은 `new-password`** 다(안 그러면 옛 비밀번호가 채워진다) ·
        🔴 `PasswordInput` 의 `autoComplete` 에 기본값을 만들지 말 것)
  ——   안드로이드 설치 원인 + 탭 하이라이트 (차수 없음)  ✅ 완료
        (PR #130 merge `9f269ce` — 🔴 **DB 0 · 신규 파일 0**. 신고 3건, 리뷰 라운드 0.
        🔴 **앞의 두 신고(설치가 안 된다 · 아이콘이 노랗다)는 한 뿌리였다** — 아이콘
        파일은 전부 맞았고, **애초에 앱 설치가 아니라 「바로가기」가 만들어지고
        있었다**(바로가기는 manifest 를 안 보고 파비콘을 쓴다. 저장소에서 노란 것은
        랜딩용 루트 파비콘 하나뿐이다). 🔴 **아이콘 파일을 고치러 가지 말 것** ·
        🔴 **원인은 랜딩(`/`)이 서비스워커 구역(`/customer`) 밖이라는 것이다** —
        `next/link` 는 문서를 새로 받지 않아 **그 문서가 영영 제어를 못 받는다**
        (등록은 되는데 맡지를 못한다. 실측 `controller` = null) ·
        🔴 **`getRegistrations()` 만 보지 말고 `controller` 를 볼 것** — 등록만 보면
        「괜찮다」로 오판한다 ·
        🔴 고친 것은 **진입 링크 3곳을 `<a>` 로**(원칙 31 번의 의도된 예외, 주석에
        사유 명시). **`<Link>` 로 되돌리면 화면은 멀쩡하고 설치만 조용히 망가진다** ·
        🔴 **서비스워커 구역을 `/` 로 넓혀 풀지 말 것**(PWA 차수 금지) ·
        🔴 탭 하이라이트는 `html` 에 `-webkit-tap-highlight-color: transparent` 한 줄
        (상속되니 버튼마다 붙이지 말 것)과 **터치 전용 `:active` 눌림 반응이 한 벌이다** —
        한쪽만 지우면 버튼이 죽은 것처럼 느껴진다. `@media (hover: none)` 밖으로
        꺼내지 말 것(데스크탑은 hover 와 겹친다))
  ——   법적 문서 3종 화면 정리 (차수 없음)  ✅ 완료
        (PR #131 merge `44e1b61` — 🔴 **DB 0 · 신규 파일 0 · `lib/legal/` 0**.
        신고 2건, 리뷰 라운드 0.
        🔴 **31차의 「「전체 페이지에서 보기」 링크를 반드시 둔다」가 뒤집혔다** — 그때의
        근거는 **URL 이 살아 있어야 한다**였고 그건 라우트를 남기는 것으로 지켜진다.
        🔴 **`/terms`·`/privacy`·`/email-policy` 라우트를 지우지 말 것**(분쟁 시 시점
        지목 · `robots.ts` Allow · `/apply` 동의 블록의 「전문 보기」) ·
        🟢 `href` prop 은 남겼다 — **`aria-labelledby` 제목 id 용**이라 지우면 접근성이 깨진다 ·
        🔴 **`LegalDoc` 이 37차 `LandingHeader` 를 쓰고 있던 것이 「예전 폐기하기로 했던
        상단메뉴」의 정체다** — 그 항목들은 30차 리뷰 ④ 에 랜딩에서 이미 뺐고 이 세 화면만
        남아 있었다. 로고만 있는 `PublicPageHeader` 로 교체 · **되돌리지 말 것** ·
        🔴 **푸터도 같이 껐다** — 헤더만 고치면 「회사소개」가 화면 아래에 그대로 남는다.
        🟢 **내가 넓힌 판단이었고 merge 직후 사용자가 확정했다**(2026-09-08 —
        "푸터의 회사소개도 빼는 것이 맞다") · 🔴 고객센터·사업자 표시사항·법적 문서 3종
        링크는 항상 나온다(전자상거래법 제10조) ·
        ⚠️ **그때 쓴 `showPageLinks` prop 은 같은 날 없어졌다** — 바로 아래 차수가
        `/about`·`/vehicles` 를 삭제해 **켤 링크 자체가 사라졌기 때문이다.**
        🔴 그 prop 을 다시 만들지 말 것)
  ——   회사소개·차량요금 안내 화면 삭제 (차수 없음)  ✅ 완료 (PR #132 merge `811424b` —
        🔴 **DB 0 · 신규 파일 0 · 화주포털·관리자 0**. 사용자 확정 한 줄에서 시작했다 —
        *"아예 삭제해도 된다. 나중에 필요하면 새로 다시 만들면 된다."*
        🔴 **`/about`·`/vehicles` 는 이미 고아였다** — 30차 리뷰 ④ 가 랜딩 진입 경로를
        지웠고(62차 ⑩ 이 「보고만 하고 안 고침」으로 남긴 것) 바로 앞 차수가 법적 문서
        푸터 링크마저 껐다. **삭제는 그 사실을 정리한 것이다** ·
        🔴 **`components/LandingHeader.tsx`(37차)가 파일째 없어졌다** —
        `components/landing/LandingHeader.tsx`(31차 시안 헤더, `/`·`/quote`·`/apply` 가
        쓴다)와 **다른 파일이다. 헷갈리지 말 것** ·
        🔴 **`lib/companyInfo.ts` 의 `COMPANY_GREETING_*` 는 지우지 말 것** — 읽는 화면이
        0곳이지만 **인사말 초안이 남아 있는 유일한 곳**이라 회사소개를 다시 만들 때 쓴다 ·
        🟢 `app/sitemap.ts` 는 라우트에서 자동으로 뽑으므로 코드 변경 없이 8 → 6 URL ·
        🔴 `app/robots.ts` Allow 목록과 `TopNav.isPublicPath` 는 **손으로 지웠다**(원칙 11번) ·
        🟢 프리렌더 실패 **44 → 43**, 줄어든 항목이 정확히 `/about` 하나)
  ——   이용약관 추가 개정 (차수 없음)  ✅ 완료 (PR #133 merge `6e35f54` —
        🔴 **DB 0 · 화면 코드 0**. `lib/legal/terms.ts` · `lib/legalInfo.ts` 둘뿐.
        사용자 지시 3건. **terms-v3 → terms-v4.**
        🔴 **제19조 1항에 「배상책임은 실제 운송을 수행한 차주 및 그 보험자에게 있으며」를
        앞세웠다** — 「회사가 배상책임을 지는 경우」만 있으면 어떤 경우에 회사가 지는지를
        이 조가 스스로 말하지 않아 애매하다는 지적. **제18조 1항과 중복이 아니다**
        (누가 지는가 / 그럼에도 회사가 질 때 얼마까지인가) — 한쪽을 지우지 말 것 ·
        🔴 **제20조 1항 2호(14일 통지)와 5항(1년 소멸시효)을 삭제해 4개 항이 됐다** ·
        🔴 **2항 단서의 「제1항 제2호에 따라…」도 같이 지웠다** — 안 지웠으면 없는 호를
        가리키는 깨진 참조가 남는다. **악의 인도 예외(상법 제146조 2항)는 그대로다** ·
        ⚠️ **보고했고 그대로 확정된 위험** — 상법 제146조 1항 단서(2주 통지)는 약관에서
        지워도 그대로 적용되므로 얻는 것은 「안내하지 않는다」뿐이고, 법이 준 권리를
        약관으로 배제한 것으로 읽히면 2항까지 흔들릴 수 있다(변호사 검수 6번째 지점) ·
        🟢 1년 시효는 상법 제147조·제121조로 그대로 1년이라 회사 지위 무변 ·
        🔴 **30일 사전 공지는 v4 기준**(v3 이 게시 전이라 중간 판본은 불필요))
  ——   CLAUDE.md 기록 분리 (차수 없음)  ✅ 완료 (PR #134 merge `6b70a5a` —
        🔴 **코드 0 · DB 0 · 화면 변화 0.** 세션 기록 56건 + §4 를 `docs/history/` 8개
        파일로. **한 글자도 안 지웠고 md5 로 대조했다**(`51e5e1d0…` · 459,690자).
        루트 **654,627 → 138,993자**. 이 파일은 `/compact` 직후에도 **통째로 다시
        주입**돼서 압축해도 방이 안 생겼다(작업 여유 277,776 → **170,336 토큰**).
        🔴 **절 번호 §0~§9 를 다시 매기지 않았다** — 기록이 「§5」·「원칙 27번」처럼 번호로
        서로를 가리켜 한 칸만 밀려도 참조가 깨진다. §4 는 **안내 한 줄만 남긴 것**이다 ·
        🔴 **본체는 파일 분리가 아니라 `/merge` 규칙이다** — 새 기록은 `current.md` 맨 위,
        루트에는 로드맵 + 요약만. **안 지키면 다시 불어나 무의미해진다** ·
        🔴 **이력은 `grep -rn "…" docs/history/ CLAUDE.md` 로 양쪽을 함께** 볼 것 —
        한쪽만 보면 「없앴다」인지 「옮겨졌다」인지 구분되지 않는다 ·
        🔴 **8개 파일 머리의 「요약하지 마십시오」 경고를 지우지 말 것** ·
        ⚠️ **원칙은 58개**다(`^\d+\. \*\*` 로 세면 57 — 5번만 `**` 가 없다) ·
        ⚠️ **`HANDOFF.md` 가 다섯 차수 밀려 있던 것이 드러나** `/merge` 에 갱신 절을
        신설했다 — 매 차수는 **머리 버전 줄 + §6 둘뿐**, 전면 재작성은 별도 세션 ·
        ⚠️ **사용자 확인** — claude.ai 동기화에 `docs/history/*.md` 가 들어오는지 ·
        ⚠️ **3단계 재측정은 아직**이다(절감 약 336,000 토큰은 예상치))
  ——   운임기준표 v11 A장 (차수 없음)  ✅ 완료 (PR #135 merge `1da2663` —
        🔴 **DB 변경 있음**(`rate_distance_tiers` 165칸 · `_migrations` **24행**) ·
        🟢 **제품 코드 0.** 화주 청구가를 v11 로 전면 교체했다.
        🔴 **`base_fare` 는 화주 청구가다** — v10 매트릭스는 **차주 지급 기준**이라
        그대로 넣으면 **마진 0** 이 된다(v11 = ROUND(차주지급 × 1.15, -3)).
        **마진율 컬럼을 만들지 말 것** — 공개 게시가에 원가가 나간다 ·
        🔴 **×1.15 예외 세 칸은 전부 공개 게시가다**(사용자 확정) — 1톤 **40,000** ·
        5톤 **115,000** · 5톤 플러스/축 **150,000**. **첨부 엑셀과 다른 것이 정상** ·
        🔴 **차급명은 `5톤 플러스/축`**(「5톤+/축」은 화면 표기) — 완전일치라 틀리면
        15행이 **조용히** 안 바뀐다 ·
        ⚠️ 지시서는 「게시가 5개」라 했으나 실제는 **164칸 인상**(평균 ×1.22 · 인하 0) —
        실측 대조표가 잡아 승인을 다시 받았다 ·
        ⚠️ 검산은 **`Decimal`+`ROUND_HALF_UP`** 으로 — `round(x,-3)` 은 .5 경계에서
        내려가 **거짓 ❌** 를 낸다 · 🟢 165칸 4중 대조 불일치 0 · 프리렌더 43 동일 ·
        🔴 되돌리기는 `_bak_rate_distance_tiers_before_v11` 뿐이고 **되돌리면 공개
        게시가도 같이 돌아간다** ·
        🟢 **B장(혼적 3단계)은 바로 아래 차수에서 끝났다**)
  ——   운임기준표 v11 B장 · 혼적 3구간 (차수 없음)  ✅ 완료 (PR #136 merge `fceb11f` —
        🔴 **DB 변경 있음**(`mixed_loading_discount_settings` 에 `distance_label`·
        `distance_to_km` 신설 + 1행 → **3행** · `_migrations` **25행**) · 🟢 화주포털·랜딩 0.
        🟢 **이것으로 v11 지시서가 A·B 둘 다 끝났다.**
        🔴 **지시서 3-2 「거리가 계수를 고르게」를 C안으로 대체했다**(사용자 확정) —
        `standard_discount_percent` 는 **계산에 안 쓰이는 입력창 기본값**이고 실제 할인은
        건별 저장값이라, 거리가 계수를 정하면 ① 담당자 건별 조정값을 덮어쓰고
        ② **`orders` 에 `distance_km` 이 없어**(grep 0건) 오더 상세에서 재현이 안 되고
        ③ 요율표를 고치는 순간 과거 견적이 재계산된다. **되살리지 말 것** ·
        🔴 **값은 계수가 아니라 할인율(%)** — 15 / 35 / 55(= 계수 0.85/0.65/0.45) ·
        🔴 **구간 이름은 「30km 이내 / 250km 이내 / 250km 초과」** — 매칭이 운임과 같은
        「상한 이하 첫 구간」(HANDOFF §4-3 · 15차=44차 세션)이라 30.4km 가 지시서의 「31~250km」와 어긋나
        보인다. **하한 컬럼도 안 만들었다** ·
        🔴 **오더 상세는 기본값 채우기 자체를 뺐다** — 거리를 몰라 임의의 구간을 채우면
        담당자가 그것을 표준으로 믿는다 ·
        🔴 **`getLatestMixedLoadingDiscountSettings()` 를 다시 만들지 말 것**(3행이 된
        뒤에도 **조용히 한 행만** 준다) · 🔴 **`reverseMixedDiscount()` 를 지우지 말 것**
        (호출부 0곳이지만 쓸 자리가 없어진 것이다) ·
        ⚠️ **31~250km 35% 는 직접 비교 쌍 0쌍인 보간값 — 담당자 확인 권장.**
        하필 이 구간이 가장 자주 걸린다)
  ——   문서 정합 정리 (차수 없음)     ✅ 완료 (🔴 **코드 0 · DB 0 · `docs/history/` 0** —
        `CLAUDE.md`·`HANDOFF.md` 둘만. 사실과 다른 서술을 고친 것이고 새 내용이 아니다.
        🔴 **v11 이 해소한 「5톤급 재검토」가 여기에만 「아직 안 한 것」으로 남아 있었다** —
        `HANDOFF` §6 은 이미 뺐는데 이쪽은 안 빼서 두 문서가 갈렸다. 근거를 찾을 때 보는
        쪽이 이 문서라 5톤을 또 만질 뻔했다 ·
        🔴 **「원칙 NN번」 오참조 2건** — 「44차」를 「원칙 44번」으로, 「§8」을 「원칙 8번」으로
        적은 자리다. **지시서가 안 것은 하나였고 전수 확인이 하나를 더 찾았다** —
        「원칙 NN번」을 쓸 때는 §3 을 열어보고 쓸 것(스크립트는 이 차수 기록에 있다) ·
        ⚠️ **`grep -c "원칙 44번" = 0` 은 완료조건으로 쓸 수 없다** — `§7` 의
        정산 잠금 참조가 **맞는 원칙 44번**이라 지우면 안 된다 ·
        🔴 **판본은 `HANDOFF` 머리 한 줄에만 적는다** — §0 표·부록 헤더에도 적었더니
        **세 판본째 갈렸다.** 그래서 값을 맞추지 않고 표기를 없앴다 ·
        🔴 **부록 비교표는 본문에 종속이다** — 「차주·보험자 **1차** 부담」이 §5-5 의
        **되살리기 금지**(PR #125 가 「1차적」을 없앴다)와 정면으로 부딪히고 있었다 ·
        🟢 `CompanyNameMark` 사용처는 **여덟 곳**(일곱이라 적혀 있었다) · 원칙 58개 확인 ·
        🔴 **같은 날 네 곳을 더 고쳤다** — `HANDOFF` §9 「지우면 안 되는 파일」이 **넷**만
        적고 있어 **PWA 3종**(`icons/*.png`·`offline.html`·`sw.js` 2개)이 빠져 있었다
        (함정 18 도 「일곱 중 넷은」으로) · 이 문서 머리말의 「(27차)」 삭제 ·
        §2 4중 구조의 `/status` 를 실제 공개 6화면으로. 🔴 **§3 원칙 3·11·34 의 `/status`
        표기는 일부러 그대로 뒀다** — 규칙 자체는 유효하고 §3 md5 를 지켜야 한다)
  32차  내부관리 로그인·계정 개편     ✅ 완료 (PR #137 merge `1f97fc7` — 🔴 **DB 변경 있음**
        (`staff_accounts` 에 `login_id`·`must_change_password` + `lower(login_id)` 유니크,
        `_migrations` **26행**) · 🟢 **화주포털 0줄 · 공개 화면 0줄 · `globals.css` 0줄** ·
        실사용 리뷰 라운드 0.
        🔴 **진짜 이유는 「아이디가 편해서」가 아니라 「비밀번호를 잊으면 아무도 풀어줄 수
        없어서」다**(RESEND 미등록 · SMTP 미연결) — 재발급을 곁다리로 여기지 말 것 ·
        🟢 **2-0 갈림길은 실측으로 사라졌다** — `anon` 전체 조회 정책은 21차에 이미
        없어졌고 `set local role anon` 조회가 **0행**이라 별도 표 없이
        `staff_accounts.login_id` 로 갔다(정책 무변경) ·
        🔴 **아이디 값을 저장소에 안 넣었다 — 이 저장소는 public 이다**(지시서 2-2 와 다름).
        `_verify.sql` ⑪ 의 이름·이메일·아이디 **마스킹도 풀지 말 것** ·
        ⚠️ **화면 도움말의 「we 로 시작 금지」를 뺐다** — 실제 아이디 넷이 전부 `we` 다 ·
        ⚠️ **실패 제한은 표 없이 프로세스 메모리다**(IP 저장 시 처리방침 수정 필요 +
        `_migrations` 26행 유지) — **벽이 아니라 과속방지턱** ·
        🔴 **프리렌더 기준선이 43 → 44 다**(새 화면 `/admin/change-password` 하나))
  ——   이용약관 제19조 1·2·7항 개정 (차수 없음)  ✅ 완료 (PR #138 merge `a9b5ccc` —
        🔴 **DB 0 · 화면 코드 0** · `lib/legal/terms.ts` · `lib/legalInfo.ts` 둘뿐.
        **terms-v4 → terms-v5.** 사용자 픽스 지시 + 보고한 우려 셋을 확정 반영.
        1항 = 가액 신고제 + **미신고는 법령에 따름** · 2항 = 차주·보험자 + 한도는
        **제1항** + 보험 안내 · 7항 = 「제2항부터」 → **「제1항부터」**. 3~6항 무변경 ·
        🔴 **1·2항 순서를 되돌리지 말 것** — 2항이 「제1항을 따릅니다」로 1항을 가리켜
        되돌리면 참조가 자기 자신을 가리킨다 ·
        🔴 **「인도할 날의 도착지 가격」을 되살리지 말 것**(상법 제137조 1항 법문이지만
        *"일반적이지 않고 애매하다"* 로 뺐다. **빼도 상법은 그대로 적용된다**) ·
        🔴 **거래명세서·세금계산서 기준안은 사용자가 안 골랐다** — 법정 기준을 약관으로
        깎는 것이라 검수 항목이 는다 ·
        🔴 **7항의 「제1항부터」를 되돌리지 말 것** — 1항이 가액 신고 한도라 예외 밖에
        두면 「고의로 훼손해도 신고 가액까지만」으로 읽혀 그 항만 무효가 될 수 있다.
        **항을 더하거나 빼면 이 범위를 같이 고칠 것**(66차가 겪은 자리) ·
        🔴 **2항 앞 문장의 굵게 표시를 지우지 말 것**(뒤 조건절에는 안 붙인다) ·
        ⚠️ **항 번호를 쓴 옛 기록이 또 낡았다 — 내용으로 찾을 것**(세 번째다) ·
        🔴 **merge = 게시가 아니다** · ⚠️ **변호사 검수 지점 여섯 → 일곱**)
  33차  화주 항목 정합 + 정기계약   ✅ 완료 (PR #139 merge `5fef0d1` — 🔴 **DB 변경 있음**
        (`companies` 정기계약 5컬럼 + 부분 인덱스 · `_migrations` **27행**) ·
        🟢 **화주포털 0줄 · 공개 화면 0줄 · `globals.css` 0줄** · 실사용 리뷰 **4라운드**.
        🔴 **A장·B장 두 PR 이 사용자 확정으로 한 PR 이 됐다**)
  ——   정기계약 배지 후속 (차수 없음)  ✅ 완료 (PR #140 merge `079dd3b` — 🔴 **DB 0 ·
        화주포털 0줄 · 공개 화면 0줄.** 33차가 빠뜨린 **활성 화주 목록**(`/admin/customers`)에
        배지 + 사용자 지적으로 **배지를 회사명 위 줄로**(다섯 목록 전부) + 「정기계약만 보기」)
  34차  견적관리 개편 (포털 정합)   ✅ 완료 (PR #141 merge `8ddb59a` — 🔴 **DB 0 ·
        `_migrations` 27행 유지 · 화주포털 0줄 · 공개 화면 0줄 · `globals.css` 순수 추가
        (+371 / −0)** · 실사용 리뷰 **5라운드**. 🔴 **지시서가 예고한 「내부 정합 ① 견적·
        오더」가 아니라 「견적관리 화면 개편」이었다** — 오더는 35차로 넘어갔다)
  ——   다마스·라보 차급 신설 (차수 없음)  ✅ 완료 (PR #142 merge `8c0f251` — 🔴 **DB 변경
        있음**(`rate_distance_tiers` 165 → **195행** · `rate_vehicle_extra_fees` 11 → **13행** ·
        `_migrations` **28행**) · 🟢 화주포털 화면 0 · 공개 화면 0 · `globals.css` 0 ·
        랜딩 0 · 실사용 리뷰 **1라운드**.
        🔴 **값은 표가 정본이고 수식으로 재생성하지 말 것** — 라보 `400km 초과` 가
        285,000 × 0.90 = 256,500 이라 반올림 방식에 따라 **256,000 / 257,000** 으로 갈린다
        (확정값 **256,000**, 마이그레이션 ⑥ 단언이 못박는다) ·
        🔴 **`VEHICLE_TYPES_ALL`(13) 과 `VEHICLE_TYPES_PUBLIC`(11) 의 값이 처음으로
        갈렸다** — 46차가 두 배열을 나눈 이유가 실현된 첫 사례다. **같은 값으로 맞추지 말 것** ·
        🔴 **`DEFAULT_VEHICLE_TYPE` 신설**(지시서에 없던 것) — 맨 앞에 넣으면
        `VEHICLE_TYPES_ALL[0]` 이 「다마스」가 되고, 그 자리를 쓰던 **일곱 군데 중 둘이
        화주포털**이라 **톤수를 안 건드린 발주가 전부 다마스로 접수**될 뻔했다 ·
        🔴 **중거리 실측(1톤 대비 1.00·1.14)에 맞춰 올리지 말 것**(차급 역전) — 1톤 아래로
        눌러 잡았고 차이는 **운영 규칙**으로 넘겼다(지급 상한 = 청구가 ÷ 1.15) ·
        🟡 **장거리는 표본 2건 근거 등급 D** · ⚠️ **적재 한도 미확정**)
  ——   견적관리 폼 시안 정합 (차수 없음)  ✅ 완료 (PR #143 merge `5fcb9fa` — 🟢 **DB 0** ·
        `_migrations` **28행 그대로** · 화주포털 0줄 · 공개 화면 0줄 · 랜딩 0줄 ·
        `globals.css` **순수 추가**(삭제 0) · 파일 2개 · 실사용 리뷰 **1라운드(지적 3건)**.
        34차가 맞춘 것은 **배치**였고 입력칸 생김새가 남아 있었다.
        🟢 **두 폼을 나란히 재 봤더니 다른 것은 라벨과 배경 둘뿐이었다** — 그래서 포털
        부품을 끌어오는 큰 작업이 되지 않았다. **「폼이 다르다」는 지적을 받으면 먼저 잴 것** ·
        🔴 **`.quote-form` 스코프 신설** — `.field` 는 관리자 **31화면**이 공유한다.
        전역으로 고치지 말 것(34차 `.admin-wide` 와 같은 결의 장치다) ·
        🔴 **CSS 색이 리터럴인 것은 의도다** — `.pv2-*`·`--pv2-*` 를 끌어오면 포털 CSS 가
        통째로 딸려온다(③ (가)안 확정). **포털 토큰이 바뀌어도 따라가지 않는다** ·
        🔴 **필수항목 옅은 강조가 사라졌던 것은 「없던 기능」이 아니라 내가 덮어쓴 것이다** —
        `.admin-wide .quote-form .field input`(0,0,3,1) 이 `.req-marks .field-required
        input`(0,0,2,1) 을 이겼다. **순서로 고치지 말고**(원칙 58번) `.quote-form.req-marks`
        (0,0,4,1) 로 특성도를 올렸다. **포커스 복귀 규칙도 같이 올려야 한다** ·
        🔴 **스코프 클래스를 새로 만들 때는 그것이 무엇을 덮어쓰는지 먼저 볼 것** —
        「이 화면에만」은 안전해 보이지만 특성도가 올라간 만큼 기존 규칙을 이긴다 ·
        🔴 **개인·신규 고객의 필수는 고객명이 아니라 연락처다**(사용자 확정 2026-09-11).
        이름이 비면 `guest_name` 에 빈 문자열이 아니라 **`null`** 을 넣는다 —
        목록·상세가 `guest_name ||` 로 대체 표기해서 빈 문자열이면 그 대체가 안 걸린다 ·
        ⚠️ **블록 번호 배지 색은 그때 답을 못 받아 파랑으로 남겨뒀다** — 🟢 **바로 아래
        차수(PR #145)에 옐로로 바뀌었다.** 이 줄을 근거로 파랑으로 되돌리지 말 것 ·
        ⚠️ **회귀를 견적 화면에서 재지 말 것** — 폼이 열리면 스코프 **밖** `.field` 가 0개라
        비교 대상이 없어 거짓 ❌ 가 난다(차주 관리 화면에서, 「+ 차주 등록」을 눌러서 잰다))
  ——   화주 목록 페이지 나누기 (차수 없음)  ✅ 완료 (PR #144 merge `143e55d` — 🟢 **DB 0** ·
        `_migrations` **28행 그대로** · 화주포털 0줄 · 공개 화면 0줄 · 랜딩 0줄 ·
        `globals.css` **순수 추가**(+119 / −0) · 파일 6개 · 실사용 리뷰 **2라운드**.
        🟢 **HANDOFF §6 「미정」의 화주 목록 페이지네이션이 이것으로 닫혔다.**
        🔴 **지시서 전제 다섯 개가 틀렸고 3번이 「보고 후 대기」 조건이라 실제로 멈췄다** —
        `/admin/crm` 은 없고(`/admin/customers` 다) · 필터·검색·정렬이 **전부 클라이언트** ·
        **두 화면 다 모바일 카드가 없었다** ·
        🔴 **서버 전환이 아니라 클라이언트 나누기다**(사용자 (C)안 확정) — 정렬 키 6개 중
        셋이 DB 컬럼이 아니라 JS 계산값(`formatRegion`·`formatIndustry`·
        `STATUS_OPTIONS.indexOf`)이라 PostgREST `.order()` 로 옮기려면 **DB 변경**이
        필요하고 검색도 결과가 달라진다. **되돌리지 말 것** ·
        ⚠️ 그래서 **완료조건 2(페이지마다 새 요청)만 설계상 불충족**이다 ·
        🔴 **실측이 계획 하나를 지웠다** — `dispatches` 전수조회를 고칠 계획이었는데
        `verify` ⑮ 가 **배차 6행 · 오더 10행**을 보여줬다(전체화주 539 · 활성화주 7).
        무게가 아니라 **안 고쳤다**. 「무거워 보인다」로 착수하지 말고 재고 시작할 것 ·
        🔴 **페이지당 건수는 `LIST_PAGE_SIZE` 한 곳(15)** — 리뷰 1라운드에 50 → 15 ·
        🔴 **페이지 줄은 「카드의 푸터」다**(리뷰 2라운드) — `border-top` 을 빼지 말 것,
        좌우는 표 칸 여백에 맞춘다(`--lp-pad-x`: 기본 16 / `.table-compact` **8** /
        모바일 18). `.table-compact` 화면은 `<ListPagination compact />` ·
        🔴 **「폼 열림 시 목록 미렌더」 분기를 없앴다 — 다시 만들지 말 것**(그 분기가
        「신규업체등록을 눌렀는데 아무것도 안 뜬다」를 한 번 만들었다. 34차 리뷰 3라운드))
  ——   견적 폼 배지 옐로 (차수 없음)  ✅ 완료 (PR #145 merge `b0c3f2d` — 🟢 **DB 0** ·
        `_migrations` **28행 그대로** · 화주포털 0줄 · 공개 화면 0줄 · 랜딩 0줄 ·
        `globals.css` **0줄** · 파일 **1개** · 리뷰 라운드 0 · **+14 / −4**.
        바로 앞 차수(PR #143)가 답을 못 받아 파랑으로 남겨둔 한 줄이다 — 사용자 확정
        *"배지 색도 화주포털처럼 옐로우로 바꿔줘"*(2026-09-11).
        🔴 **`var(--brand-yellow)` 다 — `#FFD833` 리터럴로 다시 적지 말 것**(34차 계산창
        손잡이와 같은 규칙) · 🔴 **`var(--pv2-yellow)` 를 쓰지 말 것** — 그 토큰은
        `.portal-v2` 스코프 안에만 있어서 관리자에서는 **옐로가 안 나온다**(실측:
        상속값 `rgb(25,31,40)`). 값은 `--brand-yellow` 와 같다 ·
        🟢 **글자색은 안 건드렸다** — `#1a1a1a` 가 원래부터 포털 `--pv2-text` 와 같은
        값이라 배경만 맞추면 포털과 완전히 같아진다(그래서 한 줄로 끝났다) ·
        🔴 **같은 화면의 다른 파랑은 그대로다**(탭 버튼·라디오·계산 결과 카드) —
        지시는 **배지**였고 관리자 전체 강조색을 바꾸는 것은 다른 크기의 작업이다 ·
        ⚠️ **검증은 임시 라우트 `app/preview37-quotes/` + 목 서버로 했고 커밋 전에
        지웠다**(`.next/types` 까지) — `/admin/*` 은 middleware 가 막는다 ·
        ⚠️ 포털 `.pv2-step-num` 을 화면에서 직접 재지는 못했다(로그인 필요) —
        **두 토큰의 계산값을 나란히 재서** 같은 값임을 확인했다)
  35차  내부 정합 ① 오더·배차·정산   ← 다음 · 🟢 전제 해소 — 월정산 **(A) 확정**(2026-08-29)
  36차  내부 정합 ② 화주·차주 (CRM 항목 신설은 여기다)
  ——   admin 공개문의 배지 · 보험 문구 정합 · 접수 안내 문자
```
🔴 **내부 정합이 또 밀렸다 — 열한 번째다.** 30~32차 → 32~34차 → 33~35차 → 34~36차 →
**35~36차**. 이번에는 34차 지시서가 「내부 정합 ①」이 아니라 **견적관리 화면 개편**으로
와서 오더가 35차로 넘어갔다. **예고 번호가 아니라 실제 실행 순서를 기준으로 볼 것.**
🔴 **다음은 35차(내부 정합 — 오더·배차·정산)다.** 남은 「차수 없는 소수정」은
admin 공개문의 배지 하나뿐이다.

🔴 **화주 목록 페이지 나누기(PR #144) 이후 세션이 알아야 할 것만 요약** — 전문은 `docs/history/current.md` 맨 위:
```
  🔴 공용 부품 둘   `lib/useListPagination.ts` + `components/ListPagination.tsx`.
                  원칙 43번 `useListSearchSort` 와 같은 결이다 — **화면마다 새로 만들지 말 것.**
                  걸러·정렬이 끝난 배열을 받아 자르고, **조회는 나누지 않는다**
  🔴 건수는 한 곳   `LIST_PAGE_SIZE = 15`. 두 화면이 같이 쓴다. 바꿀 때 **번호 줄이 모바일에서
                  넘치는지 같이 잴 것**(539건이면 36페이지인데 버튼은 9개로 고정이다)
  🔴 서버로 옮기지 말 것  정렬 키 6개 중 셋이 JS 계산값(지역·업종은 3단 폴백, 상태는 배열
                  순서)이라 `.order()` 로 못 옮긴다 — 옮기면 **순서·검색 결과가 달라진다**
  🔴 resetKey      필터·검색·정렬을 **전부** 넣고 구분자는 `" "` 다. 빈 문자열로 두면
                  탭 「전체」+검색 「」 과 탭 「전」+검색 「체」 가 같은 키가 된다
  🔴 스피너 금지    페이지를 넘길 때 네트워크 요청이 없어 기다림 자체가 없다
  🔴 카드 푸터      페이지 줄은 떠 있는 글이 아니다 — `border-top` 을 빼면 마지막 행과 경계가
                  사라져 「카드 바닥에 얹힌」 모양이 된다(리뷰 2라운드 지적이 그것이었다).
                  좌우는 `--lp-pad-x`: 기본 **16** / `.table-compact` **8** / 모바일 **18** —
                  `.table-compact` 화면은 `<ListPagination compact />` 로 켤 것
  🔴 분기 제거      `{!showForm && (` 를 **다시 만들지 말 것** — 539행 시절의 증상 완화였고,
                  그 분기가 「신규업체등록을 눌렀는데 아무것도 안 뜬다」를 한 번 만들었다.
                  🟢 `contain: layout style` 은 남겼다(행 수와 별개로 유효하다)
  🔴 모바일 카드    두 화면 다 없었다 — `AdminMobileList` 는 견적·오더·배차·정산 넷에만 있었다.
                  드롭다운·버튼은 **`action`** 에 넣을 것(거기에만 stopPropagation 이 걸린다)
  🟢 실측이 줄인다  「무거워 보인다」로 착수하지 말 것 — `dispatches` 전수조회를 고치려다
                  `verify` ⑮ 로 **배차 6행**을 확인하고 접었다. ⑮ 가 그 측정으로 남아 있다
  ⚠️ 안 한 것      완료조건 2(페이지마다 새 요청, 설계상) · 페이지당 건수 선택 UI ·
                  360px 번호 두 줄(가로 넘침 0이라 그대로 둔다)
  ⚠️ 검증 방법      `/admin/*` 은 middleware 가 막는다 — `app/pgcheck/*` 에 re-export 해서
                  쟀고 커밋 전에 지웠다. 🔴 지운 뒤 **`.next/types/app/pgcheck` 도** 지울 것
```

🔴 **견적관리 폼 시안 정합(PR #143) 이후 세션이 알아야 할 것만 요약** — 전문은 `docs/history/current.md` 맨 위:
```
  🔴 `.quote-form`   견적 등록 폼 전용 스코프다(폼 태그 `className="req-marks quote-form"`).
                    `.field` 는 관리자 **31화면**이 공유하니 전역으로 고치지 말 것 —
                    이 클래스의 존재 이유가 그 유혹을 막는 것이다(34차 `.admin-wide` 와 같은 결)
  🔴 특성도 사고      내가 넣은 `.quote-form .field input`(0,0,3,1) 이 기존 필수항목 강조
                    `.req-marks .field-required input`(0,0,2,1) 을 이겨 **조용히 없앴다.**
                    `.quote-form.req-marks`(0,0,4,1) 로 **올려서** 고쳤다 — 🔴 **순서로 고치지
                    말 것**(원칙 58번). **포커스 복귀 규칙도 한 벌이라 같이 올려야 한다**
  🔴 교훈           **스코프 클래스를 새로 만들 때 그것이 무엇을 덮어쓰는지 먼저 볼 것.**
                    「이 화면에만」은 안전해 보이지만 특성도가 올라간 만큼 기존 규칙을 이긴다
  🔴 색은 리터럴     `#888378` 등은 포털 **실측치를 옮겨 적은 것**이다. `.pv2-*`·`--pv2-*` 를
                    끌어오면 포털 CSS 가 통째로 딸려온다 — 포털 토큰이 바뀌어도 안 따라간다
  🟢 먼저 재라       「폼이 다르다」는 지적에 두 화면을 나란히 쟀더니 **다른 것은 라벨과 배경
                    둘뿐**이었다. 안 쟀으면 포털 부품을 통째로 옮기는 작업이 됐을 것이다
  🔴 개인고객 필수    **고객명이 아니라 연락처**다(사용자 확정). 이름이 비면 `guest_name` 에
                    빈 문자열이 아니라 **`null`** — 목록·상세가 `guest_name ||` 로 대체 표기한다
  🔴 두 칸 폭        「화주 업체 검색」은 `.form-grid` **밖**이라 전체 폭을 먹고 있었다
                    (`.quote-form-half` 448px) · 「거리」는 `gridColumn: "1 / -1"` 이었다.
                    🔴 `max-width` 를 `width` 로 바꾸지 말 것 · 품목·특이사항 전체 폭은 일부러 남겼다
  🟢 배지 색         **PR #145 에 옐로(`var(--brand-yellow)`)가 됐다** — 이 차수에는 파랑으로
                    남겨뒀던 자리다. 낡은 줄을 보고 파랑으로 되돌리지 말 것
  ⚠️ 회귀 측정       **견적 화면에서 재지 말 것** — 폼이 열리면 스코프 밖 `.field` 가 0개라
                    거짓 ❌ 가 난다. 차주 관리 화면에서 **「+ 차주 등록」을 눌러** 잰다
  ⚠️ 목 가드         `"… .quote-form" not in s` 는 34차의 `.quote-form-layout` 에 **부분문자열로
                    걸려** 통과한다 — 정확한 선택자로 쓸 것(원칙 56번)
  🔴 `won()`        이 파일에서 **원래부터 사용처 0** 이다(`origin/main` 에서도). 내가 만든 죽은
                    코드가 아니니 「정리」하지 말 것
```

🔴 **다마스·라보(PR #142) 이후 세션이 알아야 할 것만 요약** — 전문은 `docs/history/current.md` 맨 위:
```
  🔴 차급은 13종   `VEHICLE_TYPES_ALL` 에 **다마스·라보가 맨 앞**이다. 배열 순서가 곧
                  `/admin/rates` 열 순서이자 드롭다운 순서 — **끝에 붙이지 말 것**
  🔴 두 배열 갈림  `PUBLIC` 은 **11종 그대로**다(공개 폼 `/quote`·`/apply`). 값이 다른 것이
                  정상이고 **같은 값으로 맞추면 공개 화면에 내부 전용 차급이 샌다**.
                  ⚠️ `HANDOFF` §5-3 이 「6종」이라 적고 있었는데 **실제는 11종**이었다
  🔴 기본값 상수   `DEFAULT_VEHICLE_TYPE = "1톤"`. **`VEHICLE_TYPES_ALL[0]` 을 쓰지 말 것** —
                  맨 앞이 바뀌면 화주포털 발주요청 기본값이 같이 바뀐다(일곱 군데였다)
  🔴 값 재생성 금지 라보 400km 초과가 **256,000** 이다. 수식으로 만들면 257,000 이 된다
  🔴 「싼 차」 아님  중거리(31~200km) 실측이 1톤과 **동가(다마스)·+14%(라보)** 다. 짐이 아니라
                  **기사 시간**이 값을 정한다 — 표는 눌러 놓았고 차이는 운영 규칙이다
  🔴 대기료 한 파일 운임과 대기료를 쪼개면 그 차급 대기료가 **조용히 0원**이 된다(16차)
  🔴 ord 목록      마이그레이션 ⑤ 의 역전 검사 목록을 차급 추가 때마다 갱신할 것 —
                  안 하면 새 차급이 **조용히** 빠진다(이번에 「빠진 차급이 있으면 멈춤」 단언 신설)
  🟢 차급 무관     `rate_surcharges`·`insurance_rate_settings`·`mixed_loading_discount_settings`
                  는 전부 차급 컬럼이 없다 — 차급을 늘려도 손댈 것이 없다
  🔴 혼적 실측값   30km 구간은 **20%** 다(15% 는 낡았다). 20 / 35 / 55
  🔴 nowrap 두 곳  `/admin/rates` 거리구간 칸과 금액(`UnitAmount`) — 빼면 「이내」·「원」이
                  아랫줄로 내려간다(13차급이라 칸이 99px·92px 다)
  ⚠️ 안 한 것      적재 한도 확정 · 배차 담당자 운영 규칙 전달 · 상차 시각 지정 가산(22차 미룸)
  ⚠️ 줄 수 재기    칸 높이 ÷ line-height 로 재지 말 것(패딩이 섞인다) · `Range` rect 의 top 을
                  Set 으로 세지 말 것(작은 span 이 섞이면 같은 줄도 2줄로 잡힌다)
```

🔴 **34차(PR #141) 이후 세션이 알아야 할 것만 요약** — 전문은 `docs/history/current.md` 맨 위:
```
  🔴 배치만 맞췄다   포털 부품(`Pv2Select`·`Pv2DatePicker`·`.pv2-*`)을 **하나도 안 가져왔다.**
                    `.portal-v2` 스코프 전용이라 끌어오면 관리자 31화면 CSS 가 딸려온다
  🔴 `only` prop     `PickupDropoffContactFields` 의 한쪽만 그리는 모드는 **견적 폼 전용**이다.
                    안 주면 예전 그대로라 나머지 다섯 화면은 0줄 — 그 모드에 `grid-column`
                    span 을 심으면 다섯 화면 배치가 같이 망가진다
  🔴 알림 정의처     「수주인데 오더 없는 견적」은 `lib/unlinkedWonQuotes.ts` 한 곳이고 화면
                    넷이 쓴다(TopNav 배지 · 견적 목록 · 오더 목록 · 오더 상세). 화면에 다시
                    적으면 **배지와 화면이 갈린다** — 그게 「알림이 안 없어진다」의 뿌리였다
  🔴 「견적 연결」    오더 상세의 그것을 지우지 말 것 — **이미 만든 오더를 뒤늦게 잇는 유일한
                    길**이다. 없으면 배지를 지우려고 **중복 오더**가 생긴다(실측 고아 3건)
  🔴 폭은 한 곳      `--admin-max` 1360px. `.container` 자체를 고치지 말 것 — 화주포털 7화면과
                    공개 화면 6개가 같이 쓴다. 상단바는 래퍼 밖이라 따로 넓혔다
  🔴 폭 ≠ 칸 폭      `.form-grid` 는 `auto-fill` 이라 넓히면 **열이 는다**(견적 폼이 2열 282px
                    → 4열 203px 로 더 좁아졌다). 최소 폭을 올리고 견적 폼은 2열로 못박았다
  🔴 홈 카드         4칸 2줄을 **못박은 것**이다(`auto-fill` 이라 폭 따라 6열이 됐었다).
                    1행=견적·오더·배차·정산 / 2행=화주·활성화주·차주·운임(3라운드에 뒤집혔다)
  🔴 모바일 목록     네 화면은 **데스크탑 표 + 모바일 카드 별개 JSX**(원칙 13번).
                    `AdminMobileList` 를 쓰고, 배차 상태 목록은 데스크탑과 **같아야** 한다
                    (「접수중」 제외 — 한쪽만 고치면 모바일에서만 되돌릴 수 있게 된다)
  🔴 떠 있는 계산창  데스크탑에는 **한 겹도 안 씌운다**(감싸면 `sticky` 가 조용히 멈춘다) ·
                    세로만 이동 · 가로는 **CSS 가 가운데**(인라인 `left` 를 주지 말 것) ·
                    손잡이 옐로는 `--brand-yellow`(리터럴로 다시 적지 말 것)
  🔴 「당착/내착」    `quotes` 에 컬럼을 만들지 않았다 — `notes` → `special_notes` 로 이미
                    끝까지 이어진다. 만들면 오더 전환이 안 읽어 **지금보다 일찍 끊긴다**
  ⚠️ 안 한 것        계산창 위치 기억 · `/api/customer/update-contact` 서버 검증 ·
                    PR #141 본문 검증표 4번이 낡음(정정은 `globals.css` 주석에 있다).
                    🟢 **화주 목록 페이지네이션은 PR #144 에 끝났다**
  🟢 진단 자산       `_verify.sql` ⑬ 이 「알림이 안 없어진다」 진단용으로 남아 있다
```

🔴 **33차(PR #139) 이후 세션이 알아야 할 것만 요약** — 전문은 `docs/history/current.md` 맨 위:
```
  🔴 정의처 하나   `lib/companyFields.ts` 가 화주 항목의 **유일한 정의처**다. 화주가 만들어지는
                  입구 셋(등록·수정·승인)이 이 파일을 읽는다. **화면 파일에 필드 배열을
                  다시 만들지 말 것** — 그게 이번에 없앤 상태다(등록 25 · 수정 54 · 승인 19)
  🔴 축이 다르다   `companies.status` 에 「정기계약」을 넣지 말 것. 「정기계약 화주인데 지금
                  새 견적 협의 중」을 표현할 수 없게 된다. 마이그레이션 단언이 막는다
  🔴 repeat_customer  재사용 금지 — 정산이 `오더수 > 1` 이면 **자동으로 덮어쓰는 실적
                  파생값**이다. 「재거래 여부」와 「정기계약」이 나란히 보이는 것이 정상
  🔴 종료일       지난 계약에는 배지가 없다(상세에만 「종료됨」). **종료일 당일은 유효**다.
                  「체크가 켜져 있는데 배지가 없다」는 의도된 동작
  🔴 화주 비노출   포털·견적서·엑셀 **0줄**. `RecurringContractBadge` 를 `app/customer/**` 에 쓰지 말 것
  🔴 B장 설계     견적·오더·배차가 **이미 `companies(...)` 를 조인**해서 select 에 컬럼 두 개만
                  더했다. 집합 조회 API 로 떼지 말 것 — 「목록은 떴는데 배지만 조용히
                  사라지는」 실패 모드가 새로 생긴다
  🔴 `<option>`   배차 등록의 오더 선택 드롭다운에는 배지를 못 붙인다(브라우저가 평문으로 그린다)
  🔴 배지는 5곳    화주 관리 · **활성 화주** · 견적 · 오더 · 배차. **활성 화주는 33차가 빠뜨려
                  PR #140 에 추가했다** — 표시를 확산할 때는 그 값을 보여줄 화면을 전수로 훑을 것
  🔴 배지 자리     **회사명 위 줄**이다(`block` prop). 이름 옆에 붙이면 `cell-nowrap` 칸이
                  넓어져 다른 칸을 민다. 🔴 **호출부에서 `<div>` 로 감싸지 말 것** — 배지가
                  없는 행에 **빈 줄이 남는다**(컴포넌트가 `null` 을 돌려주기 때문)
  🔴 대시보드     기존 `companies` 조회를 재사용하지 말 것(최근 12개월 거래분만 담는다) ·
                  「활성」을 SQL 로 다시 쓰지 말 것 · **조회 실패를 0 으로 내려보내지 말 것**
                  (400 으로 통일하지 않은 것도 의도다) · **개수 대신 명단**을 준다(길이가 곧 개수)
  ⚠️ 사용자 확인   `/apply` 신청 → 승인 시 빈칸(완료조건 5) · `staff` 롤 권한 회귀
  🟢 진짜 무게     화주 **539건**을 한 번에 그리던 구조는 **PR #144 에 해소됐다**(15행씩).
                  「폼 열림 시 목록 미렌더」 분기도 그때 없앴다 — 🔴 **다시 만들지 말 것**
  🔴 CRM 항목     업종·잠재등급·주요 노선 등 **새 항목 신설은 36차 범위**다. 이번은 맞춘 것뿐
```

🔴 **32차(PR #137) 이후 세션이 알아야 할 것만 요약** — 전문은 `docs/history/current.md` 맨 위:
```
  🔴 로그인은 아이디   `/admin/login` 은 `/api/admin/staff-login`(service_role)이 login_id 로
                      행을 찾아 **그 행의 email 로** 로그인시킨다. 화면은 Auth 를 직접 안 부른다
  🔴 이메일은 연락처   라벨 3곳이 「담당자 이메일(연락용)」이다. 「포털과 통일하자」로
                      합성 이메일로 갈아엎지 말 것 — 복구 경로를 잃는다
  🔴 실패는 한 종류    `lib/staffLogin.ts` 의 `LOGIN_FAILED_MESSAGE` 하나. 잠금 문구만 다른데,
                      그 판정은 계정 존재를 말해주지 않아서 갈라도 새는 것이 없다
  🔴 강제 변경        `must_change_password` → middleware 가 `/admin/change-password` 로 보낸다.
                      **재직 확인 뒤**에 있어야 하고(퇴사자가 새어 나간다), 그 라우트를
                      지우거나 `PUBLIC_PATHS` 에 넣지 말 것
  🔴 재설정 API       서버에서 role='admin' 재확인 + **대상이 실제 직원인지도** 확인
                      (안 하면 화주포털 계정 비밀번호까지 바뀐다) · 비밀번호와 플래그를
                      **한 호출로** 바꾼다 · `user_metadata` 는 병합이 아니라 **교체**다
  🔴 판별자는 문자열   `kind: "ok"|"failed"|"locked"` — `strict: false` 라 boolean 으로는
                      타입이 안 좁혀진다(실제로 컴파일 에러가 났다)
  🟢 아이디는 바꿔도 됨 평범한 컬럼이라 바꿔도 비밀번호는 그대로다. **포털 아이디는 반대**
  🔴 public 저장소     직원 실명·이메일·아이디를 마이그레이션이나 verify 출력에 그대로 쓰지 말 것
  ⚠️ 안 만든 것        재발급 안내 문자(화주쪽에는 있다) · 지속 저장 실패 제한 · IP 기반 제한
```

🔴 **공개 화면이 6개가 됐다(PR #131·#132) — 다음 세션이 가장 먼저 알아야 할 것** —
전문은 위 두 「차수 없음」 기록:
```
  색인 대상 6개        `/` · `/quote` · `/apply` · `/terms` · `/privacy` · `/email-policy`
                      (= `sitemap.xml` 의 6 URL). ⚠️ 여기에 noindex 인 포털 진입 2개
                      (`/customer/login` · `/customer/support-verify`)가 더 있다
  🔴 삭제됐다          `/about`(회사소개) · `/vehicles`(차량·요금 안내) — 2026-09-08.
                      **없어진 것이 아니라 없애기로 확정한 것이다.** "왜 없지" 하고
                      되살리지 말 것. 필요해지면 **신규 제작**이다
  🔴 헤더 2종뿐         `components/landing/LandingHeader.tsx`(31차 시안 — `/`·`/quote`·
                      `/apply`) · `components/PublicPageHeader.tsx`(로고만 — 법적 문서
                      3종 + `/customer/login`·`/customer/support-verify`).
                      ⚠️ `components/LandingHeader.tsx`(37차)는 **파일째 없어졌다**
  🔴 푸터 링크          `SiteFooter` 에는 **법적 문서 3종뿐**이다(전자상거래법 제10조).
                      일반 페이지 링크 배열(`FOOTER_LINKS`)과 `showPageLinks` prop 은
                      **둘 다 없앴다 — 다시 만들지 말 것**
  🔴 라우트는 남긴다     `/terms`·`/privacy`·`/email-policy` 는 **모달과 별개로 살아 있어야
                      한다**(분쟁 시 시점 지목 · `robots.ts` Allow · `/apply` 「전문 보기」).
                      모달 하단 「전체 페이지에서 보기」 링크만 없앤 것이다
  🔴 지우지 말 것        `lib/companyInfo.ts` 의 `COMPANY_GREETING_*` — 읽는 화면은 0곳이지만
                      **인사말 초안이 남은 유일한 곳**이다
  ⚠️ 곁다리 발견        `BackToHomeLink` 의 「왔던 자리로 복귀」는 **30차 랜딩 교체 이후
                      한 번도 동작하지 않았다**(`?from=landing` 을 붙이는 곳이 0곳).
                      지금은 항상 `/` 맨 위로 간다 — 고치지 않았다(범위 밖)
  🟢 프리렌더 기준선     **44** (⚠️ 이 줄은 한동안 **43** 이라고 적혀 있었다 — `/about` 이
                      빠져 43 이 된 뒤 **32차가 `/admin/change-password` 를 더해 44** 가
                      됐는데 여기만 안 고쳤다. `/vehicles` 는 64차 ③ 이후 동적 라우트라
                      원래 그 목록에 없다)
```

🔴 **담당자 정보(PR #121) 이후 세션이 알아야 할 것만 요약** — 전문은 위 「차수 없음:
담당자 정보 화면 시안 정합」:
```
  🔴 포털 페이지     `<main className="container">` 를 만들지 말 것 — 셸이 이미
                    `.pv2-main > .pv2-main-inner` 로 감싼다. 페이지는 조각만 돌려준다
  🔴 값 오른쪽 정렬  `.pv2-prof-*` 를 새로 만든 이유다. `.pv2-qkv` 는 고정폭 라벨 +
                    왼쪽 정렬이라 이메일처럼 긴 값이 눌린다
  🔴 `overflow-wrap: anywhere`  빼지 말 것 — 이메일은 공백이 없어 칸을 뚫는다
  🔴 수정 중 아바타  되살리지 말 것 — 이름 칸을 고치는 동안 **옛 이름의 첫 글자**를
                    계속 보여줘 화면이 스스로 어긋난다
  🔴 저장은 옐로     발주요청 제출(`.pv2-submit`)과 같은 어휘다. 검정으로 되돌리면
                    이 카드에서 취소보다 지나치게 무겁다
  ⚠️ 서버 검증 없음  `/api/customer/update-contact` 는 여전히 빈 값을 받는다 —
                    화면에서만 막는다(범위 밖으로 뒀다)
  ⚠️ 답 대기 1건    부제의 「같은 회사의 다른 담당자 계정에는…」 — 캡처 두 장 모두에
                    없지만 정보 손실이라 임의로 빼지 않았다(빼려면 한 줄 삭제)
  🔴 prettier       이 저장소에는 설정이 **없다** — 기본값(80칸)으로 돌리면 diff 가
                    통째로 부푼다. 포맷터를 임의로 돌리지 말 것
```

🔴 **카피라이트 + 랜딩 이미지(PR #119) 이후 세션이 알아야 할 것만 요약** — 전문은 위
「차수 없음: 카피라이트 + 랜딩 모바일 이미지」:
```
  🔴 카피라이트     상호는 `<CompanyNameMark />` 다 — 세 곳(랜딩 푸터 · 공용 푸터 ·
                  운송관리 로그인)에서 문자로 다시 적지 말 것. 「/」는 세로 구분선이다
  🔴 기본값 금지    `CompanyNameMark` 의 `#c4c4c4`·9px 기본값을 바꾸면 **견적서 4곳**
                  (상세·print 2종·사업자정보 모달)이 같이 바뀐다. 카피라이트는
                  `separatorColor="currentColor"`·`separatorGap={7}` 로만 다르게 준다
  🔴 COMPANY_LEGAL_NAME  지우지 말 것 — 사업자 표시사항 「상호」·브랜드 고지·법적 문서가
                  계속 쓴다. **카피라이트 줄에서만 빠졌다**
  🔴 「위캐리 운송」  붙여 쓰지 말 것(실행계획 §0-5 전략 키워드)
  🔴 첫 사진 eager  `app/page.tsx` 서비스 카드 **첫 장만** `loading="eager"` 다.
                  `lazy` 로 되돌리면 팝인(회색 상자 371ms)이 되살아난다.
                  🔴 **둘째 카드부터는 lazy 유지** — 넷 다 eager 로 만들지 말 것
  🔴 이미지 원본    히어로·CTA·service-02·03 은 **품질 90 재인코딩본**이다(크기·구도 동일).
                  원본이 필요하면 **61차 커밋**에서 꺼낼 것. 다시 인코딩하지 말 것(세대 손실)
  🔴 안 건드린 것   service-00·01(이득이 작다) · service-04-moving(wecarry24.co.kr 이 쓴다) ·
                  TMS PNG 3.6MB(화면 캡처라 PNG 가 맞다 — WebP 전환은 별도 판단)
  🔴 FCP·LCP      이 환경에서 재지 말 것 — 프록시가 폰트 CDN 을 막아 그 대기가 섞인다.
                  믿을 수 있는 것은 **전송 바이트**와 **요소 타이밍**뿐이다
  ⚠️ 재현 조건      `domcontentloaded` → 1.5초 대기 → **setTimeout 으로 벽시계 1.5초** 스크롤.
                  `load` 로 기다리거나 rAF 로 재면 재현되지 않는다(위 ⑥)
```

🔴 **SEO 메타(PR #118) 이후 세션이 알아야 할 것만 요약** — 전문은 위 「차수 없음: SEO 메타 보강」:
```
  🔴 JSON-LD 목적    SEO 일반이 아니라 **동명 회사 구별**이다(「위캐리」가 물류업에만 셋).
                    `identifier` 의 사업자등록번호·허가번호를 지우면 만든 이유가 없어진다
  🔴 「WeCarry」 금지  JSON-LD `name` 에 영문을 넣지 말 것 — 경쟁사 블로그와 겹쳐 구별이
                    흐려진다. ⚠️ 화면의 시각 브랜딩이 영문인 것은 별개다(26차 확정)
  🔴 LocalBusiness   쓰지 말 것 — 방문 사업장을 뜻하고 스마트플레이스 포기 결정과 어긋난다
  🔴 루트 배치        공개 화면마다 붙이지 말 것 — 새 경로에서 빠뜨린다(원칙 11번)
  🔴 description     **80자 이내**(네이버 「간단체크」 권고). `buildPageMetadata` 가
                    `og:description` 에도 같은 값을 넣으므로 **한쪽만 고칠 수 없다**
  🔴 길이 가드        `DESCRIPTION_MAX_LENGTH` + 빌드 로그 경고 — 지우지 말 것.
                    description 은 화면에 안 보여서 넘겨도 아무도 모른다
  ⚠️ 랜딩 허가번호    80자 제약으로 뺐다. JSON-LD·/about·푸터에 남아 있다 —
                    되살리려면 다른 문장을 그만큼 줄일 것
  ⏸️ 미착수          콘텐츠 페이지 · IndexNow · 파비콘 · `sameAs`(블로그 개설 후) ·
                    🔴 `keywords` 메타는 **일부러 안 넣었다**(스팸 신호 위험)
```

🔴 **70차(랜딩 WHY + 모바일) 이후 세션이 알아야 할 것만 요약** — 전문은 위 70차 ①~⑩:
```
  🔴 desc / detail  접힘 = 짧은 소개 · 펼침 = **이어지는 설명**. 되풀이하지 말 것.
                    05(보험)가 본보기다 — 나머지 넷을 거기 맞춘 것이다
  🔴 「분실」 금지    보험약관이 **면책으로 정의한 낱말**이다(66차 ⑥). 「없어지거나」로 쓴다
  🔴 펼침은 카드가 아니다  흰 배경·테두리·radius·안쪽여백 0 · 글자는 desc 와 **완전히 동일**.
                    2026-09-02 의 「부가 설명 카드」 확정을 뒤집은 것이니 되살리지 말 것
  🔴 화살표         제목 옆이 아니라 **설명글 바로 아래**. `<summary>` 밖으로 빼지 말 것.
                    펼친 상태에서 두 글 사이에 놓이는 것은 **「지금대로」로 확정**됐다
  🔴 모바일 여백     전부 `@media (max-width:700px)` 안이다. **데스크탑 0**. 더 줄이지 말 것
  🔴 자동 슬라이드   **정수는 scrollLeft · 소수는 안쪽 줄 transform** 이 나눠 싣는다.
                    브라우저가 scrollLeft 를 정수로 반올림해서 덜덜거리기 때문이고,
                    **둘 중 하나만 쓰면 그 증상이 그대로 돌아온다**
  🔴 `.landing-vehicle-track`  데스크탑에서 `display: contents` — 지우면 그리드가 깨진다
  🔴 스크롤 스냅     자동 슬라이드를 죽여서 없앴다. 되살리지 말 것
  ⚠️ 운임할인·적립·캐시백  **실제로 운영돼야 하고 조건·기간을 함께 알려야 한다**(표시광고법)
```

🔴 **약관 현재 상태는 terms-v4 다(PR #133) — 아래 두 요약보다 이것이 먼저다** —
전문은 위 「차수 없음: 이용약관 추가 개정(terms-v4)」:
```
  🔴 제19조 1항   **차주·보험자 우선 → 그럼에도 회사가 질 때의 한도** 두 겹이다.
                 제18조 1항과 겹쳐 보여도 **중복이 아니다**(누가 지는가 / 얼마까지인가) —
                 한쪽을 「정리」로 지우면 남는 쪽이 다시 애매해진다.
                 조건절에는 **강조를 붙이지 않는다**
  🔴 제20조는 4개 항  인수 시 이의제기 · 유보 없는 수령 시 책임 소멸 · 자료 제출 · 처리 안내.
                 **「14일 이내 통지」 호와 「1년 소멸시효」 항은 삭제됐다** —
                 옛 기록이 「제20조 1항 2호」·「5항」을 가리키면 그건 낡은 것이다
  🔴 삭제 금지     제20조 2항의 **악의 인도 예외**(상법 제146조 2항) — 14일 호를 뺀 지금
                 **2항에 남은 유일한 예외**다 · 제19조 마지막 항(고의·중과실 예외)
  🔴 제17조       통지 기간을 새로 만들지 말 것(지우기로 한 것을 옮기는 셈이다)
  ⚠️ 위험         상법 제146조 1항 단서(2주 통지)를 약관에서 배제한 것이 약관규제법
                 제7조 2호를 통과하는지 — **변호사 검수 지점이 다섯 → 여섯이 됐다**
  🟢 1년 시효      약관에 없어도 상법 제147조·제121조로 그대로 1년이다(회사 지위 무변)
  🔴 판본         **terms-v4**. v3 이 게시되기 전에 v4 가 됐으니 **30일 공지는 v4 기준**
```

🔴 **⚠️ 아래 66차 요약은 「차수 없음: 이용약관 면책 보강(terms-v3)」(PR #125)에 세 곳이
낡았고, 「이미 있음」 줄은 PR #133 에 한 번 더 낡았다 — 그 두 차수 기록을 먼저 읽을 것.** ① 「차주·보험자 **1차** 부담」의 **「1차적」이
없어졌다**(사용자 지시로 「배상책임은 차주 및 그 보험자에게 **있습니다**」). ② 「삭제 금지」로
적힌 **제18조 3항 마지막 문장이 그 차수에 삭제됐다**(항 순서도 3→1 로 바뀌어 지금은 1항이다).
③ **제19조가 8항 → 7항**이라 고의·중과실 예외는 **7항**이고 범위 참조도 「제2항부터
제6항까지」다.

🔴 **66차(이용약관 개정) 이후 세션이 알아야 할 것만 요약** — 전문은 위 66차 ①~⑰:
```
  🔴 방향     「차주·보험자 1차 부담 + 회사 중재」다(제18조 3항). 34차의 「회사가 배상
              주체」 설계는 **PR #113 리뷰 2라운드에 뒤집혔다** — 옛 기록으로 되돌리지 말 것
  🔴 삭제 금지 제18조 3항 **마지막 문장**(「회사 자신의 배상책임은 제1·2항 및 제19조에
              따른다」) · 제19조 **8항**(고의·중과실 예외 — 이제 유일한 방어선) ·
              제19조 5항의 **「그로 인하여 발생하거나 확대된」 인과 한정**
  🔴 되살리기 금지  제19조 2항의 「보험금 지급 여부와 관계없이 회사가 배상한다」 ·
              제19조 7항의 과실 경합 「다만」 단서 · 랜딩 WHY 05 의 「배상해 드립니다」 ·
              5항에서 뺀 두 호(살아있는 동물 · 법령상 제한 — 제12조와 충돌한다)
  🔴 1순위    **확정운임 → 상법 제119조 2항 운송인 의제** 가능성. 그래서 「회사는 책임이
              없다」로 더 밀지 않았다 — 무효가 되면 한도·면책까지 같이 잃는다
  🟢 이미 있음 무과실 면책 · 가액 신고제 · 고가물 특칙 · 특별손해 배제 · 면책 9호 ·
              유보 없는 수령 시 책임 소멸 · 제12조 금지.
              ⚠️ **「14일 통지」와 「1년 소멸시효」는 PR #133 에 삭제됐다**(위 블록).
              「면책조항을 더 넣자」가 나오면 **새 항이 아니라 개별 호 문구를 조일 것**
  ⚠️ 선행조건  **변호사 검수**(보험사 문의는 취소됐다 — 66차 ⑬). 짚을 곳은 66차 ⑮ — ⚠️ PR #133 에 여섯
```
🟢 **31차는 62차 세션에 끝났다** — `/apply` 동의 연속성이 핵심이었고 **왕복 시험과
롤백 경로를 둘 다 실제로 태워 확인했다**(위 62차 ①). 🔴 **실사용 리뷰 3라운드에서 내
판단 둘이 뒤집혔으니 62차 ⑬ 을 반드시 읽을 것** — `/status` 를 라우트까지 지웠고
(되살리지 말 것), 현장 3항목을 넣으면서 **처리방침 제2조 두 행을 다시 썼다.**
🟢 **29차는 60차 세션에 끝났다** — 🔴 *"시안이 있어야 착수한다"* 는 예고가 **틀렸다**:
`고객운송관리 리디자인 v4.dc.html` 에 세 화면이 처음부터 다 있었고, 없던 것은 「새 시안」
뿐이었다(사용자가 v4 로 진행 확정, 2026-08-29). 자세한 것은 위 60차 ① 참고.
🟢 **P0 2건은 차수 없는 선행 작업으로 먼저 끝냈다(59차 세션)** — 29차 지시서에서 빼도 된다.
```
  P0-1  관리자 화주요청 상세 모달 (품목·상하차조건·물품특성·담당자 6필드)   ✅
  P0-2  배차 상세에 오더 특이사항 (「당착/내착」이 배차에서 끊기던 것)        ✅
  결정 2  화주 승인 흔적 — quotes 에 nullable 2컬럼                        ✅ DB 반영
  결정 3  견적 폼 「내착 · 시각 무관」 배지                                  ✅
  결정 4  견적서 머리 금액은 부가세 포함 그대로                              🔴 손대지 않음
```
~~🔴 **P1-1(포털 2화면 정산방식 라벨)은 29차 몫이다.**~~ → 🟢 **60차에 끝났다** —
「운임 수금방식」 + **별도 줄** 「청구: 건별/월정산」. 🔴 30~32차 지시서에서 빼도 된다.
**③(anon GRANT 회수) · 상차 시각 지정 가산 · 5톤급 재검토는 미정**이다. 아래 5번 첫 항목들을 볼 것:

- ~~1차(사전조사)~~ / ~~2차(모바일 오버플로우·색인차단·메타)~~ / ~~3차(로고·파비콘)~~ /
  ~~4차(용어 정리·메뉴 개편·`/about`·`/vehicles` 신규)~~ — 완료
  (**4차 범위가 도중에 바뀌었음** — 원래 4차였던 "법적 문서+푸터"가 5차로 밀림)
- ~~**5차: 법적 문서 페이지 3종(`/terms`, `/privacy`, `/email-policy`) + 푸터 재구성**~~ —
  **30차 세션에서 완료**(상세 내용은 위 30차 세션 기록 참고). 아래는 이후 세션이 알아야 할
  결과만 요약한 것:
  - **조문을 고칠 때는 `lib/legal/terms.ts`·`lib/legal/privacy.ts`만 고칠 것.**
    화면(`components/LegalDoc.tsx`)은 두 문서가 공유하는 렌더러라 건드릴 필요 없음
  - **지우면 안 되는 문장 3개**: 약관 제2조의 "관계 법령상 '화주'에 해당합니다" 병기,
    제11조 2항의 추가비 고지 조항(특히 "그 밖의 사유로…" 둘째 문장), 제19조 2항의
    "요청이 있는 경우 보험 가입 사실과 보상 한도를 안내합니다"
  - **보험 문구는 제19조 2항이 전부** — 사용자가 담보 범위를 확인·개선 중이라 결과에 따라
    바뀔 수 있음. **담보 범위나 "모든 화물이 보상된다"는 취지의 표현을 추가하지 말 것**
  - ~~**시행일은 자리표시자**~~ → **12차에 2026-09-07(목표 공개일)로 확정**되고 플래그도
    false로 내려갔음. 날짜를 다시 바꿀 일이 생기면 값과
    `LEGAL_EFFECTIVE_DATE_IS_PLACEHOLDER`를 **항상 같이** 바꿀 것.
    ⚠️ **표시 지점은 11곳이다**(예전에 "5곳"으로 적혀 있던 건 문서 본문만 센 숫자) —
    본문 5개 항목 + 페이지 헤더 3 + **법적 문서 모달 3**. 모달을 빠뜨리기 쉬움
  - ~~**Vercel 개인정보 문의처는 아직 비어 있음**~~ → **12차에 `privacy@vercel.com`으로
    채웠음**(사용자가 Vercel 공식 처리방침에서 확인). `|| "확인 중"` 폴백은 그대로 두었으니
    값을 비우면 다시 "확인 중"으로 돌아감
  - Resend(이메일 발송)를 실제로 켜면 **처리방침 제5조 위탁 표에 이메일 발송 대행사 행을
    다시 추가해야 함**(지금은 실제 위탁이 없어서 삭제한 상태)
  - 첫 거래 혜택은 약관에 넣지 않음(한시 프로모션). **게시할 때는 적용 조건·기간이 함께
    표시되어야 함**

  **⚠️ 5차 착수 전 사전조사 결과(29차 세션, PR #78)** — 별첨 문서가 또 전달되지 않아
  법적 문서 페이지·푸터 본작업은 착수하지 못했고, 대신 지시서가 요청한 확인 4건을
  처리함(그중 4번은 조사에 그치지 않고 실제로 구현·merge까지 완료됨. 나머지 1~3번은
  조사 결과이며 코드 변경 없음):

  1. **회차비 문제 — 사용자가 (B)로 확정함.** 지시서 1-2의 제11조 신설안은 "무료
     대기시간, 대기료 단가, **회차비** 등 ... 견적 시 안내합니다"였는데, 조사 결과
     **무료 대기시간과 대기료 단가는 운임기준표(`rate_vehicle_extra_fees`)에 톤수별로
     이미 정의돼 있으나 회차비는 사전 단가가 어디에도 없음**(현장 추가비 8종 중
     `recall_fee` 카테고리로 사고 발생 시 건별 수동 입력만 됨). 그대로 쓰면 약관이
     "기준을 안내한다"고 약속해놓고 기준 자체가 없는 상태가 되어, 1-1에서 지적된
     위험(약관이 인용하는 근거가 실체 없음)이 회차비에서 재발함. **확정된 방향(B):
     제11조 신설 항에서 "회차비"를 빼고 무료 대기시간·대기료 단가만 사전 안내 대상으로
     하되, 회차비는 제11조 1항 각 호(청구 사유)에는 그대로 남김.** 청구 근거를 잃지
     않도록 "그 밖의 사유로 추가비가 발생하면 사유와 금액을 안내한 후 청구한다"는 취지를
     같은 항에 포함할 것(항을 추가로 늘리지 않아야 기존 2·3항 → 3·4항 번호 이동 계획이
     그대로 유지됨). **최종 문안은 약관 원문 제11조 1항 각 호를 보고 맞춰서 확정할 것.**
  2. **견적서 PDF 확인 결과 — 별도 세션 과제로 등록.** 현재 견적서(admin·화주포털 양쪽
     print 페이지)에는 "실제 상하차 조건 및 대기시간에 따라 금액이 변동될 수 있습니다"
     라는 **모호한 변동 안내만 있고 무료 대기시간·대기료 단가 같은 구체적 기준이 없음.**
     추가비 근거를 "견적 시 개별 고지"로 옮기면 이 견적서로는 고지 의무가 충족되지 않음.
     다행히 **값은 이미 운임기준표에 톤수별로 있으므로 견적서에 그 값을 찍기만 하면 됨.**
  3. **외부 확인 2건 불가** — 공정위 사업자정보 페이지(`ftc.go.kr`)와 Vercel
     개인정보처리방침(`vercel.com`) 둘 다 이 실행 환경의 네트워크 정책에서 차단됨
     (프록시 403). 지시서 지침대로 **공정위는 링크 없이 텍스트만 표기**했고,
     ~~Vercel 문의처는 비워둔 채 진행~~ → **12차에 사용자가 확인해 전달한
     `privacy@vercel.com`으로 채워졌음**(공정위 링크는 여전히 없음).
  4. **대표번호 두 상수는 합치지 않기로 권고**(지시서 4-6의 "판단해서 보고") —
     `COMPANY_SUPPORT_PHONE`(1588-0000, 랜딩·`/about`·포털·SMS 문구 8종)과
     `COMPANY_INFO.phone`(02-0000-0000, 견적서 PDF의 발행업체 TEL)은 고객센터 번호와
     전자상거래법 표시사항의 사업자 전화번호로 역할이 달라 실제로 다른 번호를 쓰는 경우가
     많음. 합치면 나중에 분리할 때 견적서까지 건드려야 함. **사용자 확인 후 통합하지 않고
     빌드 경고만 `COMPANY_INFO.phone`까지 확장하는 것으로 확정·구현 완료** — 두 자리표시자
     중 하나만 바꾸고 나머지를 잊는 사고를 막기 위함. `lib/companyInfo.ts`에
     `COMPANY_INFO_PHONE_IS_PLACEHOLDER` 플래그를 두고 `next.config.mjs`가 읽는 방식
     (26차 `COMPANY_SUPPORT_PHONE`과 동일 패턴). **next.config.mjs의 경고 로직을
     `PLACEHOLDER_CHECKS` 배열로 일반화해뒀으므로, 앞으로 자리표시자가 더 생기면 소스
     파일에 플래그를 두고 그 배열에 한 줄만 추가하면 됨.** 지금은 빌드 시 경고가 2건
     뜨고, 한쪽을 실제 값으로 바꾸면 나머지 1건만 남는 것을 실행으로 확인함 —
     **경고가 계속 뜨면 아직 안 바꾼 번호가 남아 있다는 뜻.**
- ~~**6차: 스티키 헤더 + 법적 문서 모달 + 견적서 엑셀**~~ — **31차 세션에서 완료**(상세는 위
  31차 세션 기록 참고). 이후 세션이 알아야 할 것만 요약:
  - **공개 화면 헤더는 두 컴포넌트** — `LandingHeader`(랜딩·about·vehicles, 메뉴+모바일
    드롭다운 있음) / `PublicPageHeader`(로고만). ⚠️ **법적 문서 3종은 2026-09-08(PR #131)에
    전자에서 후자로 옮겼다** — 그 헤더의 메뉴가 30차 리뷰 ④ 에 랜딩에서 이미 뺀 항목이었다.
    **공개 하위 화면에 헤더를 새로 만들지 말고 후자를 쓸 것.** 스티키·배경·그림자는
    `.public-header` 클래스를 둘이 공유하므로 **헤더 높이·색은 그 클래스 한 곳만 고치면 됨**
  - **법적 문서는 페이지 + 모달 하이브리드.** 모달이 `lib/legal/*.ts`를 페이지와 그대로
    공유하므로 **조문 수정은 여전히 데이터 파일만 고치면 양쪽에 동시 반영**됨.
    URL 3개는 반드시 살려둘 것(분쟁 시 시점 특정 + 다음 세션 동의 모달의 "약관 보기" 대상)
  - **견적서 엑셀의 금액은 숫자 타입**(천단위는 셀 서식). **문자열로 되돌리지 말 것** —
    받는 쪽에서 SUM이 안 되면 엑셀로 주는 의미가 없어짐
  - **PDF 견적서를 고치면 `lib/quoteExcel.ts`도 같이 고칠 것**(값이 어긋나면 안 됨)
  - `/vehicles`는 의도적으로 모달로 만들지 않음(헤더 메뉴 항목 + 검색 유입 대상)
- ~~**7차: 확정 문구 교체**~~ — **32차 세션에서 완료**(상세는 위 32차 세션 기록 참고).
  이후 세션이 알아야 할 것만 요약:
  - **포지셔닝은 "정식 물류 파트너"** — "예비 배차처", "계약 없이", "기존 거래처를 바꾸",
    "1톤부터 5톤까지"는 **삭제 확정 표현이니 다시 넣지 말 것**
  - ~~**차량 범위는 "1톤부터 5톤 이상까지"**(12차 확정)~~ → 30차 본작업에 「1톤부터
    25톤까지」 → 🔴 **30차 리뷰에 「1톤부터 5톤 이상, 특수차량까지」(시안 문구)로 최종
    확정**(사용자 지시 2026-08-31). 「25톤」이 금지어에서 풀린 근거는 그대로다 —
    `rate_distance_tiers` 에 25톤 행이 실재하고 차급이 11종이라 견적이 산출된다(52차).
    ⚠️ **다만 64차에 요금 가이드 게시가 6종(1톤 ~ 5톤 플러스/축)으로 줄어 25톤 게시가는
    화면에서 사라졌다** — 그 간극은 설명글의 「5톤보다 큰 차량도 문의」가 메운다.
    🔴 **「전 차종」·「모든 차량」은 여전히 금지다**(「특수차량」은 30차, **「최저가」·
    「월별 이벤트」는 64차**에 사용자 지시로 풀렸다 — 뒤 둘은 **랜딩 WHY 05 한 곳 한정**이다)
  - **"이사"는 취급하지 않음**(단 "특이사항"·"대표이사"는 다른 단어)
  - **첫 거래 혜택에 금액·비율을 쓰지 않음** — 조건·기간이 확정되면 함께 표기할 것
  - 랜딩 문구는 `app/page.tsx`의 상수(`TRUST_POINTS`·`TRANSPORT_TYPES`)에 모여 있고,
    `/about` 인사말은 **`lib/companyInfo.ts`의 `COMPANY_GREETING_*`**(화면 파일 아님)
  - ⚠️ **히어로 CTA는 이제 2개다**(41차) — 32차 당시의 "보조 링크로 위계를 낮춘 계정 신청"은
    더 이상 히어로에 없다. 히어로에 세 번째 선택지를 다시 넣지 말 것
  - **인사말은 여전히 임시안** — 이후 다듬어 교체 예정
- ~~**8차: 대표번호 확정 + SMS·견적서 용어 정리**~~ — **33차 세션에서 완료**(상세는 위 33차
  세션 기록 참고). 이후 세션이 알아야 할 것만 요약:
  - **대표번호는 `1661-2403`이고 상수가 두 개다**(`COMPANY_SUPPORT_PHONE`·`COMPANY_INFO.phone`).
    지금은 같은 값이지만 **합치지 않았으므로 번호를 바꿀 때 두 곳을 함께 고칠 것**
  - **발신번호(`SOLAPI_SENDER_PHONE`)는 별개** — 솔라피 사전 등록이 필요한 사용자 작업이며
    코드에서 건드리지 말 것
  - **SMS 8종 중 90byte 안에 드는 것은 견적안내 하나뿐**이고 여유가 **0byte**다. 나머지
    7종은 설계상 LMS(129~243byte). **견적안내 문구를 고치면 byte를 반드시 다시 잴 것**
  - **견적서 PDF와 `lib/quoteExcel.ts`는 쌍으로 움직인다** — 한쪽만 고치면 어긋난다
    (이번에 실제로 수신 항목이 어긋나 있던 것을 발견해 맞춤)
- ~~**9차: 약관 배상 조항 개정 + 보험 언급 제거**~~ — **34차 세션에서 완료**(상세는 위 34차
  세션 기록 참고). 이후 세션이 알아야 할 것만 요약:
  - 🔴 **보험을 고객 접점에 다시 넣지 말 것** — 현 증권이 이사화물 특약이라 일반화물 담보가
    불확실함. **담보가 정리되어도 다시 넣을지는 별도 판단**이며, 제19조는 보험 없이 성립함
  - 🔴 **제19조 7항(고의·중과실 예외)은 삭제 금지** — 없으면 3~6항이 통째로 무효화될 위험
  - **제19조는 금액을 쓰지 않는 설계** — 상한은 3항(가액 신고제)+4항(고가물 특칙)으로 만든다.
    **금액을 넣자는 제안이 나오면 이 설계를 먼저 확인할 것**
  - **제11조에서 "기준 안내" 약속이 빠졌으므로** 견적서에 추가비 구체 기준을 표기해야 할
    **약관상 의무가 없어졌음**(운영상 안내는 여전히 권장)
  - **조 번호가 29개로 줄었다**(구 제20조 면책을 제19조 6항에 통합) — 조를 참조하는 새 문장을
    쓸 때 번호를 다시 확인할 것
  - ⚠️ **위캐리는 확정 운임을 청구하는 구조**라 상법상 운송인과 동일한 책임을 질 수 있음.
    "주선사라 책임이 가볍다"는 전제는 성립하지 않을 수 있음
  - ⚠️ **변호사 검토 미실시** — 공개 전에 거치는 것을 권장(지시서 7장)
- ~~**10차: 담당자별 SMS 발신번호 + 견적안내 LMS 전환**~~ — **35차 세션에서 완료**(상세는 위
  35차 세션 기록 참고). 이후 세션이 알아야 할 것만 요약:
  - 🔴 **솔라피 사전등록 없이는 동작하지 않는다** — 직원 입·퇴사 때마다 등록·삭제가 따라옴
  - **발신번호는 서버에서 세션으로만 결정**(`resolveSmsSender()`). 클라이언트 값 신뢰 금지
  - **저장은 숫자만 / 표시·본문은 하이픈**
  - 🔴 **견적안내를 다시 90byte로 압축하지 말 것** — 품목이 잘려 알아보기 어려웠던 문제로
    LMS 전환한 것이며, 이제 **8종이 전부 LMS**(단 400~500byte 상한은 유지)
  - **퇴사자 번호로 나간 문자는 회수되지 않는다** — 인수인계 시 거래처 안내 필요
  - **직원 이름도 이제 고객 접점 정보**("담당 OOO"으로 문자에 찍힘) — 발신번호와 같이
    관리자만 변경 가능하며, 내 계정에서는 읽기 전용
  - **문자 내용은 각 상세 화면의 "문자 발송 이력" 패널에서 확인**(레코드별).
    ~~전체를 모아 보는 화면은 아직 없음~~ → **36차에 만들어짐**(`/admin/sms-logs`, 관리자 전용)
- ~~**11차: 랜딩 레이아웃 전면 개편 + 헤더 옐로 전환**~~ — **37차 세션에서 완료**(상세는 위
  37차 세션 기록 참고). 이후 세션이 알아야 할 것만 요약:
  - ~~🔴 **랜딩 이미지 5종이 아직 자리표시자다 — Go-Live 차단 항목.**~~ →
    🟢 **30차(61차 세션)에 해소됐다** — 디자인팀 이미지 **32종**이 `public/landing/` 에
    들어갔고 `lib/landingImages.ts` 가 그대로 유일 정의처다(`null` 자리표시자 구조는
    없어졌다). ⚠️ **아래 규격표·섹션 순서·헤더 옐로는 37차 랜딩 기준이고, 30차가 랜딩을
    통째로 새 시안으로 교체하면서 대부분 낡았다** — `/about`·`/vehicles` 는 아직 37차
    옐로 헤더를 쓰므로 그 부분만 유효하다
  - 🔴 **헤더 색·높이는 `.public-header` 한 곳만 고치면 공개 10개 화면에 다 반영된다.**
    옐로 위에 `--text-muted`를 쓰지 말 것(대비 부족) — 헤더 텍스트는 `--text` 계열
  - 🔴 **섹션 배경 교차 순서**(다크 → 흰색 → 옅은 노랑 → 흰색 → 회색 → 다크)를 임의로
    바꾸지 말 것. 회색에 `var(--bg)`를 쓸 수 없음(`.portal-theme`에서 덮여 있음)
  - 🔴 **히어로 그라데이션은 사진 위에만 얹는다** — 히어로 전체에 %로 걸면 넓은 화면에서
    사진이 제목 위로 올라온다(원칙 54번)
  - **랜딩만 콘텐츠 폭이 1220**이고 다른 공개 화면은 `.container`(1100) 그대로다
  - **차량 형태는 모바일에서도 2×2**(가로 스크롤로 바꾸지 말 것), 번호 배지는 노란 원 +
    검정 숫자(색을 뒤집지 말 것), 선택 이유는 **4문항**(5개로 늘리면 그리드가 깨짐)
  - **`<br />`로 줄을 고정하지 말 것** — 폰트를 CDN에서 받아와 폭이 달라진다
    (`word-break: keep-all`에 맡김)
- ~~**12차: 정합성·상수·진입경로·이미지 구조**~~ — **39차 세션에서 완료**(상세는 위 39차
  세션 기록 참고). 이후 세션이 알아야 할 것만 요약:
  - ~~**차량 범위는 "1톤부터 5톤 이상까지"**~~ → 30차 본작업에 「1톤부터 25톤까지」로
    뒤집혔다가 → 🔴 **30차 리뷰에 「1톤부터 5톤 이상, 특수차량까지」(시안 문구)로
    최종 확정**(사용자 지시 2026-08-31). 하한의 소형 차종명을 뺀 것(단종)은 그대로 유효하다.
    ⚠️ **`/vehicles` 메타 description도 같은 기준**(리뷰 라운드에서 반영) — 검색결과에
    노출되는 문장은 화면 본문과 같게 본다. ⚠️ **이 검증은 소스가 아니라 렌더링 텍스트에
    적용할 것** — 소스에 걸면 금지어를 경고하는 주석 자체가 매치된다
  - **법적 문서 시행일 = 2026-09-07**, Vercel 문의처 = `privacy@vercel.com`. 둘 다
    플래그가 false로 내려가 **빌드 경고에서 사라졌고**, 대신 **보험 경고 1건이 새로 뜬다**
  - **`/apply` 라벨은 "운송관리 계정 신청"으로 통일**(화면 6곳). 🔴 `lib/legal/*`의
    "고객 등록"은 **법적 문서 본문이라 그대로 둔다** — 한쪽만 바꾸면 처리방침과 어긋난다
  - **`/customer/login`에 공개 화면 헤더가 붙는다**(`CustomerPortalShell`의 PUBLIC_PATHS
    분기). noindex는 영향 없음. ⚠️ 같은 분기를 타는 `/customer/support-verify`에도 함께 붙는다.
    ⚠️ **당시 중복이라며 뺐던 폼 하단 "← 홈으로"는 13차 리뷰에서 되살아났다** — 헤더 로고와
    동작이 달라서다(왔던 자리로 복귀). 13차 항목 참고
  - **`lib/insuranceInfo.ts`** — 12차에 파일만 만들었고(참조 UI 0건) **13차에 UI가 붙었다**
    (히어로 신뢰줄 4번째 · ⑦-3 카드 두 곳). 🔴 **아직 미가입이라 `INSURANCE_ENABLED = false`**
    — 켜기 전에 화면에 노출하면 허위·과장 광고다. 별도 플래그를 만들지 말 것
  - **모바일 전용 이미지 자산의 기준은 "글자를 읽어야 하는가"** — `hero.mobile` 키는
    없앴고(사진이라 불필요) `portal.mobile`만 `<picture>`로 연결돼 있다.
    🔴 `.desktop-only`/`.mobile-only`로 바꾸지 말 것(양쪽 다 내려받는다). 분기점 760px
- ~~**13차: 랜딩 섹션 신설 — 운송관리·안전책임**~~ — **40차 세션에서 완료**(상세는 위 40차
  세션 기록 참고). 이후 세션이 알아야 할 것만 요약:
  - **섹션이 8개다.** 배경 교차는 다크 → 흰 → 옅은 노랑 → 흰 → 회색 → **옅은 노랑 → 흰** →
    다크. 🔴 임의로 바꾸지 말 것
  - 🔴 **보험은 `INSURANCE_ENABLED` 하나가 두 곳(히어로 신뢰줄 4번째·⑦-3 카드)을 제어한다.**
    별도 플래그를 만들지 말고, **켤 때는 `INSURANCE_INFO_IS_PLACEHOLDER`도 같이 내릴 것.**
    히어로에는 한도 숫자를 넣지 않는다(금액은 ⑦ 카드 한 곳뿐)
  - 🔴 **Claude Design 시안에는 히어로 신뢰줄이 4줄(2×2)로 그려져 있지만 실제 출시본은 3줄이다 —
    시안을 근거로 켜지 말 것.** 2026-08-25에 사용자가 이 시안 화면을 보고 "히어로에
    적재물배상책임보험 가입이 있어야 할 것 같다"고 요청했으나, 확인 결과 **여전히 미가입**이라
    켜지 않았다(미가입 상태의 노출은 표시광고법상 허위·과장 광고이고, 히어로는 첫 화면이라
    더 문제가 크다). **시안은 가입 이후를 그린 것**이며 코드가 틀린 것이 아니다.
    ⚠️ 34차가 약관 제19조를 **보험과 무관하게 성립하도록** 다시 썼기 때문에 보험이 없어도
    랜딩·약관에 빠진 곳은 없다. 켤 때 챙길 것 두 가지 — **일반화물 담보 여부**(34차에 뺀 이유가
    이사화물 특약이라 일반화물 담보가 불확실했던 것)와 **한도**(일반화물 주선사업자 법정 최저는
    사고 건당 2,000만원). 플래그만 올리면 ⑦ 카드의 상품명·보험사·한도가 **빈칸으로 렌더링**되므로
    값 4개를 함께 채울 것
  - 🔴 **⑥ 모바일 순서는 `grid-template-areas`가 정한다**(기능 → 캡처 → 버튼 → 배지).
    DOM 순서를 바꾸지 말 것. 옅은 노랑 위에 `--text-muted`를 직접 올릴 수 없어 설명문은
    **흰 카드 안**에 있다
  - 🔴 **⑦은 열 수가 항목 수를 따라간다**(2항목 2열 / 3항목 3열). 보험이 꺼진 **2항목이
    실제 출시본**이다
  - 🔴 **헤더·⑥ 버튼에 `.btn`·`.btn-ghost`를 재사용하지 말 것**(옐로/흰 배경 위에서 묻히거나
    테두리가 없음). "운송관리 로그인"은 **데스크탑 전용** — 360px 헤더 여유가 15px뿐이다
  - **「첫 거래 혜택」은 전체 제거됐다.** 다시 쓰려면 **조건·기간을 확정한 뒤** 별도 차수로
  - ⚠️ **360px 헤드라인은 3줄이다**(37차부터의 상태). 2줄로 만들려면 28px → 23px 이하로
    줄여야 해서 손대지 않았고, **사용자가 리뷰에서 "ok"로 확인했다** — 완료조건 16만 보고
    다시 줄이려 하지 말 것
  - 🔴 **`/customer/login`·`/apply`의 "← 홈으로"는 헤더 로고와 동작이 다르다**(왔던 자리로
    복귀). 12차에 중복이라며 뺐던 링크를 리뷰에서 되살린 것이니 **다시 지우지 말 것.**
    판정은 `?from=landing`이며 🔴 **`document.referrer`로 바꾸면 동작하지 않는다**
    (클라이언트 전환이라 referrer가 빈 값)
  - ⚠️ **섹션에서 블록을 빼면 여백도 같이 볼 것** — ⑤ 패딩을 "섹션 리듬"이라며 그대로 뒀다가
    리뷰에서 지적받아 60/64px(모바일 40/44)로 줄였다. 패딩은 **그 섹션의 내용 높이**에 맞춘다
  - ⚠️ **41차(차수 없는 소수정)에서 히어로 CTA가 2개가 됐다** — 세 번째 보조 링크였던
    "운송관리 계정 신청"을 뺐고, 대신 `/customer/login` 폼 하단에 계정 신청 링크를 넣었다.
    🔴 그래서 **데스크탑 랜딩의 계정 신청 진입점은 ⑥ 하나뿐**이다 — ⑥ 버튼을 지우지 말 것
- ~~**14차: 동의 절차**~~ — **43차 세션에서 완료**(사전조사는 42차, 상세는 위 43차 세션 기록 참고).
  이후 세션이 알아야 할 것만 요약:
  - **`consents` 이력 테이블 하나에 모은다.** 🔴 각 테이블에 컬럼을 추가하는 방식으로 되돌리지
    말 것 — 마케팅 동의를 연락처 단위로 붙일 때 같은 사람의 동의가 갈라진다(실측 75%)
  - 🔴 **INSERT만. UPDATE 경로를 만들지 말 것** — 철회는 `agreed=false` 행을 추가한다
  - 🔴 **RLS on + 정책 0개.** 정책을 하나라도 만들면 그 순간 anon에게 열린다
  - 🔴 **CHECK 제약 없음** — 값 목록은 `lib/consent.ts`가 유일한 방어선이다
  - ⚠️ **당시엔 `privacy` 1행뿐이었고 `TERMS_VERSION`이 미사용이었다** → **49차(18차)에
    해소**. `/apply`는 이제 **privacy + terms 두 행**을 남긴다. 🔴 **다만 `/quote`는
    여전히 `privacy` 1행뿐이고 그것이 사용자 결정이다**(2026-08-26) — 다시 넣지 말 것.
    🔴 **문구를 먼저 고치지 않고 `CONSENT_TYPES_BY_SOURCE`에 값을 넣으면 받지 않은
    동의를 기록하게 된다**는 원칙 자체는 그대로 유효하다
  - 🔴 **`recordConsents` 실패를 삼키지 말 것** — 원본 행을 삭제(롤백)해야 한다
  - **동의 문구는 `lib/legalInfo.ts` 상수**다. 화면에 다시 적지 말 것
  - ⚠️ `/quote`는 이제 **서버 API 경유**다. anon INSERT 정책은 아직 남아 있다(다음 차수 정리)
- ~~**15차: 거리 구간 매칭 버그 수정**~~ — **44차 세션에서 완료**(상세는 위 44차 세션 기록 참고).
  이후 세션이 알아야 할 것만 요약:
  - 🔴 **매칭은 "상한 이하 첫 구간"이고 `distance_from_km`을 보지 않는다** — 조건에 다시 넣으면
    정수 사이 빈틈 14개가 되살아나 소수 거리(10.4km 등)에서 자동계산이 조용히 실패한다
  - 🔴 **거리를 반올림해서 정수로 만든 뒤 매칭하는 방식으로 바꾸지 말 것** — 과소청구가 된다.
    약관 제11조 2항이 추가 청구를 "협의한 후"로 묶어놔서 나중에 올리기 어렵다(지시서 부록 A)
  - **매칭 로직은 `app/admin/quotes/page.tsx` 한 곳뿐**이다(6개 후보 전수 확인함).
    견적 상세·발주요청은 `rate_surcharges`에서 드롭다운 옵션 이름만 가져올 뿐 운임을 계산하지 않는다
  - 🔴 **계산 패널의 "선택하신 톤수에 해당하는 운임기준이 없습니다" 문구는 17차용 안전장치**다 —
    차급 배열에만 추가하고 `rate_distance_tiers` INSERT를 빠뜨리면 이 문구가 원인을 알려준다
  - ⚠️ **운임값은 한 칸도 안 바꿨다**(16차 범위). 순회 검증에 쓴 구간 데이터는 재구성본이며
    실제 DB 조회가 아니다 — 실측이 필요하면 사용자에게 SQL 결과를 받을 것
- ~~**16차: 운임 기준 교체(마진 17%)**~~ — **45차 세션에서 완료**(상세는 위 45차 세션 기록 참고).
  🟢 **SQL도 같은 날 사용자가 실행해 반영을 확인했다.** 이후 세션이 알아야 할 것만 요약:
  - 🔴 **`base_fare`는 화주 청구가이고 견적 계산에 마진율 파라미터가 없다** — 마진을 바꾸려면
    이 값 자체를 바꿔야 한다. 마진 17%가 지금 값에 이미 녹아 있다(v8 3장 × 1/0.83)
  - 🔴 **운임을 바꿀 때는 `/admin/rates` 화면 클릭이 아니라 마이그레이션 파일로 남길 것** —
    그전까지 값이 DB에만 있어서 v8을 만들 때 v7 엑셀을 대용으로 써야 했다. 이제
    `migrations/2026-08-25_rate_base_fare_v8.sql`이 현재 값의 기록이다
  - ⚠️ **아래 규칙은 47차에 대체됐다** — 이제 마이그레이션은 GitHub Actions가 psql로 돌리고
    모든 문장의 결과를 로그에 보여준다. 아래는 사람이 SQL Editor에서 돌리던 시절의 규칙이며
    (써도 무해하다), **새 파일은 `migrations/README.md`의 작성 규칙을 따를 것.**
  - 🔴 **SQL은 `with upd as (update … returning 1) select count(*)` 형태로 쓸 것** —
    단일 문장이라 원자적이고 **반영 행수가 결과 표에 뜬다.** `begin;…commit;` 한 덩어리로 두면
    Supabase SQL Editor가 마지막 결과만 보여줘서 몇 행이 바뀌었는지 놓친다
  - 🔴 **`/vehicles` 시작가는 DB에서 자동으로 오지 않는다** — 하드코딩이므로 운임 마이그레이션과
    **항상 같은 PR에서 함께** 고칠 것. 안 고치면 게시가와 실제 견적이 어긋나 표시가격 분쟁이 된다
  - 🔴 **`admin/quotes/[id]`의 `첫거래지원할인:` 줄은 남겨둔 것이다** — 견적 상세 수정이
    `selected_options` 전체를 교체하므로 빼면 과거 기록이 사라진다. 정리 대상이 아니다
  - ⚠️ **실측 확인된 구조: `rate_distance_tiers` 90행(15구간 × 6차급), `rate_vehicle_extra_fees` 6행**
  - ⚠️ 백업 스냅샷 `_bak_rate_distance_tiers_20260825` · `_bak_rate_vehicle_extra_fees_20260825`가
    DB에 남아 있다. 되돌릴 일이 없다고 판단되면 지워도 되지만, **지우기 전에 CSV가 있는지 확인할 것**
- ~~**17차: 차급 9종 확장**~~ — **46차 세션에서 완료**(상세는 위 46차 세션 기록 참고).
  🟢 **SQL도 같은 날 사용자가 실행해 135행 / 9행을 확인했다.** 이후 세션이 알아야 할 것만 요약:
  - 🔴 **`VEHICLE_TYPES_ALL`(9종) / `VEHICLE_TYPES_PUBLIC`(6종) 두 배열이다. 합치지 말 것.**
    `PUBLIC`에 대형을 넣으면 `"25톤"`이 공개 화면 본문에 찍힌다(특히 `/apply` 캡션이
    배열을 `join(", ")`으로 뿌린다). 어느 화면이 어느 쪽을 쓰는지는 위 46차 (1)번 표 참고
  - 🔴 **옛 이름 `VEHICLE_TYPES`를 되살리지 말 것** — 이름을 없앤 덕분에 사용처 5곳이
    컴파일 에러로 드러나 하나씩 판단을 거칠 수 있었다
  - 🔴 **`/vehicles`의 `VEHICLE_SPECS`·`START_PRICES`는 의도적으로 6종이다** — 정리 대상이 아니다
  - 🟢 **로컬 재정의 5곳이 사라져서, 앞으로 차급 추가는 `VEHICLE_TYPES_ALL` 한 곳만 고치면 된다.**
    구체적인 목록은 `lib/constants.ts`의 "차급을 더 추가할 때 고칠 곳" 주석에 있다
  - ⚠️ **실측 확인된 구조: `rate_distance_tiers` 135행(15구간 × 9차급), `rate_vehicle_extra_fees` 9행**
  - ⚠️ 백업 스냅샷 `_bak_rate_distance_tiers_before17` · `_bak_rate_vehicle_extra_fees_before17`
- ~~**차수 없음: SQL 마이그레이션 GitHub Actions 자동화**~~ — **47차 세션에서 완료**
  (PR #94·#95, 상세는 위 47차 기록 ① 참고). 이후 세션이 알아야 할 것만 요약:
  - 🔴 **Supabase SQL Editor에 붙여넣지 말 것.** `Actions 탭 → "DB 마이그레이션" → Run workflow`
    이고, **세션이 직접 돌리고 로그까지 읽을 수 있다**(사용자가 버튼을 누를 필요도 없다)
  - 🔴 **`migrations/_baseline.txt`를 건드리지 말 것** — 없으면 기존 6개가 재실행되어
    17차 INSERT가 45행/3행 중복된다. **새 마이그레이션은 이 목록에 넣지 않는다**
  - 🔴 **새 파일은 한 번에 통째로 실행된다** — `begin;`/`commit;` 금지, 안전장치는
    `raise exception`으로. 자세한 규칙은 `migrations/README.md`
  - 🔴 접속 문자열은 **Session pooler**(Direct는 IPv6 전용이라 러너에서 안 닿는다).
    Secret `SUPABASE_DB_URL`은 **이미 등록돼 있다** — 다시 시키지 말 것
  - 🟢 **`verify` 모드로 운임·동의 상태를 언제든 확인할 수 있다**(읽기 전용 9항목).
    그동안 사용자에게 SQL 결과를 받아야 했던 확인이 대부분 이걸로 대체된다
- ~~**20차 3-4: `/customer/request` 제3자 제공 동의**~~ — **47차 세션에서 완료**(PR #96,
  상세는 위 47차 기록 ② 참고). 🟢 **동의 행이 실제로 저장되는 것까지 확인됐다.**
  이후 세션이 알아야 할 것만 요약:
  - 🔴 **`consents`에 `authenticated` INSERT 정책을 만들지 말 것** — 그 순간 화주가 아무
    내용의 동의 행이나 써넣을 수 있어 이 표의 존재 이유가 사라진다. 그래서 접수가
    서버 API(`app/api/customer/order-request/route.ts`)를 거친다
  - 🔴 **접수 성공 후 체크가 해제되는 것은 의도된 것이다** — 동의는 발주 건별이다
  - 🔴 **문구는 `lib/legalInfo.ts`의 `PORTAL_ORDER_THIRD_PARTY_CONSENT`**에 있다.
    21차가 화면을 갈아엎어도 **문구·저장 로직·DB는 그대로 재사용**할 것
  - ⚠️ **문구는 초안이며 변호사 검토 대상**이다
  - 🟢 **3-1·3-2·3-3도 48차에 완료됐다** — 아래 항목 참고
- ~~**20차 3-1·3-2·3-3: 화주포털 저장소 기반**~~ — **48차 세션에서 완료**(PR #97, 상세는
  위 48차 기록 참고). 🟢 **마이그레이션도 세션이 직접 돌려 운영에 반영했다.**
  이후 세션이 알아야 할 것만 요약:
  - 🔴 **`customer_locations`의 배송지 이름·특이사항은 `location_name`·`notes`다.**
    지시서 표의 `name`·`note`를 추가하지 말 것 — 관리자 화면 2곳이 이미 `location_name`을
    읽고 있어 중복이 된다. **마이그레이션 파일 안의 단언이 이걸 막고 있으니 지우지 말 것**
  - 🔴 **`customer_presets`를 둘로 나누지 말 것**(`preset_type`으로 가른다), **`payload`를
    정규화 컬럼으로 펼치지 말 것**(폼에 채워넣기 용도), **RLS의 `is_active = true`를 빼지 말 것**
  - 🔴 **상하차 옵션을 추가할 때는 코드(`lib/loadingMethods.ts`)와 DB(`rate_surcharges`)를
    반드시 같이 넣을 것** — 행이 없으면 예외도 경고도 없이 가산만 빠진다
  - ⚠️ **쓰는 화면은 아직 없다**(21·22차 몫). 구조만 만든 것이니 "왜 안 보이지" 하지 말 것
  - ⚠️ `도크` 금액은 `0/0`이다 — 실제 값은 담당자가 `/admin/rates` "가산기준"에서 정한다
- ~~**18차: 이용약관 동의 + anon RLS 조사**~~ — **49차 세션에서 완료**(PR #98, 상세는 위
  49차 세션 기록 참고). 🟢 **Go-Live 차단 항목이 해소됐다.** 이후 세션이 알아야 할 것만 요약:
  - 🔴 **약관 동의를 받는 화면은 `/apply` 하나뿐이다. `/quote`에는 넣지 않는다**(사용자 결정
    2026-08-26 — 견적 문의 자체는 계약이 아니다). 내가 한 번 넣었다가 되돌린 것이니
    **다시 넣지 말 것**. 근거는 `lib/legalInfo.ts`·`lib/consent.ts` 주석에 있다
  - 🔴 **`/apply`의 체크박스 2개를 하나로 합치지 말 것** — 개인정보보호법 제22조 1항이
    항목별 동의를 요구한다. 서버 게이트도 항목별로 둘이고 `!== true` 엄격 비교다
  - 🔴 **약관 요약 문장은 `lib/legal/terms.ts`의 실제 조 제목에서 파생됐다.** 조문이
    개정되면 **요약을 고치고 조문은 두라**(`lib/legal/`은 손대지 않는다)
  - 🔴 **`terms`의 버전은 `TERMS_VERSION`이다** — `PRIVACY_POLICY_VERSION`을 재사용하지 말 것
    (5차가 개정 주기가 달라 일부러 나눈 상수다)
  - 🔴 **소급 INSERT 금지** — 기존 신청 6건에 약관 동의 기록이 없는 것은 실제로 안 받았기
    때문이다. 처리 방법은 사용자가 정한다
  - ⚠️ **동의 2행이 실제로 저장되는 것은 아직 미확인**이다 — 배포본에서 `/apply` 신청을
    한 건 넣고 `verify` ⑧-c에 `terms / terms-v1`이 뜨는지 볼 것
- ~~**19차: anon RLS 정리 ① — 관리자 질의를 직원 세션으로**~~ — **50차 세션에서 완료**
  (PR #99, 상세는 위 50차 세션 기록 참고). 이후 세션이 알아야 할 것만 요약:
  - 🔴 **아직 잠긴 것이 아니다.** anon 정책 19개가 그대로 열려 있고 `anon`은 여전히 47개
    테이블 전부에 DML GRANT를 갖고 있다. **화면이 도는 것은 anon 정책 덕분이 아니라
    새로 만든 직원 정책 덕분이다** — "이제 안전하다"고 오해하지 말 것
  - 🔴 **①과 ②는 분리할 수 없다.** 지시서는 "정책이 열려 있으니 코드만 바꿔도 안 깨진다"고
    했으나 **RLS 정책은 롤별로 갈린다**(anon 정책은 `TO anon`). 코드만 바꿨으면 관리자
    화면이 조회·저장 모두 막혔다. 근거는 50차 기록 ①
  - 🔴 **정책 조건은 `public.is_active_staff()`(security definer)** — `authenticated`를
    화주포털이 같이 쓰기 때문에 재직 직원 확인이 필수이고, `staff_accounts`에도 RLS가
    걸려 있어 그냥 서브쿼리로 쓰면 조용히 false가 된다
  - 🔴 **`dispatch_extra_charges`에는 정책을 만들지 않았다** — 관리자 조회를 service_role
    서버 API로 옮겼다. `authenticated`에 전체 SELECT를 되돌려주면 화주가 차주 지급액을
    DB 수준에서 읽는다(16차 보호)
  - ⚠️ **`customer_billing_batch_candidates`는 뷰라 GRANT로만 통제된다** — ③ 차수에서
    `security_invoker` 전환 또는 서버 API 이전을 함께 정할 것
- ~~**21차: anon RLS 정리 ②+④ — 실제로 잠그기**~~ — **51차 세션에서 완료**(PR #100,
  상세는 위 51차 세션 기록 참고). 🟢 **이제 실질적으로 잠겼다.** 이후 세션이 알아야 할 것만:
  - 🔴 **남은 anon 경로는 INSERT 2개뿐이다** — `public_quote_requests`·
    `customer_applications`. **지우면 `/quote`·`/apply` 가 죽는다**(원칙 3)
  - 🔴 **되돌리는 SQL 이 세 마이그레이션 파일 맨 아래 주석에 있다** — 지운 정책 21개를
    원래 이름 그대로 복원하는 문장이다
  - 🔴 **`rate_surcharges` 는 이제 직원 전용이다.** 화주포털 선택지는
    `/api/customer/surcharge-options`(service_role)로 받는다 — **그 API 에
    `rate_pct`·`flat_amount` 를 추가하지 말 것**(28차 비공개 확정)
  - 🔴 **RLS on + 정책 0개인 표들은 "고장난 것"이 아니다** — `consents`·`sms_logs` 등과
    이번에 켠 죽은 표 6개는 **service_role 전용이 정상**이다
  - ⚠️ **`_verify.sql` ⑧-g·⑧-h·⑧-i 로 언제든 재확인할 수 있다** — RLS 꺼진 표 0 /
    anon 정책 2 / 직원 26 / 화주 14 / 롤별 행수 / 뷰 `security_invoker`
- 🔴 **③(anon GRANT 회수)은 미정 차수다.** RLS 가 이미 막고 있어 **추가 방어이며 급하지
  않다.** 함께 정할 것: 묶음 후보 뷰의 anon GRANT 회수(지금은 `security_invoker` 로만
  막혀 있다) · `dispatch_extra_charges` 의 컬럼 GRANT 정리.
  ⚠️ **`dispatch_extra_charges` 에는 여전히 직원 정책이 없다**(19차 그대로) —
  `authenticated` 전체 SELECT 를 주면 화주가 차주 지급액을 읽는다.
- ~~**22차: 운임 매트릭스 보정 + 차급 11종**~~ — **52차 세션에서 완료**(PR #101,
  상세는 위 52차 세션 기록 참고). 🟢 **운영 반영까지 끝났다(165행 · 11차급).**
  이후 세션이 알아야 할 것만:
  - 🔴 **18톤 `200km 이내` 한 칸만 −5.5%(341,000)다.** ×0.89 면 321,000 이라 11톤
    325,000 보다 낮아진다(차급 역전). **"왜 이 칸만 다르지" 하고 맞추지 말 것**
  - 🔴 **8톤·15톤은 보간값(등급 D)이고 15톤은 완료 표본 1건이라 미검증**이다 — 관찰 대상.
    8톤은 실측(완료 5건, 중앙값 193,000)과 잘 맞는다
  - 🔴 **장척/중량은 표본 5건**이다(v8 이 정한 경계선) — 관찰 대상
  - 🔴 **차급을 더 추가하면 `_verify.sql` ⑥-b 의 `ord(vt, rk)` 목록도 갱신할 것** —
    안 하면 새 차급이 차급 역전 검사에서 조용히 빠진다.
    🟢 **2026-09-11 에 13종으로 갱신했고**, 마이그레이션 쪽에는 「목록에 없는 차급이 있으면
    멈추는」 단언을 새로 넣었다(`migrations/2026-09-11_rate_damas_labo.sql` ⑤)
  - 🔴 **운임과 대기료는 한 파일에** — 쪼개면 그 차급 대기료가 조용히 0원이 된다
  - 🟢 **`migrations/2026-08-26_rate_8t_15t.sql` 이 앞으로 차급 추가의 본보기다**
    (17차 파일 대신 이것을 볼 것 — 단언과 역전 검사가 들어 있다)
- ~~**23차: 화주포털 개편 사전조사**~~ — **53·54차 세션에서 완료**(PR #102 merge, 위 참고).
  🔴 **23차는 화면이 아니라 조사가 됐다.** 산출물은 보고서 `화주포털_개편_사전조사_23차.md`(646줄)
  + 현행 스크린샷 22장이며, **지시서 전제 5건이 실제로 틀렸다.**
- ~~**24차: 화주포털 화면 ① (셸·토큰·아이콘·홈)**~~ — **54차 세션에서 완료**(PR #102 merge
  `072bd76`, 상세는 위 54차 기록 참고). 이후 세션이 알아야 할 것만 요약:
  - 🔴 **`.portal-v2` 스코프를 전역으로 합치지 말 것** — 포털이 쓰는 클래스 25개 중 24개를
    관리자가 같이 쓴다. 합치는 순간 관리자 화면 31개가 딸려온다. 새 컴포넌트는 전부 `.pv2-*`
  - 🔴 **`globals.css` 는 순수 추가다(삭제된 줄 0)** — 이것이 관리자 무회귀의 근거다.
    앞으로 이 파일을 만질 때도 **삭제된 줄 0** 을 유지할 것
  - 🔴 **메뉴에서 빠졌지만 살아 있는 라우트 셋**(`calendar`·`announcements`·`change-password`)
    을 "안 쓰는 라우트"로 보고 지우지 말 것. 비밀번호 변경을 지우면 신규 계정 첫 로그인이 갇힌다
  - 🔴 **아이콘 4개는 `currentColor` 로 바꾼 것이다** — `#FFFFFF` 로 되돌리면 흰 탭바에서
    안 보인다. `fill-rule` 을 빼지 말 것. 트럭만 `nonzero` 이고 path 가 2개다
  - 🔴 **상호는 `(주)디자인에그 │ 위캐리 운송`** 이고 화면·인쇄에는 `CompanyNameMark` 를 쓴다
    (평문을 그대로 렌더링하면 슬래시가 글자로 찍힌다). 구분선을 `background` 로 그리지 말 것
  - 🔴 **시안 규격은 54차 ⑪ 의 표가 정본이다** — CTA `min-height 230px` · 그리드 `gap 12px` ·
    모티프 `right:14px` 등. 음수 offset 을 주면 `overflow:hidden` 에 라인 끝이 잘린다
  - ⚠️ **자동검증 27개가 전부 통과했는데도 시안과 다른 것을 하나도 못 잡았다** —
    구조·수치만 재고 "시안과 같은가"를 안 쟀기 때문이다. **25차는 시안 소스에서 값을 뽑아
    대조하는 검증을 넣을 것**
- ~~**25차: 화주포털 화면 ② (발주 흐름)**~~ — **55차 세션에서 완료**(상세는 위 55차 기록).
  🔴 **25차가 셋으로 쪼개졌다**(사용자 확정 2026-08-27) — 화면 7개를 한 차수에 넣으면 리뷰가
  감당되지 않는다. **25차=발주 흐름 / 26차=견적 흐름 / 27차=조회 흐름.**
  ⚠️ **실사용 리뷰가 9라운드였다**(커밋 15개 중 10개가 리뷰 반영분). 아래는 이후 세션이
  알아야 할 것만 요약이고, **전체는 위 55차 기록**에 있다:
  - 🔴 **서비스롤 GET 라우트에는 `force-dynamic` 과 `createServiceClient()` 가 둘 다 필요하다**
    — `force-dynamic` 만으로는 supabase-js 의 내부 `fetch` 가 Next Data Cache 를 탄다.
    프로덕션 재현으로 확인했고 GET 라우트 11개를 전부 전환했다(55차 ①-b)
  - 🔴 **정렬을 컬럼 이름에 기대지 말고, `error` 를 절대 버리지 말 것** —
    `customer_locations` 에 없는 `created_at` 으로 `.order()` 를 걸었고 `const { data } = ...`
    로 42703 을 삼켜 **목록이 통째로 조용히 비었다**(55차 ①-a)
  - 🔴 **목(mock)이 실제 DB 보다 헐거우면 검증이 무의미하다** — `order`·`limit`·`gt` 세 개를
    무시하고 있었고 그 때문에 버그 셋을 못 잡았다. **목을 먼저 조인 뒤에 잴 것**(55차 ②)
  - 🔴 **상하차조건 8종을 시안 6종으로 합치지 말 것** — `호이스트`≠`크레인` · `협의필요`≠`기타`
    (라벨을 바꾸면 문자열 완전일치 매칭에서 조용히 가산이 빠진다) · `컨베이어` 유지
  - 🔴 **차량형태는 22종이고 맨 뒤 둘은 뜻이 정반대다** — `특수/협의`(배차 어려워짐) ≠
    `차종무관`(쉬워짐). 합치지 말 것. `lib/vehicleBodyTypes.ts` 가 유일한 정의처이고
    `QUOTE`(21) / `DRIVER`(24) 두 목록은 **일부러 다르다**(55차 ③)
  - 🔴 **23차 조사 §4-1·§6-3 이 틀렸다** — 카테고리 6개는 시안에 다 있다. 909×540 캡처로
    아래쪽을 못 본 오판이며 **fullPage 렌더링이 정본**이다. 접이식 「추가 조건」을 만들지 말 것
  - 🔴 **제3자 제공 동의와 「내 요청 내역」은 시안에 없지만 일부러 남겼다** — 지우지 말 것
  - 🔴 **상차 하한은 「오늘 날짜·현재 시각」** 이고 막는 곳이 셋이다(input · 칩 · 제출 직전).
    ⚠️ 25차의 `max(오늘, LEGAL_EFFECTIVE_DATE)` 는 **리뷰 7번에서 뒤집혔다** — 그러면 시행일
    전까지 칩이 둘 다 비활성이라 화주가 발주를 아예 못 넣는다. 하차는 **상차 +30분**
  - 🔴 **적재구분은 작은 원형 라디오이고 위치는 8칸 그리드와 품목 사이다** — 네 번 바뀐
    항목이라 되돌리기 전에 55차 ⑤ 의 이력을 볼 것
  - 🔴 **홈 공지의 안 읽은 수는 목록과 따로 세고, 홈은 "확인함"을 기록하지 않는다**(55차 ⑫)
  - 🔴 **공유 컴포넌트 5종을 고치지 않았다** — 포털 전용 래퍼 `components/pv2/` 를 썼다.
    `AddressSearch` 는 인라인 style 때문에, `DateTimePicker` 는 상한 미지원 때문에 고칠 수 없다
  - 🟢 **시안 소스 값 대조 검증을 새로 만들었다**(13항목) — 24차의 "구조만 재고 시안과 같은가는
    안 쟀다" 문제를 막는 장치다. 26·27차도 이 방식을 쓸 것
  - 🟢 **관리자 회귀는 origin/main 을 같은 목으로 띄워 대조할 것** — 낡은 before 스냅샷과
    비교했다가 목 데이터 차이를 회귀로 오판할 뻔했다
- ~~**26차: 화주포털 시안 정합 (서체·아이콘·폼 컴포넌트)**~~ — **56차 세션에서 완료**
  (상세는 위 56차 기록). 🔴 **26차가 "견적 흐름"이 아니었다** — 지시서가 시안 정합으로 와서
  견적 흐름이 27차로 밀렸다. 이후 세션이 알아야 할 것만 요약:
  - 🔴 **포털 폼에 네이티브 `select`·`input[type=date]` 를 다시 넣지 말 것**(원칙 57번).
    펼친 목록·달력은 브라우저가 그려서 CSS 로 못 바꾼다 — `Pv2Select`·`Pv2DatePicker` 를 쓸 것
  - 🔴 **`--pv2-icon-knockout` 을 고정색으로 박지 말 것** — 구멍 배경이 사이드바(`#1A1A1A`)와
    탭바(`#FFFFFF`)에서 **정반대**다. `variant="tabbar"` 도 없애지 말 것(획 굵기·path 수가 다르다)
  - 🔴 **포커스 글로우를 체크박스·라디오에 걸지 말 것**(원칙 58번) — `box-shadow` 가 border-box
    를 따라가 **원형 라디오에 노란 사각박스**가 생긴다. 그 둘은 `:focus-visible` outline 링으로
  - 🔴 **트리거 라벨(`날짜 선택`·`저장된 …불러오기`)을 회색으로 칠하지 말 것** — placeholder 가
    아니라 **그 버튼의 이름**이다. 목록에도 그 문구를 넣지 말 것(`placeholder`/`emptyLabel` 사용)
  - 🔴 **특성도가 같으면 선언 순서가 이긴다 — 순서로 고치지 말 것**(원칙 58번). 두 클래스
    선택자로 특성도를 올릴 것
  - 🔴 **요청 프리셋 관리는 배송지·화물 관리 화면 한 곳이다** — 발주요청에 「요청사항 삭제」를
    다시 만들지 말 것. 세 섹션이 같은 구성(폼 / 카드 목록 / 수정·삭제 / 확인 모달)이다
  - 🔴 **입력 크기는 세 벌이다**(`.pv2-input` / `-sm` / `-grid`) — 합치면 주소칸이 작아지고
    담당자칸이 커진다
  - 🟢 **「내 요청 내역」을 지워 생긴 "반려 건을 볼 화면이 없다"는 27차에 해소됐다** —
    「견적 확인」에 「접수 반려」 카드로 섞여 나오고 사유(`staff_note`)를 보여준다
  - ⚠️ **서체는 이 환경에서 확인할 수 없다** — 프록시가 폰트 CDN 을 막아 Pretendard 도 SUIT 도
    안 뜬다. 24·25·26차 캡처가 전부 대체 서체다
- ~~**27차: 화주포털 견적 흐름**~~ — **57차 세션에서 완료**(상세는 위 57차 기록).
  이후 세션이 알아야 할 것만 요약:
  - 🔴 **상태 라벨은 화주 화면에서만 바뀐다** — `lib/quoteStatusLabels.ts` 가 유일 정의처다.
    DB 값과 관리자 화면은 `보류`·`실패` 그대로다. **통일하려 들지 말 것.**
  - 🔴 **「협의 중」 배경을 「운송 확정」과 같게 두지 말 것** — 시안은 둘 다 `#FFF9D6` 인데
    뜻이 정반대다(멈춘 것 / 성사된 것). 「협의 중」만 `#F4F3EF` 로 옮겼다
  - 🔴 **시안 소스의 라벨은 「보류」다** — 「협의 중」은 사용자 확정으로 바꾼 것이니
    "시안이 보류라고 되어 있다"며 되돌리지 말 것
  - 🔴 **견적서 print 2종은 항상 쌍으로** — 27차가 PDF↔엑셀 부가세 불일치를 해소했다.
    `lib/quoteExcel.ts` 는 이미 맞으니 건드리지 말 것
  - 🔴 **입금 계좌는 값이 비면 블록 자체를 그리지 않는다**(`hasBankAccount()`) —
    가드가 없으면 여백만 남아 규격이 무너진다. 정본은 `COMPANY_BANK_ACCOUNT` 이고
    `COMPANY_INFO.bankAccount` 는 거기서 파생된 평문이다
  - 🔴 **반려된 발주 요청이 견적 확인에 섞여 나온다** — 승인건은 넣지 않는다(중복).
    사유(`staff_note`)를 반드시 보여준다
  - ⚠️ **모바일에서도 입금 계좌·「아래와 같이 견적합니다」를 그린다** — 지시서 3-2·완료조건
    16 은 뺀다고 했으나 **시안 소스 모바일 분기에 둘 다 있다**(실측, 사용자 확정)
  - 🔴 **견적 확인 목록은 리뷰에서 통째로 다시 그렸다**(클로드디자인 신규 시안 9장) —
    카드가 **접힘 + 펼침 아코디언**이고 견적번호가 크고 구간이 작다. **한 번에 하나만 펼친다.**
    「상세 보기 ▼」(카드 안에서 펼침)와 「견적서 상세 보기」(`/customer/quotes/[id]` 라우트)는
    **다른 것이다 — 둘 중 하나를 없애지 말 것**
  - 🔴 **「견적 승인」은 화주가 `quotes.status` 를 바꾸는 첫 경로다**(`견적제출 → 수주`).
    `app/api/customer/approve-quote/route.ts`(service_role)로만 하고 **`quotes` 에 화주 UPDATE
    정책을 만들지 말 것.** 🔴 **운송오더를 자동 생성하지 않는다**(담당자가 만든다 — 두 번 생긴다)
  - 🔴 **운임 내역의 「합계 (부가세 별도)」에 부가세를 더하지 말 것** — 부가세는 옆 칸에 따로 있다
  - 🔴 **`대기중` 발주 요청도 목록에 뜬다**(「상담 중」) — `승인됨` 은 견적으로 바뀌므로 넣지 않는다.
    **`대기중` → `승인됨` 전환이 곧 카드 교체다**
  - 🔴 **관리자 알림은 `TopNav` 「견적 관리」 배지**다 — 「수주인데 운송오더가 없는 건」을 세고,
    오더를 만들면 사라진다. 실패하면 0(배지 하나로 상단메뉴가 깨지면 안 된다)
  - 🔴 **견적서 상세와 PDF 는 금액 줄이 줄 단위로 같아야 한다** — 「공급가액 (부가세 별도)」
    줄이 한쪽에만 있으면 안 된다. 머리 금액은 양쪽 다 「총 견적금액 (부가세 포함)」이다(10차·53차 위계)
  - 🔴 **4라운드에 DB 가 바뀌었다** — `portal_order_requests` 가 **35 → 38컬럼**
    (`collection_method` · `direct_collection_point` · `dropoff_arrival_type`, 전부 nullable,
    `_migrations` 21행). 🔴 **`billing_cycle` 을 더하지 말 것**(월정산은 화주별 계약이라
    담당자가 정한다). 🔴 **`dropoff_arrival_type` 이 정본이고 하차 시각 23:59 는 자리 채움**이라
    화면은 시각 대신 「당착」/「내착」을 그려야 한다. 자세한 것은 57차 ③-4
  - 🔴 **견적서 네 산출물은 `getQuoteSettlementLine()` 한 함수를 쓴다**(상세·PDF 2종·엑셀) —
    각자 조합하면 조용히 어긋난다. 자리는 합계와 입금 계좌 사이이고 값이 없으면 안 그린다
  - 🔴 **선착불이면 입금 계좌를 그리지 않는다**(5라운드 확답 — *"주선수수료는 화주가 주는
    경우는 없다"*). 견적서 상세·print 2종 **세 곳에 같은 조건**을 걸었다. 되돌리지 말 것 —
    화주가 차주에게 직접 지급하는 건에 입금할 계좌를 적으면 잘못된 문서다
  - 🔴 **화주가 보는 정산방식 말이 담당자 말과 다르다**(27차 ④ 와 같은 구조) —
    「운임 수금방식 / 위캐리 수금 / 선착불(차주 직접수금)」. 유일 정의처는
    `getCustomerCollectionMethodLabel()` · `CUSTOMER_COLLECTION_AXIS_LABEL` 이고
    🔴 **`getSettlementDisplayLabel()`(담당자 말)을 이 말로 바꾸지 말 것** — 정산관리·배차·
    관리자 화주요청이 같이 쓰고 거기서는 「주선사 정산」이 정확하다
  - 🔴 **화주포털 두 화면(`dispatches`·`invoices`)에는 아직 담당자 말이 남아 있다** —
    일부러 안 고쳤다(「월정산」을 화주 말로 표현할 수 없어서). 29차·내부 정합 차수의 전제다
  - 🔴 **제3자 제공 동의는 접이식이고 접힌 상태에 제목·「자세히 보기」·체크박스만 남는다**
    (5·6·7라운드에 걸쳐 넓어졌다). 🔴 **제목을 줄이거나 접음 안으로 넣지 말 것** — 그러면
    체크박스만 남아 동의를 구하는 문장이 사라진다. 문구는 하나도 지우지 않았다
  - 🔴 **발주 폼 블록 순서는 ① 구간 ② 일정 ③ 화물·차량 ④ 요청사항이다** — 되돌리려면
    블록 두 개를 통째로 옮기고 **번호 배지도 같이** 고칠 것
- ~~**28차: 내부관리시스템 연동 조사**~~ — **58차 세션에서 완료**(조사 전용, 코드·DB 변경 0).
- ~~**차수 없음: P0 선행 작업**~~ — **59차 세션에서 완료**(PR #106 merge, squash `a1a180a`).
- ~~**29차: 화주포털 조회 흐름**~~ — **60차 세션에서 완료**(PR #107 merge, squash `62eca7b`,
  실사용 리뷰 2라운드. 상세는 위 60차 기록). 이후 세션이 알아야 할 것만 요약:
  - 🔴 **"시안이 없어서 못 한다"가 틀렸던 사례다** — 28차·59차가 두 번이나 그렇게 적었는데
    `고객운송관리 리디자인 v4.dc.html` 에 세 화면이 처음부터 다 있었다. **다시 그렇게 쓰기
    전에 저장된 시안 파일부터 열어볼 것.**
  - 🔴 **배차 3단계 매핑의 정의처는 `lib/dispatchStage.ts` 하나다** — 배차 화면과 홈이 같이
    쓴다. 두 곳에 각각 적으면 "홈에는 배차완료인데 조회에는 접수"처럼 조용히 갈린다.
    **`lib/dispatchStatusColors.ts`(6종)를 이 매핑으로 바꾸지 말 것**(관리자 3화면이 쓴다).
  - 🔴 **`하차완료` 는 「운송완료」다** — 진행 중에 두지 말 것(화물은 이미 도착했다).
    **문제발생 건은 `pickup_confirmed`·`delivery_confirmed` 두 boolean 으로 복원한다** —
    조회에서 그 둘을 빼면 문제발생 건이 전부 「접수」로 보인다.
  - 🔴 **문제발생 판정은 `dispatch_status='문제발생'` 과 `dispatches.issue_occurred` 의
    합집합이다**(`hasDispatchIssue()`) — 둘은 서로 자동으로 맞추지 않는다. 한쪽만 보면
    담당자가 체크만 하고 상태를 안 바꾼 건이 새어 나간다.
  - 🔴 **차주 성명·연락처·차량번호는 통째로 뺐다 — 마스킹도 안 한다**(확정 9번).
    정보 손실이 아니다: 알약 보조가 「배차 대기」/「차량 배차됨」으로 이미 답한다.
  - 🔴 **정산방식은 2축으로 나눈 것이지 2종으로 줄인 것이 아니다** —
    `getCustomerCollectionMethodLabel()`(운임 수금방식) + `getCustomerBillingCycleLabel()`
    (청구, **별도 줄**). 청구 축을 앞 함수 **안에** 넣으면 27차가 기각한 (C)안이 된다.
    🔴 **`getSettlementDisplayLabel()`(담당자 말)은 한 글자도 안 고쳤다** — 관리자 5파일이 쓴다.
  - 🔴 **완료 알약에 일시를 넣지 말 것** — `dispatches` 에 완료 시각 컬럼이 없다
    (`created_at`·`updated_at` 뿐). 제안이 나오면 **컬럼부터 확인**할 것.
  - 🔴 **통계 조회 하한은 「이번 달을 넘지 않게」 한 번 더 눌러 뒀다** — 시행일이 미래라
    안 누르면 조회 구간이 거꾸로 잡혀 **화면이 통째로 빈다**(55차가 발주 폼에서 겪은 함정).
  - 🔴 **캘린더는 통계 하단이고 `/customer/calendar` 라우트도 살아 있다** — 두 곳이
    `Pv2DispatchCalendar` **같은 컴포넌트**를 쓴다. 날짜 클릭 상세는 **팝오버**다(리뷰 확정).
    **`.pv2-calcell` 의 `border: none` 을 빼지 말 것**(버튼 기본 테두리가 되살아난다).
  - 🔴 **사진·인수증은 조회 화면에서 뺐다 — 확정 10번을 사용자가 뒤집은 것이다**(리뷰 1라운드,
    *"화주에게 인수증 전달은 여기서 안함"*). 옛 확정을 근거로 되살리지 말 것.
    🟢 **인프라(`DispatchPhotosPanel`·관리자 업로드·서버 API)는 그대로 살아 있다.**
  - ⚠️ **`profile`(담당자 정보)만 남았다** — 조회가 아니라 계정 화면이라 일부러 뺐다.
    🟢 **그 화면은 PR #121(`ae8ddfb`)에서 끝났다 — 이제 포털 8화면이 전부 pv2 다.**
- ~~**30차: 랜딩페이지 교체**~~ — **61차 세션에서 완료**(상세는 위 61차 기록).
  이후 세션이 알아야 할 것만 요약:
  - 🔴 **확정 다섯 개가 뒤집혔다** — 25톤 · 이사 노출 · 차량 12종 · 폼 3화면(31차) ·
    보험. **34차·합의 v3.0 을 근거로 되돌리지 말 것.**
  - 🔴 **화면 문구는 시안 그대로 「1톤부터 5톤 이상, 특수차량까지」다**(리뷰 2라운드).
    「25톤」은 요금 가이드 표(11차급)와 FAQ 답이 말한다 — **「5톤 이상」이 상한을 닫지
    않으므로 어긋나지 않는다.** ⚠️ 운송 유형 「전국화물서비스」의 25톤은 **시안 원문**이라
    그대로 뒀다. 🔴 **「전 차종」·「모든 차량」은 여전히 금지다**(「특수차량」만 풀렸다).
  - 🔴 **보험은 켜진 채로 배포됐다**(`INSURANCE_ENABLED = true`, 리뷰 1라운드 사용자
    지시). WHY 5장 · FAQ 6문항. **금액을 넣지 말 것**(약관 제19조가 금액 없는 설계다).
    ⚠️ **증권을 아직 못 받았다** — 공개일(2026-09-07)까지 담보가 확인되지 않으면
    이 값을 다시 `false` 로 내려야 한다.
  - 🔴 **시작가 11차급은 DB 실측값**이고 **랜딩·`/vehicles` 가 같은 배열 하나**
    (`components/landing/data.ts` 의 `startPrices`)를 읽는다 — 다시 갈라 적지 말 것.
    **운임기준표 마이그레이션과 항상 같은 PR 에서 움직인다.**
    ⚠️ 「차종·적재 용량」(CBM)은 리뷰에서 **뺐다** — 되살리려면 8~25톤 CBM 을 먼저 정할 것.
  - 🔴 **`/vehicles` 차량 12종도 `components/landing/data.ts` 를 읽는다** — 배열을
    두 곳에 적지 말 것.
  - 🔴 **CTA 하단에는 법적 문서 3종만 남았다**(오른쪽 정렬). 이동 링크 8개는 리뷰에서
    지웠으니 **다시 채우지 말 것.** `/status` 는 `/quote`·`/apply` 헤더 칩과 접수완료
    2화면에 있다. ⚠️ **푸터 법정 표시사항은 남겼다** — 전자상거래법 제10조라 빼면 위법 소지.
  - 🔴 **랜딩·`/vehicles` 의 「차량 크기와 형태를 각각 선택」 안내를 지우지 말 것** —
    시안 이름이 발주 폼 선택지와 다른 간극을 메우는 줄이다.
  - 🔴 **`lib/legal/` 은 안 고쳤다** — 법적 문서는 기존 `LegalLinks` 모달을 쓴다.
  - ⚠️ **공개 화면 헤더가 두 종류다**(랜딩 = 새 헤더 / 나머지 = 37차 옐로 헤더).
    31차가 폼 3화면을 교체하면 좁혀진다.
  - ⚠️ **접수 안내 문자는 존재하지 않는다** — 지시서 3-9 의 전제가 틀렸다. 만들려면
    별도 차수다(`/quote`·`/apply` API 에 발송 트리거가 붙어야 한다).
- ~~**31차: 폼 3화면(`/quote` · `/apply` · `/customer/login`)**~~ — **62차 세션에서 완료**
  (PR #109 merge `7d88930`, 실사용 리뷰 3라운드. 상세는 위 62차 기록, 특히 ⑬).
  이후 세션이 알아야 할 것만 요약:
  - 🔴 **`/status` 는 라우트·API·처리방침 행까지 전부 없앴다 — 되살리지 말 것**(62차 ⑬-2).
    비회원 조회 경로는 이제 없다. 「접수 안내 문자」는 애초에 존재하지 않는다(61차 ⑨)
  - 🔴 **`/apply` 제3자 동의는 조건부다 — 항상 뜨게 바꾸지 말 것**(62차 ⑬-3). 현장
    담당자 연락처를 적었을 때만 뜨고 그때만 `consents` 가 3행이 된다. 서버는 화면이
    보낸 boolean 이 아니라 **연락처 값을 직접 보고** 판단한다(원칙 25번)
  - 🔴 **선택 항목이어도 처리방침 제2조에 넣어야 한다** — 법이 요구하는 건 "실제로
    수집하는 항목"이고 필수/선택은 고지 의무를 가르지 않는다. 이번에 `/quote`·`/apply`
    두 행을 화면과 대조해 통째로 다시 썼다
  - 🔴 **주 이용 차량은 톤수 1개 + 형태 1개다**(사용자 재확인 2026-09-01) — 중복 선택으로
    바꾸면 `companies.recommended_vehicle`(단일 text)이 목록이 되어 배차 판단에 못 쓴다
  - 🔴 **월별 통계 엑셀은 배차 3단계로 찍는다** — 원본 6종으로 되돌리면 화면과 갈린다.
    현장 추가비를 표시 시점에 합산하고, **차주 정보·지급액은 어떤 열로도 넣지 말 것**
  - ⚠️ **랜딩 헤더는 520px 이하에서 라벨이 짧아진다**(「무료 견적 문의」→「견적 문의」).
    `!important` 는 인라인 style 을 이기려는 것이니 빼지 말 것
  - ⚠️ **주소칸 16px 은 `.landing-addr` 쪽 특성도가 이겨서 뚫려 있던 것을 막은 값**이다
    (원칙 58번) — 15px 로 내리면 iOS 자동확대가 되살아난다
- ~~**31차 예고(아래는 착수 전 기록)**~~ — 🟢 **다음 차수로 확정**
  (사용자 결정 2026-08-31 — "31차로 따로 가자"). 🔴 **시안 HTML 3종은 PR #108 코멘트에
  첨부돼 있고 저장소에는 안 넣었다**(자체 압축해제 번들이라 합쳐 20MB). 다시 받으려면
  **WebFetch 로 302 Location 을 받아 5분 안에 `curl`**(57차 ① 방법).
  🔴 `/apply` 동의 기록(`consents`, 49차) 연속성이 핵심 · `/quote` 도 서버 API 로 동의
  1행을 남긴다 · 주소검색 API · `VEHICLE_TYPES_PUBLIC` 6→11종 여부.
- ~~**차수 없음: 랜딩 2차 개편 + 법적 문서**~~ — **65차 세션에서 완료**
  (PR #112 merge `284c776`, 실사용 리뷰 4라운드. 상세는 위 65차 기록).
  이후 세션이 알아야 할 것만 요약:
  - 🔴 **확정 4건을 되돌리지 말 것** — 운임 ×0.833 인하는 **의도**(45차 값이 옛 값) ·
    「이사」는 고객 접점에서 **뺀다**(30차를 뒤집고 34차로 복귀) · 「최저가」는 빼고
    **「월별 이벤트」는 남긴다** · 전자상거래법 표시는 **「사업자정보」 모달**
  - 🔴 **모달은 자기 글자색을 스스로 선언해야 한다** — 어두운 배경(인라인 흰 글자) 안에서
    열리면 상속으로 통째로 안 보인다. `LegalModal`·`BusinessInfoModal` 의 인라인
    `color: var(--text)` 를 지우지 말 것
  - 🔴 **`service-04-moving.jpg` 를 지우지 말 것** — `wecarry24.co.kr` 이 쓴다.
    「고정화물 배차」 문구는 화주포털 프리셋 기능에 근거하며 **전담 차량을 약속하지 않는다**
  - 🔴 **보험 값 5개는 화면에 나가지 않는다**(약관 제19조가 금액 없는 설계).
    ⚠️ 자기부담금 20만원 · 증권 만기 **2027-09-01** — 갱신이 확인 안 되면 값을 비우고
    `INSURANCE_INFO_IS_PLACEHOLDER` 를 다시 `true` 로
  - 🔴 **`/admin/rates` 확인 창은 「10km 이내」 × 게시 차급뿐이다** — 전 구간에 걸지 말 것
  - 🔴 **설명글이 두 상수로 갈렸다** — `START_PRICE_NOTE`(3줄) + `START_PRICE_FOOTNOTE`
    (표 아래 각주 1줄). 필수 넷은 둘에 나뉘어 다 있다 — 한쪽만 보고 「빠졌다」 하지 말 것
  - 🔴 **모바일 히어로 전화 버튼은 225×56 이다** — `width: auto` 와 부모
    `align-items: flex-start` 가 **쌍**이고 `min-width: 0` 을 빼면 360px 에서 넘친다.
    데스크탑(334×83 · 26px)은 그대로다
  - 🟢 ~~**`components/SiteFooter.tsx` 에 `BUSINESS_INFO` 사본이 남아 있다**~~ →
    **69차에 `COMPANY_BUSINESS_INFO` 로 합쳤다.** 🔴 다시 갈라 적지 말 것
  - ⚠️ **구조를 바꾸면 그 요소를 겨누는 CSS 를 같이 훑을 것** — WHY 행을 `<details>` 로
    바꾸면서 모바일 규칙 6개가 빗나갔고, 오버플로우만 재던 검증이 그걸 못 잡았다
- ~~**차수 없음: 이용약관 개정 (보험약관 대조)**~~ — **66차 세션에서 완료**
  (상세는 위 66차 기록). 이후 세션이 알아야 할 것만 요약:
  - 🔴 **제19조 항 번호가 밀렸다**(7 → 8) — 5항이 「취급 협의 대상 화물」 신설이고
    구 5·6·7항이 **6·7·8항**이 됐다. **옛 기록의 번호 표기는 낡았다 — 내용으로 찾을 것.**
    🟢 2·3·4항은 안 움직여서 `lib/insuranceInfo.ts` 참조는 그대로 유효하다
  - 🔴 **특별약관을 하나도 가입하지 않았다** — 제외 화물 **6종**(유리제품·계란류·동물 포함)은
    **고지해도 보험이 안 나온다.** 「고지하면 된다」고 적지 말 것.
    ⚠️ 증권 표면에는 1·2번만 인쇄돼 있어 65차가 두 줄로 알고 있었다
  - 🔴 **약관에 넣지 않은 것 셋** — 「분실」(상법 제115조) · 근로자 도난 가담 · 자기부담금
    20만원. **보험 면책을 그대로 옮기면 우리가 지는 위험이 화주에게 넘어간다**
  - 🔴 **냉장·냉동 온도 면책도 일부러 안 넣었다** — 냉동탑 배차를 광고하기 때문.
    보험(냉동·냉장장치 특별약관)으로 메울 문제다
  - ⚠️ **통지 기간 14일은 PR #133 에 삭제됐다** — 제20조 1항 2호였다. 🔴 **그래도
    제17조에 새로 만들지 말 것**(지우기로 한 것을 다른 조로 옮기는 셈이다)
  - ⚠️ **처리방침 제4조에 보험회사 행이 없다** — 보고만 했고 안 고쳤다(추가 필요해 보임)
  - 🟢 **보험사 문의 6문항은 취소됐다**(2026-09-03 사용자 확정) — 「확인 대기」로
    되살리지 말 것. 약관이 보험을 책임의 조건으로 걸지 않아 답이 무엇이든 문안이
    안 바뀐다. 남은 선행 조건은 **변호사 검수 하나**다
  - 🔴 **실사용 리뷰 2라운드에 약관의 방향이 뒤집혔다**(전문은 66차 ⑰) —
    「회사가 배상 주체」 → **「차주·보험자 1차 부담 + 회사 중재」**(제18조 3항 복원).
    34차·66차 본작업 기록으로 되돌리지 말 것
  - 🔴 **되살리기 금지 넷** — 제19조 2항의 「보험금 지급 여부와 관계없이 회사가
    배상한다」(리뷰 2라운드에 제거) · 7항의 과실 경합 「다만」 단서 · 랜딩 WHY 05 의
    「배상해 드립니다」 · 5항에서 뺀 두 호(살아있는 동물 · 법령상 제한 — **제12조와
    정면으로 부딪힌다**)
  - 🔴 **삭제 금지 셋** — 제18조 3항 **마지막 문장**(「회사 자신의 배상책임은 제1·2항 및
    제19조에 따른다」 — 없으면 전면 면책으로 읽혀 그 항이 무효가 된다) · 제19조 **8항**
    (고의·중과실 예외 — 7항 단서를 뺀 뒤로 **유일한 방어선**) · 5항의 **「그로 인하여
    발생하거나 확대된」 인과 한정**
  - 🔴 **랜딩 WHY 05 에 연착·「보장」류 단정을 되살리지 말 것** · 「미리 알려주시면」은
    **제19조 5항과 짝**이다(한쪽만 지우지 말 것)
  - 🔴 **변호사 검수 1순위 — 확정운임 → 상법 제119조 2항 운송인 의제 가능성.**
    그래서 「회사는 책임이 없다」로 더 밀지 않았다. 무효가 되면 한도·면책까지 같이 잃는다
  - 🟢 **표준적인 면책 장치는 이미 다 있다** — 무과실 면책 · 가액 신고제 · 고가물 특칙 ·
    특별손해 배제 · 면책 9호 · 14일 통지 + 유보 없는 수령 시 책임 소멸 · **1년 소멸시효** ·
    제12조 금지. 🔴 **「면책조항을 더 넣자」가 나오면 새 항이 아니라 개별 호 문구를 조일 것**
- ~~**차수 없음: 메일 서명용 로고 PNG**~~ — **67차 세션에서 완료**(PR #115 merge
  `3451259`, 상세는 위 67차 기록). 이후 세션이 알아야 할 것만 요약:
  - 🔴 **「로고 주소 알려줘」에 SVG 를 답하지 말 것** — 메일 클라이언트는 SVG 를 못 읽는다
    (Outlook 은 지원 자체가 없고 Gmail·네이버메일은 `<img>` 안의 SVG 를 막는다).
    메일용 주소는 **`https://wecarrylogis.co.kr/email/wecarry-logo-400.png`** 다
  - 🔴 **`public/email/` 의 PNG 2개를 지우지 말 것** — 저장소 코드가 참조하지 않고 **외부
    메일 서명이 절대 URL 로 가져다 쓴다.** 지우면 이미 발송된 메일의 서명이 전부 깨진다
    (`service-04-moving.jpg` 와 같은 성격). `public/email/README.md` 가 그 경고를 담고 있다
  - 🔴 **투명본·흰배경본 두 벌은 의도다 — 합치지 말 것.** 투명본은 다크모드에서 검정 글자가
    묻히고, 흰배경본은 다크모드에서 흰 박스가 보인다. 캔버스가 400×72 로 같은 것도 의도다
    (서명 HTML 의 `width` 를 하나로 유지). 표시 크기는 **200×36** 이고 `width`·`height` 를
    반드시 명시해야 한다(안 적으면 Outlook 이 400px 로 그린다)
  - 🔴 **로고 원본은 `brand/wecarry-logo.svg` 다** — `public/landing/wecarry-logo.svg` 는
    여백이 넓고 길이 0짜리 흰색 `<line>` 잔여물이 남아 있는 디자인팀 원본이다
  - ⚠️ **`/apple-icon.png` 는 워드마크가 아니다** — 180×180 옐로 정사각 아이콘이다(픽셀 실측)
  - ⚠️ **배포 후 실제 응답은 확인하지 못했다**(프록시가 도메인을 막는다) — 사용자 확인 항목
- ~~**차수 없음: 대표메일 교체**~~ — **69차 세션에서 완료**(PR #116 merge `1362a44`,
  상세는 위 69차 기록).
  이후 세션이 알아야 할 것만 요약:
  - 🔴 **네임서버를 카페24로 바꾸지 말 것** — 메일만 카페24이고 **웹사이트는 Vercel** 이다.
    가비아 DNS 에 `A(webmail)`·`MX`·`TXT(SPF)`·`TXT(소유권)` 네 줄만 더했고 `A(@)`·
    `CNAME(www)` 는 그대로다. 네임서버를 옮기면 웹이 통째로 죽는다
  - 🔴 **모든 자리가 `biz@wecarrylogis.co.kr` 하나다** — 역할 이름 주소라 담당자가 바뀌어도
    처리방침을 안 고친다. 🔴 **개인 이름 주소나 다른 법인 도메인을 법적 문서에 넣지 말 것**
  - 🔴 **`privacy@` 를 만들지 않기로 확정했다**(2026-09-03) — 개인정보 창구도 `biz@` 다.
    **이메일 상수를 둘로 나누지 말 것.** 값이 하나라 기존 상수 값만 바꿨다
  - 🔴 **판본은 파일 diff 가 아니라 게시되는 문서 내용을 기준으로 올린다** — 조문이 상수를
    참조해 `lib/legal/` 은 0건인데도 `privacy-v2` 로 올렸다. 연락처는 핵심 고지사항이다.
    🟢 `TERMS_VERSION`·시행일·「최종 개정일」은 그대로다(시행 전이라 초안 수정)
  - 🔴 **「상호」를 `COMPANY_BUSINESS_INFO` 로 옮기지 말 것** — 「사업자정보」 모달은 상호를
    `CompanyNameMark` 로 따로 그린다. 옮기면 모달에 상호가 두 번 나온다
  - ⚠️ **열람청구가 일반 문의에 섞인다** — 제35조 3항의 **10일 처리 의무**를 놓치지 말 것
  - ⚠️ **카페24 웹메일은 POP3(110) 평문뿐이고 IMAP·포워딩이 없다** — 처리방침 제9조의
    「통신 구간 암호화」와 어긋나므로 **앱 등록 전에 POP3S(995) 지원을 확인할 것.**
    지금은 POP3·SMTP 를 꺼 두어 웹메일로만 쓴다
- 🔴 **27차 merge 직후 새 지시가 들어왔다 — 「두 화면 시안대로 + 내부 시스템 정합」.**
**바로 착수하지 않고 작업지시서를 받기로 판단했고 사용자가 그 판단대로 merge 를 지시했다**
(2026-08-28). 근거와 실측(담당자 말 2축 4값 vs 화주 말 1축 2값, 월정산 축이 사라지는 문제)은
**57차 ⑪ 에 전문으로 적어뒀다 — 그 지시서를 쓰기 전에 반드시 읽을 것.**
🔴 **필수 결정 하나**: 「월정산」·「선착불 / 수수료 월정산」 두 칸을 담당자 화면에 그대로 둘지,
화주 말로 통일하면서 청구주기를 별도 표시로 뺄지. 이것만 정해지면 순서·구성·메뉴 항목은
기계적으로 옮길 수 있다.
~~🔴 **29차(조회 흐름)는 시안이 있어야 착수한다**~~ → 🟢 **60차에 해소됐다** —
`고객운송관리 리디자인 v4.dc.html` 에 세 화면이 **처음부터 있었다.** 없던 것은
클로드디자인이 새로 줄 「신규 시안」뿐이었고 사용자가 v4 로 진행하기로 확정했다
(2026-08-29). 🔴 **"시안이 없어서 못 한다"를 쓰기 전에 저장된 시안 파일부터 열어볼 것.**

- ~~**28차: 내부관리시스템 연동 조사**~~ — **58차 세션에서 완료**(보고서
  `내부관리시스템_연동_사전조사_28차.md` 547줄, 코드·DB 변경 0). 이후 세션이 알아야 할 것만:
  - ~~🔴 **P0 는 둘뿐이다**~~ — 🟢 **둘 다 59차(차수 없는 선행 작업)에서 완료**
    ① 관리자 화주요청 **상세 모달**(펼치기가 아니다, 원칙 18번) ② 배차 상세에 오더 `special_notes`
  - 🔴 **「월정산」 권장안은 (A)** — 담당자 말 유지 + 포털에서 「청구: 월정산」을 별도 줄로.
    근거는 **월정산이 운영 0건**이라는 실측이다. **(C) 는 27차가 이미 기각한 설계다**
  - 🔴 **관리자가 pv2 부품을 쓰려면 `--pv2-*` 변수 33개가 `.portal-v2` 안에만 있는 것을
    풀어야 한다** — `.pv2-tokens` 를 **추가**할 것. **옮기면 `globals.css` 삭제 줄이 생긴다**
  - 🔴 **23:59 는 안 보인다. 대신 시각이 빈칸이 되고 「내착」이 특이사항 안에만 있다**
  - 🔴 **용어 사고는 0건** — 전부 의도된 차이다. 통일하려 들지 말 것
  - 🟢 **관리자 회귀 기준선을 `19c1c27` 로 다시 쟀다**(9화면 × 12지표, 보고서 §8-1)
  - ⚠️ **원격 임시 브랜치 `claude/28-survey-tmp` 가 남아 있다** — 프록시가 삭제를 막는다
- 🟢 **「월정산」이 (A) 로 확정됐다**(2026-08-29, 사용자) — 담당자 화면은 그대로 두고 포털
  2화면만 화주 말로 바꾸되 **「청구: 월정산」을 별도 줄로** 뺀다. **30~32차의 전제가 풀렸다.**
  🔴 **(B)·(C) 를 다시 꺼내지 말 것** — 비교와 사유는 58차 ⑤ 에 있다.
- ~~🔴 **다음 지시서는 29차(포털 조회 흐름)이고 시안이 있어야 착수한다.**~~ →
  🟢 **29차는 60차 세션에 완료됐다**(배차 3단계 알약 · 정산 표와 두 줄 정산방식 ·
  통계 그래프 · 배차 캘린더 · 홈 배차 배지 · P1-1). 🔴 **"시안이 없어서 못 한다"가
  틀렸던 사례다** — v4 시안에 세 화면이 처음부터 있었다(위 60차 ①).
  🔴 **다음 지시서는 차수 없는 소수정(담당자 정보 `customer/profile`)이고, 그 뒤가
  30~32차(내부 정합)다.**
  🟢 **P0 2건과 사용자 결정 4건은 59차(차수 없는 선행 작업, PR #106)에서 끝났다** —
  아래 문단은 **28차 조사를 지시하던 시점의 글**이라 그 부분만 낡았다. 조사 자체도 끝났다.
  24·25·26차가 화주포털을 크게 바꾸면서 **화주가 입력하기 시작한 값을 담당자가 볼 수
  있는지 아무도 확인하지 않았다.** 9/7 시행일이 열흘 남짓이라 그때 못 보는 값이 있으면
  바로 운영에서 아프다. 핵심은 **화주 입력 → 관리자 표시 전수 대조표**이고, 각 행이
  `보인다`/`안 보인다`/`볼 필요 없다` 셋 중 하나로 끝나야 한다.
  🟢 **28차가 쓸 실측을 27차에 미리 떠뒀다** — 🔴 **`portal_order_requests` 는 지금
  38컬럼이다**(27차 4라운드가 3개를 더했다: `collection_method` · `direct_collection_point` ·
  `dropoff_arrival_type`). **28차가 `verify` 로 직접 세어 확인했다.**
  ⚠️ 아래 「35컬럼」은 **27차 착수 전 시점의 값**이라 그대로 두되 숫자로 쓰지 말 것 —
  **35컬럼**(마지막이
  `loading_type`, NOT NULL) · `customer_locations` **11컬럼** · 그 표에는 **status CHECK
  제약이 없다**(값은 코드가 쓰는 문자열이고 실제 분포는 대기중 2 · 승인됨 1 · **반려 0**).
  🔴 **디자인은 공유 부품까지만이 사용자 확정이다** — 색·레이아웃을 포털과 통일하는 안을
  다시 꺼내지 말 것. ~~그 다음이 **29차(조회 흐름)**~~ → 🟢 **29차는 60차에 끝났다**
  (배차 3단계 알약 · 정산 · 월별 통계 + 캘린더 · 홈 배차 배지). 🔴 **사진 자리만 예외로
  빠졌다** — 리뷰에서 사용자가 뺐다. **담당자 정보(`profile`)는 차수 없는 소수정으로 남았다.**
  🔴 **그 화면들을 그릴 때 `Pv2Select` 를 쓸 것** — 네이티브 `select` 를 새로 넣으면 26차가
  없앤 것이 되살아난다.
  🔴 **9/7 을 기다리지 않고 바로 이어간다**(2026-08-26 확정) — 화주포털은 로그인한 화주만
  보므로 공개 리스크와 무관하다.
  🟢 **조사 보고서 §14 의 "사용자 결정 11개"는 2026-08-26 에 전부 확정됐다** — 아래 확정표를
  볼 것. 🔴 **"아직 미결"로 적힌 옛 문장에 속지 말 것**(내가 조사 시점 상태를 그대로 옮겨
  적어서 25차 지시서가 이 줄을 정정하라고 지적했다).
```
   1 상하차방식      DB 8종 그대로 노출(시안 6종으로 합치지 않음)      25차 ✅
   2 발주 시작일     🔴 **오늘 날짜·현재 시각** (리뷰 7번에서 뒤집힘)   25차 ✅
   3 차급            11종(VEHICLE_TYPES_ALL)                          25차 ✅
  3b 차량형태        🔴 **22종**(차종무관 포함) · 25차에 7 → 21, 뒤에 22    25차 ✅
  3c 무료 대기시간   🔴 **20분** (30분에서 단축 — 가격 변경)           25차 ✅
  3d 적재구분        독차/혼적가능 · 작은 원형 라디오                  25차 ✅
   4 서체            SUIT Variable 유지 · Pretendard 도입 안 함        24차 ✅
   5 법인·상호       (주)디자인에그 │ 위캐리 운송 · CompanyNameMark    24차 ✅
   6 배차 상태       🔴 **시안대로 3단계** + 문제발생 별도 배지        29차 ✅
   7 견적 상태 라벨  보류→"협의 중" · 실패→"취소" (DB 값은 그대로)     27차 ✅
   8 정산방식        4종 유지 — 🔴 **2축으로 나눠서** 표현             29차 ✅
   9 차주 정보       구절 통째로 제거(마스킹도 하지 않음)             29차 ✅
  10 사진·인수증     🔴 **뒤집혔다 — 조회 화면에서 뺐다**(PR #107 리뷰) 29차 ✅
  11 입금 계좌       국민은행 069101-04-228121 / (주)디자인에그        27차 ✅
  12 통계 PDF        전체 다운로드는 안 만듦(엑셀로 대체)             29차 ✅
  13 캘린더·공지     라우트 유지 · 메뉴 제외                          24차 ✅
```
  🟢 **25차가 처리한 것**: `/customer/request` 상차 `minDateTime` 누락(원칙 6 위반) 해소 ·
  🔴 **서비스롤 GET 라우트 11개의 Next Data Cache 버그**(23차 조사에 없던 것이고, 문자 이력·
  직원 목록·공개문의·대시보드가 **저장 직후 옛 값을 보여줄 수 있는 상태**였다).
  🟢 **곁다리 하나가 27차에 해소됐다** — 견적서 PDF ↔ 엑셀 부가세 표기 불일치(31차가
  금지한 상태였다). ~~🔴 **남은 하나**: 홈 배차 배지 6종 → 3단계~~ → 🟢 **60차 완료**
  (`lib/dispatchStage.ts` 를 배차 화면과 홈이 같이 쓴다).
  🟢 **26차가 만든 숙제도 27차에 해소됐다** — 반려된 발주 요청은 **「견적 확인」에 넣기로
  확정**(2026-08-28)했고 「접수 반려」 배지 + 사유로 그린다.
  🔄 **이 항목은 절반이 끝났다(62차)** — `/status` 를 **라우트·조회 API·처리방침 행까지
  통째로 지웠다**(62차 ⑬-2). 🔴 **남은 것은 admin 공개문의 배지 하나뿐이다.**
  ⚠️ 아래는 그 시점 기록이라, 「비회원이 갈 경로가 사라진다」는 걱정은 **이미 실현됐고
  사용자가 그렇게 확정한 것**이다 — 그 문장을 근거로 되살리지 말 것.
  🔴 **별도 차수로 남긴 것 1개** — admin 공개문의 배지 + **랜딩의 「문의·신청 현황 조회」 삭제**.
  사용자가 *"랜딩에서 삭제할 계획이고 이 부분 처리도 고민이 필요하다"* 며 미뤘다. 그 링크는
  **푸터와 모바일 드롭다운 두 곳**에 있어 지우면 **비회원이 `/status` 로 갈 경로가 사라진다** —
  배지 방식과 진입 경로 이전을 한 차수로 묶는 것을 제안해 뒀다.
- 🟢 **20차는 전부 끝났다**(3-4는 47차, 3-1·3-2·3-3은 48차. 운영 DB 반영까지 완료).
  🟢 **25차가 전부 쓰기 시작했다** — 배송지 담당자 3컬럼 · `location_name`·`notes` ·
  `customer_presets` 가 배송지·화물 관리 화면과 발주 폼에서 실제로 쓰인다(55차 ④).
  🟢 **`도크` 도 25차 발주 폼의 상하차조건 드롭다운 8개에 포함돼 실측 확인됐다** —
  20차가 만든 것 중 화면에서 안 쓰이는 것은 이제 없다.
  🟢 **51차가 `customer_locations`·`customer_presets` 를 화주 롤로 실측해 뒀다** — 자기
  회사 것만 읽고 쓸 수 있다. 25차에서 "저장이 안 된다"가 나오면 정책이 아니라 화면 쪽이다.
- ⏸️ **가산기준 조정 — 22차에 대부분 끝났고 하나가 남았다.**
  🟢 **22차(52차 세션)에서 처리된 것**: 파손주의 `30,000 → 15,000` · 장척/중량
  `20%+80,000 → 15%+40,000` · **18톤 전 구간 ×0.89** · **8톤·15톤 신설**(11차급 165행).
  ⚠️ **「18톤 전 구간 ×0.89」와 「200km 이내만 −5.5%(341,000)」는 v11(PR #135)이
  덮어썼다** — 지금 165칸은 전부 `ROUND(차주지급 × 1.15, -3)` 이다. 22차 계수를
  근거로 되돌리지 말 것. 🟢 다만 **200km 구간이 차급 간격이 가장 좁다는 성질은
  그대로**이고 HANDOFF §5-1 에 표로 남아 있다.
  🔴 **아직 안 한 것 하나 — 별도 차수로 할 것**:
  - 🔴 **상차 시각 지정 가산 신설**(예고 +8,000) — `rate_surcharges` 에 **그 카테고리 자체가
    없는 것을 22차에 확인했다.** 새 카테고리 설계 + 견적 계산의 `selections` 배열 변경이
    따라오므로 코드 변경이 있는 차수다(22차는 값만 바꾸는 차수라 일부러 미뤘다).
  - ~~🔴 **5톤급 `base_fare` 재검토**~~ → 🟢 **v11(PR #135)에 해소됐다** —
    전 차급을 `ROUND(차주지급 × 1.15, -3)` 로 다시 깔았고 5톤 마진이 **17.3%** 다
    (98,000 → **115,000**, 게시가라 만원 단위로 맞춘 예외 칸). 🔴 **「실거래 42건에서
    마진 중앙값 13.6%(목표 17% 미달)」을 근거로 다시 조정하지 말 것** — 그 값은
    **v11 이전 운임에서 잰 것**이다.
  ⚠️ **11톤·25톤은 손대지 말 것** — 11톤은 검증됐고(완료 36건, +19.6%), 25톤은 완료 3건이라
  판단 불가다. **15톤·장척/중량도 관찰 대상**이니 실거래가 쌓이기 전에 또 만지지 말 것.
- ⚠️ **사용자가 배포본에서 확인할 것(18차 잔여)**: `/apply`에 체크박스가 **정확히 2개**이고
  약관 요약·거부권 문구가 읽을 만한지 / `/quote`에는 **약관 문구가 없는지**(사용자 결정대로).
  🟢 **DB 쪽은 해소됐다(52차)** — 사용자가 신청을 한 건 넣었고 `verify` ⑧-c 에
  `terms / terms-v1 / 1건`, ⑧-b 에 `application/terms → 원본 있음 1 · **고아 0**` 이 떴다.
  14차가 못박은 "join 까지 볼 것"까지 확인된 것이므로 **다시 확인할 필요 없다.**
- ⚠️ **사용자가 배포본에서 확인할 것(16·17·22차 잔여)** — 전부 **로그인이 필요하거나
  브라우저에서 봐야 하는 것**이라 이 환경에서 확인할 수 없다:
  `/vehicles` 시작가 **48,000원부터** / `/admin/quotes` 거리 `10.4` · `1톤` → **60,000원**,
  `5톤` · 대기 `90` → **50,000원** / 🔴 **`/admin/rates` 표에 8톤·15톤 포함 11개 열**이
  뜨고 18톤 값이 내려갔는지(22차) / 🔴 **`/customer/request` 희망 톤수가 11종**인지
  (21차에 6→9종, 22차에 9→11종. **여기는 대형이 나와야 맞는 곳**이다 — 46차 기준이
  21차에 바뀌었으니 "6개여야 한다"는 옛 기록에 속지 말 것).
  🟢 **운임기준표·동의 데이터 자체는 47차부터 `verify` 워크플로로 세션이 직접 확인한다**
  — 남은 것은 "화면에 어떻게 보이는가"뿐이다.
- 🔴 **변호사 검토 항목이 하나 늘었다(47차)** — `lib/legal/privacy.ts:211`의 제4조 표에
  **"운송을 의뢰한 고객에게 차주 성명·연락처·차량번호·차량 종류를 제공한다"**는 행이 있는데,
  **사용자 결정(2026-08-25)은 차주 정보를 화주에게 노출하지 않는 것**이다. 하지 않기로 한 일이
  기재된 상태이며 위반은 아니지만 사실과 다르다. 🔴 **임의로 고치지 말 것**(법적 문서다).
  아래 "동의 절차 잔여 6가지"의 2번(고지 항목 개편)과 **같은 차수에 함께 다루는 것이 맞다.**
- ~~🔴 **정할 것 — `/vehicles` 시작가를 운임기준표와 자동으로 잇는가**~~ —
  🟢 **64차 세션에 자동 연동으로 확정·구현됐다**(사용자 요청: *"내부시스템에서 운임기준표를
  수정했는데 랜딩 금액이 안 바뀐다"*). 정의처는 `lib/startPrices.ts` 하나이고 팝업은
  `/api/public/start-prices`(service_role), `/vehicles` 는 서버에서 직접 읽는다.
  🔴 **폴백 금액은 두지 않는다** — 두면 반드시 낡는다(실제로 코드 48,000 vs DB 40,000 으로
  어긋나 있었다). 조회가 실패하면 표를 아예 안 그리고 「견적으로 안내드립니다」만 남긴다.
  🟢 **저장 전 확인 단계는 65차 ⑨ 에 만들어졌다** — 45차가 「자동화한다면 같이 넣으라」고
  적어둔 안전장치다. 「10km 이내」 × **게시 차급**을 고칠 때만 차급·전→후 금액과
  「이 값이 랜딩과 차량안내에 바로 게시됩니다」를 묻고, 취소하면 옛 값이 남는다.
  🔴 **전 구간에 걸지 말 것** — 매번 눌러야 하면 실무가 막힌다(비게시 행은 창 없이 저장).
  ⚠️ 45차 (6)·61차 ⑥ 의 「손으로 맞춘 값이다」·「자동 연동이 아니다」는 **이제 낡은 기록**이다.
- ~~🔴 **가장 먼저 — 14차 동의 저장이 실제로 되는지 확인**~~ — **2026-08-25에 확인 완료**
  (마이그레이션 실행 + 양쪽 폼 실사용, 결과는 위 43차 기록 참고).
  🔴 **`consents` 마이그레이션은 이미 운영 DB에 반영돼 있다 — 다시 실행하려 하지 말 것.**
  ⚠️ **롤백 경로만 여전히 미검증**이다(정상 흐름에서는 안 타는 길이라 재현되지 않는다).
- ⏸️ **랜딩 이미지 교체 — 보류됨**(2026-08-26 사용자 결정: **랜딩페이지를 Claude Design에서
  다시 잡은 뒤** 넣는다). 없어진 항목이 아니라 **순서가 뒤로 간 것**이며, 아래 규격은
  재설계 뒤에도 그대로 참고할 것. 파일이 준비되면
  `lib/landingImages.ts`만 채우면 됨(컴포넌트에 경로를 직접 적지 말 것). 규격:
  히어로 870×716 / 운송 유형 456×304(모바일 없음) / 차량 4장 272×200·154×104 /
  선택 이유 아이콘 4종 64×64·48×48 / **운송관리 캡처 620×400·320×228**(제작 1240×800·640×456,
  데스크탑은 목록 **표** 5~6행·모바일은 **카드** 3~4장을 찍는다 — 다른 화면이다) /
  **⑦ 안전·책임 아이콘 3종 56×56·48×48**(13차 신설).
  ⚠️ **히어로 사진이 들어오면 그라데이션 정지점을 사진 밝기에 맞춰 한 번 더 볼 것**
  ⚠️ 캡처는 브라우저 확대 200%로 찍고, **데모 계정 가짜 데이터**를 쓸 것(실거래 마스킹 금지).
  상태 배지를 여러 종류 섞고 사이드바·브라우저 UI는 제외
- 🔴 **14차에서 하지 않고 남긴 것 6가지**(43차 세션 — 지시서 7장이 기록을 요구한 항목):
  1. ~~🔴 **파기 로직이 없다**~~ → 🟢 **「차수 없음: 보유기간 만료 파기 장치」(PR #122)에서
     해소됐다.** `scripts/purge-expired.sql` 을 `.github/workflows/purge.yml` 이 **매일
     03:10 KST** 에 돌린다(제7조의 「5일 이내」 때문에 주 1회로는 안 된다).
     🔴 **`quote_id is null`·`company_id is null`·`status <> '승인됨'` 세 조건을 빼지 말 것** —
     거래 기록(5년)까지 지운다. 기산점은 신설한 `processed_at` 이고 `updated_at` 을 쓰면 안 된다.
     ⚠️ **자동화된 것은 이 둘뿐이다** — 제3조 자체기준의 나머지 4행은 「거래 종료일」·
     「동의 철회 시」 처럼 이벤트 기반이라 그 시점을 담는 컬럼부터 없다(범위 밖).
  2. **동의 문구 고지 4항목 개편**(수집항목·보유기간·거부권) — 두 문구 모두 개인정보보호법
     제15조 2항을 아직 다 갖추지 못했다. **변호사 검토와 함께** 할 일.
     ⚠️ **49차에 `/apply` 약관 동의 문구가 새로 생겼으니 그것도 같은 검토 대상**이다
     (요약 문장·거부권 안내 모두 초안이다)
  3. **마케팅 동의** — 담당자(연락처) 단위. `subject_type='phone'` + `individual_customers.
     phone_normalized`와 같은 정규화 방식을 재사용하면 테이블을 안 늘리고 붙는다
  4. `public_quote_requests`의 **anon INSERT 정책 제거** — 서버 API 실사용 검증 후
  5. ~~**`/customer/request`의 제3자 개인정보**(상·하차지 담당자 이름·연락처)~~ →
     🟢 **47차(20차 3-4)에서 해소됨.** 동의 체크박스 + `consents` 저장 + 서버 게이트까지 완료
  6. **화주 상세에 동의 표시**(신청서 경유 조회) — 필요해지면
- ~~🔴 **처리방침이 약속한 동의를 실제로는 받지 않고 있다**~~ → 🟢 **47차(20차 3-4)에서
  해소됐다.** 처리방침 제4조가 약속한 *"실제 운송 접수(발주) 시점에 별도의 동의"*를
  `/customer/request`에서 실제로 받고 `consents`에 기록한다(43차에 발견해 보고만 했던 건).
  ⚠️ 다만 **문구 자체는 초안이고 변호사 검토 대상**이며, 같은 조 표에 **하지 않기로 한 일
  (차주 정보를 화주에게 제공)이 기재돼 있는 문제는 그대로 남아 있다** — 위 항목 참고.
- ⚠️ **답을 못 받고 남겨둔 것 1건(13차 리뷰)**: `/apply` **접수 완료 화면**의 기존
  "홈으로 돌아가기" 버튼은 홈 맨 위로 간다. 신청을 마치고 떠나는 자리라 그게 맞다고 판단해
  그대로 뒀고 리뷰에서 보고했으나 답이 없었다 — 폼 화면의 "← 홈으로"처럼 왔던 자리로
  돌려보내려면 `BackToHomeLink`로 교체하면 된다(한 줄).
- 그 밖에 아직 범위 밖인 것: ~~**`/vehicles`·`/about` 디자인 재구성**~~ → 🟢 **없어진
  항목이다** — 두 화면을 **2026-09-08 에 통째로 삭제**했다(PR #132, 사용자 확정 "나중에
  필요하면 새로 다시 만들면 된다"). 다시 만들 때는 재구성이 아니라 신규 제작이다,
  ~~**스크롤 모션**(레이아웃 확정 후 별도 세션)~~ → 🟢 **「차수 없음: 랜딩 모션」(PR #123)에
  완료됐다** — 🔴 **랜딩 한정이다.** `/vehicles`·`/about`·폼 3화면에는 리빌이 없고,
  토큰(`--mo-*`)도 `.landing-page` 스코프 안에만 있다. 다른 공개 화면에 넣으려면
  스코프부터 정해야 한다(`globals.css` 에 두지 말 것 — 관리자 31화면이 공유한다),
  ~~**`/vehicles`에 냉장·냉동 등 나머지 차량형태를 노출할지 여부**~~ → 🟢 **그 화면이
  없어져 해당 없다**(PR #132). ⚠️ **랜딩 ④ 차량 섹션의 12종은 그대로 살아 있다** —
  `components/landing/data.ts` 의 `vehicles` 가 정의처다, FAQ(보류), 푸터 디자인(5차 결정대로
  보류), 견적서 PDF에 로고 미표시(대표번호는 33차에 반영됨),
  관리자·화주포털 헤더 로고(랜딩만 적용됨),
  ~~OG 공유 이미지~~ · ~~SEO 일괄(metadataBase·canonical·Open Graph·OG 이미지·sitemap.xml)~~
  → 🟢 **63차(차수 없는 도메인 반영)에 전부 완료됐다.** ⚠️ **남은 것은 서치콘솔·서치
  어드바이저 등록뿐**이고 그건 코드가 아니라 사용자가 DNS 에 TXT 를 넣고 사이트맵을
  제출하는 일이다(급하지 않다), 성능 점검
  (Lighthouse mobile, LCP/CLS/INP, Hero 이미지 `next/image` — 37차에 자리표시자를
  일반 `<img>`로 뒀으므로 실제 사진을 넣을 때 `next/image` 전환을 함께 검토할 것)
- ~~🔴 **5차 완료로 확정된 운영상 파급 — 별도 세션 과제**: 견적서에 무료 대기시간과
  대기료 단가가 실제로 표기되어야 약관이 성립함~~ — **34차에 해소됨.** 제11조 2항이
  "기준을 안내한다"에서 "사유와 금액을 안내하고 협의한 후 청구한다"로 바뀌면서
  **견적서에 구체 기준을 표기해야 할 약관상 의무가 없어졌음**(30차부터 걸려 있던 항목).
  여전히 **운영상으로는 표기하는 편이 분쟁 예방에 유리**하므로 하고 싶으면 하면 되고,
  값은 이미 운임기준표(`rate_vehicle_extra_fees`)에 톤수별로 있어 찍기만 하면 됨.
  현재 견적서 PDF 2종에는 "실제 상하차 조건 및 대기시간에 따라 금액이 변동될 수 있습니다"
  라는 안내만 있음. ⚠️ **하더라도 회차비는 사전 단가 자체가 없으므로 넣지 말 것**(29차 (B)안)

### 인프라 리전 (2026-08-12 확인·조치 완료)

- **Supabase 프로젝트: `ap-northeast-2`(Northeast Asia, 서울)**
- **Vercel 함수 리전: 서울 `icn1`** — 원래 Vercel 기본값인 워싱턴(`iad1`)이었던 것을
  이 날 서울로 변경 후 재배포함(Hobby 플랜이라 리전 1개만 선택 가능). 이 설정은
  `vercel.json`이 아니라 **Vercel 대시보드(Settings → Functions → Function Region)에만
  존재**하므로 코드로는 확인할 수 없음 — 나중에 값을 확인해야 하면 대시보드를 보거나,
  배포된 사이트 응답 헤더 `x-vercel-id`의 **두 번째** 지역 코드를 볼 것(첫 번째는 접속
  지점이라 함수 리전과 무관하게 한국에서 접속하면 `icn1`로 나옴 — 헷갈리기 쉬움).
- 이 설정이 실제로 영향을 주는 범위: **서버 API 라우트(`app/api/**`, 전부 Node 런타임)**.
  `middleware.ts`는 Edge 런타임이라 전 세계 엣지에 배포되므로 이 설정과 무관하고,
  화면 대부분의 데이터 조회는 브라우저가 anon 키로 Supabase에 직접 붙어서 Vercel을
  아예 거치지 않음(원칙 2번 구조). 즉 리전 변경으로 빨라지는 건 SMS 발송·정산 저장·
  대시보드 집계·POD 업로드처럼 **서버를 거치는 작업들**임.
- **앞으로 서버 쪽 성능을 판단할 때 이 사실을 전제로 할 것**: 함수와 DB가 둘 다 서울에
  있으므로 서버 API의 DB 왕복은 이제 국내 지연(수 ms) 수준임. 예전에 "업로드·조회가
  느리다"는 피드백이 나왔던 건들(17차 세션 POD 업로드 등)은 이 변경 전 환경이었다는
  점을 감안할 것.

이 트랙과 별개로 남아있는 우선순위는:

1. 카카오 알림톡 자동화 — 사업자 인증·발신프로필 심사가 필요해 **미리 신청 절차부터
   시작하는 것을 권장** (승인에 시간 걸림)
2. 화주포털 발주요청 2차 기능(화주 직접 오더 입력)
3. ~~커스텀 도메인 연결~~ → 🟢 **끝났다**(`wecarrylogis.co.kr`, 2026-09-01 · 63차).
   공개 화면 UX 고도화는 그대로 보류 중
4. 유료 플랜 전환 (🟢 **화주 목록 페이지네이션은 PR #144 에 끝났다** — 여기서 뺀다)
5. 운영 대시보드(로드맵⑥) 고도화 — 현재는 최근 12개월 고정 조회+4개 핵심 지표만
   있는 1차 버전. 기간 선택 UI, 차트 라이브러리 도입, 섹션별 API 분리(데이터
   규모가 커질 경우) 등은 필요성이 확인되면 추가 검토
6. ~~**SMS 문구·발송 방식 정리**~~ — **33차(용어 정리)와 35차(담당자별 발신번호 +
   견적안내 LMS 전환)에서 대부분 해소됨.** 8종 문구·발신번호·발송 이력 표시가 정리됐고,
   23차의 "발송 직전 확인 모달" 방식은 그대로 유지되고 있음. **남은 후보**(전부 사용자가
   원할 때만): (a) 나머지 7종에도 LMS 제목 넣기 — 7종은 본문 첫 줄이 이미 "[WeCarry]
   xxx 안내"라 제목을 붙이면 알림창에 같은 말이 두 번 나오므로 **첫 줄을 빼는 작업이
   같이 필요**함(35차에서 범위 문제로 미룸), (b) 견적안내에 유효기간 한 줄 — `quotes`에
   컬럼은 없고 "발행일+7일" 규칙이 견적서 PDF·엑셀·약관 제7조 2항에 있음, (c) 견적안내에
   운송관리 링크 — **게스트 견적은 계정이 없어** 링크가 무의미하므로 회원 건에만 붙이는
   분기가 필요, ~~(d) 문자 발송 이력 통합조회 화면~~ — **36차에 완료**(`/admin/sms-logs`)

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
  고친 이력 있음. 🔴 **컬럼명이 불확실하면 `lib/companyFields.ts` 의 `COMPANY_FIELDS`
  를 먼저 확인할 것**(33차 신설 — 화주 항목의 유일한 정의처다).
  ⚠️ **이 자리는 오래 `companies_id_page_final.tsx` 의 `BASIC_FIELDS`/`SALES_REF_FIELDS`
  를 가리키고 있었는데 그 파일은 존재하지 않는다** — 33차 착수 전 확인에서 드러났다
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
- **공용 CSS 클래스(`.field input` 등)의 값을 바꾸고 싶을 때는, 그 클래스를 몇
  곳이 같이 쓰는지부터 확인하고 전역 변경 대신 스코프 래퍼 클래스를 쓸 것.**
  `/quote`·`/apply` 입력창을 16px로 올려야 했을 때(iOS Safari가 16px 미만 입력창에
  포커스하면 화면을 자동 확대함) `.field input`(14px)을 그냥 고치면 관리자 화면 등
  16곳이 전부 같이 바뀜 — 두 페이지 최상위에 `.public-form` 래퍼를 두고 그 안에서만
  올리는 방식으로 처리함(26차 세션). **이때 새 규칙이 기존 규칙과 특성도가 같으면
  (`.public-form input`과 `.field input` 둘 다 0,0,1,1) 나중에 선언된 쪽이 이기므로,
  반드시 기존 규칙보다 아래에 배치해야 적용됨** — 위에 두면 조용히 안 먹힘
- **랜딩(`/`)은 TopNav가 숨겨지는 독립 화면이므로(원칙 11번) `.nav-mobile-toggle`/
  `.nav-desktop-group` 같은 TopNav 전용 클래스가 전혀 적용되지 않는다.** 랜딩 헤더에
  모바일 대응이 있는 줄 알고 넘어가면 안 됨 — 실제로 링크 4개가 `flexWrap` 없이 한 줄에
  붙어 있어서 360px에서 81px 가로 오버플로우(진짜 가로 스크롤)가 발생하고 있었음
  (26차 세션에서 `components/LandingHeader.tsx`로 분리해 해소). 랜딩에 UI를 추가할
  때는 TopNav 클래스를 끌어오지 말고 랜딩 전용(`.landing-*`)으로 새로 만들 것 —
  동작 방식(바깥 클릭 시 닫힘 등)만 참고하면 됨
- **모바일 레이아웃이 깨졌다는 신고를 받으면 눈으로 보고 짐작하지 말고
  `document.documentElement.scrollWidth === clientWidth`로 실측할 것.** 가로 스크롤은
  원인 요소가 화면 밖에 있어서 스크린샷만으로는 어느 요소인지 특정하기 어려운데,
  뷰포트 밖으로 나간 요소를 `getBoundingClientRect()`로 전수 조사하면 바로 찾을 수
  있음(26차 세션에서 Playwright로 이 방식을 씀). 흔한 원인 순서: `min-width`가 큰
  요소 → `white-space: nowrap` → 고정 px 폭 → `100vw`+padding → 줄바꿈 안 되는 긴
  텍스트 → `absolute`/`fixed` 요소
- **검색엔진 색인 차단은 `robots.txt`만으로 끝내면 안 됨** — robots.txt는 크롤을
  막을 뿐 이미 색인된 결과의 삭제를 보장하지 않음. 핵심 방어선은 각 세그먼트
  `layout.tsx`의 `robots: { index: false, follow: false }` metadata이고 `app/robots.ts`의
  `Disallow`는 보조임(둘 다 유지할 것, 26차 세션에서 `/admin`·`/customer`·`/status`에
  적용). 원칙 25번의 "화면단+서버단 이중체크"와 같은 결
- **`brand/` 폴더의 로고·파비콘은 이미 가공된 파일이다 — 디자이너 원본(Illustrator
  내보내기)으로 다시 덮어쓰지 말 것.** 원본 워드마크는 viewBox가 `0 0 1000 200`인데
  실제 아트웍은 969×139만 차지해서, CSS로 `height:28px`를 줘도 **로고가 19px로 작게
  렌더링되는** 문제가 있었음(빈 여백까지 높이에 포함되기 때문). 그래서 viewBox를 아트웍
  bbox+여백으로 크롭해둔 상태(`9 25 982 151`)이고, 길이 0짜리 흰색 `<line>` 잔여물도
  제거되어 있음. 로고가 갑자기 작아 보이면 누가 원본으로 덮어썼는지부터 의심할 것.
  자세한 가공 내역·주의사항은 `brand/README.md` 참고
- **워드마크(`components/BrandLogo.tsx`)는 반드시 인라인 SVG여야 한다 — `<img src>`나
  `next/image`로 바꾸면 안 됨.** 루트에 `fill="currentColor"`가 걸려 있어 부모의 `color`를
  상속받는 구조라(다크 배경에서 흰색 전환 가능), 이미지로 참조하면 색이 검정으로 고정되어
  어두운 배경에서 로고가 안 보임. 반대로 **파비콘은 배경색이 채워진 디자인이라
  `currentColor` 처리가 없음** — 둘의 색상 처리 방식이 다르다는 걸 기억할 것.
  또 `brand/wecarry-logo.svg`와 이 컴포넌트는 같은 그림의 사본 2개이므로 **로고가 바뀌면
  반드시 둘 다 갱신**해야 함
- **랜딩 헤더에 요소를 추가하면 360px 가로 스크롤을 반드시 재확인할 것.** 워드마크
  종횡비가 6.50:1로 가로가 길어서(모바일 24px 높이 → 폭 156px) 여유가 거의 없음 —
  현재 360px에서 로고 우측 끝 180px, CTA 우측 끝 336px로 **남는 폭이 24px뿐**임.
  27차에서 로고를 넣을 때 이 여유를 확보하려고 모바일 높이를 24px로 낮췄고, 20px 이하로
  더 내리면 로고 안의 한글 "위캐리 운송" 판독이 어려워지므로 임의로 줄이지 말 것
- **파비콘은 `app/icon.svg`·`app/apple-icon.png`(App Router 파일 컨벤션)에 있고
  `brand/`에 사본을 두지 않았다.** Next.js가 이 두 파일을 보고 `<link rel="icon">`/
  `<link rel="apple-touch-icon">`을 자동 생성하므로 `metadata.icons`를 따로 적을 필요가
  없음. 파비콘을 바꿔야 하면 `brand/`가 아니라 이 두 경로를 고칠 것(`brand/`에는 미사용
  대안인 다크 버전만 보관 중)
- **클라이언트 컴포넌트에 prop으로 넘긴 값은 화면에 안 보여도 페이지 소스(HTML)에 그대로
  남는다.** Next.js가 클라이언트 컴포넌트의 props를 HTML 안의 RSC 데이터로 직렬화해서
  같이 내려보내기 때문 — "화면에 가려놨으니 안전하다"는 판단이 통하지 않는 지점.
  30차에서 푸터 이메일 난독화(`components/ObfuscatedEmail.tsx`)를 만들 때 실제로 겪었음:
  주소를 prop으로 받게 만들었더니 화면에는 `아이디 [at] 도메인`으로 가려졌는데
  페이지 소스에는 완성된 주소가 그대로 실려 나갔다(자동검증이 잡아냄). **컴포넌트가 상수를
  직접 import하도록 바꿔서 해결** — import한 값은 별도 JS 번들에만 들어가고 HTML에는 전혀
  나타나지 않음. 비슷하게 "감춰야 하는 값"을 다룰 때는 화면 렌더링 결과만 보지 말고
  `curl`로 실제 HTML 소스를 받아서 확인할 것(차주 지급액·내부 단가 등도 같은 결의 문제).
  다만 이건 **스크래핑 난이도를 올리는 수준일 뿐 보안 경계가 아님** — 진짜 노출되면 안 되는
  값은 원칙 49번처럼 애초에 서버 밖으로 내보내지 않는 방식으로 막을 것
- **하위 세그먼트 `layout.tsx`에 `description`을 안 적으면 루트 `app/layout.tsx`의
  description을 그대로 상속받는다.** 루트 description이 내부 시스템 설명("화주 CRM ·
  견적 · 배차 · 정산 통합 관리")이었던 탓에 `/quote`·`/apply` 같은 공개 페이지가
  검색결과에 이 문구로 노출될 상태였음(26차 세션에서 정비). 새 공개 페이지를 추가할
  때는 title뿐 아니라 description도 같이 지정할 것. 또 루트에 `title.template`을
  걸면 하위 title에 브랜드명이 이중으로 붙으므로(`견적 문의 | 위캐리 운송 | 위캐리
  운송`), 템플릿을 새로 도입한다면 하위 title에서 브랜드명을 빼거나 `title.absolute`를
  쓸 것 — 현재는 템플릿을 일부러 두지 않는 방식으로 통일되어 있음
- **"목록 표의 칸 구분이 이상하다"는 신고를 받으면, 그 표에 긴 텍스트(문자 본문·오류
  메시지·메모)를 통째로 넣은 칸이 있는지부터 볼 것.** 표는 칸 폭이 서로 밀고 당기는
  구조라, 한 칸에 여러 줄짜리 긴 글이 들어가면 그 칸이 세로로 길어지는 데 그치지 않고
  **옆 칸까지 눌러버린다**(36차 PR #85에서 문자 발송 이력 목록이 실제로 이랬음).
  칸을 조금씩 넓혔다 좁혔다 하며 맞추려 하지 말고, **긴 본문은 팝업으로 빼고 목록에는
  `-webkit-line-clamp`로 2줄 미리보기만 두는 것**이 정답이다. 곁들여 쓸 만한 것:
  날짜+시각처럼 붙어 있는 값은 2줄로 나누면 칸이 확 줄고, 한글이 단어 중간에서 끊기면
  `word-break: keep-all`을 준다. **레이아웃을 눈으로 짐작하지 말고** 임시 스텁 페이지에
  극단적인 표본(가장 긴 오류 메시지, 가장 긴 품목명, 값이 비어 있는 행)을 넣어
  실제로 렌더링해 보고 컬럼 폭을 실측할 것
- 🔴 **`set` 접두사가 붙는 이름을 grep할 때는 대소문자 경계를 의심할 것.**
  `setAccountId`·`setThirdPartyAgreed`는 `set` + **대문자**로 이어져서 **소문자
  `accountId`·`thirdPartyAgreed` 패턴에 걸리지 않는다.** 47차에 이걸 보고 "이 state는 한 번도
  채워진 적이 없다"고 **오진해서 사용자에게 잘못 보고했고**, 같은 이유로 스텁 생성 스크립트의
  치환이 실패해 브라우저 시험이 헛돌았다(한 세션에 두 번). React state는 `x` / `setX` 쌍이라
  이 함정이 특히 잘 걸린다 — **`-i`를 붙이거나 `[Aa]ccountId`처럼 쓰거나, 선언부를 직접 열어
  확인할 것.** "grep이 안 나온다"를 "코드에 없다"로 곧장 읽지 말 것.
- **이 실행 환경은 `node_modules`가 설치돼 있지 않은 상태로 시작한다 — `npm ci`를 먼저
  돌릴 것.** 그리고 `npx tsc --noEmit 2>&1 | tail -5` 같은 형태로 확인하면 `$?`가 tsc가 아니라
  **파이프 끝(`tail`)의 종료코드**를 읽어서, 실제로는 "Cannot find module 'react'"가 수백 줄
  나고 있는데 "통과"로 잘못 판단하게 된다(44차에서 실제로 겪음). tsc 결과는 파이프를 걸지 말고
  파일로 받은 뒤 종료코드와 줄 수를 같이 볼 것
- **임시 스텁 페이지는 서버 컴포넌트로 만들 것** — `"use client"`를 붙이면 `searchParams`가
  들어오지 않아 쿼리로 상태를 갈라 확인할 수 없다(44차). 또 루트 레이아웃의 `TopNav`가
  Supabase 환경변수 없이는 예외를 던져 스텁 라우트가 500이 되므로, **더미
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`를 넣고 dev 서버를 띄울 것**
  (더미라 실제 DB에 닿지 않는다). `_`로 시작하는 폴더가 라우팅되지 않는 것은 43차 참고
- 🔴 **가로 목록을 코드로 천천히 밀 때 `scrollLeft` 만 쓰면 덜덜거린다 — 브라우저가
  그 값을 정수 픽셀로 반올림한다.** 실측(70차): `scrollLeft` 에 10.25 를 넣으면 10,
  10.5 를 넣으면 11 이 되고 **카드의 화면 좌표도 정수로만** 움직인다. 한 프레임에 1px 이
  안 되는 속도(예: 22px/s = 0.37px/프레임)면 어떤 프레임은 0px, 어떤 프레임은 1px 씩 가서
  눈에 덜덜거림으로 보인다. **속도를 올려도 정수가 딱 떨어지지 않는 한 그대로다.**
  🔴 **정수부는 `scrollLeft`, 소수부는 안쪽 줄의 `transform` 이 나눠 싣게 할 것**
  (`components/landing/useAutoMarquee.ts`). 그래야 네이티브 터치·관성을 그대로 쓰면서
  소수 픽셀까지 그려진다 — `transform` 만 쓰면 손으로 넘기는 것을 직접 구현해야 하고
  그게 64차가 겪은 「덜덜거림」의 원인이다.
  ⚠️ 그 전에 **`el.scrollLeft` 를 읽어서 더하는 방식**도 같은 반올림 때문에 **1px 에서
  멈춘다** — 위치는 코드가 소수까지 따로 누적할 것. **두 단계를 다 거쳐야 한다.**
  ⚠️ **`scroll-snap-type` 이 걸려 있으면 그 전에 아예 안 움직인다** — 매 프레임 미는
  소수 픽셀을 스냅이 가장 가까운 지점으로 되돌린다(`proximity` 여도 그렇다).
- **한글이 "관리합니 / 다"처럼 어절 중간에서 끊기면 `word-break: keep-all`을 섹션 단위로
  걸 것**(한 어절이 칸보다 긴 극단적인 경우를 위해 `overflow-wrap: break-word`를 같이 준다).
  그리고 **그 자리를 `<br />`로 고정해서 해결하려 들지 말 것** — 이 사이트의 본문 폰트
  (SUIT)와 표시용 폰트(Space Grotesk)는 **전부 CDN에서 받아온다**(`app/layout.tsx`).
  폰트가 늦게 뜨거나 못 뜨면 글자 폭이 달라져서 줄바꿈 위치가 통째로 바뀌므로, 특정 폰트
  폭에 맞춰 넣은 `<br />`는 다른 환경에서 오히려 어색한 줄바꿈을 만든다(37차 랜딩에서
  운송관리 카드 제목이 실제로 이랬음 — 데스크탑에 맞춰 고정했더니 모바일에서 "내역이"만
  남는 3줄이 됐고, `<br />`를 빼니 해결됨). **시안이 의도한 줄바꿈만 `<br />`로 남길 것**
- 🔴 **`public/` 에는 "저장소 코드가 참조하지 않지만 지우면 안 되는 파일"이 여럿 있다 —
  「안 쓰이는 파일」로 보고 정리하지 말 것.** 앞의 넷은 **외부가 절대 URL 로 가져다 쓰는**
  것이라 지우면 회수가 안 되고, 뒤의 셋은 **JSON·서비스워커가 문자열로만 가리켜서**
  `.ts`/`.tsx` 를 grep 하면 0건으로 나온다.
```
  public/naverd2a4fd031fc1d5c8e06b2ca3aace4eb8.html   네이버 소유확인 — 지우면 소유확인이
                                                      풀리고 사이트맵·수집요청이 무효가 된다
  public/email/wecarry-logo-400.png / -white.png      직원 메일 서명 — 이미 발송된 메일이 깨진다
  public/landing/service-04-moving.jpg                wecarry24.co.kr 이 쓴다
  public/og-wecarry-1200x630.jpg                      카톡·검색 미리보기 (코드는 lib/siteUrl.ts 참조)

  public/icons/*.png (6개)                           설치형 앱 아이콘 — manifest 2종이
                                                      JSON 문자열로만 가리킨다
  public/offline.html                                 오프라인 안내 — sw.js 가 문자열로만
                                                      가리킨다. 🔴 두 앱이 같이 쓴다
  public/{customer,admin}/sw.js                       서비스워커 — 위치가 곧 담당 구역이라
                                                      루트로 옮기면 안 된다
```
  ⚠️ **`grep` 으로 "참조 0건"이 나와도 근거가 되지 않는다** — 이 파일들은 원래 코드에서
  참조되지 않는 것이 정상이다. `public/email/README.md`·`public/icons/README.md` 가 그
  경고를 담고 있는 전례다(67차 ④ · PWA 차수 ⑥).

---
- 🔴 **「이미지가 늦게 떠서 버벅인다」는 신고를 받으면 파일 크기부터 의심하지 말 것 —
  그 섹션이 화면 위에서 몇 px 지점에 있는지부터 재라.** 브라우저는 지연로딩(`loading="lazy"`)
  이미지를 **뷰포트에서 약 1250px 앞**에서야 받기 시작한다. 그 거리 안팎에 섹션이 있으면
  **스크롤해서 보이는 바로 그 순간에 받기 시작**해서 회색 상자가 스친다 — 용량과 무관하다.
  실제로 랜딩 `#work` 가 모바일에서 y=2161px 이라 딱 그 경계에 걸려 있었고(PR #119),
  이미지를 5.4MB 줄여도 팝인은 371ms → 339ms 로 **거의 그대로였다.** 해소한 것은
  **그 한 장만 `loading="eager"` 로 바꾼 것**이다(`fetchPriority="low"` 를 같이 줘서 히어로와
  대역폭을 다투지 않게 한다). 🔴 **한 화면의 이미지를 전부 eager 로 만들지 말 것** — 첫 화면이
  느려진다. 경계에 걸린 **첫 장만** 바꾼다.
- 🔴 **스크롤 타이밍 버그를 재현할 때 `waitUntil: "load"` 로 기다리거나 rAF 로 스크롤 속도를
  재면 재현되지 않는다.** 전자는 리소스가 다 받아진 뒤라 대역폭이 비어 있고, 후자는 CPU
  스로틀에 눌려 1.5초짜리 스크롤이 15초가 되어 그 사이 이미지가 다 도착한다(둘 다 「전·후
  똑같이 문제 없음」이라는 **무의미한 비교**가 나온다). **`domcontentloaded` 로 열고 →
  1.5초 기다렸다가 → `setTimeout` 으로 벽시계 1.5초에 걸쳐 내려갈 것** — 사람이 착지해서 바로
  스크롤하는 것과 같다. ⚠️ 그리고 **고친 뒤에는 `load` 이벤트가 안 걸린다**(이미 `complete`
  라서) — 「카드가 보이는 순간 `img.complete && naturalWidth > 0` 인가」로 재야 한다. 이걸
  몰라서 「측정 실패 3/3」이 나왔는데 그게 사실은 성공 신호였다.
- 🔴 **이 환경에서 FCP·LCP 를 재서 성능을 판단하지 말 것** — 프록시가 폰트 CDN
  (`fonts.googleapis.com`·`cdn.jsdelivr.net`)을 막아 **그 대기 시간이 그대로 섞여 들어간다**
  (실측 FCP 13,240ms · LCP 17,600ms — 우리 페이지의 값이 아니다). 믿을 수 있는 것은
  **전송 바이트**(네트워크 조건과 무관한 산술값)와 **요소 타이밍**(카드 노출 ↔ 이미지 도착
  간격)뿐이다.
- ⚠️ **이미지를 다시 인코딩할 때는 「눈에 안 보인다」를 수치로 확인할 것** — 원본과 재인코딩본을
  **실제 표시 크기로 줄인 뒤** 픽셀 차이를 재면 된다(PIL 로 `ImageChops.difference` + `ImageStat`).
  랜딩 히어로는 품질 90 으로 3045KB → 992KB 인데 표시 크기 기준 **평균 차이 0.27~1.67 / 255**
  (0.1~0.7%)였다. 🔴 **원본을 덮어쓰기 전에 그 파일이 git 어느 커밋에 있는지 기록에 남길 것**
  (랜딩 이미지는 61차 커밋이다) — 재인코딩은 세대 손실이라 되돌릴 길이 그것뿐이다.
- 🔴 **`<details>` 의 높이는 애니메이션할 수 없다 — `grid-template-rows: 0fr → 1fr` 트릭을
  쓰되 안쪽에 `overflow: hidden` 겹을 하나 더 둘 것.** `height: auto` 는 보간되지 않고,
  그리드 트릭만 쓰면 **안쪽 요소의 `margin` 이 클리핑 밖에 남아 닫힌 상태에도 틈이 생긴다**
  (랜딩 WHY 는 `margin: 6px 0 26px 76px` 라 32px 이 남았다). 그래서 `.landing-acc-body`
  (그리드) > `.landing-acc-clip`(overflow hidden) 두 겹이다 — 한 겹으로 줄이지 말 것.
  ⚠️ **만들기 전에 그 브라우저에서 실제로 보간되는지 먼저 재볼 것** — 이 저장소는
  Chromium 141 에서 0 → 83px / 280ms 로 도는 것을 확인하고 착수했다.
- 🔴 **스크롤 리빌이 「다시 재생되는가」를 잴 때 「화면 안에 opacity 0 인 요소가 있는가」로
  재지 말 것 — 처음 등장하는 요소가 정상적으로 0에서 시작하는 것까지 잡힌다.**
  그 지표는 「한 번만 재생」이든 「반복 재생」이든 똑같이 걸려서 둘을 구분하지 못한다.
  🟢 **재야 할 것은 「보이는 상태의 요소가 다시 숨겨지는 순간」**이고, `MutationObserver`
  로 클래스가 떼어지는 순간을 잡아 그때 `getBoundingClientRect()` 가 화면 안이었는지
  보면 된다(PR #123 에서 이 방식으로 0건을 확인했다).
- ⚠️ **모션 값을 잴 때는 재생 시간보다 넉넉히 기다릴 것** — 620ms 짜리를 900ms 뒤에
  쟀더니 `opacity: 0.99` 가 나와 거짓 ❌ 가 두 번 났다. 전환이 끝난 값을 원하면
  **`transition-duration` + `transition-delay` 의 합보다 두 배쯤** 기다리는 편이 안전하다.
- 🔴 **`middleware.ts` 의 matcher(`/admin/:path*`)는 그 아래 정적 파일까지 전부 잡는다 —
  아이콘·서비스워커처럼 로그인과 무관하게 내려가야 하는 파일을 그 세그먼트에 두면
  `PUBLIC_PATHS` 에 함께 넣어야 한다.** 안 넣으면 **화면에는 아무 증상이 없고**(응답이
  에러가 아니라 307 리다이렉트라 콘솔도 조용하다) 「아이콘이 안 뜬다」·「설치가 안 된다」로만
  나타나 원인을 찾기 어렵다. 28차 PR #77(관리자 파비콘)과 PWA 차수(`/admin/apple-icon.png`)
  에서 **두 번 겪었다.** 🔴 **반대로 화면·API 경로는 절대 넣지 말 것** — 그 순간 로그인 없이
  열린다. 🟢 **가능하면 애초에 루트(`public/`)에 둬서 matcher 를 피할 것**(manifest 를 그렇게
  했다) — 인증이 열리는 면이 늘지 않는다.
- 🔴 **설치형 앱(PWA)의 구역(`scope`)에 끝 슬래시를 붙이지 말 것.** 이 저장소의 홈 주소는
  `/admin`·`/customer` 이고 **Next 가 `/admin/` 을 `/admin` 으로 308 리다이렉트한다.**
  구역 판정은 **문자열 접두 비교**라 `/admin` 은 `/admin/` 안에 들어가지 않아서, 구역을
  `/admin/` 로 두면 **앱이 켜지자마자 자기 구역 밖으로 나가** 창에 주소 띠가 남고
  서비스워커도 홈 화면을 못 맡는다(PR #127 에서 실제로 겪었다). 🔴 **`trailingSlash: true`
  나 `start_url` 을 하위 화면으로 돌려서 우회하지 말 것** — 전자는 사이트 전체 URL 규칙을
  바꾸고, 후자는 로그인한 사람이 홈으로 가는 순간 다시 구역 밖이 된다.
  ⚠️ **`.webmanifest` 는 JSON 이라 주석을 못 단다** — 사유는 `app/{customer,admin}/layout.tsx`
  의 `manifest:` 옆에 있다. 🔴 **구역이 얽힌 것을 검증할 때는 시작 주소를 실제로 열어
  「리다이렉트가 끝난 최종 주소」로 잴 것**(하위 화면만 보면 이 결함을 못 잡는다).
- 🔴 **브라우저가 한 번만 쏘는 이벤트(`beforeinstallprompt` 등)를 `useEffect` 에서 듣지
  말 것 — 하이드레이션 전에 지나가면 영영 못 받는다.** 화면이 무거울수록 잘 놓쳐서
  **「어떤 날은 되고 어떤 날은 안 된다」**로 나타난다(설치 버튼이 실제로 그랬다).
  `lib/installPromptCapture.ts` 처럼 **HTML 을 읽는 순간 도는 인라인 스크립트가 먼저 잡아
  `window` 에 넣어두고, 리액트는 그것을 읽는 방식**을 쓸 것.
- 🔴 **서비스워커의 담당 구역은 스크립트가 놓인 위치가 **최대치**를 정한다 — 그보다 넓히려면
  `Service-Worker-Allowed` 헤더로 서버가 허락해야 하고, 등록할 때 `scope` 도 같이 넘겨야
  한다(🔴 **둘은 한 벌이라 한쪽만 고치면 등록이 조용히 실패한다**). 그래서 `public/customer/sw.js` ·
  `public/admin/sw.js` 처럼 세그먼트 안에 둔다. 🔴 **루트로 옮기면 한 워커가 두 시스템과
  랜딩까지 삼킨다.** 그리고 이 저장소는 **전 화면이 실시간 데이터라 앱 셸이 없다** —
  🔴 **화면(HTML)과 API 응답을 캐싱하면 화주가 낡은 배차 상태·정산 금액을 본다.**
  캐시는 화이트리스트로만 두고, 대상을 바꾸면 캐시 이름의 `VERSION` 을 함께 올릴 것.
- ⚠️ **검증용 Playwright 는 `npm i --no-save playwright-core` 로 넣을 것** —
  `package.json`·`package-lock.json` 변경 0 을 유지해야 하는 차수가 대부분이다.
  브라우저는 `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` 에 이미 있다.
- 🔴 **「모바일에서 목록이 엉망이다」는 신고를 받으면 눈으로 짐작하지 말고 표 폭을 재라.**
  실측(34차, 390px): 견적 **880** · 오더 **610** · 배차 **914** · 정산 **1056px**.
  🔴 **감싸개에 `overflow-x: auto` 가 없으면 페이지 자체가 옆으로 밀려**(scrollWidth
  627·931·1073) 제목·필터까지 잘려 나간다 — 그 상태가 「엉망」의 정체다. 칸을 조금씩
  넓혔다 좁혔다 하지 말고 **모바일은 카드로 따로 그릴 것**(원칙 13번).
  🔴 **CSS 로 표를 접는 방법**(`display:block` + `td::before`)**을 쓰지 말 것** — 모든
  `<td>` 에 `data-label` 을 달아야 하고, 무엇보다 **「모바일에서만 이 열을 생략」이 안 된다**
  (열을 지우면 데스크탑에서도 지워진다). `components/AdminMobileList.tsx` 를 쓸 것.
- 🔴 **화면 폭을 넓혔는데 「입력칸이 더 좁아졌다」면 그 격자가 `auto-fill` 인지부터 볼 것.**
  `.form-grid` 는 `repeat(auto-fill, minmax(200px, 1fr))` 이라 **넓힌 폭이 칸 폭이 아니라
  열 수로 간다** — 34차에 폭을 1100 → 1560 으로 넓혔더니 견적 폼이 **2열 282px →
  4열 203px** 로 오히려 좁아졌다. 홈 카드도 같은 이유로 **4칸 2줄이 6열**이 됐다.
  🟢 고치는 법 둘: 최소 폭을 올려 열이 덜 늘게 하거나(`minmax(260px, …)`), 그 화면이
  **짝으로 읽혀야 하는 격자면 열 수를 못박는다**(견적 폼 2열 · 홈 카드 4열).
- 🔴 **관리자 화면에만 적용할 CSS 는 `.container` 를 고치지 말고 `.admin-wide` 안에서 할 것.**
  `.container` 를 쓰는 39개 파일 중 **7개가 화주포털**이고 `SiteFooter`·`PublicPageHeader`·
  `LegalDoc` 을 통해 **공개 화면 6개**도 쓴다. `app/admin/layout.tsx` 가 자식을 그 클래스로
  감싸고 있다. ⚠️ **`TopNav` 는 그 래퍼 밖(루트 레이아웃)이라 따로 걸어야 한다** —
  `.top-nav-inner` 는 `TopNav` 한 곳만 쓰고 그 컴포넌트가 `/customer`·공개 경로에서
  `null` 을 돌려주므로 관리자 전용으로 봐도 된다.

## 8. Claude Code로 넘어가면서 참고할 것

- 이 프로젝트는 지금까지 **사용자가 매번 파일을 GitHub 웹 UI에 직접 복사해서
  적용하는 방식**으로 진행되었음. Claude Code부터는 저장소를 직접 읽고 수정하면 됨
- 사용자는 **개발 초보자**임 — 전문 용어를 풀어서 설명하고, 변경사항을 적용하기
  전에 무엇을 왜 하는지 간단히 설명해주는 게 좋음
- 중요한 변경(특히 DB 스키마, 결제/계정 관련 로직)은 **바로 main에 반영하지 말고
  검토받을 것을 권장**
- **⚠️ 사용자가 "CLAUDE.md 업데이트 해줘"라고 하면 PR을 만들지 말고 `main`에 바로
  반영(commit + push)할 것 — 31차 세션에서 사용자가 명시적으로 정한 규칙.**
  이 문서만 바뀌는 커밋은 실행되는 코드가 아니라 배포에 영향이 없고, 매번 PR을
  만들어 확인받는 것이 번거롭기 때문. 지금까지도 사용자가 그때그때 "merge해줘"라고
  지시해 왔던 것을 상시 규칙으로 확정한 것임.
  **적용 범위는 CLAUDE.md 단독 변경일 때뿐** — 코드 변경이 섞여 있으면 기존대로
  PR을 만들어 확인받을 것(코드가 한 줄이라도 포함되면 이 규칙은 적용되지 않음).
- 이 문서를 프로젝트 저장소 루트에 `CLAUDE.md`라는 이름으로도 저장해두면, Claude
  Code가 세션 시작 시 자동으로 읽어서 참고함

---

## 9. 새 세션에서 이어가는 방법

**🔴 읽는 순서**

```
  ① HANDOFF.md   저장소 루트. 지금 시점의 스냅샷 — 먼저 읽는다
  ② CLAUDE.md    이 문서. 세션별 축적 기록 — 그 결정을 왜 그렇게 했는지 되짚을 때
       ├ 3장  핵심 설계 원칙 (되돌리면 안 되는 것)
       ├ 5장  다음 예정 작업 (로드맵·차수)
       └ 7장  자주 막히는 지점
  ③ 해당 차수의 세션 기록  🔴 **`docs/history/`** 에 있다 — §0 「이력 찾는 법」 표
                          최신은 `current.md` 최상단, 옛것은 `history-01~08.md`
```

🔴 **`HANDOFF.md` 만 읽고 끝내지 마십시오** — 스냅샷이라 "왜"가 빠져 있습니다.
🔴 **`CLAUDE.md` 를 요약해서 줄이지 마십시오** — 대체가 아니라 입구입니다.

직원 계정·권한·이력 재구조화 스펙(1~8단계)은 전부 완료되어 main에 merge되었습니다.
Claude Code에서: 저장소를 열고 "인수인계 문서(HANDOFF.md → CLAUDE.md 순서로)를
참고해서 5번 "다음 예정 작업"부터 이어서 진행해줘" 같은 식으로 시작하면 됩니다.

실제 저장소 코드가 이 문서와 다르면 **저장소가 항상 맞습니다.**
