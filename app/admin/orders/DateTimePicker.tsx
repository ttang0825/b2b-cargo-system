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
}: {
  label: string;
  value: string; // "YYYY-MM-DDTHH:mm" 형식 또는 빈 문자열
  onChange: (v: string) => void;
}) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""];

  function applyDate(d: string) {
    onChange(d ? `${d}T${timePart || "09:00"}` : "");
  }
  function applyTime(t: string) {
    onChange(datePart ? `${datePart}T${t}` : "");
  }
  function quickPick(daysFromToday: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    onChange(`${toDateStr(d)}T${timePart || "09:00"}`);
  }

  const today = toDateStr(new Date());
  const tomorrow = toDateStr(
    new Date(new Date().setDate(new Date().getDate() + 1))
  );
  const isToday = datePart === today;
  const isTomorrow = datePart === tomorrow;

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
          onChange={(e) => applyDate(e.target.value)}
          style={{ flex: 1 }}
        />
        <select
          value={timePart}
          onChange={(e) => applyTime(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">시간 선택</option>
          {TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
