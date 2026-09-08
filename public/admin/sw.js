// ─────────────────────────────────────────────────────────────────────────────
// 내부관리 설치형 앱 서비스워커
//
// 🔴 **이 파일은 손으로 고치지 않는다.** `public/customer/sw.js` 와
//    `public/admin/sw.js` 는 라벨과 캐시 이름만 다른 같은 파일이다 — 한쪽만 고치면
//    두 앱이 조용히 갈린다.
//
// 🔴 **캐시는 화이트리스트다. 「일단 다 캐시하고 나중에 뺀다」로 바꾸지 말 것.**
//    이 저장소는 `force-dynamic` 만으로는 데이터 캐시를 못 막아 API 가 옛 값을
//    계속 내려주던 사고를 겪었다(55차, GET 라우트 11개). 서비스워커는 그보다 훨씬
//    오래 남는다 — 사용자가 앱을 지우기 전까지 남는다.
//
// 🔴 **화면(HTML)을 캐시하지 않는 것이 핵심이다.** 운송관리 15화면·내부관리 31화면이
//    전부 실데이터 화면이라 캐시해도 되는 「앱 셸」이 아예 없다. 견적 금액·배차 상태·
//    정산 내역이 낡은 채로 보이면 그대로 업무 사고다.
//
//    캐시한다      /_next/static/*  (파일명에 내용 해시가 박혀 있어 낡을 수 없다)
//                  아이콘 · 오프라인 안내 화면 1장
//    캐시 안 한다  나머지 전부 — 화면 · API · 견적 · 배차 · 정산 · 통계
// ─────────────────────────────────────────────────────────────────────────────

// 🔴 배포할 때마다 올릴 것. 값이 바뀌면 activate 에서 옛 캐시를 통째로 지운다 —
//    안 올리면 배포해도 사용자에게 옛 정적 자산이 남는다.
const VERSION = "v1";
const CACHE = "wecarry-admin-" + VERSION;

const OFFLINE_URL = "/offline.html";

// 설치 시점에 미리 받아 두는 것 — 오프라인에서 보여줄 화면과 그 화면이 쓰는 것뿐이다.
const PRECACHE = [OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      // 🔴 미리 받기가 실패해도 설치를 막지 않는다 — 실패하면 오프라인 화면만
      //    못 쓸 뿐인데, 여기서 던지면 앱 자체가 설치되지 않는다.
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("wecarry-admin-") && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** 내용 해시가 박힌 빌드 산출물만 캐시에서 먼저 꺼내도 안전하다. */
function isImmutableAsset(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
}

/** manifest 가 가리키는 아이콘. 바뀌면 파일명이 아니라 VERSION 으로 갈아낀다. */
function isIcon(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 🔴 GET 이 아니면 손대지 않는다 — 저장·삭제 요청을 가로채면 안 된다.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 🔴 다른 출처(Supabase · 솔라피 · 폰트 CDN)는 통째로 건드리지 않는다.
  if (url.origin !== self.location.origin) return;

  // 화면 이동 — 🔴 **항상 네트워크로 간다. 응답을 캐시하지 않는다.**
  //    실패했을 때만 오프라인 안내 화면을 보여준다.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || Response.error())
      )
    );
    return;
  }

  if (isImmutableAsset(url) || isIcon(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            // 부분 응답(206)이나 오류는 캐시하지 않는다.
            if (res && res.ok && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // 🔴 그 밖의 모든 것 — API · 데이터 · manifest — 은 손대지 않는다(network-only).
});
