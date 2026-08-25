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

// 차량 톤수 — 🔴 **두 배열로 나뉘어 있다. 합치지 말 것**(17차 확정).
//
// 관리자 입력·자동견적 계산은 9종을 다 써야 하지만, 광고·유입 화면과 화주 입력
// 드롭다운에는 대형 3종을 노출하지 않는다. `"25톤"`이 **금지 표현**이기 때문이다
// (32차·12차 확정 — 차량 범위는 "1톤부터 5톤 이상까지"이고, 배차망으로 대형이
// 가능하긴 하나 아직 수월하지 않아 불특정 다수에게 약속하지 않기로 했다).
// `BODY_TYPES` 11종을 `/vehicles`에서 4종으로 좁혀 노출하는 것과 같은 취지다(원칙 50번).
//
// 어느 쪽을 쓰는지는 **화면의 성격**으로 가른다.
//
//   광고·유입 (불특정 다수)   `/`, `/vehicles`, `/quote`, `/apply`        → PUBLIC (6종)
//   화주 입력 (로그인 화주)    `/customer/request` 희망 톤수                → PUBLIC (6종)
//   표시 (이미 확정된 건)      화주포털 조회·견적서 PDF·엑셀                 → 저장값 그대로 (9종 가능)
//   관리자 입력·계산          `/admin/*`, `rate_distance_tiers`           → ALL (9종)
//
// 🔴 "표시"는 배열을 참조하지 않는다 — `quotes.vehicle_type` 저장 문자열을 그대로
//    인쇄한다. 대형 오더를 이미 의뢰한 화주에게 나가는 견적서는 광고가 아니므로
//    "25톤"이 찍혀도 된다. 금지되는 것은 **취급 범위를 과장하는 광고**다.

// 자동견적·운임기준표·관리자 입력용 — DB의 `rate_distance_tiers.vehicle_type`과 1:1 (9종)
export const VEHICLE_TYPES_ALL = [
  "1톤",
  "1.4톤",
  "2.5톤",
  "3.5톤",
  "5톤",
  "5톤 플러스/축",
  "11톤",
  "18톤",
  "25톤",
];

// 공개·화주 노출용 (6종) — 원칙 50번.
// 🔴 여기에 11·18·25톤을 넣지 말 것. `"25톤"`은 금지 표현이다(위 주석 참고).
export const VEHICLE_TYPES_PUBLIC = [
  "1톤",
  "1.4톤",
  "2.5톤",
  "3.5톤",
  "5톤",
  "5톤 플러스/축",
];

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
