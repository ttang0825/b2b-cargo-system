// 화주(companies) 항목 정의 — 33차 A장
//
// 🔴 **이 파일이 유일한 정의처다.** 화주가 만들어지는 입구가 셋인데(아래) 화면마다
//    항목 목록을 따로 들고 있어서 갈려 있었다. 값만 손으로 맞춰 놓으면 다음에 컬럼이
//    하나 늘 때 또 갈리므로, 세 입구가 **같은 배열을 읽게** 한 것이 이 차수의 본체다.
//
//      ① 관리자가 직접 등록   app/admin/companies/page.tsx        (신규업체 등록 폼)
//      ② 관리자가 나중에 수정  app/admin/companies/[id]/page.tsx   (정보 수정 폼)
//      ③ 온라인 신청 승인      app/api/admin/approve-application   (화주가 /apply 로 신청)
//
// 🔴 **화면 파일에 필드 배열을 다시 만들지 말 것.** 만드는 순간 이 파일과 갈린다.
//    항목을 늘리려면 여기 한 줄을 추가하면 세 입구에 동시에 나타난다.
//
// ⚠️ 옛 `BASIC_FIELDS`·`SALES_REF_FIELDS`·`CRM_CONTACT_FIELDS`·`CRM_BIZ_FIELDS`·
//    `CRM_PERFORMANCE_FIELDS` 다섯 배열이 `app/admin/companies/[id]/page.tsx` 안에
//    있었고 이 파일로 옮겼다. 🔴 `CLAUDE.md` §7 이 「컬럼명이 불확실하면
//    `companies_id_page_final.tsx` 의 그 배열을 먼저 확인」이라고 안내하고 있었는데
//    **그 파일은 애초에 존재하지 않는다** — 같은 차수에서 그 안내도 고쳤다.
//
// 실측(2026-09-09, Actions verify ⑫): `companies` 는 **81컬럼**이다. 아래 정의는 그중
// 화면이 다루는 것만 담는다 — 나머지(점수 6종·`external_id`·`source_url` 등)는 화면에
// 없던 것이고 이번 차수는 **있는 항목을 맞추는 것**이라 늘리지 않았다(지시서 §5 금지 3번).

import {
  REGIONS,
  VEHICLE_TYPES_ALL,
  DEFAULT_VEHICLE_TYPE,
  BODY_TYPES,
  GRADE_OPTIONS,
} from "@/lib/constants";
import { STATUS_OPTIONS } from "@/lib/statusColors";
import { MANUAL_SOURCE_OPTIONS } from "@/lib/sourceColors";

/** 화면이 그리는 입력 위젯의 종류. */
export type CompanyFieldType =
  | "text"
  | "tel" // 🔴 formatPhoneNumber 를 onChange 에 물린다(원칙 35번)
  | "email"
  | "url"
  | "date"
  | "number"
  | "select"
  | "textarea"
  | "checkbox"
  | "address" // 🔴 components/AddressSearch.tsx 재사용(원칙 37번). sido/sigungu 를 같이 채운다
  | "region-multi" // REGIONS 중복 선택(MultiSelectTags) — 콤마 구분 문자열로 저장
  | "vehicle" // 톤수 + 형태 두 select → recommended_vehicle 한 컬럼으로 합쳐 저장
  | "biz-reg" // 사업자등록번호(자동 하이픈)
  // 🔴 **입력칸이 아니라 읽기 전용 안내 줄이다**(36차 리뷰 3라운드). 다른 칸의 값에서
  //    파생되는 사실을 담당자에게 알려 줄 때 쓴다 — 지금은 「정산 마감: 월말 기준」.
  //    🔴 **DB 컬럼이 아니다** — `key` 가 `__` 로 시작하고 `buildCompanyPayload` 가
  //       걸러낸다. 🔴 이 타입에 저장 경로를 만들지 말 것.
  | "static";

/** 화면에서 묶어 보여주는 구획. 순서가 곧 화면 순서다. */
export const COMPANY_SECTIONS = [
  "기본 정보",
  "담당자",
  "거래 조건",
  "정기계약",
  "영업 참고",
  "실적",
] as const;
export type CompanySection = (typeof COMPANY_SECTIONS)[number];

export type CompanyField = {
  /** companies 의 컬럼명 */
  key: string;
  label: string;
  type: CompanyFieldType;
  section: CompanySection;
  /** 신규 등록에서 필수인가 */
  required?: boolean;
  /**
   * 등록 폼에 노출하는가(기본 true). 상세 수정 폼에는 **나오되 읽기 전용**이 된다.
   *
   * 🔴 false 인 것은 **정산이 자동으로 갱신하는 실적값**이다(「실적」 구획) — 신규
   *    화주는 0이고, 담당자가 손으로 넣어도 다음 정산에서 덮인다.
   *    ⚠️ 36차 A장이 한때 `payment_terms` 를 여기에 넣어 얼려 뒀는데, 리뷰 1라운드에
   *       사용자가 **「특이사항」으로 이름을 바꿔 계속 쓰기로** 정해서 되돌렸다.
   *    (완료조건 2의 「등록 == 수정」은 이 플래그를 제외한 집합을 뜻한다)
   */
  inForm?: boolean;
  /** select 일 때의 값 목록 (값 == 라벨) */
  options?: readonly string[];
  /**
   * select 인데 **DB 에 코드값을 저장하는** 항목의 값 목록 (36차 A장).
   *
   * 🔴 `options` 와 달리 **저장되는 것은 `value`, 보이는 것은 `label`** 이다 —
   *    거래조건 칸들은 DB CHECK 제약이 걸린 코드값(`per_order` 등)이라 한글을
   *    그대로 넣으면 저장이 통째로 거부된다.
   * 🔴 라벨을 `lib/settlementLabels.ts` 의 **화주 말** 함수에서 끌어오지 말 것
   *    (`getCustomerBillingCycleLabel`) — 이 화면은 담당자 화면이고, 화주 말이
   *    바뀔 때 관리자 화면이 조용히 따라가면 안 된다(사용자 확정 2026-09-14).
   */
  codedOptions?: readonly { value: string; label: string }[];
  placeholder?: string;
  /** inForm:false 인 이유 — 화면 도움말로 그대로 쓴다 */
  note?: string;
  /**
   * 표시 모드에서 값이 비었을 때 대신 보여줄 말.
   * 🔴 「값이 없다」가 곧 뜻을 갖는 항목에만 쓴다 — 정산 마감일이 비어 있으면
   *    「말일(달력월 기준)」이라는 실제 규칙이다(로드맵 ②-B). 안 그리면 담당자가
   *    「설정 안 된 것」으로 오해한다.
   */
  emptyLabel?: string;
  /** 표시 모드에서 값 뒤에 붙일 단위(예: `일`) */
  displaySuffix?: string;
  /** 표시 모드에서 1,000 단위 쉼표를 넣는가(금액 칸) */
  displayThousands?: boolean;
  /**
   * `type: "static"` 전용 — 같은 행의 값에서 만들어 낼 안내 글. `null` 이면 안 그린다.
   * 🔴 화면에 이 문장을 다시 적지 말 것(등록 폼과 수정 폼이 갈린다).
   */
  staticText?: (form: Record<string, any>) => string | null;
  /**
   * 이 조건이 참일 때만 입력칸을 그린다.
   * 🔴 조건을 화면에 적지 말 것 — 등록 폼과 수정 폼이 서로 다르게 판단하게 된다
   *    (실제로 「출처 설명」이 등록 폼에서는 항상 보이고 수정 폼에서는 「기타」일
   *    때만 보이는 상태였다).
   */
  showWhen?: (form: Record<string, any>) => boolean;
};

/**
 * 화주 거래조건 — 청구주기 **기본값** (36차 A장).
 *
 * 🔴 **기본값이지 강제가 아니다**(사용자 확정 2026-09-14 · 지시서가 정할 것 ①).
 *    오더·발주요청을 만들 때 이 값을 **복사**해 채우고, 그 뒤로는 그 건의 값이 이긴다.
 *    강제로 만들면 화주 설정을 바꾸는 순간 **진행 중인 건의 정산방식이 조용히 바뀐다.**
 * 🔴 **역방향 동기화 금지**(원칙 45번) — 오더에서 고친 값을 화주로 되돌리지 말 것.
 * 🔴 `quotes`·`orders`·`dispatches`·`invoices` 의 `billing_cycle` 과 **같은 코드값**이다
 *    (`lib/settlementLabels.ts` 의 `BillingCycle`). 새 값을 여기서만 늘리지 말 것.
 */
export const BILLING_CYCLE_DEFAULT_OPTIONS = [
  { value: "per_order", label: "건별" },
  { value: "monthly", label: "월정산" },
] as const;

/**
 * 화주 거래조건 — 결제일 **기준** (36차 A장 · DB `payment_due_basis`).
 *
 * ⚠️ **화면에서는 고르지 않는다**(36차 리뷰 2라운드). 사용자 지시로 정산 구조가
 *    이렇게 단순해졌기 때문이다 —
 *
 *      건별      정산 마감 개념 없음 · **즉시지급**
 *      월정산    정산 마감 **항상 월말** · 결제일 = **정산 익월 며칠**
 *
 *    *"업체마다 정산마감일이 상이하면 복잡해질것 같다"* · *"결제일은 (정산 다음달 기준)"*
 *
 *    월말 마감이 고정이므로 「익월 25일」은 `fixed_day` + 25 로 정확히 표현된다.
 *    그래서 **저장되는 기준은 `fixed_day`(협의면 `negotiated`) 둘뿐**이고,
 *    담당자는 결제일 한 칸만 고른다.
 *
 * 🔴 **컬럼과 이 목록을 지우지 말 것** — 화면에서 안 고를 뿐 저장은 계속 하고,
 *    나중에 「세금계산서 발행일 기준」 같은 것이 필요해지면 화면만 되살리면 된다.
 *    DB CHECK 제약도 네 값을 그대로 허용한다.
 * 🔴 `negotiated`(협의)는 **값이 없다** — 자동계산에서 제외 대상이다.
 */
export const PAYMENT_DUE_BASIS_OPTIONS = [
  { value: "cutoff", label: "마감일 기준" },
  { value: "fixed_day", label: "매월 고정일" },
  { value: "tax_invoice", label: "세금계산서 발행일 기준" },
  { value: "negotiated", label: "협의" },
] as const;

/**
 * 🔴 화면이 고르는 결제일 값 — **기준까지 이 한 칸이 정한다**(36차 리뷰 2라운드).
 *
 *    `"negotiated"` 를 고르면 `payment_due_basis = 'negotiated'` · 값은 비운다.
 *    나머지는 `payment_due_basis = 'fixed_day'` · 값은 고른 날짜다(말일 = 0).
 *
 * 🔴 **화면 값과 DB 값이 1:1 이 아니다** — 그래서 저장·표시가 반드시
 *    `paymentDueToForm()` / `paymentDueFromForm()` 두 함수를 거쳐야 한다.
 *    🔴 화면에서 `payment_due_basis` 를 직접 건드리지 말 것.
 */
export const PAYMENT_DUE_CHOICES = [
  { value: "0", label: "익월 말일" },
  ...Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: `익월 ${i + 1}일`,
  })),
  { value: "negotiated", label: "협의" },
] as const;

/**
 * 화주 거래조건 — 세금계산서 발행 방식 (36차 A장, 사용자 확정 ⭕).
 *
 * ⚠️ 「발행 안 함」은 **면세·간이 등 실제로 안 내보내는 화주**를 뜻한다 —
 *    정산 화면의 발행 여부 체크를 대신하는 값이 아니다(그건 건별 기록이다).
 */
export const TAX_INVOICE_METHOD_OPTIONS = [
  { value: "standard", label: "정발행" },
  { value: "reverse", label: "역발행" },
  { value: "none", label: "발행 안 함" },
] as const;

/**
 * 정기계약 운송 주기.
 * 🔴 DB 에 CHECK 제약을 걸지 않았으므로 **이 배열이 유일한 방어선**이다
 *    (`consents` 표와 같은 판단 — 목록이 늘 때 마이그레이션을 또 돌리지 않으려고).
 */
export const RECURRING_FREQUENCY_OPTIONS = [
  "주 1회",
  "주 2회",
  "주 3회 이상",
  "월 1회",
  "월 2회",
  "월 3회 이상",
  "격주",
  "수시",
] as const;

export const COMPANY_FIELDS: CompanyField[] = [
  // ── 기본 정보 ──────────────────────────────────────────────────────────────
  // 🔴 회사명이 유일한 필수 항목이다(실측 — 등록 폼의 검사가 `!form.name.trim()` 뿐).
  //    ⚠️ 상세 수정 폼에는 이 항목이 **없어서 회사명을 고칠 방법이 아예 없었다.**
  //    오타가 나면 화주를 지우고 다시 만들어야 했으므로 이번에 정합의 일부로 넣었다.
  { key: "name", label: "회사명", type: "text", section: "기본 정보", required: true, placeholder: "예: ○○정밀" },
  { key: "industry", label: "업종", type: "text", section: "기본 정보", placeholder: "예: 제조 / 금속가공" },
  { key: "sub_industry", label: "세부업종", type: "text", section: "기본 정보" },
  { key: "main_items", label: "취급 품목", type: "text", section: "기본 정보", placeholder: "예: 알루미늄 프로파일" },
  { key: "metro_region", label: "광역권", type: "select", section: "기본 정보", options: REGIONS },
  { key: "district", label: "시군구", type: "text", section: "기본 정보", placeholder: "예: 화성시" },
  { key: "sub_district", label: "세부권역", type: "text", section: "기본 정보" },
  { key: "industrial_complex", label: "산업단지", type: "text", section: "기본 정보" },
  { key: "address", label: "주소", type: "text", section: "기본 정보" },
  { key: "phone", label: "대표번호", type: "tel", section: "기본 정보" },
  { key: "website", label: "웹사이트", type: "url", section: "기본 정보" },
  { key: "biz_reg_no", label: "사업자등록번호", type: "biz-reg", section: "기본 정보" },
  { key: "franchise_operator", label: "프랜차이즈 본부", type: "text", section: "기본 정보" },
  { key: "company_scale", label: "규모구간", type: "text", section: "기본 정보" },
  { key: "recommended_vehicle", label: "추천 차량", type: "vehicle", section: "기본 정보" },
  { key: "expected_volume", label: "예상 운송수요", type: "text", section: "기본 정보" },
  // 신청서의 「월 예상 운송건수」가 들어오는 자리. 🔴 지금까지 승인 API 가 이 컬럼을
  // 비워둔 채 `notes` 문자열에 뭉쳐 넣고 있었다 — 그래서 검색·필터가 안 됐다.
  { key: "monthly_expected_orders", label: "월 예상 운송건수", type: "number", section: "기본 정보" },
  { key: "status", label: "영업상태", type: "select", section: "기본 정보", options: STATUS_OPTIONS },
  { key: "grade", label: "화주등급", type: "select", section: "기본 정보", options: GRADE_OPTIONS },
  { key: "next_followup_date", label: "다음 연락 예정일", type: "date", section: "기본 정보" },
  { key: "manual_source_type", label: "출처 분류", type: "select", section: "기본 정보", options: MANUAL_SOURCE_OPTIONS },
  // 🔴 출처분류가 「기타」일 때만 쓰는 전용 칸이다(CLAUDE.md §7). 다른 흐름에서 임의
  //    텍스트를 저장할 목적으로 재사용하지 말 것 — 분류를 「기타」로 바꾸는 순간
  //    엉뚱한 글이 화면에 나타난다. 자유 메모는 `notes` 에 넣는다.
  {
    key: "manual_source_note",
    label: "출처 설명",
    type: "text",
    section: "기본 정보",
    // 🔴 분류가 「기타」일 때만 그린다 — 다른 분류에서 채워도 저장 때 비워지므로
    //    (buildCompanyPayload) 입력칸 자체를 안 보여주는 것이 맞다.
    showWhen: (form) => form.manual_source_type === "기타",
  },
  { key: "notes", label: "메모", type: "textarea", section: "기본 정보" },

  // ── 담당자 ────────────────────────────────────────────────────────────────
  { key: "contact_name", label: "담당자명", type: "text", section: "담당자" },
  { key: "contact_position", label: "직책", type: "text", section: "담당자" },
  { key: "contact_department", label: "부서", type: "text", section: "담당자" },
  { key: "contact_mobile", label: "휴대폰", type: "tel", section: "담당자" },
  { key: "contact_email", label: "이메일", type: "email", section: "담당자" },
  { key: "assigned_staff", label: "담당직원", type: "text", section: "담당자" },

  // ── 거래 조건 ──────────────────────────────────────────────────────────────
  // 🔴 **전부 내부 전용이다**(사용자 확정 2026-09-14) — 화주포털·견적서·엑셀에
  //    한 줄도 내보내지 않는다(33차 정기계약 배지와 같은 취급).
  //    🔴 `app/customer/**` 에서 이 값들을 읽지 말 것.
  // 🔴 **기존 화주 539건은 전부 비어 있는 것이 맞다** — 일괄로 「건별」을 채우면
  //    「안 정했다」와 「건별로 정했다」가 구분되지 않는다(지시서가 정할 것 ④).
  {
    key: "billing_cycle_default",
    label: "청구주기",
    type: "select",
    section: "거래 조건",
    codedOptions: BILLING_CYCLE_DEFAULT_OPTIONS,
    // 🔴 **기본값(제안)이지 강제가 아니다** — 오더·발주요청을 만들 때 복사해 채우고,
    //    그 뒤로는 그 건의 값이 이긴다. 강제로 만들면 화주 설정을 바꾸는 순간
    //    진행 중인 건의 정산방식이 조용히 바뀐다.
    note: "새 오더·발주요청에 기본으로 채워집니다. 건별로 담당자가 바꿀 수 있습니다.",
    emptyLabel: "미정",
  },
  // 🔴 **정산 마감은 입력칸이 아니다 — 청구주기가 정하는 읽기 전용 안내다**
  //    (36차 리뷰 2·3라운드, 사용자 지시).
  //
  //      건별     정산 마감 개념이 없다 → **즉시지급**
  //      월정산   **항상 월말** — *"업체마다 정산마감일이 상이하면 복잡해질것 같다"*
  //                             *"월정산을 했을때 모두 월말기준으로 바꾸자"*
  //
  // 🔴 **`billing_cutoff_day` 입력칸을 되살리지 말 것.** 컬럼은 그대로 두고 **전부
  //    비웠다**(마이그레이션 `2026-09-14_billing_cutoff_month_end.sql`) — 월정산 묶음
  //    계산이 「비어 있으면 달력월(1일~말일)」이라 **`null` 이 곧 월말**이기 때문이다.
  //    🔴 컬럼 자체를 지우지도 말 것(그 계산이 통째로 깨진다).
  // 🔴 **「월말 기준」 표시는 사용자가 남기라고 한 것이다**(*"정산마감은 월말기준이라는
  //    표시는 두자"*) — 지우지 말 것. 발주요청 화면에도 같은 문장이 있다.
  {
    key: "__settlement_cutoff",
    label: "정산 마감",
    type: "static",
    section: "거래 조건",
    staticText: (form) =>
      form.billing_cycle_default === "monthly"
        ? "월말 기준 (모든 화주 공통)"
        : form.billing_cycle_default === "per_order"
        ? "해당 없음 — 운송 완료 시 즉시지급"
        : null,
  },
  {
    key: "payment_due_value",
    label: "결제일",
    type: "number",
    section: "거래 조건",
    // 🔴 **정산 익월 기준이다**(사용자 지시 *"결제일은 (정산 다음달 기준)"*).
    //    마감이 월말로 고정이라 「익월 25일」이 곧 「마감 후 25일」이고, 담당자가
    //    고를 것은 날짜 하나뿐이다.
    // 🔴 **화면 값과 DB 값이 1:1 이 아니다** — 「협의」를 고르면 이 컬럼이 아니라
    //    `payment_due_basis` 가 바뀐다. 그래서 화면은 `paymentDue*` 두 함수를 거친다.
    codedOptions: PAYMENT_DUE_CHOICES,
    note: "화주가 위캐리에 입금하는 날 (정산 익월 기준)",
    emptyLabel: "미정",
    // 🔴 **건별에는 결제일이 없다** — 운송 완료 시 즉시지급이라 물을 것이 없다.
    showWhen: (form) => form.billing_cycle_default === "monthly",
  },
  { key: "main_pickup_region", label: "주요 상차지역", type: "region-multi", section: "거래 조건" },
  { key: "main_dropoff_region", label: "주요 하차지역", type: "region-multi", section: "거래 조건" },
  { key: "main_pickup_address", label: "주요 상차지 정확주소", type: "address", section: "거래 조건" },
  { key: "main_dropoff_address", label: "주요 하차지 정확주소", type: "address", section: "거래 조건" },
  // 🔴 **구형 「결제조건」 칸을 「특이사항」으로 바꿔 계속 쓴다**(36차 리뷰 1라운드 —
  //    사용자 지시 *"(구)결제조건 대신 「특이사항」으로 넣어서 기존 화주의 결제조건은
  //    「특이사항」에 넣고 신규화주도 「특이사항」 항목을 넣자"*).
  //
  //    ⚠️ 처음에는 원칙 45번대로 **읽기 전용으로 얼려** 뒀는데, 그러면 새 화주에게는
  //       구조화되지 않는 거래 조건(예: "파렛트 회수 조건 별도")을 적을 자리가 아예
  //       없어진다. **이름을 바꾸는 편이 칸을 하나 더 만드는 것보다 낫다** — 기존 값이
  //       정확히 그런 자유 서술이라 옮길 필요도 없다(컬럼도 그대로 `payment_terms` 다).
  //
  // 🔴 **여기에 적은 것은 자동계산에 쓰이지 않는다.** 「정산 예정일」을 계산하는 것은
  //    위의 청구주기·결제일이고, 이 칸은 사람이 읽는 메모다.
  // ⚠️ 「기본 정보」의 `notes`(메모)와 다른 칸이다 — 그쪽은 영업 메모다.
  {
    key: "payment_terms",
    label: "특이사항",
    type: "textarea",
    section: "거래 조건",
    placeholder: "예: 파렛트 회수 조건 별도 · 세금계산서는 경리팀 메일로",
    note: "거래 조건 중 위 칸으로 담기지 않는 것 (자동계산에는 쓰이지 않습니다)",
  },

  // ── 정기계약 (33차 신설) ───────────────────────────────────────────────────
  // 🔴 `status`(거래 상태)와 **다른 축**이다 — 상태는 「지금 어느 단계인가」, 정기계약은
  //    「어떤 관계인가」. 상태 값으로 합치면 「정기계약 화주인데 지금 새 견적 협의 중」을
  //    표현할 수 없다. 🔴 기존 `repeat_customer`(재거래 여부)와도 다르다 — 그건 정산이
  //    `오더수 > 1` 로 자동 갱신하는 실적 파생값이다.
  { key: "is_recurring_contract", label: "정기계약", type: "checkbox", section: "정기계약" },
  { key: "recurring_contract_started_on", label: "계약 시작일", type: "date", section: "정기계약" },
  { key: "recurring_contract_ended_on", label: "계약 종료일", type: "date", section: "정기계약", note: "비우면 기한 없음" },
  {
    key: "recurring_contract_frequency",
    label: "운송 주기",
    type: "select",
    section: "정기계약",
    options: RECURRING_FREQUENCY_OPTIONS,
  },
  { key: "recurring_contract_note", label: "계약 메모", type: "textarea", section: "정기계약" },

  // ── 영업 참고 ──────────────────────────────────────────────────────────────
  { key: "priority", label: "우선순위", type: "text", section: "영업 참고" },
  { key: "lead_type", label: "화주유형", type: "text", section: "영업 참고" },
  { key: "sales_message", label: "영업 메시지 포인트", type: "text", section: "영업 참고" },
  { key: "sales_potential", label: "영업가능성", type: "text", section: "영업 참고" },
  { key: "sales_difficulty", label: "영업난이도", type: "text", section: "영업 참고" },
  { key: "cold_chain_risk", label: "냉장/냉동 리스크", type: "text", section: "영업 참고" },
  { key: "volume_potential", label: "운송수요 가능성", type: "text", section: "영업 참고" },
  { key: "total_score", label: "종합점수", type: "text", section: "영업 참고" },
  { key: "next_action", label: "다음액션", type: "text", section: "영업 참고" },
  { key: "data_source", label: "데이터출처", type: "text", section: "영업 참고" },
  { key: "verification_notes", label: "검증메모", type: "text", section: "영업 참고" },

  // ── 실적 — 🔴 등록 폼에 노출하지 않는다(inForm: false) ──────────────────────
  // 정산 저장(app/admin/invoices/page.tsx)이 오더가 완료될 때마다 이 값들을 덮어쓴다.
  // 신규 등록 화면에 두면 담당자가 채워도 조용히 사라지고, 신규 화주는 애초에 0이다.
  { key: "total_orders_count", label: "누적 오더수", type: "number", section: "실적", inForm: false, note: "정산에서 자동 갱신" },
  { key: "total_revenue", label: "누적 매출(원)", type: "number", section: "실적", inForm: false, note: "정산에서 자동 갱신" },
  { key: "total_margin", label: "누적 마진(원)", type: "number", section: "실적", inForm: false, note: "정산에서 자동 갱신" },
  { key: "outstanding_amount", label: "미수금(원)", type: "number", section: "실적", inForm: false, note: "정산에서 자동 갱신" },
  { key: "last_order_date", label: "최근 오더일", type: "date", section: "실적", inForm: false, note: "정산에서 자동 갱신" },
  // 🔴 정기계약과 다른 항목이다 — 지우지 말 것. 정산이 `오더수 > 1` 이면 자동으로 켠다.
  { key: "repeat_customer", label: "재거래 여부", type: "checkbox", section: "실적", inForm: false, note: "정산에서 자동 갱신" },
];

/** 등록 폼에 노출하는 항목(= 실적 자동갱신값을 뺀 것). */
export const COMPANY_FORM_FIELDS = COMPANY_FIELDS.filter((f) => f.inForm !== false);

/** 신규 등록에서 반드시 채워야 하는 항목. */
export const COMPANY_REQUIRED_FIELDS = COMPANY_FIELDS.filter((f) => f.required);

/**
 * 신규 등록 폼에서 처음부터 펼쳐 두는 구획.
 *
 * ⚠️ 지시서는 「처음 펼쳐지는 것은 **필수 항목만**」이라고 했으나, 실측하니 필수는
 *    회사명 하나뿐이라 그대로 하면 등록 화면이 **입력칸 한 개**가 된다(등록이 불가능해
 *    보인다). 전화 상담 중에 바로 받아 적는 항목까지는 펼쳐 두고, 나중에 채우는
 *    CRM 항목(영업 참고)·계약 조건(정기계약·거래 조건)·실적을 접었다.
 * 🔴 접힌 구획에 입력한 값도 **그대로 저장된다** — 접기는 표시일 뿐 폼에서 빠지는 것이
 *    아니다(완료조건: 접이식 안의 값이 저장돼야 한다).
 */
export const COMPANY_FORM_OPEN_SECTIONS: readonly CompanySection[] = ["기본 정보", "담당자"];

/**
 * 그 구획에 속한, 등록 폼에 노출하는 항목들.
 * `form` 을 주면 `showWhen` 조건까지 걸러 준다 — 🔴 조건을 화면에 적지 말 것.
 */
export function companyFormFieldsOf(
  section: CompanySection,
  form?: Record<string, any>
): CompanyField[] {
  return COMPANY_FORM_FIELDS.filter(
    (f) => f.section === section && (!form || !f.showWhen || f.showWhen(form))
  );
}

/** 그 구획에 속한 모든 항목(상세 화면은 실적까지 다 보여준다). */
export function companyFieldsOf(section: CompanySection): CompanyField[] {
  return COMPANY_FIELDS.filter((f) => f.section === section);
}

/**
 * 표시 모드(수정이 아닐 때)에 그 칸이 보여줄 글 — 없으면 `null`.
 *
 * 🔴 **화면에 이 규칙을 다시 적지 말 것.** 코드값→라벨 변환이 화면에 있으면
 *    `codedOptions` 를 늘렸을 때 그 화면만 조용히 코드값을 그대로 보여준다.
 */
export function companyFieldDisplay(f: CompanyField, raw: any): string | null {
  let shown: any = f.type === "checkbox" ? (raw === true ? "예" : null) : raw;

  if (shown === null || shown === undefined || shown === "") {
    // 🔴 「비어 있음」이 곧 규칙인 항목(정산 마감일)은 그 뜻을 그린다.
    return f.emptyLabel ?? null;
  }
  // 🔴 목록이 있으면 **라벨이 단위까지 담는다**(「익월 25일」) — 그래서 아래
  //    `displaySuffix` 를 건너뛴다. 안 건너뛰면 「익월 25일일」이 된다.
  const opts = f.codedOptions;
  if (opts) {
    // 🔴 목록에 없는 값이면 **저장된 값을 그대로 보여준다** — 숨기면 잘못 들어간 값을
    //    아무도 못 본다(조용히 사라지는 것이 가장 나쁘다).
    const hit = opts.find((o) => o.value === String(shown));
    if (hit) return hit.label;
  }
  if (f.displayThousands) shown = Number(shown).toLocaleString();
  if (f.displaySuffix) shown = `${shown}${f.displaySuffix}`;
  return String(shown);
}

/**
 * 화면 state 를 담을 빈 값 묶음.
 * `vehicle`·`address` 는 화면에서 두 칸으로 나뉘므로 보조 키를 함께 만든다.
 */
export function emptyCompanyForm(): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of COMPANY_FIELDS) {
    out[f.key] = f.type === "checkbox" ? false : "";
  }
  // 톤수·형태는 저장 직전에 `recommended_vehicle` 한 컬럼으로 합친다.
  // 🔴 `VEHICLE_TYPES_ALL[0]` 을 쓰지 말 것 — 2026-09-11 에 맨 앞이 「다마스」가 됐다.
  out.recommended_vehicle_tonnage = DEFAULT_VEHICLE_TYPE;
  out.recommended_vehicle_bodytype = BODY_TYPES[0];
  // 상세주소는 별도 컬럼 없이 도로명주소와 합쳐 저장한다(원칙 37번의 fullOrigin 패턴).
  out.main_pickup_addressDetail = "";
  out.main_dropoff_addressDetail = "";
  out.status = "미접촉";
  return out;
}

/**
 * 화면 state 를 companies 에 쓸 payload 로 바꾼다.
 *
 * 🔴 세 입구가 **이 함수 하나만** 쓴다 — 각자 payload 를 조립하면 조용히 갈린다.
 * 🔴 빈 문자열은 `null` 로 바꾼다(DB 에 `''` 를 넣으면 「값이 있다」로 취급돼 필터가 어긋난다).
 */
export function buildCompanyPayload(
  form: Record<string, any>,
  opts: { includePerformance?: boolean } = {}
): Record<string, any> {
  const payload: Record<string, any> = {};
  const fields = opts.includePerformance ? COMPANY_FIELDS : COMPANY_FORM_FIELDS;

  for (const f of fields) {
    if (f.type === "vehicle") continue; // 아래에서 합쳐서 넣는다
    // 🔴 읽기 전용 안내 줄은 DB 컬럼이 아니다 — payload 에 넣으면 저장이 통째로 거부된다.
    if (f.type === "static") continue;
    let v = form[f.key];

    if (f.type === "checkbox") {
      payload[f.key] = v === true;
      continue;
    }
    if (f.type === "address") {
      // 도로명주소 + 상세주소를 공백으로 이어 하나의 문자열로 저장한다.
      const detail = form[`${f.key}Detail`];
      v = [v, detail].filter((s) => typeof s === "string" && s.trim()).join(" ");
      // 🔴 주소검색이 함께 준 sido/sigungu 도 같이 저장한다 — 안 담으면 광역권·시군구
      //    자동기입이 조용히 비고, 그 값을 쓰는 화면(화주 상세·배차 판단)이 빈칸이 된다.
      //    ⚠️ 직접 타이핑한 경우엔 알 수 없어 빈 값이 오는 것이 정상 동작이다(원칙 37번).
      const prefix = f.key.replace(/_address$/, "");
      for (const suffix of ["sido", "sigungu"]) {
        const k = `${prefix}_${suffix}`;
        const sv = form[k];
        payload[k] = sv === "" || sv === undefined ? null : sv;
      }
    }
    if (f.type === "number") {
      payload[f.key] = v === "" || v === null || v === undefined ? null : Number(v);
      continue;
    }
    payload[f.key] = v === "" || v === undefined ? null : v;
  }

  // 톤수 + 형태 → 기존 단일 컬럼. 🔴 컬럼을 둘로 쪼개지 말 것 — 배차 판단 코드가
  // 이 한 컬럼을 읽고, 화주등록신청 승인도 신청서의 단일 값을 여기 넣는다.
  const tonnage = form.recommended_vehicle_tonnage;
  const bodytype = form.recommended_vehicle_bodytype;
  payload.recommended_vehicle = tonnage && bodytype ? `${tonnage} ${bodytype}` : null;

  // 출처분류가 「기타」가 아니면 출처 설명은 비워서 저장한다
  // (다른 분류로 바꿨는데 이전 수기설명이 남지 않도록).
  if (payload.manual_source_type !== "기타") {
    payload.manual_source_note = null;
  }

  // 🔴 결제일 — 화면의 한 값을 DB 두 칸으로 되돌린다(위 두 함수가 유일한 변환처).
  //    `payment_due_basis` 는 `COMPANY_FIELDS` 에 없으므로 위 반복문이 만들지 않는다.
  Object.assign(payload, paymentDueFromForm(form.payment_due_value));

  // 🔴 **정산 마감일은 저장하지 않는다** — 모든 화주가 월말 마감이고(36차 리뷰 2·3라운드)
  //    비운 값이 곧 월말이다(로드맵 ②-B). 화면에 입력칸이 없지만 **저장 경로도 함께
  //    막아 둔다** — 칸만 숨기면 다음에 누가 되살려 다시 화주마다 달라진다.
  //    🔴 `payload.billing_cutoff_day` 를 만들지 말 것.
  delete payload.billing_cutoff_day;

  return payload;
}

/**
 * DB 두 칸(`payment_due_basis` + `payment_due_value`) → **화면이 고르는 한 값**.
 *
 * 🔴 **화면 값과 DB 값이 1:1 이 아니다**(36차 리뷰 2라운드) — 담당자는 결제일 하나만
 *    고르는데 저장은 기준까지 정해야 한다. 두 함수가 그 변환을 **혼자** 맡는다.
 *    🔴 화면에서 `payment_due_basis` 를 직접 읽거나 쓰지 말 것.
 */
export function paymentDueToForm(row: Record<string, any> | null | undefined): string {
  if (!row) return "";
  if (row.payment_due_basis === "negotiated") return "negotiated";
  if (row.payment_due_value === null || row.payment_due_value === undefined) return "";
  return String(row.payment_due_value);
}

/** 화면 값 → DB 두 칸. `paymentDueToForm()` 의 짝이다. */
export function paymentDueFromForm(v: any): {
  payment_due_basis: string | null;
  payment_due_value: number | null;
} {
  if (v === "negotiated") return { payment_due_basis: "negotiated", payment_due_value: null };
  if (v === "" || v === null || v === undefined)
    return { payment_due_basis: null, payment_due_value: null };
  // 🔴 마감이 **월말로 고정**이라 「익월 25일」은 `fixed_day` + 25 로 정확히 표현된다
  //    (사용자 지시 *"결제일은 (정산 다음달 기준)"* · *"정산 마감일은 자동 월말기준"*).
  return { payment_due_basis: "fixed_day", payment_due_value: Number(v) };
}

/**
 * 화면에서 한 칸을 고쳤을 때의 **다음 폼 상태** — 딸림 효과를 여기 한 곳에 모은다.
 *
 * 🔴 **결제일 기준을 바꾸면 결제일 값을 비운다**(36차 리뷰 1라운드 — 사용자 질문
 *    *"결제일 기준을 「마감일기준」,「세금계산서발행일기준」일때 결제일의 값이 자동으로
 *    바꿔야 하지 않나?"*).
 *
 *    같은 컬럼인데 기준에 따라 **뜻이 통째로 달라지기 때문이다** —
 *    「매월 고정일 + 25」는 *매월 25일*이고 「마감일 기준 + 25」는 *마감 후 25일 이내*다.
 *    기준만 바꾸고 25 가 남으면 **담당자도 자동계산도 조용히 틀린 값을 읽는다.**
 *
 * 🔴 **다른 숫자로 자동으로 채우지 않는다 — 비운다.** 어떤 값이 맞는지는 화주마다
 *    다르고(사용자 확정 *"이는 화주마다 다르다"*), 추측해서 넣으면 담당자가 그것을
 *    확인된 값으로 믿는다. 빈 칸은 「다시 골라 주세요」라고 스스로 말한다.
 * 🔴 화면에 이 규칙을 다시 적지 말 것 — 등록 폼과 수정 폼이 다르게 동작하게 된다.
 */
export function applyCompanyFieldChange(
  form: Record<string, any>,
  key: string,
  value: any
): Record<string, any> {
  const next = { ...form, [key]: value };
  // 🔴 **건별에는 결제일이 없다** — 운송 완료 시 즉시지급이라 물을 것이 없다.
  //    칸만 숨기고 값을 남기면 나중에 월정산으로 바꿨을 때 **옛 날짜가 되살아난다.**
  if (key === "billing_cycle_default" && value !== "monthly") {
    next.payment_due_value = "";
  }
  return next;
}

/**
 * 저장 전 검사 — 문제가 있으면 그 이유를, 없으면 `null` 을 돌려준다.
 *
 * 🔴 **DB CHECK 제약과 같은 범위를 본다**(`migrations/2026-09-14_company_trade_terms.sql`).
 *    안 막으면 PostgREST 가 `new row violates check constraint "..."` 를 그대로
 *    올려서 담당자는 **어느 칸이 틀렸는지 알 수 없다.**
 * 🔴 이것은 화면 편의이고 **방어선은 DB 제약이다** — 한쪽만 고치지 말 것.
 */
export function validateCompanyForm(form: Record<string, any>): string | null {
  if (!String(form.name ?? "").trim()) return "회사명을 입력해주세요.";

  // 🔴 결제일은 드롭다운이라 화면으로는 이상한 값이 들어갈 수 없지만, DB CHECK 와
  //    **같은 범위**를 한 번 더 본다(브라우저 콘솔로 직접 보내는 길이 있다).
  //    🔴 화면은 편의이고 방어선은 DB 제약이다 — 한쪽만 고치지 말 것.
  const due = paymentDueFromForm(form.payment_due_value);
  if (due.payment_due_value !== null) {
    const n = due.payment_due_value;
    if (!Number.isInteger(n) || n < 0 || n > 31)
      return "결제일은 익월 말일(0) 또는 1~31일입니다.";
  }

  return null;
}

/** `"1톤 카고"` 처럼 합쳐 저장된 값을 두 칸으로 되돌린다. */
export function parseRecommendedVehicle(v: string | null | undefined) {
  if (!v) return { tonnage: DEFAULT_VEHICLE_TYPE, bodytype: BODY_TYPES[0] };
  const tonnage = VEHICLE_TYPES_ALL.find((t) => v.startsWith(t)) || DEFAULT_VEHICLE_TYPE;
  const rest = v.slice(tonnage.length).trim();
  const bodytype = BODY_TYPES.find((b) => b === rest) || BODY_TYPES[0];
  return { tonnage, bodytype };
}

/**
 * 지금 정기계약으로 **보여야 하는가**.
 *
 * 🔴 종료일이 지난 계약에는 배지를 붙이지 않는다 — 체크는 기록으로 남기되, 안 그러면
 *    끝난 계약의 배지가 목록에 영원히 남는다. 상세 화면에서는 「종료됨」으로 보인다.
 * 🔴 이 판정을 화면마다 각자 적지 말 것(목록·상세·견적·오더·배차가 같이 쓴다).
 */
export function isRecurringContractActive(
  company: { is_recurring_contract?: boolean | null; recurring_contract_ended_on?: string | null },
  today = new Date()
): boolean {
  if (!company?.is_recurring_contract) return false;
  const end = company.recurring_contract_ended_on;
  if (!end) return true; // 종료일 없음 = 기한 없는 계약
  // 날짜만 비교한다(시각이 섞이면 종료일 당일이 빠진다 — 종료일 당일까지는 유효).
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  return end >= todayYmd;
}

/**
 * 🔴 배지 문구는 이 상수 하나다 — 「정기」·「계약화주」 같은 변형을 만들지 말 것.
 *    목록·상세·견적·오더·배차가 같은 말을 써야 담당자가 같은 것으로 읽는다.
 */
export const RECURRING_CONTRACT_BADGE_LABEL = "정기계약";
