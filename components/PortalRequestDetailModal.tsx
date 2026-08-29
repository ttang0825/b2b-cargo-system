"use client";

import { useEffect } from "react";

/**
 * 화주 발주 요청 상세 — 목록 + 상세 모달(원칙 18번).
 *
 * 🔴 **왜 만들었나.** 목록이 9개 열뿐이라 **담당자가 품목도 모르는 채 승인/반려를
 *    판단하고 있었다**(28차 §2-1). 화주가 입력한 값 중 상하차조건·물품특성·운송시간·
 *    왕복편도·대기시간·경유지 수·상하차지 담당자 6필드는 **조회조차 하지 않았고**,
 *    품목은 조회는 하면서 그리지 않았다. 되물으면 화주포털을 만든 이유가 무너진다.
 *
 * 🔴 **목록 표에 열을 더하지 말 것** — 이미 `minWidth: 1030` 이라 무너진다. 그래서
 *    행 펼치기가 아니라 **모달**이다(27차 견적 카드의 아코디언은 화주포털 것이고,
 *    관리자 화면끼리 패턴이 갈리면 안 된다).
 *
 * 🔴 **담당자 연락처는 이 모달 안에만 둔다.** 47차가 제3자 제공 동의까지 받은 값이고
 *    화주가 그 동의를 한 이유가 정확히 「담당자가 상·하차지에 연락하기 위해서」다.
 *    다만 **클릭해야 보이는 것과 늘 보이는 것은 다르다** — 목록에 상시 노출하지 말 것.
 *    ⚠️ 별도 접근 로그는 만들지 않는다 — `support_access_logs` 는 화주 계정 대리접속용이고
 *    이 화면은 직원 전용이라 성격이 다르다.
 *
 * 🔴 **값이 비면 그 줄을 아예 그리지 않는다**(27차 ⑦ 입금 계좌와 같은 규칙) — 빈 줄만
 *    남으면 규격이 무너진다. ⚠️ 운영 DB 의 옛 요청은 27차 3컬럼이 전부 NULL 이라
 *    **빈 값 경로가 정상 동작이다.**
 */

function Row({ label, value }: { label: string; value: string | null }) {
  // 🔴 값이 없으면 줄 자체를 그리지 않는다.
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13 }}>
      <div style={{ width: 92, flexShrink: 0, color: "var(--text-muted)" }}>{label}</div>
      <div style={{ flex: 1, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: "var(--text-muted)",
        margin: "16px 0 4px",
      }}
    >
      {children}
    </div>
  );
}

/** 빈 문자열·공백만 있는 값은 없는 것으로 본다. */
function text(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** 숫자 0 은 「없음」이 아니라 「0」이므로 그대로 그린다(대기시간·경유지 수). */
function numText(v: unknown, unit: string): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return `${n}${unit}`;
}

export default function PortalRequestDetailModal({
  request,
  onClose,
}: {
  request: any;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const r = request;

  const transport: Array<[string, string | null]> = [
    ["품목", text(r.item)],
    ["상차조건", text(r.load_condition)],
    ["하차조건", text(r.unload_condition)],
    ["물품특성", text(r.item_condition)],
    ["운송시간", text(r.transport_time)],
    ["왕복/편도", text(r.trip_type)],
    ["대기시간", numText(r.waiting_minutes, "분")],
    ["경유지 수", numText(r.waypoint_count, "곳")],
  ];

  const pickup: Array<[string, string | null]> = [
    ["현장 상호", text(r.origin_company_name)],
    ["담당자", text(r.origin_contact_name)],
    ["연락처", text(r.origin_contact_phone)],
  ];
  const dropoff: Array<[string, string | null]> = [
    ["현장 상호", text(r.destination_company_name)],
    ["담당자", text(r.destination_contact_name)],
    ["연락처", text(r.destination_contact_phone)],
  ];

  const hasTransport = transport.some(([, v]) => v);
  const hasPickup = pickup.some(([, v]) => v);
  const hasDropoff = dropoff.some(([, v]) => v);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 100,
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 24, maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>발주 요청 상세</div>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
              {r.companies?.name || "화주 미상"}
            </div>
          </div>
          <button
            className="btn-ghost"
            style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <SectionTitle>운송 구간</SectionTitle>
        <Row label="출발지" value={text(r.origin)} />
        <Row label="도착지" value={text(r.destination)} />

        {hasTransport && (
          <>
            <SectionTitle>운송 정보</SectionTitle>
            {transport.map(([label, value]) => (
              <Row key={label} label={label} value={value} />
            ))}
          </>
        )}

        {hasPickup && (
          <>
            <SectionTitle>상차지 담당자</SectionTitle>
            {pickup.map(([label, value]) => (
              <Row key={label} label={label} value={value} />
            ))}
          </>
        )}

        {hasDropoff && (
          <>
            <SectionTitle>하차지 담당자</SectionTitle>
            {dropoff.map(([label, value]) => (
              <Row key={label} label={label} value={value} />
            ))}
          </>
        )}

        {text(r.notes) && (
          <>
            <SectionTitle>특이사항</SectionTitle>
            <div style={{ fontSize: 13, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {r.notes}
            </div>
          </>
        )}

        {!hasTransport && !hasPickup && !hasDropoff && !text(r.notes) && (
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 16 }}>
            화주가 추가로 입력한 정보가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
