"use client";

// 견적서 등 인쇄물 — **관리자 화면 안 모달**로 띄운다 (34차, 지적 3번
// "견적서 출력이 화면을 떠나면 돌아왔을 때 하던 일이 끊긴다").
//
// 🔴 **내용을 여기서 그리지 않는다.** 기존 인쇄 라우트를 `iframe` 으로 띄운다 —
//    견적서 내용은 그 한 곳에만 있어야 한다. 모달용으로 새로 그리면 두 벌이 되어
//    **조용히 갈린다**(31차 「견적서 print 2종은 항상 쌍으로 움직인다」가 깨지는 지점).
// 🔴 **기존 인쇄 라우트를 지우지 말 것** — 다른 진입로가 있을 수 있고, 프레임 인쇄가
//    막히는 브라우저를 위한 「새 탭으로 열기」가 그 라우트를 그대로 쓴다.
//
// ⚠️ **`iframe.contentWindow.print()` 는 같은 출처라서 된다.** 부모에서
//    `window.print()` 를 부르면 **관리자 화면 전체**가 인쇄된다 — 반드시 프레임에 대고 부를 것.
//
// 🔴 **화주포털의 `Pv2PrintModal` 과 같은 일을 하는 쌍둥이다** — 합치지 말 것.
//    그쪽은 `.pv2-*` 클래스를 쓰는데 그 CSS 는 `.portal-v2` 스코프 전용이라 관리자로
//    가져오면 관리자 화면 31개가 공유하는 CSS 에 딸려온다(34차 §5-2). 그래서 이쪽은
//    인라인 스타일로 따로 그린다. **동작(embed=1 · 프레임 인쇄 · 새 탭 · Esc)은 같게 둔다.**

import { useEffect, useRef, useState } from "react";

type Props = {
  /** 인쇄 라우트 경로. `?embed=1` 은 이 컴포넌트가 붙인다 */
  src: string;
  title?: string;
  onClose: () => void;
};

export default function PrintModal({ src, title = "견적서", onClose }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  // Esc 로 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const url = src + (src.includes("?") ? "&" : "?") + "embed=1";

  function handlePrint() {
    const w = frameRef.current?.contentWindow;
    if (!w) return;
    w.focus();
    w.print();
  }

  return (
    <div className="print-modal-dim" role="presentation" onClick={onClose}>
      <div
        className="print-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="print-modal-bar">
          <strong style={{ fontSize: 13.5 }}>{title}</strong>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" style={{ fontSize: 12.5, padding: "6px 12px" }} onClick={handlePrint}>
            인쇄 / PDF로 저장
          </button>
          {/* 🔴 새 탭 경로를 남겨둔다 — 프레임 인쇄가 막히는 브라우저가 있다 */}
          <a
            className="btn btn-ghost"
            style={{ fontSize: 12.5, padding: "6px 12px", textDecoration: "none" }}
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            새 탭으로 열기
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{ border: "none", background: "transparent", fontSize: 17, cursor: "pointer", padding: "2px 6px", color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>
        <div className="print-modal-body">
          {loading && (
            <div style={{ padding: 24, fontSize: 13, color: "var(--text-muted)" }}>견적서를 불러오는 중...</div>
          )}
          <iframe ref={frameRef} src={url} title={title} className="print-modal-frame" onLoad={() => setLoading(false)} />
        </div>
      </div>
    </div>
  );
}
