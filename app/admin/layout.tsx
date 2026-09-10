import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { INSTALL_PROMPT_CAPTURE } from "@/lib/installPromptCapture";

export const metadata = {
  title: "내부관리 | WeCarry 운송 운영 시스템",
  // 내부 관리 화면은 검색엔진에 색인되면 안 됨(프라이버시). robots.txt는 크롤 차단일
  // 뿐 검색결과 삭제를 보장하지 않으므로 이 metadata noindex가 핵심 방어선이고,
  // app/robots.ts의 Disallow는 보조임 — 둘 다 유지할 것
  robots: { index: false, follow: false },
  // 🔴 루트 layout 의 OG·트위터 카드를 **물려받지 않게 지운다.** 관리자 화면은 링크
  //    미리보기 대상이 아니고, 물려받으면 내부 주소를 카톡·슬랙에 붙였을 때 공개
  //    사이트 미리보기가 뜬다. noindex(검색 색인)와는 별개 축이니 둘 다 유지할 것.
  openGraph: null,
  twitter: null,
  // ── 설치형 앱(PWA) ────────────────────────────────────────────────────────
  // 🔴 manifest 를 `/admin/` 아래가 아니라 `public/`(루트)에 둔 것이 핵심이다 —
  //    `middleware.ts` 의 matcher 가 이 세그먼트 전체를 가로채서, 여기 두면 브라우저가
  //    manifest 를 요청할 때 **로그인 화면으로 307** 이 오고 설치 버튼이 원인 불명으로
  //    안 뜬다(28차 파비콘 사고와 같은 뿌리 — 실측으로 재현했다).
  //    반면 `apple-icon.png` 는 파일 컨벤션이라 이 세그먼트에 둘 수밖에 없어서
  //    middleware 의 통과 목록에 따로 넣어 두었다.
  // 설치형 앱(PWA) 설정. 🔴 **세그먼트별 manifest 는 Next 가 지원하지 않아**(루트 전용)
  // `public/` 정적 파일로 두고 여기서 잇는다.
  // 🔴 **그 파일의 `scope`·`start_url` 에 끝 슬래시를 붙이지 말 것**(`/admin` 이어야 한다).
  //    Next 가 `/admin/` 를 `/admin` 로 308 리다이렉트하므로, `/admin/` 로 적으면 앱이
  //    켜지자마자 **자기 구역 밖으로 나가** 창에 주소 띠가 남는다(PR #126 에서 실제로
  //    겪었다). `.webmanifest` 는 JSON 이라 주석을 못 달아서 여기에 적어 둔다.
  manifest: "/manifest-admin.webmanifest",
  appleWebApp: {
    capable: true,
    title: "내부관리",
    statusBarStyle: "default",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 🔴 `/admin/sw.js` 는 middleware 통과 목록에 들어가 있다 — 빼면 등록 요청에
          로그인 화면이 내려와 서비스워커가 조용히 등록되지 않는다. */}
      {/* 🔴 설치 신호는 리액트가 붙기 전에 지나갈 수 있어 여기서 먼저 잡는다.
          `lib/installPromptCapture.ts` 주석 참고 — 옮기거나 지우면 설치 버튼이
          떴다 안 떴다 한다. */}
      <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_CAPTURE }} />
      <ServiceWorkerRegister scriptUrl="/admin/sw.js" scope="/admin" />
      {/* 🔴 **이 래퍼는 화면 폭을 넓히는 스코프다**(34차 리뷰 1라운드) — 지우지 말 것.
          `.container` 는 관리자 전용이 아니라 화주포털 7화면과 공개 화면 6개도 쓰기
          때문에 그 클래스 자체를 넓힐 수 없다. 관리자 안에서만 넓히려고 여기서 감싼다.
          자세한 사유는 `app/globals.css` 의 「내부관리 화면 폭」 주석. */}
      <div className="admin-wide">{children}</div>
    </>
  );
}
