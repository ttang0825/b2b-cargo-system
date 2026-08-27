"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 화주포털 v2 전용 — 이름 하나를 받는 가운데 팝업.
 *
 * 🔴 **`window.prompt` 로 되돌리지 말 것**(PR #103 리뷰 2·9번). 브라우저 기본 prompt 는
 *    화면 **최상단**에 시스템 대화상자로 떠서 시안 톤과 전혀 맞지 않고, 폼 아래쪽에서
 *    버튼을 누른 화주는 그 대화상자가 어디서 왔는지 알기 어렵다.
 *
 * 🔴 **삭제 확인 모달과 같은 클래스(`.pv2-modal-*`)를 쓴다** — 포털 안의 팝업이 두 가지
 *    모양으로 갈리지 않게 하려는 것이다. 새 클래스를 만들지 말 것.
 */
export default function Pv2PromptModal({
  title,
  desc,
  defaultValue = "",
  placeholder,
  confirmLabel = "저장",
  onConfirm,
  onCancel,
}: {
  title: string;
  desc?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // ESC 로도 닫힌다(31차 법적 문서 모달과 같은 동작)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function submit() {
    if (!value.trim()) return;
    onConfirm(value.trim());
  }

  return (
    <div
      className="pv2-modal-dim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pv2-prompt-title"
      onClick={onCancel}
    >
      <div className="pv2-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pv2-modal-title" id="pv2-prompt-title">
          {title}
        </div>
        {desc && <div className="pv2-modal-desc">{desc}</div>}
        <input
          ref={inputRef}
          className="pv2-input pv2-modal-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label={title}
          onKeyDown={(e) => {
            // 🔴 이 입력은 폼 밖(포털 창)에 떠 있지만, 발주 폼 안에서 열리기도 한다 —
            //    Enter 가 발주 폼 제출로 새어 나가지 않도록 여기서 멈춘다(원칙 34번).
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              submit();
            }
          }}
        />
        <div className="pv2-modal-actions">
          <button type="button" className="pv2-modal-cancel" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className="pv2-modal-confirm pv2-modal-confirm-dark"
            onClick={submit}
            disabled={!value.trim()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
