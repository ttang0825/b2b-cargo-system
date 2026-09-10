"use client";

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

  function applyDate(d: string) {
    onChange(d ? `${d}T${timePart || fallbackTime()}` : "");
  }
  function applyTime(t: string) {
    onChange(datePart ? `${datePart}T${t}` : "");
  }
  function quickPick(daysFromToday: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    onChange(`${toDateStr(d)}T${timePart || fallbackTime()}`);
  }

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

  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button
          type="button"
          className={isToday ? "btn" : "btn-ghost"}
          style={{
            padding: "5px 10px",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
          }}
          onClick={() => quickPick(0)}
        >
          오늘
        </button>
        <button
          type="button"
          className={isTomorrow ? "btn" : "btn-ghost"}
          style={{
            padding: "5px 10px",
            borderRadius: 6,
            fontSize: 12,
            cursor: "pointer",
          }}
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
          style={{ flex: 1 }}
        />
        <select
          value={timePart}
          onChange={(e) => applyTime(e.target.value)}
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
