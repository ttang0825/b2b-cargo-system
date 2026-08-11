import { shortAddress } from "@/lib/shortAddress";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";

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

export function dispatchConfirmedMessage(params: {
  orderNo: string | null;
  origin: string | null;
  destination: string | null;
  pickupAt: string | null;
}): string {
  return [
    "[WeCarry] 배차확정 안내",
    params.orderNo ? `오더 ${params.orderNo}` : null,
    `상차: ${shortAddress(params.origin)} ${shortDateTime(params.pickupAt)}`,
    `하차: ${shortAddress(params.destination)}`,
    `문의: ${COMPANY_SUPPORT_PHONE}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function pickupCompletedMessage(params: { orderNo: string | null; origin: string | null }): string {
  return [
    "[WeCarry] 상차완료 안내",
    `오더 ${params.orderNo || ""} ${shortAddress(params.origin)}에서 상차가 완료되었습니다.`.trim(),
    "진행상황은 화주포털에서 확인하실 수 있습니다.",
    `문의: ${COMPANY_SUPPORT_PHONE}`,
  ].join("\n");
}

export function deliveryCompletedMessage(params: { orderNo: string | null; destination: string | null }): string {
  return [
    "[WeCarry] 운송완료 안내",
    `오더 ${params.orderNo || ""} ${shortAddress(params.destination)}에 하차 완료되었습니다.`.trim(),
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

export function quoteSummaryMessage(params: {
  item: string | null;
  vehicleType: string | null;
  finalAmount: number | null;
  pickupAt: string | null;
}): string {
  return [
    "[WeCarry] 견적 안내",
    [
      params.item || null,
      params.vehicleType || "차량 미정",
      // 최종 견적금액은 항상 공급가액(부가세 별도) 기준으로 저장됨(견적 상세 표시와 동일)
      params.finalAmount != null
        ? `운임 ${Math.round(params.finalAmount).toLocaleString("ko-KR")}원(부가세 별도)`
        : null,
      `상차 ${shortDateTime(params.pickupAt)}`,
    ]
      .filter(Boolean)
      .join(" / "),
    "상세 견적서는 화주포털에서 확인해주세요.",
    `문의: ${COMPANY_SUPPORT_PHONE}`,
  ].join("\n");
}
