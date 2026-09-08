"use client";

import { useEffect, useState } from "react";

/**
 * 설치형 앱(PWA) 설치 안내. 운송관리·내부관리 두 화면이 같이 쓴다.
 *
 * 🔴 **아이폰에는 설치 프롬프트가 없다.** `beforeinstallprompt` 는 크로미움 계열만
 *    쏘는 이벤트라 사파리에서는 영영 오지 않는다. 우회할 방법이 없어서 아이폰에서는
 *    「공유 → 홈 화면에 추가」를 손으로 하도록 안내 화면을 띄운다. 그렇게 추가해도
 *    아이콘 모양과 개별창(주소창 없음)은 안드로이드와 똑같이 나온다.
 *    ⚠️ 「설치 버튼이 아이폰에서 왜 안 뜨나」는 버그가 아니다.
 *
 * 🔴 **버튼이 아무 일도 안 하는 상태를 만들지 말 것.** 이벤트를 못 잡았고 아이폰도
 *    아니면(예: 데스크탑 사파리, 이미 설치됨) **버튼 자체를 그리지 않는다.**
 *
 * 🔴 스타일은 `className` 으로 받는다 — 화주 운송관리는 `.pv2-*`, 내부관리는 전역
 *    클래스를 쓰기 때문이다. 이 컴포넌트 안에 어느 한쪽 클래스를 박지 말 것.
 */

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // 아이폰 사파리는 display-mode 대신 이 값을 쓴다.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // 아이패드는 iPadOS 13부터 데스크탑 사파리로 위장하므로 터치 지원을 같이 본다.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document)
  );
}

export default function InstallAppButton({
  appName,
  className,
  label = "앱으로 설치",
}: {
  /** 안내 문구에 쓰는 이름. 예: "운송관리" */
  appName: string;
  className?: string;
  label?: string;
}) {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true); // 판정 전에는 그리지 않는다
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());

    function onPrompt(e: Event) {
      // 브라우저 기본 배너를 막고 우리 버튼으로 대신 띄운다.
      e.preventDefault();
      setPrompt(e as PromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setPrompt(null);
      setGuideOpen(false);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // 설치된 채로 브라우저에서 열어도 배너가 다시 뜨지 않도록 표시 상태를 따라간다.
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onMode = () => setInstalled(isStandalone());
    mq?.addEventListener?.("change", onMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mq?.removeEventListener?.("change", onMode);
    };
  }, []);

  async function handleClick() {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      // 한 번 쓴 이벤트는 다시 쓸 수 없다 — 거절했으면 버튼을 거둔다.
      setPrompt(null);
      if (choice.outcome === "accepted") setInstalled(true);
      return;
    }
    setGuideOpen(true);
  }

  // 🔴 이미 설치됐거나(개별창), 설치할 방법이 없으면 아무것도 그리지 않는다.
  if (installed) return null;
  if (!prompt && !ios) return null;

  return (
    <>
      <button type="button" className={className} onClick={handleClick}>
        {label}
      </button>

      {guideOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${appName} 앱 설치 방법`}
          onClick={() => setGuideOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200, display: "flex",
            alignItems: "center", justifyContent: "center", padding: 20,
            background: "rgba(0,0,0,0.45)",
            // 🔴 모달은 자기 글자색과 정렬을 스스로 선언한다 — 어두운 배경이나 가운데
            //    정렬 안에서 열리면 상속으로 글자가 안 보이거나 가운데로 밀린다(65차·66차).
            color: "#191f28", textAlign: "left",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 16, padding: "28px 24px 22px",
              maxWidth: 360, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
          >
            <h2 style={{ margin: "0 0 6px", fontSize: 17.5, letterSpacing: "-0.01em" }}>
              {appName} 앱으로 설치하기
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: 14, lineHeight: 1.7, color: "#5f6b78" }}>
              아이폰·아이패드는 사파리에서 직접 추가합니다. 추가하면 주소창 없는 개별
              창으로 열립니다.
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14.5, lineHeight: 1.95 }}>
              <li>
                아래쪽 <strong>공유</strong> 단추(
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"
                  style={{ verticalAlign: "-2px" }}>
                  <path d="M12 3v12M12 3 8 7M12 3l4 4" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 11H5v9h14v-9h-1" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                )를 누릅니다.
              </li>
              <li>
                목록을 내려 <strong>홈 화면에 추가</strong>를 누릅니다.
              </li>
              <li>
                오른쪽 위 <strong>추가</strong>를 누르면 끝입니다.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              style={{
                marginTop: 22, width: "100%", font: "inherit", fontSize: 15, fontWeight: 600,
                cursor: "pointer", background: "#191f28", color: "#fff",
                border: "none", borderRadius: 10, padding: "12px 0",
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
