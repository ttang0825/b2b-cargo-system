"use client";

import { useEffect, useState } from "react";

/**
 * 「이 기기로 알림 받기」 — 웹 푸시 구독 (38차 B장).
 *
 * 🔴 **설정 화면을 새로 만들지 않는다**(사용자 확정: 직원 전원 같은 알림).
 *    A장의 종 모양 토글 **옆**에 단추 하나로 둔다.
 *
 * 🔴 **거절당하면 다시 묻지 않는다** — 브라우저가 그 사이트를 영구 차단해서, 다시
 *    물어도 창이 아예 안 뜬다. 안내 문구로 바꿔 「브라우저 설정에서 허용」을 알린다.
 *
 * 🔴 **아이폰은 홈 화면에 추가한 뒤에만 된다**(iOS 16.4+). 사파리에서 그냥 열어두면
 *    **눌러도 안 되므로**, 단추 대신 안내를 그린다.
 *    ⚠️ 아이폰은 앱을 지우면 구독이 사라진다 — 다시 설치하면 다시 눌러야 한다.
 *    **버그가 아니다.**
 */

// 🔴 **`components/InstallAppButton.tsx` 에 같은 판정이 있다.** 거기서 export 해서
//    쓰지 않은 것은 그 컴포넌트를 **화주포털 2화면이 렌더링**하기 때문이다 —
//    38차 지시서가 「화주포털은 한 줄도 건드리지 않는다」로 범위를 못박았다.
//    🔴 **둘 중 하나를 고치면 다른 하나도 같이 볼 것**(순수 함수 둘뿐이라 갈려도
//    조용히 틀리지는 않지만, 새 기기가 나오면 두 곳 다 손봐야 한다).
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

/**
 * base64url 공개키를 `pushManager.subscribe` 가 받는 바이트열로 바꾼다.
 * 🔴 `ArrayBuffer` 로 돌려준다 — `Uint8Array` 를 그대로 주면 `BufferSource` 에
 *    안 맞아 `tsc` 가 거절한다(`ArrayBufferLike` 에 `SharedArrayBuffer` 가 섞인다).
 */
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return buf;
}

function keyToB64u(key: ArrayBuffer | null): string {
  if (!key) return "";
  return btoa(String.fromCharCode(...new Uint8Array(key)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** 🔴 판별자는 문자열이다 — 이 저장소는 `strict: false` 라 참/거짓으로 안 좁혀진다. */
type State =
  | { kind: "loading" }
  /** 브라우저가 웹 푸시를 아예 지원하지 않음 · VAPID 미등록 — 아무것도 안 그린다 */
  | { kind: "unavailable" }
  /** 아이폰인데 아직 홈 화면에 추가하지 않음 */
  | { kind: "ios-needs-install" }
  /** 이 기기는 이미 등록됨 */
  | { kind: "subscribed" }
  /** 사용자가 거절함 — 🔴 다시 묻지 않는다 */
  | { kind: "denied" }
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "failed"; message: string };

export default function AdminPushSubscribeButton() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

  useEffect(() => {
    let alive = true;
    (async () => {
      if (typeof window === "undefined") return;
      // 🔴 VAPID 가 아직 등록되지 않은 배포본이 반드시 생긴다(코드가 먼저 나간다) —
      //    그때는 단추를 아예 안 그린다. 눌러도 안 되는 단추가 있는 것이 더 나쁘다.
      if (!vapid) return setState({ kind: "unavailable" });
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState({ kind: "unavailable" });
      }
      if (isIos() && !isStandalone()) return setState({ kind: "ios-needs-install" });
      if (Notification.permission === "denied") return setState({ kind: "denied" });
      try {
        const reg = await navigator.serviceWorker.getRegistration("/admin");
        const existing = await reg?.pushManager.getSubscription();
        if (!alive) return;
        setState({ kind: existing ? "subscribed" : "idle" });
      } catch {
        if (alive) setState({ kind: "idle" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [vapid]);

  async function subscribe() {
    setState({ kind: "working" });
    try {
      // 🔴 **반드시 사용자 제스처 안이어야 한다** — 이 함수는 onClick 에서만 불린다.
      //    아이폰은 제스처 밖 요청을 그냥 거절한다.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        // 🔴 거절당하면 다시 묻지 않는다(브라우저가 영구 차단한다).
        return setState({ kind: "denied" });
      }
      // 🔴 서비스워커 구역은 `/admin` 이고 **끝 슬래시가 없다**(PR #127 — 붙이면
      //    홈 화면이 구역 밖으로 빠진다). `ready` 가 아니라 이 구역으로 집는다.
      const reg =
        (await navigator.serviceWorker.getRegistration("/admin")) || (await navigator.serviceWorker.ready);
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          // 🔴 `true` 여야 한다 — 안 보이는 푸시를 보내겠다고 하면 브라우저가 거절한다.
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBuffer(vapid),
        }));

      const res = await fetch("/api/admin/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: keyToB64u(sub.getKey("p256dh")),
          auth: keyToB64u(sub.getKey("auth")),
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        // 🔴 서버가 못 받았으면 브라우저 구독도 되돌린다 — 안 그러면 「등록됐다는데
        //    알림이 안 온다」가 된다(서버에 행이 없으니 보낼 곳을 모른다).
        await sub.unsubscribe().catch(() => undefined);
        return setState({ kind: "failed", message: j?.error || "등록에 실패했습니다." });
      }
      setState({ kind: "subscribed" });
    } catch (e) {
      setState({ kind: "failed", message: e instanceof Error ? e.message : "등록에 실패했습니다." });
    }
  }

  async function unsubscribe() {
    setState({ kind: "working" });
    try {
      const reg = await navigator.serviceWorker.getRegistration("/admin");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/admin/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => undefined);
        await sub.unsubscribe().catch(() => undefined);
      }
      setState({ kind: "idle" });
    } catch {
      setState({ kind: "idle" });
    }
  }

  if (state.kind === "loading" || state.kind === "unavailable") return null;

  if (state.kind === "ios-needs-install") {
    return (
      <span className="aintake-push-note" title="아이폰은 홈 화면에 추가한 뒤에만 알림을 받을 수 있습니다 (iOS 16.4+)">
        알림: 홈 화면에 추가 필요
      </span>
    );
  }
  if (state.kind === "denied") {
    return (
      <span className="aintake-push-note" title="브라우저 주소창의 자물쇠 → 알림 → 허용 으로 바꾼 뒤 새로고침해 주세요">
        알림 차단됨
      </span>
    );
  }
  if (state.kind === "subscribed") {
    return (
      <button type="button" className="aintake-push-btn aintake-push-on" onClick={unsubscribe} title="이 기기에서 알림 받기를 끕니다">
        이 기기 알림 켜짐
      </button>
    );
  }
  if (state.kind === "failed") {
    return (
      <button type="button" className="aintake-push-btn" onClick={subscribe} title={state.message}>
        알림 등록 실패 — 다시 시도
      </button>
    );
  }
  return (
    <button
      type="button"
      className="aintake-push-btn"
      onClick={subscribe}
      disabled={state.kind === "working"}
      title="브라우저를 닫아도 새 접수 알림을 받습니다"
    >
      {state.kind === "working" ? "등록 중…" : "이 기기로 알림 받기"}
    </button>
  );
}
