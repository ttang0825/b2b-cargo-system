import Link from "next/link";
import InstallAppButton from "@/components/InstallAppButton";

// 🔴 **배열 순서가 곧 화면 순서다**(리뷰 2라운드에 사용자가 직접 지정).
//    1행: 화주 관리 · 활성 화주 · 차주 관리 · 운임기준표
//    2행: 견적 관리 · 운송오더 · 배차 관리 · 정산 관리
//    앞 줄은 **누구와 무엇으로 일하는가**(대상·기준), 뒷 줄은 **한 건이 흘러가는 차례**
//    (견적 → 오더 → 배차 → 정산)다. 항목을 더하면 4의 배수를 지켜야 4칸 2줄이 유지된다.
//    🔴 「가나다」나 「원래 순서」로 되돌리지 말 것.
const MENU = [
  {
    href: "/admin/companies",
    tag: "영업",
    title: "화주 관리 (영업)",
    desc: "신규 화주 발굴부터 접촉 이력까지, 영업 대상 DB를 관리합니다.",
  },
  {
    href: "/admin/customers",
    tag: "CRM",
    title: "활성 화주 (CRM)",
    desc: "견적 요청 이상 진행된 화주만 모아 거래 현황을 확인합니다.",
  },
  {
    href: "/admin/drivers",
    tag: "차주",
    title: "차주 관리",
    desc: "차주와 차량 정보, 운행 가능 지역, 누적 운송건수를 관리합니다.",
  },
  {
    href: "/admin/rates",
    tag: "운임",
    title: "운임기준표",
    desc: "거리·톤수 매트릭스와 가산기준을 관리하고 견적에 반영합니다.",
  },
  {
    href: "/admin/quotes",
    tag: "견적",
    title: "견적 관리",
    desc: "기존 화주와 신규 고객의 견적을 자동 계산하고 발송합니다.",
  },
  {
    href: "/admin/orders",
    tag: "오더",
    title: "운송오더",
    desc: "수주된 견적과 직접 접수 건을 운송오더로 등록·관리합니다.",
  },
  {
    href: "/admin/dispatches",
    tag: "배차",
    title: "배차 관리",
    desc: "오더에 차주를 배정하고 상차부터 운송완료까지 추적합니다.",
  },
  {
    href: "/admin/invoices",
    tag: "정산",
    title: "정산 관리",
    desc: "세금계산서·입금·지급 상태를 관리하고 화주 실적을 집계합니다.",
  },
];

export default function AdminHomePage() {
  return (
    <main className="container">
      {/* 🔴 설치 버튼은 제목 줄 **오른쪽 끝**이다(실사용 지적, PR #127).
          `.page-header` 가 이미 좌우로 벌리는 줄이라 두 번째 자식으로 두면 된다.
          설치할 수 없으면 아무것도 안 그려서 예전 모습 그대로가 된다. */}
      <div className="page-header">
        <div>
          <h1 className="page-title">WeCarry 운송 통합 운영 시스템</h1>
          <p className="page-desc">원하는 업무를 선택해 바로 이동하세요.</p>
        </div>
        <InstallAppButton appName="내부관리" className="install-app-btn" />
      </div>

      <div className="home-grid">
        {MENU.map((m) => (
          <Link key={m.href} href={m.href} className="card home-card">
            <span className="home-card-tag">{m.tag}</span>
            <h3 className="home-card-title">{m.title}</h3>
            <p className="home-card-desc">{m.desc}</p>
          </Link>
        ))}
      </div>

      <div style={{ textAlign: "right", marginTop: 16 }}>
        <Link href="/admin/guide" className="guide-link">
          이용가이드
        </Link>
      </div>
    </main>
  );
}
