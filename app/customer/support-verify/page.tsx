"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseCustomer as supabase } from "@/lib/supabaseCustomerClient";

function SupportVerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const verifyStarted = useRef(false);

  useEffect(() => {
    if (verifyStarted.current) return;
    verifyStarted.current = true;
    async function verify() {
      const tokenHash = searchParams.get("token_hash");
      const email = searchParams.get("email");
      if (!tokenHash || !email) {
        setError("접속 정보가 올바르지 않습니다.");
        return;
      }
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
        email,
      });
      if (error) {
        // TODO(임시 디버그): 지원접속 검증 실패 원인 확인 후 제거
        console.error("[support-verify] verifyOtp error:", error);
        setError("접속 링크가 만료되었거나 이미 사용되었습니다. 관리자 화면에서 다시 시도해주세요.");
        return;
      }
      router.replace("/customer");
    }
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: 20,
      }}
    >
      <div className="card" style={{ padding: 36, width: 360, maxWidth: "100%", textAlign: "center" }}>
        {error ? (
          <>
            <p style={{ fontSize: 13.5, color: "var(--danger)" }}>{error}</p>
            <a href="/customer/login" style={{ fontSize: 13 }}>
              화주포털 로그인으로 이동
            </a>
          </>
        ) : (
          <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}>접속 확인 중...</p>
        )}
      </div>
    </main>
  );
}

export default function SupportVerifyPage() {
  return (
    <Suspense fallback={null}>
      <SupportVerifyInner />
    </Suspense>
  );
}
