"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/admin/companies", label: "화주 관리 (영업)" },
  { href: "/admin/customers", label: "활성 화주 (CRM)" },
  { href: "/admin/rates", label: "운임기준표" },
  { href: "/admin/quotes", label: "견적 관리" },
  { href: "/admin/orders", label: "운송오더" },
  { href: "/admin/drivers", label: "차주 관리" },
  { href: "/admin/dispatches", label: "배차 관리" },
  { href: "/admin/invoices", label: "정산 관리" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <div className="top-nav">
      <div className="top-nav-inner" style={{ flexWrap: "wrap", gap: 16 }}>
        <Link href="/admin" className="brand-link">
          <div className="brand">EGG 운송 통합 운영 시스템</div>
          <div className="brand-sub">내부 관리자 (admin)</div>
        </Link>
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {MENU.map((m) => {
            const active = pathname?.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                className={active ? "nav-chip nav-chip-active" : "nav-chip"}
              >
                {m.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
