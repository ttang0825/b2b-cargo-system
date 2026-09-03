"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { LegalDocBody, type LegalBlock, type LegalSection } from "@/components/LegalDoc";

// 법적 문서를 페이지 이동 없이 그 자리에서 보여주는 모달.
//
// ⚠️ **이건 페이지를 대체하는 게 아니라 추가되는 것이다.**
// `/terms`·`/privacy`·`/email-policy` URL은 그대로 살아 있어야 한다:
//   - URL이 없으면 외부에서 링크할 수 없어 분쟁 시 "어느 시점 약관"을 지목할 수 없음
//   - `robots.ts`에서 Allow로 열어둔 것이 무의미해짐
//   - 다음 세션(동의 절차)의 동의 모달에서 "약관 보기"가 갈 곳이 필요함
//   - 개인정보처리방침은 정보주체가 쉽게 확인할 수 있어야 하는 문서라 직접 경로가 안전
// 그래서 모달 하단에 **"전체 페이지에서 보기" 링크를 반드시 둔다.**
//
// 조문 내용은 `lib/legal/*.ts`, 본문 렌더링은 `LegalDocBody`(페이지와 공유)를 그대로 쓴다.
// **이 파일은 껍데기(모달 동작·접근성)만 담당** — 조문을 고칠 일이 있으면 여기가 아니라
// `lib/legal/` 쪽 데이터 파일을 고칠 것.

// 포커스를 줄 수 있는 요소들(포커스 트랩 계산용)
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function LegalModal({
  open,
  onClose,
  title,
  effectiveLabel,
  href,
  intro,
  sections,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 예: "시행일 2026년 9월 1일" — 값은 lib/legalInfo.ts에서 오며 하드코딩하지 말 것 */
  effectiveLabel: string;
  /** 전체 페이지 경로 (`/terms` 등) */
  href: string;
  intro?: LegalBlock[];
  sections: LegalSection[];
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // 모달을 연 요소(푸터 링크). 닫을 때 여기로 포커스를 돌려줘야 키보드 사용자가 길을 잃지 않음
  const triggerRef = useRef<HTMLElement | null>(null);

  const titleId = `legal-modal-title-${href.replace(/\W/g, "")}`;

  // 열릴 때: 직전 포커스 저장 + 배경 스크롤 잠금 + 모달 안으로 포커스 이동
  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement | null;

    // 배경 스크롤 잠금. 스크롤바가 사라지면서 생기는 가로 밀림을 막기 위해 그 폭만큼 패딩 보정
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;

    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      // 닫힐 때 원래 링크로 포커스 복귀
      triggerRef.current?.focus?.();
    };
  }, [open]);

  // ESC로 닫기 + Tab이 모달 밖으로 빠져나가지 않게 가두기(포커스 트랩)
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
    // 배경(오버레이) 클릭 시 닫힘 — 모달 본체 클릭은 onClick 전파를 막아 닫히지 않게 함
    //
    // 🔴 **`color` 를 여기서 직접 정한다 — 지우지 말 것.**
    // 이 모달은 그 자리(부르는 화면의 DOM) 안에 렌더링되므로 **조상의 글자색을 상속한다.**
    // 랜딩은 이 링크가 **어두운 마감 CTA 띠 안**(`div.landing-cta-links`, 인라인
    // `color: rgba(255,255,255,0.6)`)에 있어서, 상속하면 **흰 배경 위 흰 글씨**가 되어
    // 조문이 통째로 안 보였다(사용자 신고 2026-09-02 「법적 문서가 비어 있다」 —
    // 실측: 모달 DOM 에 약관 6,483자가 들어 있는데 color 가 rgba(255,255,255,0.6) 이었다).
    // `/about`·`/vehicles`·법적 문서 페이지는 조상이 평범한 푸터라 멀쩡했다 — **랜딩에서만**
    // 나던 증상이라 더 늦게 발견됐다.
    // ⚠️ 인라인으로 둔 것은 **어떤 조상 규칙보다 확실하게 이기기 위해서다.** 모달을 어디에
    // 놓든 색이 그 자리에 좌우되면 안 된다. `var(--text)` 라 토큰은 그대로 따라간다.
    //
    // 🔴 **`textAlign: "left"` 도 같은 이유다 — 2026-09-03 에 같은 함정이 한 번 더 났다.**
    // 랜딩 마감 CTA 섹션이 `textAlign: center` 라(64차에 「번호를 가운데로」가 이미 되어 있던
    // 그 줄이다) 모달이 그것까지 물려받아 **조문이 통째로 가운데 정렬**로 읽혔다.
    // 실측 — 랜딩 모달 `center` / `/about` 모달 `start` / `/terms` 페이지 `start`.
    // 🔴 **색과 정렬을 한 벌로 볼 것.** 어두운 배경·가운데 정렬 안에서 모달을 여는 새 화면을
    //    만들 때도 같은 함정이 있다 — 모달은 자기 글자색과 정렬을 스스로 선언해야 한다.
    <div className="legal-modal-overlay" style={{ color: "var(--text)", textAlign: "left" }} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* 제목 영역 — 조문이 길어 스크롤해도 제목과 닫기 버튼은 계속 보여야 함 */}
        <div className="legal-modal-head">
          <div className="legal-modal-head-text">
            <h2 id={titleId} className="legal-modal-title">
              {title}
            </h2>
            {/* 버전 이력이 하나뿐이라 드롭다운 없이 시행일만 표기. 개정이 생기면 그때 확장 */}
            <p className="legal-modal-effective">{effectiveLabel}</p>
          </div>
          <button ref={closeButtonRef} type="button" className="legal-modal-close" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 조문 본문 — 이 영역만 스크롤된다(배경 본문은 위에서 잠갔음) */}
        <div className="legal-modal-body">
          <LegalDocBody intro={intro} sections={sections} />
        </div>

        <div className="legal-modal-foot">
          <Link href={href} className="legal-modal-fullpage" onClick={onClose}>
            전체 페이지에서 보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
