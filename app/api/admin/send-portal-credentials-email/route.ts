import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "서버에 RESEND_API_KEY가 설정되어 있지 않습니다. 이메일 발송 서비스 가입이 먼저 필요합니다." },
      { status: 500 }
    );
  }

  const { email, companyName, contactName, password, portalUrl } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호 정보가 필요합니다." }, { status: 400 });
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#1a1a1a;">WeCarry 화주포털 계정 안내</h2>
      <p>안녕하세요, ${contactName ? contactName + "님" : "담당자님"}.</p>
      <p><b>${companyName || "귀사"}</b>의 WeCarry 화주포털 등록 신청이 <b>승인</b>되었습니다.
      아래 정보로 화주포털에 접속하실 수 있습니다.</p>
      <div style="background:#fff9d6; border-radius:10px; padding:16px; margin:20px 0;">
        <div>포털 주소: <a href="${portalUrl}">${portalUrl}</a></div>
        <div>이메일: <b>${email}</b></div>
        <div>임시 비밀번호: <b>${password}</b></div>
      </div>
      <p style="font-size:13px; color:#666;">
        보안을 위해 최초 로그인 시 비밀번호를 새로 설정해주세요.<br/>
        문의사항이 있으시면 고객센터로 편하게 연락해주세요.
      </p>
      <p style="font-size:13px; color:#999; margin-top:24px;">WeCarry 운송</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WeCarry 운송 <onboarding@resend.dev>",
        to: [email],
        subject: "[WeCarry] 화주포털 계정이 발급되었습니다",
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.message || "이메일 발송에 실패했습니다." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "이메일 발송 중 오류가 발생했습니다." }, { status: 500 });
  }
}
