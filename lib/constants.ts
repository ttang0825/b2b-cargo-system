// 여러 화면(화주관리, 차주관리, 운송오더 등)에서 공통으로 쓰는 선택지들

export const REGIONS = [
  "서울",
  "인천",
  "경기",
  "강원",
  "충북",
  "충남",
  "대전",
  "세종",
  "전북",
  "전남",
  "광주",
  "경북",
  "경남",
  "대구",
  "부산",
  "울산",
  "제주",
];

// 차량 톤수 (차주관리·견적관리와 동일한 목록 - 화주 "추천 차량" 선택에도 재사용)
export const VEHICLE_TYPES = ["1톤", "1.4톤", "2.5톤", "3.5톤", "5톤", "5톤 플러스/축"];

// 차량 형태 (차주관리와 동일한 목록)
export const BODY_TYPES = [
  "카고",
  "탑차",
  "윙바디",
  "냉장탑",
  "냉동탑",
  "리프트",
  "크레인",
  "렉카",
  "트레일러",
  "사다리차",
  "기타/협의",
];

// 화주 등급
export const GRADE_OPTIONS = ["S", "A", "B", "C", "D", "휴면"];

// 입력값에서 숫자만 뽑아 한국 전화번호 형식으로 자동 하이픈 삽입
export function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  if (digits.length < 11) {
    // 02로 시작하는 서울 지역번호(10자리)까지 고려
    if (digits.startsWith("02")) {
      return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

// 입력값에서 숫자만 뽑아 사업자등록번호 형식(000-00-00000)으로 자동 하이픈 삽입
export function formatBizRegNo(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

// 운임 정산방식 — 견적 단계에서 최초 선택하면 운송오더→배차→정산관리까지 승계되는
// 기준 필드. 신규 유형이 생기면 이 배열만 수정할 것 (화면마다 하드코딩 금지,
// lib/loadingMethods.ts와 동일한 패턴)
export const SETTLEMENT_TYPES = [
  { value: "general", label: "일반오더/주선사정산" },
  { value: "prepaid", label: "선불 오더" },
  { value: "postpaid_cod", label: "착불 오더" },
  { value: "monthly", label: "월정산 오더" },
  { value: "network", label: "정보망 정산" },
] as const;

export function getSettlementTypeLabel(value: string | null | undefined): string {
  return SETTLEMENT_TYPES.find((t) => t.value === value)?.label || value || "-";
}
