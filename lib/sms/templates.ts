import { shortAddress } from "@/lib/shortAddress";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";
import { SMS_BYTE_LIMIT, byteLength } from "@/lib/sms/byteLength";

// SMS 문구 유일 정의처. 전부 "[WeCarry]" 문두 표기(발신번호가 개인 010번호라
// 스팸으로 오인되지 않도록) + 실제 발신번호 대신 대표 문의번호(COMPANY_SUPPORT_PHONE,
// 현재 1588-0000 자리표시자 — 나중에 실제 번호로 바뀌면 이 상수만 갱신하면 전체 반영됨).

function shortDateTime(value: string | null | undefined): string {
  if (!value) return "일정 미정";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "일정 미정";
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

// 차주(배차확정 안내 수신자)가 실제 운행에 필요한 정보 위주로 구성(PR #73 리뷰
// 반영 — 오더번호 대신 상하차지 상세정보·주의사항·인사말 요청). **주의**: 화주명·
// 연락처는 의도적으로 뺌 — 오더 1건에 화주(고객) 연락처가 하나뿐인데 실제로는
// 상차지·하차지 담당자가 서로 다른 경우가 많다는 피드백(PR #73)에 따라, 정확하지
// 않은 연락처를 잘못 안내하느니 아예 빼는 쪽으로 결정. 상차지/하차지별 상호·
// 담당자명·연락처를 별도로 저장하는 기능은 오더/견적/화주포털 발주요청 전체에
// 걸친 별도 작업으로 분리됨(이번 PR 범위 밖).
export function dispatchConfirmedMessage(params: {
  origin: string | null;
  destination: string | null;
  pickupAt: string | null;
  specialNotes: string | null;
}): string {
  return [
    "[WeCarry] 배차확정 안내",
    `상차지: ${params.origin || "주소 미정"}`,
    params.pickupAt ? `상차일시: ${shortDateTime(params.pickupAt)}` : null,
    `하차지: ${params.destination || "주소 미정"}`,
    params.specialNotes ? `요청사항: ${params.specialNotes}` : null,
    "건강 조심하시고 안전운전하세요.",
    `문의: ${COMPANY_SUPPORT_PHONE}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function pickupCompletedMessage(params: { origin: string | null }): string {
  return [
    "[WeCarry] 상차완료 안내",
    `${shortAddress(params.origin)}에서 상차가 완료되었습니다.`,
    "진행상황은 화주포털에서 확인하실 수 있습니다.",
    `문의: ${COMPANY_SUPPORT_PHONE}`,
  ].join("\n");
}

export function deliveryCompletedMessage(params: { destination: string | null }): string {
  return [
    "[WeCarry] 운송완료 안내",
    `${shortAddress(params.destination)}에 하차 완료되었습니다.`,
    "이용해주셔서 감사합니다.",
    `문의: ${COMPANY_SUPPORT_PHONE}`,
  ].join("\n");
}

// /apply 승인은 회사 등록+포털계정 발급이 같은 요청 안에서 동시에 일어나므로,
// "승인" 안내와 "계정발급" 안내를 따로 두 통 보내지 않고 하나로 합침
export function applicationApprovedWithAccountMessage(params: {
  companyName: string | null;
  loginId: string;
  password: string;
  portalUrl: string;
}): string {
  return [
    "[WeCarry] 화주등록 승인 및 계정발급 안내",
    `${params.companyName || "귀사"}의 화주등록 신청이 승인되었습니다.`,
    `아이디: ${params.loginId} / 임시비밀번호: ${params.password}`,
    `포털: ${params.portalUrl}`,
    "최초 로그인 시 비밀번호를 변경해주세요.",
    `문의: ${COMPANY_SUPPORT_PHONE}`,
  ].join("\n");
}

export function applicationRejectedMessage(params: { companyName: string | null; reason: string | null }): string {
  return [
    "[WeCarry] 화주등록 신청 결과 안내",
    `${params.companyName || "귀사"}의 화주등록 신청이 반려되었습니다.`,
    params.reason ? `사유: ${params.reason}` : null,
    `문의: ${COMPANY_SUPPORT_PHONE}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// 화주 상세화면에서 단독으로(신청서 승인과 무관하게) 포털 계정을 발급할 때
export function portalAccountIssuedMessage(params: { loginId: string; password: string; portalUrl: string }): string {
  return [
    "[WeCarry] 화주포털 계정발급 안내",
    `아이디: ${params.loginId} / 임시비밀번호: ${params.password}`,
    `포털: ${params.portalUrl}`,
    "최초 로그인 시 비밀번호를 변경해주세요.",
    `문의: ${COMPANY_SUPPORT_PHONE}`,
  ].join("\n");
}

export function portalPasswordReissuedMessage(params: { loginId: string; password: string; portalUrl: string }): string {
  return [
    "[WeCarry] 화주포털 비밀번호 재발급 안내",
    `아이디: ${params.loginId} / 새 임시비밀번호: ${params.password}`,
    `포털: ${params.portalUrl}`,
    "로그인 시 비밀번호를 다시 설정해주세요.",
    `문의: ${COMPANY_SUPPORT_PHONE}`,
  ].join("\n");
}

// 90byte(SMS 단문 상한, EUC-KR 기준 한글 1자=2byte) 안에 최대한 들어가도록
// 압축한 포맷(PR #73 리뷰 반영 — 사용자가 "최대한 압축" 방식으로 확정). 안내문구·
// "문의:" 콜론 등 없어도 되는 글자를 빼고, 품목명(자유 입력이라 길이가 들쭉날쭉함)만
// 나머지(차량형태·금액·상차일·문의처)를 다 채운 뒤 남는 byte만큼만 byte 단위로
// 정확히 잘라 붙임 — 고정 글자수로 자르면 남는 여유를 못 쓰거나 반대로 여전히
// 넘칠 수 있어서, 실제 byte를 계산해 최대한 SMS 안에 들어오도록 함. 그래도
// 차량형태·금액만으로 이미 90byte에 근접한 극단적인 경우엔 품목이 통째로
// 빠질 수 있음(빈도 낮음, 허용된 트레이드오프).

function truncateToBytes(text: string, maxBytes: number): string {
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

export function quoteSummaryMessage(params: {
  item: string | null;
  vehicleType: string | null;
  finalAmount: number | null;
  pickupAt: string | null;
}): string {
  const fixedPart = [
    params.vehicleType || "차량 미정",
    // 최종 견적금액은 항상 공급가액(부가세 별도) 기준으로 저장됨(견적 상세 표시와 동일)
    params.finalAmount != null
      ? `${Math.round(params.finalAmount).toLocaleString("ko-KR")}원(부가세별도)`
      : null,
    `상차${shortDateTime(params.pickupAt)}`,
  ]
    .filter(Boolean)
    .join(" ");

  const withoutItem = `[WeCarry]견적안내\n${fixedPart}\n문의 ${COMPANY_SUPPORT_PHONE}`;
  const itemBudget = SMS_BYTE_LIMIT - byteLength(withoutItem) - (params.item ? 1 : 0); // 품목-나머지 사이 공백 1자
  const itemPart = params.item && itemBudget > 0 ? truncateToBytes(params.item, itemBudget) : null;

  const line = [itemPart, fixedPart].filter(Boolean).join(" ");
  return `[WeCarry]견적안내\n${line}\n문의 ${COMPANY_SUPPORT_PHONE}`;
}
