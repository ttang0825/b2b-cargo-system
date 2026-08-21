// ⚠️ 차량 범위 표현 기준(12차 확정): **"1톤부터 5톤 이상까지"**.
// 🔴 "이상"을 빼면 "1톤부터 5톤까지"가 되어 상한을 못 박는 금지 표현이 된다 —
// 검색결과에 그대로 노출되는 문장이므로 화면 본문과 같은 기준을 적용한다.
// (표의 실제 상한인 "5톤 플러스/축"을 적고 있었으나 같은 이유로 교체함)
export const metadata = {
  title: "차량·요금 안내 | 위캐리 운송",
  description:
    "1톤부터 5톤 이상까지 차종별 적재 용량과 시작가를 안내합니다. 정확한 금액은 견적 시 안내해 드립니다.",
};

export default function VehiclesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
