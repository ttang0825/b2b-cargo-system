"use client";

import { useCallback, useEffect, useRef } from "react";
import CompanyNameMark from "@/components/CompanyNameMark";
import ObfuscatedEmail from "@/components/ObfuscatedEmail";
import { COMPANY_BUSINESS_INFO } from "@/lib/companyInfo";
import { COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";

// 전자상거래법 제10조 1항 표시사항을 담는 모달.
//
// 🔴 **왜 모달인가** — 30차 리뷰에 랜딩 푸터에서 호스팅사업자·개인정보 보호책임자
//    두 줄을 뺐고(사용자 확정), 그래서 제10조 1항이 요구하는 **초기화면 표시**가
//    충족되지 않는 상태가 됐다. 되살리는 길 둘 중 **사용자가 「법적 문서 링크 옆에
//    사업자정보」로 확정했다**(2026-09-02). 🔴 **푸터 한 줄로 되돌리지 말 것.**
//
// 🔴 **값을 여기에 적지 말 것** — `lib/companyInfo.ts` 의 `COMPANY_BUSINESS_INFO`
//    (+ `CompanyNameMark`·`ObfuscatedEmail`·`COMPANY_SUPPORT_PHONE`)가 정의처다.
//
// ⚠️ `LegalModal` 과 껍데기가 같지만 **합치지 않았다** — 그쪽은 `lib/legal/` 의
//    조문(장·조·표)을 받아 `LegalDocBody` 로 그리는 전용 렌더러이고, 이쪽은 [라벨,값]
//    목록이다. 억지로 합치면 `LegalModal` 이 두 모드를 갖는 부품이 된다.
// 🔴 **`color` 를 직접 정하는 것은 `LegalModal` 과 같은 이유다** — 이 모달도 어두운
//    마감 CTA 띠 안에 렌더링되므로, 상속하면 흰 배경 위 흰 글씨가 된다(2026-09-02
//    실제로 겪은 사고). 지우지 말 것.

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function BusinessInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;

    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;

    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      triggerRef.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div className="legal-modal-overlay" style={{ color: "var(--text)" }} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="business-info-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="legal-modal-head">
          <div className="legal-modal-head-text">
            <h2 id="business-info-modal-title" className="legal-modal-title">
              사업자정보
            </h2>
            <p className="legal-modal-effective">전자상거래 등에서의 소비자보호에 관한 법률 제10조 제1항</p>
          </div>
          <button ref={closeButtonRef} type="button" className="legal-modal-close" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="legal-modal-body">
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "minmax(120px, max-content) minmax(0, 1fr)", gap: "10px 20px", fontSize: 14.5, lineHeight: 1.7 }}>
            <dt style={{ fontWeight: 700 }}>상호</dt>
            <dd style={{ margin: 0 }}>
              <CompanyNameMark />
            </dd>

            {COMPANY_BUSINESS_INFO.map(([label, value]) => (
              <div key={label} style={{ display: "contents" }}>
                <dt style={{ fontWeight: 700 }}>{label}</dt>
                <dd style={{ margin: 0 }}>{value}</dd>
              </div>
            ))}

            <dt style={{ fontWeight: 700 }}>대표전화</dt>
            <dd style={{ margin: 0 }}>
              <a href={`tel:${COMPANY_SUPPORT_PHONE.replace(/-/g, "")}`} style={{ color: "inherit" }}>
                {COMPANY_SUPPORT_PHONE}
              </a>
            </dd>

            <dt style={{ fontWeight: 700 }}>이메일</dt>
            <dd style={{ margin: 0 }}>
              <ObfuscatedEmail />
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
