import { buildPageMetadata } from "@/lib/pageMetadata";

// 🔴 `page.tsx` 가 클라이언트 컴포넌트라 metadata 를 export 할 수 없어서 두는 얇은
//    서버 레이아웃이다(원칙 10번, `app/customer/layout.tsx` → Shell 과 같은 패턴).
// ⚠️ **noindex 는 부모(`app/customer/layout.tsx`)에서 물려받는다** — 여기서 풀지 말 것.
//    OG 를 넣는 것은 검색 색인이 아니라 **카카오톡·슬랙 링크 미리보기**를 위해서다.
//    이 화면은 랜딩에서 넘어오는 공개 진입 화면이라 미리보기가 필요하다.
export const metadata = buildPageMetadata({
  title: "운송관리 로그인 | 위캐리 운송",
  description:
    "위캐리 운송관리에 로그인하시면 견적·배차·정산 내역을 언제든 확인하실 수 있습니다.",
  path: "/customer/login",
});

export default function CustomerLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
