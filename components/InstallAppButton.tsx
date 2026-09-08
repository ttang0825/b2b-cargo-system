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
 * 🔴 **버튼이 아무 일도 안 하는 상태를 만들지 말 것.** 다만 「아무 일도 안 함」과
 *    「설치할 길을 알려줌」은 다르다. 세 갈래로 갈린다:
 *      설치 신호를 잡았다        → 눌러서 바로 설치
 *      아이폰                    → 「공유 → 홈 화면에 추가」 안내
 *      크로미움인데 신호가 없다   → **주소창 설치 아이콘·메뉴 위치 안내**
 *    마지막 갈래가 없으면 **설치했다 지운 사람이 다시 설치할 길을 잃는다** — 크롬은
 *    지운 뒤 한동안 신호를 다시 쏘지 않는데, 그때도 주소창으로는 설치가 된다
 *    (PR #127 실사용에서 실제로 막혔던 자리다). 셋 다 아니면 그리지 않는다.
 *
 * 🔴 **설치 신호는 `window.__wcInstall` 에서 읽는다** — 리액트가 붙기 전에 지나가는
 *    신호라 `lib/installPromptCapture.ts` 의 인라인 스크립트가 먼저 잡아둔다.
 *    여기서 `beforeinstallprompt` 를 직접 듣기만 하면 **놓치는 날이 생긴다.**
 *
 * 🔴 스타일은 `className` 으로 받는다 — 화주 운송관리는 `.pv2-*`, 내부관리는 전역
 *    클래스를 쓰기 때문이다. 이 컴포넌트 안에 어느 한쪽 클래스를 박지 말 것.
 */

type InstallStore = { evt: Event | null; installed: boolean };

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

/** 크로미움 계열만 이 속성을 노출한다 — 사파리·파이어폭스는 설치 자체가 없다. */
function supportsInstallPrompt() {
  return typeof window !== "undefined" && "onbeforeinstallprompt" in window;
}

function isAndroid() {
  return typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);
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
  const [android, setAndroid] = useState(false);
  const [canGuide, setCanGuide] = useState(false);
  const [installed, setInstalled] = useState(true); // 판정 전에는 그리지 않는다
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    setIos(isIos());
    setAndroid(isAndroid());
    setCanGuide(supportsInstallPrompt());

    // 🔴 리액트가 붙기 전에 지나간 신호를 여기서 가져온다(위 주석 참고).
    const store = (window as unknown as { __wcInstall?: InstallStore }).__wcInstall;
    const sync = () => {
      setInstalled(isStandalone() || store?.installed === true);
      setPrompt((store?.evt as PromptEvent | null) ?? null);
    };
    sync();
    window.addEventListener("wc-install-change", sync);

    // 인라인 스크립트가 막힌 경우를 대비한 예비 경로(있으면 중복이지만 무해하다).
    function onPrompt(e: Event) {
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
      window.removeEventListener("wc-install-change", sync);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mq?.removeEventListener?.("change", onMode);
    };
  }, []);

  async function handleClick() {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      // 한 번 쓴 이벤트는 다시 쓸 수 없다. 거절했으면 버튼은 남기되(크로미움이면
      // 주소창으로 설치할 수 있다) 다음 클릭은 안내로 간다.
      const store = (window as unknown as { __wcInstall?: InstallStore }).__wcInstall;
      if (store) store.evt = null;
      setPrompt(null);
      if (choice.outcome === "accepted") setInstalled(true);
      return;
    }
    setGuideOpen(true);
  }

  // 🔴 이미 설치됐거나(개별창), 설치할 방법이 아예 없으면 아무것도 그리지 않는다.
  if (installed) return null;
  if (!prompt && !ios && !canGuide) return null;

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
              {ios
                ? "아이폰·아이패드는 사파리에서 직접 추가합니다. 추가하면 주소창 없는 개별 창으로 열립니다."
                : "한 번 설치했다 지운 뒤에는 브라우저가 설치 안내를 다시 띄우지 않기도 합니다. 그럴 때는 아래 방법으로 설치하시면 됩니다."}
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14.5, lineHeight: 1.95 }}>
              {ios ? (
                <>
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
                </>
              ) : android ? (
                <>
                  <li>
                    오른쪽 위 <strong>⋮</strong> 를 누릅니다.
                  </li>
                  <li>
                    <strong>앱 설치</strong>(또는 <strong>홈 화면에 추가</strong>)를 누릅니다.
                  </li>
                  <li>
                    <strong>설치</strong>를 누르면 끝입니다.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    주소창 오른쪽 끝의 <strong>설치 아이콘</strong>(
                    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"
                      style={{ verticalAlign: "-3px" }}>
                      <rect x="3" y="4" width="18" height="13" rx="2" fill="none"
                        stroke="currentColor" strokeWidth="1.7" />
                      <path d="M12 8v5m0 0-2.2-2.2M12 13l2.2-2.2M8 20h8" fill="none"
                        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
                        strokeLinejoin="round" />
                    </svg>
                    )을 누릅니다.
                  </li>
                  <li>
                    아이콘이 안 보이면 오른쪽 위 <strong>⋮</strong> →{" "}
                    <strong>캐스트, 저장 및 공유</strong> →{" "}
                    <strong>페이지를 앱으로 설치</strong>
                  </li>
                  <li>
                    <strong>설치</strong>를 누르면 끝입니다.
                  </li>
                </>
              )}
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
