"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  CHANGE_EMPTY_LABEL,
  fetchRecordChangeLogs,
  formatChangeLogAt,
  type RecordChangeLogRow,
  type RecordChangeTarget,
} from "@/lib/recordChangeLog";

/**
 * 견적·운송오더 상세의 **수정 이력** 패널 (2026-09-17).
 *
 * 사용자 지시: *「견적상세와 운송오더 상세에는 견적과 운송오더가 수정된 이력이 어딘가
 * 남아 있으면 좋겠다」*
 *
 * 🔴 **기본은 접힘이다.** 상세 화면은 이미 길고(견적 상세는 폼이 열리면 2,000px 를
 *    넘는다 — PR #167 이 그것을 접었다), 이력은 **되짚을 때만** 보는 것이다.
 *    🔴 **펼쳤을 때 처음 조회한다** — 상세를 열 때마다 읽으면 안 볼 사람도 한 번 더 읽는다.
 *
 * 🔴 **`<details>` 를 쓰지 않는다** — 저장 직후 이 패널을 **다시 읽어야** 하는데
 *    (`refreshKey`), 그때 열림 상태를 코드가 알고 있어야 한다. PR #167 이 견적 폼에서
 *    같은 이유로 state 로 갔다.
 *
 * 🔴 **조회 실패를 「이력이 없습니다」로 보여주지 말 것**(원칙 55번) — 이력이 안 쌓인
 *    것인지 못 읽는 것인지 구분할 단서가 사라진다.
 *
 * ⚠️ **관리자 전용이다** — 화주포털에서 이 컴포넌트를 쓰지 말 것. `activity_logs` 의
 *    정책이 `is_active_staff()` 라 화주 세션에서는 어차피 빈 결과가 돌아온다.
 */
export default function RecordChangeLogPanel({
  target,
  recordId,
  refreshKey = 0,
}: {
  target: RecordChangeTarget;
  recordId: string;
  /** 저장이 끝나면 이 값을 올려 준다 — 펼쳐 둔 채로 저장했을 때 방금 남은 줄이 바로 보인다. */
  refreshKey?: number;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RecordChangeLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !recordId) return;
    let alive = true;
    setLoading(true);
    fetchRecordChangeLogs(supabase, target, recordId).then((res) => {
      if (!alive) return;
      setError(res.error);
      setRows(res.rows);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [open, target, recordId, refreshKey]);

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          font: "inherit",
          color: "inherit",
          textAlign: "left",
        }}
        aria-expanded={open}
      >
        {/* 🔴 손잡이는 SVG 다 — `▸` 는 이 서체에 글리프가 없어 6px 네모로 그려진다
            (PR #167 이 견적 폼에서 실제로 겪었다). 글자로 되돌리지 말 것. */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          style={{
            flex: "none",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 120ms",
          }}
        >
          <path d="M4 2.5 L8.5 6 L4 9.5 Z" fill="currentColor" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 700 }}>수정 이력</span>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
          {open ? "" : "펼쳐서 보기"}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          {loading && (
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>불러오는 중…</div>
          )}
          {/* 🔴 실패를 「이력 없음」으로 감추지 않는다 */}
          {!loading && error && (
            <div style={{ fontSize: 12.5, color: "#b4423a" }}>
              수정 이력을 불러오지 못했습니다: {error}
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              아직 수정된 적이 없습니다.
              {/* ⚠️ 2026-09-17 이전 수정은 기록이 없다 — 지어내지 않았다(백필 금지) */}
              <div style={{ marginTop: 4, fontSize: 11.5 }}>
                (2026-09-17 이전에 수정된 내용은 기록이 남아 있지 않습니다)
              </div>
            </div>
          )}
          {!loading && !error && rows.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {rows.map((r) => (
                <li
                  key={r.id}
                  style={{
                    borderLeft: "2px solid var(--border)",
                    paddingLeft: 12,
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4 }}>
                    <span className="num">{formatChangeLogAt(r.created_at)}</span>
                    {" · "}
                    {r.by || "알 수 없음"}
                  </div>
                  <div style={{ display: "grid", gap: 3 }}>
                    {r.changes.map((c, i) => (
                      <div key={`${r.id}-${i}`} style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 600 }}>{c.label}</span>{" "}
                        <span style={{ color: "var(--text-muted)" }}>
                          {c.before ?? CHANGE_EMPTY_LABEL}
                        </span>{" "}
                        <span style={{ color: "var(--text-muted)" }}>→</span>{" "}
                        <span>{c.after ?? CHANGE_EMPTY_LABEL}</span>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
