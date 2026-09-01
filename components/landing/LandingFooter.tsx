import CompanyNameMark from "@/components/CompanyNameMark";
import ObfuscatedEmail from "@/components/ObfuscatedEmail";
import { COMPANY_SUPPORT_HOURS, COMPANY_SUPPORT_PHONE } from "@/lib/contactInfo";
import {
  COMPANY_ADDRESS,
  COMPANY_BIZ_REG_NO,
  COMPANY_CEO,
  COMPANY_ECOMMERCE_LICENSE,
  COMPANY_FREIGHT_BROKER_LICENSE,
  COMPANY_LEGAL_NAME,
} from "@/lib/companyInfo";

/* 랜딩 푸터.
   🔴 전화·이메일·회사정보는 전부 상수 참조다 — 여기에 값을 직접 적지 말 것.
      대표번호는 `lib/contactInfo.ts` 와 `lib/companyInfo.ts` 두 상수가 있고 지금은 같은
      값이지만 **합치지 않았다**(29차) — 바꿀 때는 두 곳을 함께 고칠 것.
   🔴 상호는 `<CompanyNameMark />` 를 쓴다 — 평문(`COMPANY_INFO.name`)을 그대로 그리면
      가운데 **세로 구분선이 슬래시 글자로 찍힌다**(54차).
   ⚠️ 이메일은 `<ObfuscatedEmail />` 이다 — HTML 소스에 평문이 남지 않는다(30차). */
export default function LandingFooter() {
  return (
    /* 🔴 위 여백 130 → 76px (사용자 지시 2026-09-01 — "제일 아래 칸의 고객센터와 회사
       정보 나와있는 칸의 위쪽 여백을 조금만 더 줄이고"). */
    <footer style={{ padding: "76px max(56px, calc((100% - 1200px) / 2)) 52px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "32px 48px" }}>
        <div>
          <div style={{ fontSize: 14.4, fontWeight: 600, letterSpacing: "0.14em", color: "#9C9B95" }}>고객센터</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
            <svg width="32" height="32" viewBox="0 0 20 20" fill="none" style={{ flex: "0 0 auto", display: "block", transform: "translateY(2px)" }}>
              <path d="M6.4 3.2H3.9c-.7 0-1.2.6-1.1 1.3.3 2.6 1.4 5 3.1 6.8 1.8 1.8 4.1 2.9 6.7 3.2.7.1 1.3-.5 1.3-1.2v-2.4c0-.6-.4-1.1-1-1.2l-1.8-.3c-.4-.1-.8.1-1 .4l-.5.8c-1.4-.7-2.6-1.9-3.3-3.3l.8-.5c.4-.2.5-.6.5-1l-.3-1.8c-.1-.6-.6-1-1.2-1z" fill="#17181A" />
            </svg>
            <a href={`tel:${COMPANY_SUPPORT_PHONE.replace(/-/g, "")}`}
              style={{ fontSize: 32.4, lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.03em", color: "inherit" }}>
              {COMPANY_SUPPORT_PHONE}
            </a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 16.8, color: "#6C6B65" }}>
              <svg width="26" height="26" viewBox="0 0 20 20" fill="none" style={{ flex: "0 0 auto", display: "block" }}>
                <circle cx="10" cy="10" r="7" stroke="#A8A79F" strokeWidth="1.4" />
                <path d="M10 6.4V10l2.6 1.6" stroke="#A8A79F" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <span>{COMPANY_SUPPORT_HOURS} (주말·공휴일 휴무)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 16.8 }}>
              <svg width="26" height="26" viewBox="0 0 20 20" fill="none" style={{ flex: "0 0 auto", display: "block" }}>
                <rect x="3" y="5" width="14" height="10" rx="2" stroke="#A8A79F" strokeWidth="1.4" />
                <path d="M3.8 6.2 10 10.6l6.2-4.4" stroke="#A8A79F" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <ObfuscatedEmail style={{ color: "#4A4945" }} />
            </div>
          </div>
        </div>
        {/* 🔴 글자 12.5 → 14px, 색 #9C9B95 → #6C6B65 (사용자 지시 — "회사 정보는 좀더
            잘보이게 하자. 글씨도 너무 작고 희미하다"). #9C9B95 는 흰 배경 대비가 약
            2.8:1 로 **WCAG AA(4.5:1) 에 한참 못 미쳤다** — #6C6B65 는 약 5.6:1 이다.
            🔴 다시 옅게 되돌리지 말 것: 이 블록은 전자상거래법 제10조 표시사항이라
               「읽히는 것」이 요건의 일부다. 폭도 380 → 420 으로 넓혀 줄바꿈을 줄였다. */}
        <div style={{ fontSize: 14, lineHeight: 1.95, color: "#6C6B65", maxWidth: 420 }}>
          <div style={{ marginBottom: 6, fontSize: 15.5, fontWeight: 700, color: "#2F2E2B" }}>
            <CompanyNameMark />
          </div>
          <div>대표 {COMPANY_CEO} · 사업자등록번호 {COMPANY_BIZ_REG_NO}</div>
          <div>통신판매업 신고 {COMPANY_ECOMMERCE_LICENSE}</div>
          <div>화물자동차 운송주선사업 허가 {COMPANY_FREIGHT_BROKER_LICENSE}</div>
          <div>{COMPANY_ADDRESS}</div>
          {/* 🔴 아래 두 줄은 시안에 없지만 뺄 수 없다 — 전자상거래법 제10조 표시사항인
              **호스팅사업자**와, 개인정보처리방침이 지정한 **개인정보 보호책임자**다
              (30차 `SiteFooter` 가 같은 이유로 담고 있다). */}
          <div>개인정보 보호책임자 {COMPANY_CEO} · 호스팅 제공 Vercel Inc.</div>
          <div style={{ marginTop: 10, fontSize: 12.5, color: "#9C9B95" }}>© {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
