// 26차 메타 규칙: 공개 페이지는 title뿐 아니라 description도 각자 지정할 것
// (안 적으면 루트 layout의 description을 그대로 상속받음)
export const metadata = {
  title: "이용약관 | 위캐리 운송",
  description: "위캐리 운송 화물운송 주선 서비스의 이용약관입니다. 계약 성립, 운임과 추가비, 배상 책임, 정산 조건을 안내합니다.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
