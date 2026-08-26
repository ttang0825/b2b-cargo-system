import type { SupabaseClient } from "@supabase/supabase-js";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION } from "@/lib/legalInfo";

// 동의 기록(`consents` 테이블)의 유일 정의처. 값 목록·버전 매핑·저장 헬퍼가 전부 여기 있다.
//
// 🔴 **DB에 CHECK 제약을 걸지 않았다** — 값 목록은 이 파일이 관리한다. 나중에 마케팅 동의를
// 붙일 때 제약까지 같이 고쳐야 하는 부담을 지지 않으려는 것이며, 이 저장소는
// `dispatch_status` CHECK 때문에 배차 등록이 막힌 전례가 있다(CLAUDE.md 7장).
// 그래서 **값을 늘릴 때는 이 파일만 고치면 되지만, 반대로 이 파일이 유일한 방어선**이다.
//
// ⚠️ `orders`·`quotes`의 **`mixed_shipper_consent`는 완전히 다른 것**이다(혼적 운송에 화주가
// 동의했는지). `consent`로 grep하면 함께 걸리니 절대 섞지 말 것.

/**
 * 동의 주체의 종류. 마케팅 동의가 붙으면 'phone'이 추가된다.
 * ⚠️ `portal_order_request`는 20차에 추가됐다 — 값은 `portal_order_requests` 행의 id다.
 */
export const CONSENT_SUBJECT_TYPES = [
  "quote_request",
  "application",
  "portal_order_request",
] as const;
export type ConsentSubjectType = (typeof CONSENT_SUBJECT_TYPES)[number];

/**
 * 동의 항목. 마케팅 동의가 붙으면 'marketing'이 추가된다.
 * ⚠️ `third_party`(제3자 제공)는 20차에 추가됐다 — 상·하차지 담당자의 성명·연락처를
 * 배차된 차주에게 제공하는 것에 대한 동의이며, `privacy`(수집·이용)와는 다른 항목이다.
 */
export const CONSENT_TYPES = ["privacy", "terms", "third_party"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

/**
 * 동의를 받은 지점.
 * ⚠️ 앞의 둘은 화면 경로인데 `customer_portal`만 화면 이름이라 형태가 섞여 있다 —
 * 20차 지시서가 정한 값을 그대로 따른 것이다. **21차가 이 화면을 새 디자인으로
 * 갈아엎으면서 경로가 바뀔 수 있어서**, 경로보다 안정적인 이름을 쓴 것으로 읽는다.
 * 🔴 이미 저장된 행이 이 값을 갖게 되므로 나중에 바꾸지 말 것.
 */
export const CONSENT_SOURCES = ["/quote", "/apply", "customer_portal"] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

/**
 * 동의 항목별 문서 버전. 개인정보처리방침과 약관은 개정 주기가 달라 5차부터 항목별로
 * 나눠 정의돼 있고(`lib/legalInfo.ts`), 그 값을 그대로 저장한다.
 * 🔴 여기에 버전 문자열을 다시 적지 말 것 — 상수를 참조해야 한 곳만 고치면 된다.
 */
const VERSION_BY_CONSENT_TYPE: Record<ConsentType, string> = {
  privacy: PRIVACY_POLICY_VERSION,
  terms: TERMS_VERSION,
  // 제3자 제공 동의의 근거 문서는 개인정보처리방침(제4조)이므로 같은 버전을 쓴다.
  // 🔴 `THIRD_PARTY_VERSION` 같은 상수를 새로 만들지 말 것 — 근거 문서가 하나뿐이라
  //    버전이 갈라지면 어느 처리방침에 동의한 것인지 되짚을 수 없게 된다.
  third_party: PRIVACY_POLICY_VERSION,
};

/**
 * 🔴 **화면별로 실제로 받는 동의 항목.** 화면의 동의 문구에 적힌 것만 넣는다.
 *
 * `/quote`·`/apply` 두 문구는 "개인정보 수집·이용에 동의합니다"로 끝나고 **이용약관은
 * 언급하지 않는다.** 그래서 `privacy` 하나만 저장한다 — 받지 않은 동의를 기록하면 기록
 * 자체가 거짓이 되어 입증 자료로서의 가치가 없어진다.
 *
 * ⚠️ 그 결과 **현재 `terms` 동의를 받는 화면은 하나도 없다**(`TERMS_VERSION`은 계속 미사용).
 * 약관 동의를 받으려면 먼저 **화면 문구에 약관을 넣어야** 하고, 그건 법적 문구 개편이라
 * 별도 차수다. 여기 배열에 `"terms"`를 먼저 추가하지 말 것.
 */
export const CONSENT_TYPES_BY_SOURCE: Record<ConsentSource, readonly ConsentType[]> = {
  "/quote": ["privacy"],
  "/apply": ["privacy"],
  // 🔴 발주요청 화면은 `third_party` **하나만** 받는다. 로그인한 화주 본인의 개인정보는
  // 계정 발급(`/apply`) 시점에 이미 동의를 받았고, 이 화면이 새로 받는 것은 **제3자
  // (상·하차지 담당자)의 정보를 차주에게 제공하는 것**뿐이다. 화면 문구도 그것만 말한다.
  customer_portal: ["third_party"],
};

/** 관리자 화면 표시용 라벨. 화면마다 다시 적지 말 것. */
export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  privacy: "개인정보 수집·이용",
  terms: "이용약관",
  third_party: "제3자 제공",
};

/** 관리자 화면이 받아 쓰는 동의 기록 한 행(서버 API가 원본 행에 붙여서 내려준다). */
export type ConsentRecord = {
  id: string;
  consent_type: string;
  version: string;
  agreed: boolean;
  agreed_at: string;
  source: string | null;
};

type RecordConsentsParams = {
  subjectType: ConsentSubjectType;
  /** 방금 만든 원본 행의 id */
  subjectId: string;
  source: ConsentSource;
};

/**
 * 동의 기록을 남긴다. 어떤 항목을 몇 행 남길지는 `CONSENT_TYPES_BY_SOURCE`가 정한다.
 *
 * 🔴 **호출한 쪽이 실패를 반드시 처리해야 한다.** Supabase JS에는 트랜잭션이 없어서,
 * 원본 insert가 성공하고 이 함수가 실패하면 **동의 없는 접수 건이 남는다.** 그래서 이
 * 함수는 예외를 삼키지 않고 에러를 그대로 돌려주며, 호출부는 원본 행을 삭제(롤백)해야
 * 한다 — `approve-application`이 포털 계정 발급 실패 시 회사를 되돌리는 것과 같은 방식.
 * (`lib/sendSms.ts`처럼 실패를 조용히 넘기는 부가기능과 성격이 반대다.)
 */
export async function recordConsents(
  admin: SupabaseClient,
  params: RecordConsentsParams
): Promise<{ error: string | null }> {
  const rows = CONSENT_TYPES_BY_SOURCE[params.source].map((consentType) => ({
    subject_type: params.subjectType,
    subject_id: params.subjectId,
    consent_type: consentType,
    version: VERSION_BY_CONSENT_TYPE[consentType],
    // 이 함수는 "동의했다"를 남기는 경로다. 철회는 agreed=false 행을 따로 추가한다(UPDATE 아님).
    agreed: true,
    source: params.source,
  }));

  const { error } = await admin.from("consents").insert(rows);
  return { error: error?.message || null };
}
