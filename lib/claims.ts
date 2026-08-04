// 로드맵⑤ 클레임·사고 — 유형/상태/책임소재 라벨의 유일한 정의처.
// DB CHECK 제약조건과 반드시 동일하게 유지할 것.
export const CLAIM_TYPES = ["damage", "loss", "delay", "wrong_delivery", "accident", "other"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  damage: "파손",
  loss: "분실",
  delay: "지연",
  wrong_delivery: "오배송",
  accident: "사고",
  other: "기타",
};

export function getClaimTypeLabel(type: string | null | undefined): string {
  if (!type) return "-";
  return CLAIM_TYPE_LABELS[type as ClaimType] || type;
}

// 삭제 기능은 두지 않음(법적·분쟁 대응 근거자료 성격) — "기각"이 사실상 종결 상태
export const CLAIM_STATUSES = ["접수", "조사중", "처리완료", "기각"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

type StatusColor = { bg: string; text: string };

export const CLAIM_STATUS_COLORS: Record<string, StatusColor> = {
  접수: { bg: "#F3F4F6", text: "#6B7280" },
  조사중: { bg: "#FEF3C7", text: "#B45309" },
  처리완료: { bg: "#D1FAE5", text: "#059669" },
  기각: { bg: "#E5E7EB", text: "#6B7280" },
};

export function getClaimStatusColor(status: string): StatusColor {
  return CLAIM_STATUS_COLORS[status] || { bg: "#F3F4F6", text: "#6B7280" };
}

// 처리완료/기각은 사실상 종결 상태 — resolved_at/resolved_by를 자동으로 채우는 기준
export const CLAIM_TERMINAL_STATUSES: string[] = ["처리완료", "기각"];

export const RESPONSIBLE_PARTIES = ["화주", "차주", "주선사", "불명"] as const;
export type ResponsibleParty = (typeof RESPONSIBLE_PARTIES)[number];

export function getResponsiblePartyLabel(party: string | null | undefined): string {
  return party || "-";
}
