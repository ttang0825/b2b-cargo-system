"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentStaffRole } from "@/lib/currentStaff";
import {
  CALL_SCRIPT_MAX_LINES,
  CALL_SCRIPT_MAX_LINE_LENGTH,
  EMPTY_CALL_SCRIPT,
  normalizeCallScriptLines,
  type CallScript,
} from "@/lib/callScript";

// ─────────────────────────────────────────────────────────────────────────────
// 견적관리 「전화응대 매뉴얼」 (2026-09-18)
//
// 사용자 요청: *"견적관리에서 전화응대 메뉴얼 창이 있으면 좋겠다. 자동계산결과 창아래
// 따로 창이 있어서 마찬가지로 스크롤 따라 가게(모바일버전은 생략). 이 창은 수시로
// 편집할수 있으면 좋겠다. … 줄칸을 늘릴수 있고 줄일수 있게 설정. 줄칸 앞에 넘버링만
// 있으면 된다"*
//
// 🔴 **스크롤을 따라다니는 것은 이 컴포넌트가 아니다.** 계산 패널과 이 패널을 함께
//    감싼 `.quote-side`(견적관리 화면)가 `position: sticky` 다 — 둘을 각각 sticky 로
//    두면 서로 겹친다. 여기에 `position` 을 주지 말 것.
// 🔴 **모바일에는 안 나온다**(사용자 지시) — CSS `.call-script-panel` 이 ≤700px 에서
//    `display: none` 이다. 화면 폭을 JS 로 재서 가르지 말 것(첫 그림이 깜빡인다).
//
// 🔴 **편집은 관리자만**(사용자 확정 2026-09-18). 여기서 버튼을 감추는 것과
//    `/api/admin/call-script` 의 `role === "admin"` 검사는 **한 벌**이다(원칙 25번) —
//    화면만 감추면 브라우저 콘솔에서 그대로 부를 수 있다.
// 🔴 **넘버링을 글에 적지 않는다** — 번호는 배열 순서에서 나온다(`i + 1`).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 매뉴얼을 읽는다 — **로그인한 직원 세션으로 직접** 읽는다(RLS `staff_read_call_script`).
 *
 * 🔴 **저장 API 로 읽지 않는다** — 서비스롤 GET 라우트는 `force-dynamic` 과
 *    `createServiceClient()` 가 **둘 다** 필요하고(원칙 21번), 그냥 읽기만 하는 값이라
 *    서버를 거칠 이유가 없다.
 * 🔴 **`error` 를 삼키지 않는다**(원칙 55번) — 조회가 실패했을 때 빈 목록으로 두면
 *    화면이 「아직 아무것도 안 적혀 있다」로 보여서, 실제로는 권한·정책 문제인데
 *    원인을 짚을 단서가 하나도 안 남는다.
 * ⚠️ 행이 없을 수도 있다(마이그레이션 전). 그때는 빈 매뉴얼이 맞다.
 * 🔴 이 함수를 `lib/callScript.ts` 로 옮기지 말 것 — 그 파일은 저장 API 도 가져다
 *    쓰는데, `lib/supabaseClient.ts` 가 딸려 가면 서버 빌드가 통째로 멈춘다.
 */
async function fetchCallScript(): Promise<CallScript> {
  const { data, error } = await supabase
    .from("call_script")
    .select("lines,updated_at")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return EMPTY_CALL_SCRIPT;

  return {
    lines: normalizeCallScriptLines(data.lines),
    updatedAt: (data.updated_at as string) ?? null,
  };
}

export default function CallScriptPanel() {
  const [lines, setLines] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * 🔴 **불러오기 실패와 저장 실패를 가른다**(원칙 33번) — 하나로 두면 저장에
   *    실패했을 때 이미 불러온 본문이 오류 문구로 통째로 덮인다. 이 저장소에서
   *    같은 버그를 네 번 겪었다(PR #153 · #154 · #167).
   */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  /** 편집 중 「+ 줄 추가」·Enter 로 만든 줄에 바로 커서를 둔다. */
  const focusIndexRef = useRef<number | null>(null);
  const inputsRef = useRef<(HTMLTextAreaElement | null)[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const script = await fetchCallScript();
      setLines(script.lines);
      setUpdatedAt(script.updatedAt);
    } catch (e) {
      // 🔴 빈 목록으로 두지 않는다(원칙 55번) — 「아직 안 적혀 있다」로 읽힌다.
      setLoadError(e instanceof Error ? e.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getCurrentStaffRole().then((role) => setIsAdmin(role === "admin"));
  }, [load]);

  // 새로 만든 줄로 커서를 옮긴다 — 렌더가 끝난 뒤라야 그 칸이 존재한다.
  useEffect(() => {
    const i = focusIndexRef.current;
    if (i === null) return;
    focusIndexRef.current = null;
    inputsRef.current[i]?.focus();
  }, [draft]);

  function startEdit() {
    // 🔴 편집은 **사본**으로 한다 — 취소하면 원래 내용이 그대로 남아야 한다.
    //    줄이 하나도 없으면 빈 줄 하나로 시작한다(칸이 없으면 적을 데가 없다).
    setDraft(lines.length > 0 ? [...lines] : [""]);
    setSaveError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft([]);
    setSaveError(null);
  }

  function setLine(i: number, value: string) {
    setDraft((prev) => prev.map((v, j) => (j === i ? value : v)));
  }

  function addLine(at: number) {
    if (draft.length >= CALL_SCRIPT_MAX_LINES) {
      setSaveError(`줄은 최대 ${CALL_SCRIPT_MAX_LINES}개까지입니다.`);
      return;
    }
    setSaveError(null);
    focusIndexRef.current = at;
    setDraft((prev) => [...prev.slice(0, at), "", ...prev.slice(at)]);
  }

  function removeLine(i: number) {
    // 마지막 한 줄은 지우는 대신 비운다 — 칸이 0개가 되면 다시 적을 자리가 없다.
    setDraft((prev) => (prev.length <= 1 ? [""] : prev.filter((_, j) => j !== i)));
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/call-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 🔴 `updatedAt` 을 같이 보낸다 — 그 사이 다른 관리자가 저장했으면 서버가
        //    409 로 거절한다(원칙 28번과 같은 결). 빼면 앞사람 글이 조용히 사라진다.
        body: JSON.stringify({ lines: draft, updatedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error || "저장에 실패했습니다.");
        return;
      }
      setLines(normalizeCallScriptLines(data.lines));
      setUpdatedAt(data.updatedAt ?? null);
      setEditing(false);
      setDraft([]);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  /** 글자 수에 맞춰 칸 높이를 늘린다 — 긴 문장이 한 줄에 잘려 안 보이면 못 고친다. */
  function grow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  return (
    <div className="card call-script-panel">
      <div className="call-script-head">
        <h3>전화응대 매뉴얼</h3>
        {/* 🔴 `staff` 에게는 버튼 자체를 안 그린다 — 눌러도 서버가 403 이라 누를 수
            있게 두면 「왜 저장이 안 되지」가 된다. */}
        {isAdmin && !editing && !loading && (
          <button type="button" className="call-script-edit" onClick={startEdit}>
            편집
          </button>
        )}
      </div>

      {loading ? (
        <p className="call-script-empty">불러오는 중...</p>
      ) : loadError ? (
        <div className="error-box" style={{ margin: 0 }}>
          전화응대 매뉴얼을 불러오지 못했습니다: {loadError}
        </div>
      ) : editing ? (
        <>
          <ol className="call-script-list call-script-list-edit">
            {draft.map((line, i) => (
              <li key={i}>
                <textarea
                  ref={(el) => {
                    inputsRef.current[i] = el;
                    grow(el);
                  }}
                  rows={1}
                  value={line}
                  maxLength={CALL_SCRIPT_MAX_LINE_LENGTH}
                  placeholder="응대 문구를 적어주세요"
                  onChange={(e) => {
                    setLine(i, e.target.value);
                    grow(e.target);
                  }}
                  onKeyDown={(e) => {
                    // 🔴 Enter 는 줄바꿈이 아니라 **아래에 새 줄**이다 — 한 칸이 한
                    //    줄이라 안에서 줄바꿈이 생기면 번호와 내용이 어긋나 보인다.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLine(i + 1);
                    }
                  }}
                />
                <button
                  type="button"
                  className="call-script-del"
                  onClick={() => removeLine(i)}
                  aria-label={`${i + 1}번 줄 삭제`}
                  title="이 줄 삭제"
                >
                  ×
                </button>
              </li>
            ))}
          </ol>

          <button
            type="button"
            className="call-script-add"
            onClick={() => addLine(draft.length)}
          >
            + 줄 추가
          </button>

          {saveError && (
            <div className="error-box" style={{ margin: "10px 0 0" }}>
              {saveError}
            </div>
          )}

          {/* 🔴 저장·취소는 **줄 목록 바로 아래**다(원칙 33번의 결) — 패널 맨 위에만
              두면 줄이 많을 때 버튼이 한참 위로 올라가 「눌렀는데 아무 일도 없다」가 된다. */}
          <div className="call-script-actions">
            <button type="button" className="btn" onClick={save} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={cancelEdit}
              disabled={saving}
            >
              취소
            </button>
          </div>
        </>
      ) : lines.length === 0 ? (
        <p className="call-script-empty">
          {isAdmin
            ? "아직 적힌 내용이 없습니다. 「편집」을 눌러 응대 문구를 적어주세요."
            : "아직 적힌 내용이 없습니다."}
        </p>
      ) : (
        <ol className="call-script-list">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
