// 26차 메타 규칙: 공개 페이지는 title뿐 아니라 description도 각자 지정할 것
export const metadata = {
  title: "이메일무단수집거부 | 위캐리 운송",
  description: "본 웹사이트에 게시된 이메일 주소의 무단 수집을 거부합니다. 관련 법령 조항을 안내합니다.",
};

export default function EmailPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
