"use client";

// 견적서 PDF — 포털 안 모달로 띄운다 (27차 리뷰 3라운드).
//
// 🔴 **새 탭으로 열지 않는다.** 25차까지 「PDF」는 `window.open(..., "_blank")` 이라
//    화주가 포털을 벗어났다가 탭을 닫고 돌아와야 했다. 모달 안 `iframe` 으로 같은
//    print 라우트를 띄우고, 인쇄는 그 프레임에 대고 부른다.
//
// 🔴 **print 라우트를 복제하지 말 것** — 견적서 내용은 그 한 곳에만 있어야 한다
//    (31차 "쌍으로 움직인다"가 깨지는 지점이다). 여기는 껍데기만 담는다.
//
// ⚠️ **`iframe.contentWindow.print()` 는 같은 출처라서 된다.** 부모에서 `window.print()`
//    를 부르면 포털 화면 전체가 인쇄된다 — 반드시 프레임에 대고 부를 것.

import { useEffect, useRef, useState } from "react";

type Props = {
  /** print 라우트 경로. `?embed=1` 은 이 컴포넌트가 붙인다 */
  src: string;
  title?: string;
  onClose: () => void;
};

export default function Pv2PrintModal({ src, title = "견적서", onClose }: Props) {
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
    <div className="pv2-modal-dim" role="presentation" onClick={onClose}>
      <div
        className="pv2-printmodal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pv2-printmodal-bar">
          <span className="pv2-printmodal-title">{title}</span>
          <span className="pv2-printmodal-sp" />
          <button type="button" className="pv2-qbtn pv2-qbtn-dark" onClick={handlePrint}>
            인쇄 / PDF로 저장
          </button>
          {/* 🔴 새 탭 경로를 남겨둔다 — 프레임 인쇄가 막히는 브라우저가 있다 */}
          <a className="pv2-qbtn" href={url} target="_blank" rel="noreferrer">
            새 탭으로 열기
          </a>
          <button type="button" className="pv2-printmodal-x" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="pv2-printmodal-body">
          {loading && <div className="pv2-printmodal-loading">견적서를 불러오는 중...</div>}
          <iframe
            ref={frameRef}
            src={url}
            title={title}
            className="pv2-printmodal-frame"
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}
