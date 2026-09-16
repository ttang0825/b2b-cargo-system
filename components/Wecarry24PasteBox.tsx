"use client";

// 24시콜 가져오기 ⓐ — 배차된 차주 정보 붙여넣기 칸 (37차)
//
// 🔴 **붙여넣은 텍스트는 서버에 보내지도 저장하지도 않는다.** 이 컴포넌트가 브라우저에서
//    갈라 아래 입력칸에 넣고 버린다(설계 v4 확정) — 처리방침 변경 0 · 개인정보 보관 0.
//    🔴 **「서버에서 파싱하자」로 바꾸면 그 성질이 통째로 사라진다.**
//
// 🔴 **채우기만 하고 저장하지 않는다.** 저장은 아래 「배차확정」 버튼이 한다 —
//    새 저장 경로를 만들면 그 버튼의 검사(지급조건 확인 등)를 우회하게 된다.
//    그래서 채운 뒤 **「아직 저장되지 않았습니다」**를 그 자리에 적는다(원칙 33번).

import { useState } from "react";
import { parseWecarry24Driver, type W24Driver } from "@/lib/wecarry24Paste";

type Props = {
  /** 부모가 실제로 채운 뒤, 채운 칸 이름을 사람이 읽는 문장으로 돌려준다 */
  onApply: (driver: W24Driver) => string[];
};

export default function Wecarry24PasteBox({ onApply }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[] | null>(null);
  const [notes, setNotes] = useState<string[]>([]);

  function handleApply() {
    setError(null);
    setApplied(null);
    setNotes([]);

    const parsed = parseWecarry24Driver(text);
    if (parsed.kind !== "ok") {
      setError(parsed.reason);
      return;
    }

    const infos: string[] = [];
    // 🔴 어느 것으로도 안 읽힌 토큰은 조용히 버리지 않는다(원칙 55번)
    if (parsed.unknownTokens.length > 0) {
      infos.push(`읽지 못한 값: ${parsed.unknownTokens.join(" · ")}`);
    }

    setApplied(onApply(parsed.driver));
    setNotes(infos);
    // 🔴 붙여넣은 원문은 여기서 버린다 — 화면에 남겨 둘 이유가 없다
    setText("");
  }

  return (
    <div
      style={{
        border: "1px dashed var(--border)",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
        24시콜에서 차주 정보 가져오기
      </div>
      <p
        style={{
          fontSize: 11.5,
          color: "var(--text-muted)",
          marginTop: 0,
          marginBottom: 8,
          lineHeight: 1.6,
        }}
      >
        24시콜에서 배차된 차주의 <strong>이름 · 차량번호 · 연락처</strong>를 붙여넣으면
        아래 칸이 채워집니다. <strong>순서는 상관없습니다.</strong>
        <br />
        붙여넣은 내용은 <strong>이 브라우저 안에서만</strong> 처리되고 서버로 보내거나
        저장하지 않습니다.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder={"홍길동 서울12가3456 010-1234-5678"}
        style={{ width: "100%", fontSize: 13 }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" className="btn" onClick={handleApply} disabled={!text.trim()}>
          차주 정보 채우기
        </button>
        {text.trim() && (
          <button type="button" className="btn btn-ghost" onClick={() => setText("")}>
            지우기
          </button>
        )}
      </div>

      {error && (
        <p
          style={{
            fontSize: 12.5,
            color: "var(--danger, #c0392b)",
            marginTop: 10,
            marginBottom: 0,
            lineHeight: 1.6,
          }}
        >
          {error}
        </p>
      )}

      {notes.map((n, i) => (
        <p
          key={i}
          style={{
            fontSize: 11.5,
            color: "var(--text-muted)",
            marginTop: 8,
            marginBottom: 0,
            lineHeight: 1.6,
          }}
        >
          {n}
        </p>
      ))}

      {applied && (
        <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600 }}>채웠습니다</div>
          <ul style={{ margin: "2px 0 8px", paddingLeft: 18 }}>
            {applied.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
          {/* 🔴 저장은 「배차확정」이 한다 — 채우고 끝난 줄 알면 값이 사라진다 */}
          <div style={{ color: "var(--text-muted)" }}>
            아직 저장되지 않았습니다 — 값을 확인한 뒤{" "}
            <strong style={{ color: "var(--text)" }}>배차확정</strong>을 눌러 주세요.
          </div>
        </div>
      )}
    </div>
  );
}
