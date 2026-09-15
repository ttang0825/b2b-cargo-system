"use client";

import {
  ARRIVAL_FILLER_TIME,
  type DropoffArrivalType,
} from "@/lib/arrivalType";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 06:00 ~ 22:00, 30분 단위 시간 옵션
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${pad(h)}:00`);
  if (h !== 22) TIME_OPTIONS.push(`${pad(h)}:30`);
}

export default function DateTimePicker({
  label,
  value,
  onChange,
  minDateTime,
  minDateTimeLabel,
  defaultTimeMode = "morning",
  nowChip = false,
  nowSelected = false,
  onNowChange,
  arrivalChips = false,
  arrivalValue = null,
  onArrivalChange,
  pickupDate,
}: {
  label: string;
  value: string; // "YYYY-MM-DDTHH:mm" 형식 또는 빈 문자열
  onChange: (v: string) => void;
  minDateTime?: string; // 이 시점 이전은 선택할 수 없게 제한 ("YYYY-MM-DDTHH:mm")
  minDateTimeLabel?: string; // 제한 이유를 알려주는 안내 문구
  /**
   * 날짜만 고르고 시각을 아직 안 골랐을 때 채울 값.
   * 🔴 **기본값 `"morning"`(09:00)을 바꾸지 말 것** — 이 부품을 네 화면이 같이 쓰고,
   *    기본값을 건드리면 안 물어본 화면의 동작이 같이 바뀐다.
   *    `"now"` 는 34차에 견적 화면만 켠 것이다(달력을 열면 오늘·현재 시각 기준).
   * 🔴 **어느 쪽이든 칸을 미리 채우지는 않는다** — 사용자가 날짜를 고른 뒤에만 쓰인다.
   *    미리 채우면 「안 건드렸는데 저장되는」 사고가 난다.
   */
  defaultTimeMode?: "morning" | "now";
  /* ── 아래 칩들은 **opt-in 이다** (36차 PR 2 리뷰 2라운드) ──────────────────────
   *
   * 사용자 지시: *"일정에서 발주요청과 마찬가지로 지금, 당착, 내착 등의 옵션이 있어야 한다."*
   *
   * 🔴 **기본값이 전부 꺼짐이라 이 부품을 쓰는 다른 화면은 한 글자도 안 바뀐다** —
   *    운송오더·화주요청이 같이 쓰는 부품이라 이것이 무회귀의 근거다. 기본값을 켜지 말 것.
   * 🔴 **포털 부품(`components/pv2/Pv2DateTimeField.tsx`)을 관리자로 끌어오지 않았다** —
   *    `.pv2-*` 스코프가 딸려온다(원칙 57번). 같은 **동작**을 관리자 생김새로 옮긴 것이고,
   *    자리 채움 시각만 `lib/arrivalType.ts` 하나를 함께 쓴다.
   */
  /** 「지금」 칩을 보여줄지 — **상차 일시에만 쓴다** */
  nowChip?: boolean;
  nowSelected?: boolean;
  onNowChange?: (v: boolean) => void;
  /** 「당착」·「내착」 칩을 보여줄지 — **하차 일시에만 쓴다** */
  arrivalChips?: boolean;
  arrivalValue?: DropoffArrivalType | null;
  onArrivalChange?: (v: DropoffArrivalType | null) => void;
  /** 당착·내착의 기준이 되는 **상차 날짜** ("YYYY-MM-DD") */
  pickupDate?: string;
}) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""];
  const [minDatePart, minTimePart] = minDateTime ? minDateTime.split("T") : ["", ""];

  // 시각을 아직 안 골랐을 때 쓸 값. `now` 면 **현재 시각에서 가장 가까운 30분 슬롯**
  // (드롭다운이 30분 단위라 그 사이 값은 고를 수 없다). 목록 범위(06:00~22:00) 밖이면
  // 가장 가까운 끝으로 잘라낸다.
  function fallbackTime() {
    if (defaultTimeMode !== "now") return "09:00";
    const d = new Date();
    const slot = d.getMinutes() < 30 ? "00" : "30";
    const t = `${pad(d.getHours())}:${slot}`;
    if (t < TIME_OPTIONS[0]) return TIME_OPTIONS[0];
    if (t > TIME_OPTIONS[TIME_OPTIONS.length - 1]) return TIME_OPTIONS[TIME_OPTIONS.length - 1];
    return t;
  }

  // 🔴 손으로 고르면 칩 선택은 **풀린다** — 안 풀면 「당착」이라 적혀 있는데 저장값은
  //    담당자가 방금 고른 시각인 상태가 된다(포털이 같은 이유로 같게 동작한다).
  function clearChips() {
    onNowChange?.(false);
    onArrivalChange?.(null);
  }
  function applyDate(d: string) {
    clearChips();
    onChange(d ? `${d}T${timePart || fallbackTime()}` : "");
  }
  function applyTime(t: string) {
    clearChips();
    onChange(datePart ? `${datePart}T${t}` : "");
  }
  function quickPick(daysFromToday: number) {
    clearChips();
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    onChange(`${toDateStr(d)}T${timePart || fallbackTime()}`);
  }
  /** 🔴 값은 **누른 그 시각**으로 채우고, 제출 직전에 폼이 다시 지금으로 맞춘다. */
  function pickNow() {
    const d = new Date();
    onNowChange?.(true);
    onArrivalChange?.(null);
    onChange(`${toDateStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }
  /**
   * 🔴 날짜는 **상차일에서 계산한다** — "오늘"을 기준으로 잡으면 상차가 모레인 건의
   *    당착이 오늘이 되어 하한 검증에 걸린다(포털이 겪은 자리다).
   */
  function pickArrival(kind: DropoffArrivalType) {
    if (!pickupDate) return;
    const d = new Date(`${pickupDate}T00:00`);
    d.setDate(d.getDate() + (kind === "next_day" ? 1 : 0));
    onNowChange?.(false);
    onArrivalChange?.(kind);
    onChange(`${toDateStr(d)}T${ARRIVAL_FILLER_TIME}`);
  }

  /** 🔴 칩이 켜져 있으면 날짜·시간 칸을 잠근다 — 「지금」·「당착」은 **시각을 담지 않는
   *  선택지**라, 칸이 열려 있으면 담당자가 그 자리 채움 시각을 진짜 값으로 고쳐 버린다. */
  const locked = nowSelected || arrivalValue !== null;

  const today = toDateStr(new Date());
  const tomorrow = toDateStr(
    new Date(new Date().setDate(new Date().getDate() + 1))
  );
  const isToday = datePart === today;
  const isTomorrow = datePart === tomorrow;

  // 선택한 날짜가 최소 날짜와 같은 날이면, 그 시각 이후 시간만 고를 수 있게 필터링
  const timeOptions =
    minDatePart && datePart === minDatePart
      ? TIME_OPTIONS.filter((t) => t >= minTimePart)
      : TIME_OPTIONS;

  // 칩 생김새는 「오늘」·「내일」과 **같다** — 같은 줄에 서는 같은 종류의 버튼이다
  const chipStyle = {
    padding: "5px 10px",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
  } as const;

  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        {/* 🔴 「지금」·「당착」·「내착」이 「오늘」·「내일」 **앞**이다 — 포털 발주요청과
            같은 순서다(24시콜 오더의 자리 규칙). 순서를 바꾸지 말 것. */}
        {nowChip && (
          <button
            type="button"
            className={nowSelected ? "btn" : "btn-ghost"}
            style={chipStyle}
            onClick={pickNow}
          >
            지금
          </button>
        )}
        {arrivalChips && (
          <>
            {/* 🔴 상차 날짜를 먼저 골라야 누를 수 있다 — 당착·내착은 **상차일 기준**이다 */}
            <button
              type="button"
              className={arrivalValue === "same_day" ? "btn" : "btn-ghost"}
              style={chipStyle}
              onClick={() => pickArrival("same_day")}
              disabled={!pickupDate}
              title={!pickupDate ? "상차 일시를 먼저 고르세요" : undefined}
            >
              당착
            </button>
            <button
              type="button"
              className={arrivalValue === "next_day" ? "btn" : "btn-ghost"}
              style={chipStyle}
              onClick={() => pickArrival("next_day")}
              disabled={!pickupDate}
              title={!pickupDate ? "상차 일시를 먼저 고르세요" : undefined}
            >
              내착
            </button>
          </>
        )}
        <button
          type="button"
          className={isToday && !locked ? "btn" : "btn-ghost"}
          style={chipStyle}
          onClick={() => quickPick(0)}
        >
          오늘
        </button>
        <button
          type="button"
          className={isTomorrow && !locked ? "btn" : "btn-ghost"}
          style={chipStyle}
          onClick={() => quickPick(1)}
        >
          내일
        </button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="date"
          value={datePart}
          min={minDatePart || undefined}
          onChange={(e) => applyDate(e.target.value)}
          disabled={locked}
          style={{ flex: 1 }}
        />
        <select
          value={timePart}
          onChange={(e) => applyTime(e.target.value)}
          disabled={locked}
          style={{ flex: 1 }}
        >
          <option value="">시간 선택</option>
          {timeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {minDateTimeLabel && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>
          {minDateTimeLabel}
        </div>
      )}
    </div>
  );
}
