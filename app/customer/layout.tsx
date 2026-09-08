import CustomerPortalShell from "./CustomerPortalShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata = {
  title: "운송관리 | 위캐리 운송",
  // 화주포털도 admin과 동일하게 색인 차단(원칙: 로그인이 필요한 화면은 검색 노출 대상 아님)
  robots: { index: false, follow: false },
  // 🔴 루트 OG 를 물려받지 않게 지운다(admin 과 같은 이유).
  // ⚠️ **`/customer/login` 만 예외다** — 랜딩에서 넘어오는 공개 진입 화면이라 링크
  //    미리보기가 필요하다. 그 화면은 `login/layout.tsx` 에서 OG 를 따로 넣고,
  //    noindex 는 여기서 물려받아 그대로 유지한다(두 축은 서로 독립이다).
  openGraph: null,
  twitter: null,
  // ── 설치형 앱(PWA) ────────────────────────────────────────────────────────
  // 🔴 manifest 는 `public/` 에 있다. Next 의 `manifest` 파일 컨벤션은 **루트 전용**이라
  //    (`app/manifest.ts` 만 인식된다 — 세그먼트에 두면 라우트로 잡히지도 않는다)
  //    세그먼트별로 내려면 Route Handler 나 정적 파일뿐이고, 정적 파일을 골랐다.
  //    ⚠️ manifest 위치는 scope 와 무관하다 — scope 는 아래 파일 안의 값이 정한다.
  // 🔴 `appleWebApp` 이 iOS 메타태그 3종을 만든다. 아이폰에는 설치 프롬프트가 없어
  //    「홈 화면에 추가」로만 설치되는데, 이 값이 없으면 주소창이 남는다.
  //    홈 화면 아이콘은 같은 폴더의 `apple-icon.png`(파일 컨벤션)가 담당한다.
  // 설치형 앱(PWA) 설정. 🔴 **세그먼트별 manifest 는 Next 가 지원하지 않아**(루트 전용)
  // `public/` 정적 파일로 두고 여기서 잇는다.
  // 🔴 **그 파일의 `scope`·`start_url` 에 끝 슬래시를 붙이지 말 것**(`/customer` 이어야 한다).
  //    Next 가 `/customer/` 를 `/customer` 로 308 리다이렉트하므로, `/customer/` 로 적으면 앱이
  //    켜지자마자 **자기 구역 밖으로 나가** 창에 주소 띠가 남는다(PR #126 에서 실제로
  //    겪었다). `.webmanifest` 는 JSON 이라 주석을 못 달아서 여기에 적어 둔다.
  manifest: "/manifest-customer.webmanifest",
  appleWebApp: {
    capable: true,
    title: "운송관리",
    statusBarStyle: "default",
  },
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 🔴 스크립트 위치가 곧 담당 구역이다 — 루트로 옮기면 한 서비스워커가
          내부관리와 랜딩까지 삼킨다. `components/ServiceWorkerRegister.tsx` 주석 참고. */}
      <ServiceWorkerRegister scriptUrl="/customer/sw.js" scope="/customer" />
      <CustomerPortalShell>{children}</CustomerPortalShell>
    </>
  );
}
