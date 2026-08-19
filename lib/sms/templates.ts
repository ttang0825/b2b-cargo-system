import { shortAddress } from "@/lib/shortAddress";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";

// SMS 문구 유일 정의처. 전부 "[WeCarry]" 문두 표기(발신번호가 개인 휴대폰이라
// 스팸으로 오인되지 않도록).
//
// ⚠️ **안내번호는 이제 상수가 아니라 인자로 받는다(35차, 10차 지시서)** —
// 고객이 회신할 때 **보낸 담당자에게 직접 닿게** 하려고, 발신번호와 본문 안내번호를
// 둘 다 로그인한 담당자의 번호로 맞춘다. 담당자 번호가 등록돼 있지 않으면 호출부가
// 고객센터 대표번호를 넘긴다(`lib/smsSenderPhone.ts`의 contactPhoneForBody).
// **템플릿 안에서 COMPANY_SUPPORT_PHONE을 직접 쓰지 말 것** — 안내번호가 담당자
// 번호로 바뀌지 않고 대표번호로 고정돼버린다.
//
// ⚠️ **용어 기준(33차)**: 이 문구들은 고객·차주에게 그대로 발송되므로 고객 접점 용어를
// 쓴다 — "화주"가 아니라 **"고객"**, "화주포털"이 아니라 **"운송관리"**. 반면 코드
// 주석은 내부 문서라 정확성 우선으로 "화주" 표현을 그대로 둔다(혼동 방지).
// **"차주"는 고객 접점에서도 그대로 쓴다** — 바꾸지 말 것.
//
// ⚠️ **byte 관리(35차에 방침이 바뀜)**: 이제 **8종이 전부 LMS**다. 견적안내를
// 90byte(SMS 단문 상한)에 맞추던 압축을 폐기했기 때문이며, 그 이유는
// `quoteSummaryMessage` 위 주석에 적어뒀다. 상한 관리는 사라졌지만 **문자는 스크롤
// 없이 한 화면에 들어오는 게 좋으므로 400~500byte를 넘기지 말 것.**

/** 기본 인자 — 8종 모두 안내번호(하이픈 표기)를 받는다 */
type WithContact = { contactPhone?: string | null };

/** 안내번호가 비어 있으면 대표번호로 되돌린다(호출부 실수 방어) */
function contact(p: string | null | undefined): string {
  return (p || "").trim() || COMPANY_SUPPORT_PHONE;
}

function shortDateTime(value: string | null | undefined): string {
  if (!value) return "일정 미정";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "일정 미정";
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "8/21(목) 09:00" — 견적안내처럼 고객이 일정을 확인해야 하는 문자에 씀 */
function dateTimeWithWeekday(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]}) ${String(d.getHours()).padStart(
    2,
    "0"
  )}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 담당자 이름이 있으면 "(담당 홍길동)"을 붙인 안내번호 줄을 만든다 */
function contactLine(params: WithContact & { staffName?: string | null }): string {
  const who = params.staffName ? ` (담당 ${params.staffName})` : "";
  return `문의 ${contact(params.contactPhone)}${who}`;
}

// 차주(배차확정 안내 수신자)가 실제 운행에 필요한 정보 위주로 구성(PR #73 리뷰
// 반영 — 오더번호 대신 상하차지 상세정보·주의사항·인사말 요청). **주의**: 화주명·
// 연락처는 의도적으로 뺌 — 오더 1건에 화주(고객) 연락처가 하나뿐인데 실제로는
// 상차지·하차지 담당자가 서로 다른 경우가 많다는 피드백(PR #73)에 따라, 정확하지
// 않은 연락처를 잘못 안내하느니 아예 빼는 쪽으로 결정.
export function dispatchConfirmedMessage(
  params: WithContact & {
    origin: string | null;
    destination: string | null;
    pickupAt: string | null;
    specialNotes: string | null;
    staffName?: string | null;
  }
): string {
  return [
    "[WeCarry] 배차확정 안내",
    `상차지: ${params.origin || "주소 미정"}`,
    params.pickupAt ? `상차일시: ${shortDateTime(params.pickupAt)}` : null,
    `하차지: ${params.destination || "주소 미정"}`,
    params.specialNotes ? `요청사항: ${params.specialNotes}` : null,
    "건강 조심하시고 안전운전하세요.",
    contactLine(params),
  ]
    .filter(Boolean)
    .join("\n");
}

export function pickupCompletedMessage(
  params: WithContact & { origin: string | null; staffName?: string | null }
): string {
  return [
    "[WeCarry] 상차완료 안내",
    `${shortAddress(params.origin)}에서 상차가 완료되었습니다.`,
    "진행상황은 운송관리에서 확인하실 수 있습니다.",
    contactLine(params),
  ].join("\n");
}

export function deliveryCompletedMessage(
  params: WithContact & { destination: string | null; staffName?: string | null }
): string {
  return [
    "[WeCarry] 운송완료 안내",
    `${shortAddress(params.destination)}에 하차 완료되었습니다.`,
    "이용해주셔서 감사합니다.",
    contactLine(params),
  ].join("\n");
}

// /apply 승인은 회사 등록+포털계정 발급이 같은 요청 안에서 동시에 일어나므로,
// "승인" 안내와 "계정발급" 안내를 따로 두 통 보내지 않고 하나로 합침
export function applicationApprovedWithAccountMessage(
  params: WithContact & {
    companyName: string | null;
    loginId: string;
    password: string;
    portalUrl: string;
    staffName?: string | null;
  }
): string {
  return [
    "[WeCarry] 고객등록 승인 및 계정발급 안내",
    `${params.companyName || "귀사"}의 고객등록 신청이 승인되었습니다.`,
    `아이디: ${params.loginId} / 임시비밀번호: ${params.password}`,
    `운송관리: ${params.portalUrl}`,
    "최초 로그인 시 비밀번호를 변경해주세요.",
    contactLine(params),
  ].join("\n");
}

export function applicationRejectedMessage(
  params: WithContact & { companyName: string | null; reason: string | null; staffName?: string | null }
): string {
  return [
    "[WeCarry] 고객등록 신청 결과 안내",
    `${params.companyName || "귀사"}의 고객등록 신청이 반려되었습니다.`,
    params.reason ? `사유: ${params.reason}` : null,
    contactLine(params),
  ]
    .filter(Boolean)
    .join("\n");
}

// 화주 상세화면에서 단독으로(신청서 승인과 무관하게) 포털 계정을 발급할 때.
// (함수·변수명의 portal, 주석의 "화주"는 내부 용어라 그대로 두고 발송 문구만 고객 접점 용어를 씀)
export function portalAccountIssuedMessage(
  params: WithContact & { loginId: string; password: string; portalUrl: string; staffName?: string | null }
): string {
  return [
    "[WeCarry] 운송관리 계정발급 안내",
    `아이디: ${params.loginId} / 임시비밀번호: ${params.password}`,
    `운송관리: ${params.portalUrl}`,
    "최초 로그인 시 비밀번호를 변경해주세요.",
    contactLine(params),
  ].join("\n");
}

export function portalPasswordReissuedMessage(
  params: WithContact & { loginId: string; password: string; portalUrl: string; staffName?: string | null }
): string {
  return [
    "[WeCarry] 운송관리 비밀번호 재발급 안내",
    `아이디: ${params.loginId} / 새 임시비밀번호: ${params.password}`,
    `운송관리: ${params.portalUrl}`,
    "로그인 시 비밀번호를 다시 설정해주세요.",
    contactLine(params),
  ].join("\n");
}

// ⚠️ **이 함수는 더 이상 견적안내에서 쓰이지 않는다**(35차에 호출 제거).
// 다른 템플릿이 나중에 쓸 수 있어 **삭제하지 않고 남겨둠**(지시서 4-6).
export function truncateToBytes(text: string, maxBytes: number): string {
  let result = "";
  let bytes = 0;
  for (const ch of text) {
    const chBytes = ch.charCodeAt(0) > 0x7f ? 2 : 1;
    if (bytes + chBytes > maxBytes) break;
    result += ch;
    bytes += chBytes;
  }
  return result.trimEnd();
}

/** LMS 제목 — 알림창에서 바로 구분되도록(지시서 4-4) */
export const QUOTE_SMS_SUBJECT = "[위캐리 운송] 견적 안내";

// 시·도 축약. 견적안내의 "구간" 한 줄을 짧게 유지하기 위한 것으로,
// 목록 화면이 쓰는 `lib/shortAddress.ts`(도로명까지 남김)와는 목적이 달라 별도로 둔다.
// ⚠️ shortAddress를 이 용도로 고치지 말 것 — 운송오더·배차 목록의 구간 표시가 같이 바뀐다.
const SIDO_SHORT: [RegExp, string][] = [
  [/^서울(특별시)?/, "서울"], [/^부산(광역시)?/, "부산"], [/^대구(광역시)?/, "대구"],
  [/^인천(광역시)?/, "인천"], [/^광주(광역시)?/, "광주"], [/^대전(광역시)?/, "대전"],
  [/^울산(광역시)?/, "울산"], [/^세종(특별자치시)?/, "세종"], [/^경기(도)?/, "경기"],
  [/^강원(특별자치도|도)?/, "강원"], [/^충청북도|^충북/, "충북"], [/^충청남도|^충남/, "충남"],
  [/^전라북도|^전북(특별자치도)?/, "전북"], [/^전라남도|^전남/, "전남"],
  [/^경상북도|^경북/, "경북"], [/^경상남도|^경남/, "경남"],
  [/^제주(특별자치도)?/, "제주"],
];

/** "경기도 화성시 동탄순환대로 830" → "경기 화성" (시·구 단위면 충분, 지시서 4-3) */
function shortRegion(address: string | null | undefined): string | null {
  const raw = (address || "").trim();
  if (!raw) return null;
  const tokens = raw.split(/\s+/);
  const first = tokens[0] || "";
  const hit = SIDO_SHORT.find(([re]) => re.test(first));
  if (!hit) return tokens.slice(0, 2).join(" ") || raw;
  const sido = hit[1];
  // 세종처럼 시·군·구가 따로 없는 경우도 있으므로 없으면 시·도만 반환
  const second = (tokens[1] || "").replace(/(특별자치)?[시군구]$/, "");
  return second ? `${sido} ${second}` : sido;
}

// 품목명은 자유 입력이라 길이가 들쭉날쭉하다. 이제 자르지 않는 것이 원칙이지만,
// 극단적으로 긴 값이 들어와 문자가 스크롤 한참 내려가는 것은 막는다(지시서 4-6이
// 허용한 "넉넉한 상한"). 100자 = 200byte로, 400~500byte 목표 안에서 충분한 여유.
const QUOTE_ITEM_MAX_CHARS = 100;

/**
 * 견적안내 문자(35차 전면 개편, 10차 지시서 4장).
 *
 * 🔴 **90byte 압축을 되살리지 말 것.** 원래 143byte였던 문구를 SMS 단문 상한(90byte)에
 * 맞추느라 안내 문구를 빼고 품목명을 byte 단위로 잘라 붙이는 구조였고, 그 결과 고객이
 * **무슨 견적인지 알아보기 어려운** 문자가 나갔다. 건당 요금 차이는 약 20원 → 50원
 * (견적 100건 기준 월 3,000원)인데, 품목이 잘려 문의 전화가 한 번 더 오는 비용이 더
 * 크다고 판단해 LMS로 전환함. **다시 압축하자는 제안이 나오면 이 결정을 먼저 확인할 것.**
 *
 * 문구 설계 근거(임의로 바꾸지 말 것):
 *  - 금액을 별도 줄에 띄움 — 고객이 가장 먼저 찾는 정보라 목록에 섞이면 눈에 안 띈다
 *  - 구간은 한 줄로 압축 — 상·하차지를 두 줄로 쓰면 길어진다
 *  - 상·하차 조건 포함 — 조건 착오가 현장 분쟁의 주원인인데 압축 때 빠져 있었다
 *  - 추가비 안내 2줄 — 약관 제11조 2항("사유와 금액을 안내하고 협의한 후 청구")과 맞춤
 *  - 부가세 별도 명시 — 약관 제10조 2항이 공급가액 기준임을 규정
 *  - 담당자 이름 병기 — 회신 시 누구를 찾을지 명확해진다
 */
export function quoteSummaryMessage(
  params: WithContact & {
    item: string | null;
    vehicleType: string | null;
    finalAmount: number | null;
    pickupAt: string | null;
    origin?: string | null;
    destination?: string | null;
    loadCondition?: string | null;
    unloadCondition?: string | null;
    staffName?: string | null;
  }
): string {
  const route =
    params.origin || params.destination
      ? `${shortRegion(params.origin) || "상차지 미정"} → ${shortRegion(params.destination) || "하차지 미정"}`
      : null;

  const pickup = dateTimeWithWeekday(params.pickupAt);
  const item = params.item ? params.item.slice(0, QUOTE_ITEM_MAX_CHARS) : null;

  const condition = [
    params.loadCondition ? `${params.loadCondition} 상차` : null,
    params.unloadCondition ? `${params.unloadCondition} 하차` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  const details = [
    route ? `· 구간   ${route}` : null,
    pickup ? `· 일시   ${pickup} 상차` : null,
    params.vehicleType ? `· 차량   ${params.vehicleType}` : null,
    item ? `· 품목   ${item}` : null,
    condition ? `· 조건   ${condition}` : null,
  ].filter(Boolean);

  // 최종 견적금액은 항상 공급가액(부가세 별도) 기준으로 저장됨(견적 상세 표시와 동일)
  const amount =
    params.finalAmount != null
      ? `견적 금액 ${Math.round(params.finalAmount).toLocaleString("ko-KR")}원 (부가세 별도)`
      : "견적 금액은 별도 안내드립니다.";

  return [
    "요청하신 운송 건의 견적을 안내드립니다.",
    "",
    ...details,
    "",
    amount,
    "",
    "현장 조건이 견적과 다를 경우 추가비가 발생할 수 있으며,",
    "사유와 금액을 안내드린 후 청구합니다.",
    "",
    contactLine(params),
  ].join("\n");
}
