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

import { REGIONS, VEHICLE_TYPES_ALL, BODY_TYPES, GRADE_OPTIONS } from "@/lib/constants";
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
  | "biz-reg"; // 사업자등록번호(자동 하이픈)

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
   * 등록 폼에 노출하는가(기본 true).
   * 🔴 false 인 것은 **정산이 자동으로 갱신하는 실적값**이라 신규 등록에 넣으면 안 된다 —
   *    신규 화주는 실적이 0이고, 담당자가 손으로 넣어도 다음 정산에서 덮인다.
   *    (완료조건 2의 「등록 == 수정」은 이 플래그를 제외한 집합을 뜻한다)
   */
  inForm?: boolean;
  /** select 일 때의 값 목록 */
  options?: readonly string[];
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
};

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
  { key: "manual_source_note", label: "출처 설명", type: "text", section: "기본 정보" },
  { key: "notes", label: "메모", type: "textarea", section: "기본 정보" },

  // ── 담당자 ────────────────────────────────────────────────────────────────
  { key: "contact_name", label: "담당자명", type: "text", section: "담당자" },
  { key: "contact_position", label: "직책", type: "text", section: "담당자" },
  { key: "contact_department", label: "부서", type: "text", section: "담당자" },
  { key: "contact_mobile", label: "휴대폰", type: "tel", section: "담당자" },
  { key: "contact_email", label: "이메일", type: "email", section: "담당자" },
  { key: "assigned_staff", label: "담당직원", type: "text", section: "담당자" },

  // ── 거래 조건 ──────────────────────────────────────────────────────────────
  { key: "payment_terms", label: "결제조건", type: "text", section: "거래 조건", placeholder: "예: 월말 마감 익월 15일" },
  {
    key: "billing_cutoff_day",
    label: "정산 마감일",
    type: "number",
    section: "거래 조건",
    note: "비우면 달력월(1일~말일) 기준",
    emptyLabel: "말일(달력월 기준)",
    displaySuffix: "일",
  },
  { key: "main_pickup_region", label: "주요 상차지역", type: "region-multi", section: "거래 조건" },
  { key: "main_dropoff_region", label: "주요 하차지역", type: "region-multi", section: "거래 조건" },
  { key: "main_pickup_address", label: "주요 상차지 정확주소", type: "address", section: "거래 조건" },
  { key: "main_dropoff_address", label: "주요 하차지 정확주소", type: "address", section: "거래 조건" },

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

/** 그 구획에 속한, 등록 폼에 노출하는 항목들. */
export function companyFormFieldsOf(section: CompanySection): CompanyField[] {
  return COMPANY_FORM_FIELDS.filter((f) => f.section === section);
}

/** 그 구획에 속한 모든 항목(상세 화면은 실적까지 다 보여준다). */
export function companyFieldsOf(section: CompanySection): CompanyField[] {
  return COMPANY_FIELDS.filter((f) => f.section === section);
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
  out.recommended_vehicle_tonnage = VEHICLE_TYPES_ALL[0];
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

  return payload;
}

/** `"1톤 카고"` 처럼 합쳐 저장된 값을 두 칸으로 되돌린다. */
export function parseRecommendedVehicle(v: string | null | undefined) {
  if (!v) return { tonnage: VEHICLE_TYPES_ALL[0], bodytype: BODY_TYPES[0] };
  const tonnage = VEHICLE_TYPES_ALL.find((t) => v.startsWith(t)) || VEHICLE_TYPES_ALL[0];
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
