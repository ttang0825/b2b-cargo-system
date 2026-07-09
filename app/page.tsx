import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">B2B 화물운송 통합 운영 시스템</h1>
          <p className="page-desc">
            1단계: 화주 CRM(companies) 관리부터 시작합니다.
          </p>
        </div>
      </div>
      <Link href="/admin/companies" className="btn">
        화주 관리 화면으로 이동 →
      </Link>
    </main>
  );
}
