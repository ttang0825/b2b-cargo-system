"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";

const PUBLIC_PATHS = ["/customer/login"];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [notified, setNotified] = useState({ quotes: false, dispatches: false, invoices: false });

  useEffect(() => {
    async function check() {
      if (PUBLIC_PATHS.includes(pathname || "")) {
        setChecking(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/customer/login");
        return;
      }

      const { data: account } = await supabase
        .from("customer_accounts")
        .select("must_change_password, is_active, companies(name)")
        .eq("auth_user_id", session.user.id)
        .single();

      if (!account || !account.is_active) {
        await supabase.auth.signOut();
        router.replace("/customer/login");
        return;
      }

      if (account.must_change_password && pathname !== "/customer/change-password") {
        router.replace("/customer/change-password");
        return;
      }

      setCompanyName((account.companies as any)?.name || "");
      setChecking(false);

      // 지금 보고 있는 메뉴의 알림은 해제
      if (pathname === "/customer/quotes") setNotified((prev) => ({ ...prev, quotes: false }));
      if (pathname === "/customer/dispatches") setNotified((prev) => ({ ...prev, dispatches: false }));
      if (pathname === "/customer/invoices") setNotified((prev) => ({ ...prev, invoices: false }));
    }
    check();
  }, [pathname, router]);

  // 견적/배차/정산 변경사항을 실시간으로 감지해서 해당 메뉴에 알림 표시
  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname || "")) return;

    const channel = supabase
      .channel("customer_layout_notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => {
        setNotified((prev) => (pathname === "/customer/quotes" ? prev : { ...prev, quotes: true }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, () => {
        setNotified((prev) => (pathname === "/customer/dispatches" ? prev : { ...prev, dispatches: true }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
        setNotified((prev) => (pathname === "/customer/invoices" ? prev : { ...prev, invoices: true }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/customer/login");
  }

  if (PUBLIC_PATHS.includes(pathname || "")) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <main className="container">
        <div className="empty-state">확인 중...</div>
      </main>
    );
  }

  return (
    <div>
      <div className="top-nav">
        <div className="top-nav-inner" style={{ flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="brand">{companyName || "화주"} 포털</div>
            <div className="brand-sub">EGG 운송 통합 운영 시스템</div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href="/customer" className="nav-chip">대시보드</a>
              <a href="/customer/request" className="nav-chip">발주 요청</a>
              <a href="/customer/quotes" className="nav-chip" style={{ position: "relative" }}>
                견적 확인
                {notified.quotes && (
                  <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "var(--danger)" }} />
                )}
              </a>
              <a href="/customer/dispatches" className="nav-chip" style={{ position: "relative" }}>
                배차·운송 조회
                {notified.dispatches && (
                  <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "var(--danger)" }} />
                )}
              </a>
              <a href="/customer/calendar" className="nav-chip">캘린더</a>
              <a href="/customer/invoices" className="nav-chip" style={{ position: "relative" }}>
                정산·세금계산서
                {notified.invoices && (
                  <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "var(--danger)" }} />
                )}
              </a>
              <a href="/customer/stats" className="nav-chip">통계</a>
              <a href="/customer/locations" className="nav-chip">배송지 관리</a>
              <a href="/customer/announcements" className="nav-chip">공지사항</a>
              <a href="/customer/profile" className="nav-chip">담당자 정보</a>
              <a href="/customer/change-password" className="nav-chip">비밀번호 변경</a>
            </nav>
            <button
              onClick={handleLogout}
              className="guide-link"
              style={{ border: "none", background: "none", cursor: "pointer" }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
