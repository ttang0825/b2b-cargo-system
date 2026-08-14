// 26차 메타 규칙: 공개 페이지는 title뿐 아니라 description도 각자 지정할 것
export const metadata = {
  title: "개인정보처리방침 | 위캐리 운송",
  description: "위캐리 운송이 수집하는 개인정보의 항목과 처리 목적, 보유 기간, 제3자 제공 및 위탁 현황을 안내합니다.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
