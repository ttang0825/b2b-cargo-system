"use client";

import Pv2DatePicker from "@/components/pv2/Pv2DatePicker";
import { DatePreset, getDateRange } from "@/components/DateRangeFilter";

/**
 * 화주포털 **조회기간** 고르개 — 프리셋 넷 + **직접 지정**(사용자 지시 2026-09-15
 * *"조회기간을 정해서 검색할수 있는 기능을 두자"*).
 *
 * 🔴 **이 부품이 유일한 정의처다.** 견적 확인 · 배차/운송 조회 · 정산/결제 내역
 *    **세 화면**이 같이 쓴다. 화면마다 따로 만들면 「견적은 되는데 정산은 안 되는」
 *    상태가 되고, 프리셋 이름도 서서히 갈린다.
 *
 * 🔴 **네이티브 `<input type="date">` 를 쓰지 말 것**(원칙 57번) — 포털에서는 달력을
 *    브라우저가 그려서 CSS 로 못 바꾼다. `Pv2DatePicker` 를 쓴다.
 *
 * 🔴 **프리셋 계산은 `getDateRange()` 를 그대로 쓴다** — 관리자 화면도 같은 함수를
 *    쓰므로 「이번주」의 뜻이 화면마다 달라지지 않는다. 여기에 다시 적지 말 것.
 */
export type PortalPeriod = {
  preset: DatePreset | "custom";
  /** 직접 지정일 때만 의미가 있다. `YYYY-MM-DD` */
  from: string;
  to: string;
};

export const PORTAL_PERIOD_ALL: PortalPeriod = { preset: "all", from: "", to: "" };

/**
 * 🔴 **기간 칩이 없는 화면에서 쓰는 「이번 달」**(2026-09-23 · 홈 「금액 요약」).
 *    🔴 `{ preset: "month" }` 를 화면마다 적지 말 것 — 「이번 달」의 뜻이 갈린다.
 */
export const PORTAL_PERIOD_MONTH: PortalPeriod = { preset: "month", from: "", to: "" };

const CHIPS: { value: PortalPeriod["preset"]; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번주" },
  { value: "month", label: "이번달" },
  { value: "all", label: "전체" },
  { value: "custom", label: "직접 지정" },
];

/**
 * 그 행이 고른 기간 안에 드는가. `iso` 는 `created_at` 같은 ISO 문자열이다.
 *
 * 🔴 **끝날은 그 날을 포함한다** — 담당자가 「9/1 ~ 9/15」라고 하면 15일에 들어온 건도
 *    포함이라고 읽는다. `to` 를 그대로 비교하면 15일 00:00 이후가 통째로 빠진다.
 * 🔴 **한쪽만 골라도 동작한다** — 시작만 고르면 「그 날부터 지금까지」다.
 */
export function isInPortalPeriod(period: PortalPeriod, iso: string | null | undefined): boolean {
  if (period.preset !== "custom") {
    const { from } = getDateRange(period.preset as DatePreset);
    if (!from) return true;
    return !!iso && iso >= from;
  }
  if (!period.from && !period.to) return true;
  if (!iso) return false;
  const day = iso.slice(0, 10);
  if (period.from && day < period.from) return false;
  if (period.to && day > period.to) return false;
  return true;
}

export default function Pv2PeriodFilter({
  value,
  onChange,
}: {
  value: PortalPeriod;
  onChange: (next: PortalPeriod) => void;
}) {
  return (
    <>
      <div className="pv2-chipgroup">
        {CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`pv2-fchip${value.preset === c.value ? " pv2-fchip-on" : ""}`}
            onClick={() => onChange({ ...value, preset: c.value })}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 🔴 고른 뒤에만 펼친다 — 늘 펼쳐 두면 프리셋만 쓰는 사람에게 칸 두 개가 계속 남는다 */}
      {value.preset === "custom" && (
        <div className="pv2-period-custom">
          <Pv2DatePicker
            value={value.from}
            onChange={(v) => onChange({ ...value, from: v })}
            max={value.to || undefined}
            ariaLabel="조회 시작일"
            wrapClassName="pv2-period-date"
          />
          <span className="pv2-period-tilde">~</span>
          <Pv2DatePicker
            value={value.to}
            onChange={(v) => onChange({ ...value, to: v })}
            min={value.from || undefined}
            ariaLabel="조회 종료일"
            wrapClassName="pv2-period-date"
          />
          {(value.from || value.to) && (
            <button
              type="button"
              className="pv2-period-clear"
              onClick={() => onChange({ ...value, from: "", to: "" })}
            >
              지우기
            </button>
          )}
        </div>
      )}
    </>
  );
}
